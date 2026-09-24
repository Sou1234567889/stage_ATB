import { Injectable } from '@angular/core';
import { Client, Message, StompSubscription } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ChatMessage {
  expediteurId: number;
  expediteurNom: string;
  destinataireId: number;
  contenu: string;
  date: string;
  type: 'CHAT' | 'MEET_START' | 'MEET_END';
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private client: Client;
  private chatSubject = new BehaviorSubject<ChatMessage | null>(null);
  private meetSubject = new BehaviorSubject<ChatMessage | null>(null);

  public chat$: Observable<ChatMessage | null> = this.chatSubject.asObservable();
  public meet$: Observable<ChatMessage | null> = this.meetSubject.asObservable();

  private currentUserId: number | null = null;
  private messageSub: StompSubscription | null = null;
  private meetSub: StompSubscription | null = null;

  constructor() {
    this.client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8088/ws'),
      debug: (str) => console.log('[STOMP]', str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = (frame) => {
      console.log('✅ WebSocket connecté', frame);
      this.subscribeToUserTopics();
    };

    this.client.onStompError = (frame) => {
      console.error('❌ Erreur STOMP:', frame.headers['message'], frame.body);
    };

    this.client.onWebSocketError = (event) => {
      console.error('❌ Erreur WebSocket:', event);
    };
  }

  connect(userId: number): void {
    console.log('🔌 connect() appelé avec userId =', userId);
    this.currentUserId = userId;

    if (!this.client.active) {
      console.log('🔌 Activation du client STOMP...');
      this.client.activate();
    } else if (this.client.connected) {
      console.log('🔌 Client déjà connecté, réabonnement...');
      this.subscribeToUserTopics();
    }
  }

  private subscribeToUserTopics(): void {
    if (!this.currentUserId) {
      console.error('❌ currentUserId est null');
      return;
    }

    if (this.messageSub) this.messageSub.unsubscribe();
    if (this.meetSub) this.meetSub.unsubscribe();

    console.log(`📡 Abonnement au topic /topic/messages/${this.currentUserId}`);

    this.messageSub = this.client.subscribe(
      `/topic/messages/${this.currentUserId}`,
      (message: Message) => {
        console.log('🔔 Raw message STOMP reçu:', message.body);
        try {
          const payload: ChatMessage = JSON.parse(message.body);
          console.log('✅ Payload parsé:', payload);
          this.chatSubject.next(payload);
        } catch (e) {
          console.error('❌ Erreur parsing:', e);
        }
      }
    );

    this.meetSub = this.client.subscribe(
      `/topic/meet/${this.currentUserId}`,
      (message: Message) => {
        console.log('🔔 Raw meet STOMP reçu:', message.body);
        try {
          const payload: ChatMessage = JSON.parse(message.body);
          this.meetSubject.next(payload);
        } catch (e) {
          console.error('❌ Erreur parsing meet:', e);
        }
      }
    );

    console.log(`✅ Abonné aux topics pour user ${this.currentUserId}`);
  }

  envoyerMessage(destinataireId: number, contenu: string, expediteurNom: string): void {
    if (!this.client.connected) {
      console.error('❌ WebSocket non connecté.');
      return;
    }

    const message: ChatMessage = {
      expediteurId: this.currentUserId!,
      expediteurNom: expediteurNom,
      destinataireId: destinataireId,
      contenu: contenu,
      date: new Date().toISOString(),
      type: 'CHAT',
    };

    console.log('📤 Envoi message:', message);

    this.client.publish({
      destination: '/app/chat.sendMessage',
      body: JSON.stringify(message),
    });
  }

  demarrerMeet(destinataireId: number, expediteurNom: string, meetUrl: string): void {
    if (!this.client.connected) return;

    const message: ChatMessage = {
      expediteurId: this.currentUserId!,
      expediteurNom: expediteurNom,
      destinataireId: destinataireId,
      contenu: meetUrl,
      date: new Date().toISOString(),
      type: 'MEET_START',
    };

    this.client.publish({
      destination: '/app/meet.start',
      body: JSON.stringify(message),
    });
  }

  arreterMeet(destinataireId: number, expediteurNom: string): void {
    if (!this.client.connected) return;

    const message: ChatMessage = {
      expediteurId: this.currentUserId!,
      expediteurNom: expediteurNom,
      destinataireId: destinataireId,
      contenu: '',
      date: new Date().toISOString(),
      type: 'MEET_END',
    };

    this.client.publish({
      destination: '/app/meet.end',
      body: JSON.stringify(message),
    });
  }

  disconnect(): void {
    if (this.messageSub) this.messageSub.unsubscribe();
    if (this.meetSub) this.meetSub.unsubscribe();
    if (this.client.active) {
      this.client.deactivate();
      console.log('🔌 WebSocket déconnecté');
    }
    this.currentUserId = null;
  }
}