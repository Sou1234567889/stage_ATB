import {
  Component, EventEmitter, Input, OnInit, OnDestroy, Output, HostListener,
  AfterViewChecked, OnChanges, SimpleChanges
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WebSocketService, ChatMessage as WsChatMessage } from '../../../services/websocket.service';
import { UtilisateurService, StatutLivrable } from 'src/app/services/utilisateur.service';

const JAAS_APP_ID = 'vpaas-magic-cookie-8fbadb6a92694bd2983e200fbc8be6a2';


declare var JitsiMeetExternalAPI: any;

export interface Stagiaire {
  id: number;
  stagiaireId: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  offreTitre: string;
  statut: string;
  heuresTravaillees: number;
  heuresObjectif: number;
  rapports: Rapport[];
  messages: Message[];
}

export interface Rapport {
  id: number;
  nom: string;
  dateUpload: string;
  statut: 'EN_ATTENTE' | 'VALIDE' | 'REJETE';
  taille: string;
  url?: string;
}

export interface LivrableReel {
  id: number;
  titre: string;
  description: string;
  fichierUrl?: string;
  statut: StatutLivrable;
  commentaireEncadrant?: string;
  dateSoumission: string;
  dateRevision?: string;
  version: number;
}

export interface Message {
  id: number;
  auteur: string;
  contenu: string;
  date: string;
  isMoi: boolean;
}

@Component({
  selector: 'app-stagiaire-detail',
  templateUrl: './stagiaire-detail.component.html',
  styleUrls: ['./stagiaire-detail.component.css']
})
export class StagiaireDetailComponent implements OnInit, OnDestroy, OnChanges, AfterViewChecked {

  @Input() stagiaire!: Stagiaire;
  @Input() adminName = 'Encadrant';
  @Input() autoJoinMeetUrl: string | null = null;

  @Output() close = new EventEmitter<void>();

  activeTab: 'heures' | 'rapports' | 'chat' | 'meet' = 'heures';
  newMessage = '';
  chatMessages: Message[] = [];

  // HEURES
  heuresTravaillees: number = 0;
  heuresObjectif: number = 140;
  pointageEnCours: boolean = false;

  // TRAVAUX
  travaux: LivrableReel[] = [];
  loadingTravaux = false;
  livrableEnRevision: LivrableReel | null = null;
  commentaireRevision = '';
  savingRevision = false;
  apercuLivrable: LivrableReel | null = null;
  fichierSelectionne: File | null = null;
  uploadingFichier = false;

  // MEET
  jitsiApi: any = null;
jitsiDomain: string = '8x8.vc';   
  meetRoomName: string = '';
  meetActive = false;
  meetDuration = 0;
  meetTimer: any;
  myVideoOn = true;
  myMicOn = true;
  meetUrl = '';

  // Prévisualisation
  meetPreviewStream: MediaStream | null = null;
  meetPreviewLoading = false;
  meetPreviewError = '';
  meetDeviceSelection = {
    videoEnabled: true,
    audioEnabled: true,
    videoDeviceId: '',
    audioDeviceId: ''
  };
  meetVideoDevices: MediaDeviceInfo[] = [];
  meetAudioDevices: MediaDeviceInfo[] = [];

  // Panneau latéral
  meetParticipants: { id: string; displayName: string }[] = [];
  meetIsScreenSharing = false;
  meetIsFullscreen = false;
  meetPanelTab: 'chat' | 'participants' | 'info' = 'participants';
  meetChatMessages: { author: string; text: string; time: string }[] = [];
  meetChatInput = '';

  // APPEL ENTRANT
  showIncomingCall = false;
  incomingCallFrom = '';
  incomingCallRole = 'Stagiaire';
  incomingCallInitials = 'S';
  incomingCallUrl = '';
  private incomingCallTimeout: any = null;

  // Flags internes
  private pendingJitsiInit = false;
  private lastAutoJoinUrl: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private wsService: WebSocketService,
    private utilisateurService: UtilisateurService
  ) {}

  ngOnInit(): void {
    this.chatMessages = [...(this.stagiaire.messages || [])];

    if (this.stagiaire.stagiaireId) {
      this.loadChatHistory();
    }

    this.loadTravaux();
    this.chargerHeures();

    // ===== CHAT WEBSOCKET =====
    this.wsService.chat$.pipe(takeUntil(this.destroy$)).subscribe((msg) => {
      if (!msg) return;
      if (msg.expediteurId !== this.stagiaire.stagiaireId) return;

      this.chatMessages.push({
        id: Date.now(),
        auteur: msg.expediteurNom,
        contenu: msg.contenu,
        date: msg.date,
        isMoi: false
      });

      this.stagiaire.messages = this.chatMessages;
    });

    // ===== MEET WEBSOCKET =====
    this.wsService.meet$.pipe(takeUntil(this.destroy$)).subscribe((msg) => {
      if (!msg) return;
      if (msg.expediteurId !== this.stagiaire.stagiaireId) return;

      if (msg.type === 'MEET_START') {
        this.incomingCallFrom = msg.expediteurNom;
        this.incomingCallUrl = msg.contenu;
        this.incomingCallInitials = this.computeInitials(msg.expediteurNom);
        this.incomingCallRole = 'Stagiaire';
        this.showIncomingCall = true;

        if (this.incomingCallTimeout) clearTimeout(this.incomingCallTimeout);
        this.incomingCallTimeout = setTimeout(() => {
          if (this.showIncomingCall) this.refuserAppel();
        }, 45000);
      }

      if (msg.type === 'MEET_END') {
        console.log('📹 [DETAIL] Le stagiaire a quitté → fermeture auto');

        this.showIncomingCall = false;
        if (this.incomingCallTimeout) {
          clearTimeout(this.incomingCallTimeout);
          this.incomingCallTimeout = null;
        }

        this.activeTab = 'heures';
        this.meetActive = false;

        this.nettoyerMeet();
        if (this.meetTimer) {
          clearInterval(this.meetTimer);
          this.meetTimer = null;
        }

        alert(`📹 ${msg.expediteurNom} a quitté la visioconférence`);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['autoJoinMeetUrl'] && this.autoJoinMeetUrl) {
      console.log('🔵 [DETAIL] autoJoinMeetUrl détecté:', this.autoJoinMeetUrl);
      this.demarrerAppelEntrant(this.autoJoinMeetUrl);
    }
  }

  ngAfterViewChecked(): void {
    if (!this.pendingJitsiInit) return;

    const container = document.querySelector('#jitsi-container-enc') as HTMLElement;
    if (!container) return;

    const w = container.offsetWidth;
    const h = container.offsetHeight;

    if (w > 100 && h > 100) {
      console.log('✅ [DETAIL] DOM prêt → init Jitsi (' + w + 'x' + h + ')');
      this.pendingJitsiInit = false;
      setTimeout(() => this.initJitsi(), 100);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.nettoyerMeet();
    if (this.meetTimer) clearInterval(this.meetTimer);
    if (this.incomingCallTimeout) clearTimeout(this.incomingCallTimeout);
  }

  // =============================================
  // DÉMARRAGE AUTOMATIQUE DE LA VISIO
  // =============================================
  private demarrerAppelEntrant(meetUrl: string): void {
    if (this.lastAutoJoinUrl === meetUrl) return;
    this.lastAutoJoinUrl = meetUrl;

    console.log('🚀 [DETAIL] Démarrage automatique de la visio');

    this.meetUrl = meetUrl;
    this.meetRoomName = meetUrl.split('/').pop() || '';

    if (this.meetPreviewStream) {
      this.meetPreviewStream.getTracks().forEach(t => t.stop());
      this.meetPreviewStream = null;
    }

    this.meetActive = true;
    this.meetDuration = 0;
    this.myVideoOn = true;
    this.myMicOn = true;
    this.activeTab = 'meet';

    if (this.meetTimer) clearInterval(this.meetTimer);
    this.meetTimer = setInterval(() => this.meetDuration++, 1000);

    this.pendingJitsiInit = true;
    console.log('🔵 [DETAIL] pendingJitsiInit = true (attente DOM)');
  }

  // =============================================
  // HEURES
  // =============================================
  private chargerHeures(): void {
    this.utilisateurService.getHeuresTravaillees(this.stagiaire.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.heuresTravaillees = data.totalHeures || 0;
          this.heuresObjectif = data.objectif || 140;
          this.stagiaire.heuresTravaillees = this.heuresTravaillees;
          this.stagiaire.heuresObjectif = this.heuresObjectif;
        },
        error: (err) => console.error('❌ Erreur heures:', err)
      });
  }

  pointerHeures(): void {
    if (this.pointageEnCours) return;

    const heuresRestantes = this.heuresObjectif - this.heuresTravaillees;
    if (heuresRestantes <= 0) {
      alert('🎉 Objectif déjà atteint !');
      return;
    }

    const heuresAPointer = Math.min(8, heuresRestantes);
    if (!confirm(`Pointer ${heuresAPointer}h ?\n${this.heuresTravaillees}h / ${this.heuresObjectif}h actuellement`)) {
      return;
    }

    this.pointageEnCours = true;
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    this.utilisateurService.pointerHeures(
      this.stagiaire.id, heuresAPointer, currentUser.id, 'Pointage manuel'
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.pointageEnCours = false;
        this.heuresTravaillees = response.totalHeures || (this.heuresTravaillees + heuresAPointer);
        this.stagiaire.heuresTravaillees = this.heuresTravaillees;
      },
      error: (err) => {
        this.pointageEnCours = false;
        alert('❌ ' + (err.error?.message || 'Impossible de pointer'));
      }
    });
  }

  getPourcentageHeures(): number {
    if (!this.heuresObjectif || this.heuresObjectif === 0) return 0;
    return Math.min(100, Math.round((this.heuresTravaillees / this.heuresObjectif) * 100));
  }

  // =============================================
  // CHAT
  // =============================================
  private loadChatHistory(): void {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const encadrantId = currentUser?.id;
    if (!encadrantId || !this.stagiaire.stagiaireId) return;

    this.utilisateurService.getChatHistorique(encadrantId, this.stagiaire.stagiaireId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages: any[]) => {
          this.chatMessages = (messages || []).map(m => ({
            id: m.id,
            auteur: m.expediteur?.id === encadrantId
              ? this.adminName
              : `${m.expediteur?.prenom || ''} ${m.expediteur?.nom || ''}`.trim(),
            contenu: m.contenu,
            date: m.dateEnvoi,
            isMoi: m.expediteur?.id === encadrantId
          }));
          this.stagiaire.messages = this.chatMessages;
        }
      });
  }

  envoyerMessage(): void {
    if (!this.newMessage.trim()) return;
    const contenu = this.newMessage.trim();

    this.chatMessages.push({
      id: Date.now(),
      auteur: this.adminName,
      contenu,
      date: new Date().toISOString(),
      isMoi: true
    });

    this.wsService.envoyerMessage(this.stagiaire.stagiaireId, contenu, this.adminName);
    this.newMessage = '';
  }

  getTimeAgo(date: string): string {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (diff < 1) return 'À l\'instant';
    if (diff < 60) return `Il y a ${diff} min`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `Il y a ${h}h`;
    return `Il y a ${Math.floor(h / 24)}j`;
  }

  // =============================================
  // TRAVAUX
  // =============================================
  private loadTravaux(): void {
    this.loadingTravaux = true;
    this.utilisateurService.getLivrablesByCandidature(this.stagiaire.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any[]) => {
          this.travaux = (data || []).sort((a, b) => (b.version || 0) - (a.version || 0));
          this.loadingTravaux = false;
        },
        error: () => { this.loadingTravaux = false; }
      });
  }

  ouvrirRevision(livrable: LivrableReel): void {
    this.livrableEnRevision = livrable;
    this.commentaireRevision = livrable.commentaireEncadrant || '';
  }

  fermerRevision(): void {
    this.livrableEnRevision = null;
    this.commentaireRevision = '';
  }

  voirApercu(livrable: LivrableReel): void { this.apercuLivrable = livrable; }
  fermerApercu(): void { this.apercuLivrable = null; }

  envoyerRevision(statut: StatutLivrable): void {
    if (!this.livrableEnRevision) return;
    this.savingRevision = true;

    this.utilisateurService.reviserLivrable(this.livrableEnRevision.id, statut, this.commentaireRevision)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.savingRevision = false;
          this.fermerRevision();
          this.loadTravaux();
        },
        error: () => { this.savingRevision = false; }
      });
  }

  onFichierCorrectionSelected(event: any): void {
    const file = event.target.files[0];
    if (file) this.fichierSelectionne = file;
  }

  envoyerFichierCorrection(): void {
    if (!this.livrableEnRevision || !this.fichierSelectionne) return;
    this.uploadingFichier = true;

    const formData = new FormData();
    formData.append('fichier', this.fichierSelectionne);
    formData.append('commentaire', this.commentaireRevision || '');

    this.utilisateurService.uploaderFichierCorrection(this.livrableEnRevision.id, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.uploadingFichier = false;
          this.fichierSelectionne = null;
          this.fermerRevision();
          this.loadTravaux();
        },
        error: () => { this.uploadingFichier = false; }
      });
  }

  statutTravailLabel(statut: StatutLivrable): string {
    const map: Record<StatutLivrable, string> = {
      SOUMIS: 'Soumis', EN_REVISION: 'En révision',
      A_MODIFIER: 'Modification demandée', APPROUVE: 'Approuvé'
    };
    return map[statut] || statut;
  }

  statutTravailClass(statut: StatutLivrable): string {
    const map: Record<StatutLivrable, string> = {
      SOUMIS: 'statut-attente', EN_REVISION: 'statut-attente',
      A_MODIFIER: 'statut-rejete', APPROUVE: 'statut-valide'
    };
    return map[statut] || 'statut-attente';
  }

  telechargerTravail(l: LivrableReel): void {
    if (l.fichierUrl) window.open(l.fichierUrl, '_blank');
  }

  // =============================================
  // HELPERS
  // =============================================
  fermer(): void {
    this.arretMeet();
    this.close.emit();
  }

  setTab(tab: 'heures' | 'rapports' | 'chat' | 'meet'): void {
    this.activeTab = tab;
  }

  getNomComplet(): string {
    return `${this.stagiaire.prenom} ${this.stagiaire.nom}`.trim() || 'Stagiaire';
  }

  getInitiales(): string {
    const p = this.stagiaire.prenom?.charAt(0) || '';
    const n = this.stagiaire.nom?.charAt(0) || '';
    return `${p}${n}`.toUpperCase() || 'S';
  }

  // =============================================
  // MEET — Prévisualisation
  // =============================================
  async ouvrirApercuMeet(): Promise<void> {
    this.setTab('meet');
    this.meetRoomName = `talentis-stage-${this.stagiaire.id}`;
    this.meetUrl = `https://8x8.vc/${JAAS_APP_ID}/${this.meetRoomName}`;
    this.meetActive = false;
    this.meetPreviewLoading = true;
    this.meetPreviewError = '';

    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      this.meetVideoDevices = allDevices.filter(d => d.kind === 'videoinput');
      this.meetAudioDevices = allDevices.filter(d => d.kind === 'audioinput');
      await this.refreshPreviewStream();
      this.meetPreviewLoading = false;
    } catch (err: any) {
      this.meetPreviewError = 'Impossible d\'accéder à la caméra/micro.';
      this.meetPreviewLoading = false;
    }
  }

  private async refreshPreviewStream(): Promise<void> {
    if (this.meetPreviewStream) {
      this.meetPreviewStream.getTracks().forEach(t => t.stop());
      this.meetPreviewStream = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: this.meetDeviceSelection.videoEnabled
          ? { deviceId: this.meetDeviceSelection.videoDeviceId || undefined }
          : false,
        audio: this.meetDeviceSelection.audioEnabled
          ? { deviceId: this.meetDeviceSelection.audioDeviceId || undefined }
          : false
      });
      this.meetPreviewStream = stream;

      setTimeout(() => {
        const videoEl = document.querySelector('#meet-preview-video') as HTMLVideoElement;
        if (videoEl) {
          videoEl.srcObject = stream;
          videoEl.muted = true;
          videoEl.play().catch(() => {});
        }
      }, 50);
    } catch (err) {
      console.error('Erreur preview:', err);
    }
  }

  async togglePreviewVideo(): Promise<void> {
    this.meetDeviceSelection.videoEnabled = !this.meetDeviceSelection.videoEnabled;
    await this.refreshPreviewStream();
  }

  async togglePreviewAudio(): Promise<void> {
    this.meetDeviceSelection.audioEnabled = !this.meetDeviceSelection.audioEnabled;
    await this.refreshPreviewStream();
  }

  async changerCamera(event: any): Promise<void> {
    this.meetDeviceSelection.videoDeviceId = event.target.value;
    await this.refreshPreviewStream();
  }

  async changerMicro(event: any): Promise<void> {
    this.meetDeviceSelection.audioDeviceId = event.target.value;
    await this.refreshPreviewStream();
  }

  // =============================================
  // MEET — Rejoindre manuellement
  // =============================================
  rejoindreMeet(): void {
    console.log('🔵 [DETAIL] rejoindreMeet()');
    if (this.meetPreviewStream) {
      this.meetPreviewStream.getTracks().forEach(t => t.stop());
      this.meetPreviewStream = null;
    }

    this.meetActive = true;
    this.meetDuration = 0;
    this.myVideoOn = this.meetDeviceSelection.videoEnabled;
    this.myMicOn = this.meetDeviceSelection.audioEnabled;

    if (this.meetTimer) clearInterval(this.meetTimer);
    this.meetTimer = setInterval(() => this.meetDuration++, 1000);

    // 🔧 NOUVEAU : on utilise pendingJitsiInit + ngAfterViewChecked (au lieu de setTimeout)
    this.pendingJitsiInit = true;

    // Notifier le stagiaire
    if (this.stagiaire?.stagiaireId) {
      this.wsService.demarrerMeet(this.stagiaire.stagiaireId, this.adminName, this.meetUrl);
    }
  }

    // =============================================
  // INIT JITSI AVEC JaaS (sans erreurs Amplitude)
  // =============================================
  private initJitsi(): void {
    console.log('🔵 [JITSI ENC] initJitsi()');

    if (typeof JitsiMeetExternalAPI === 'undefined') {
      console.error('❌ [JITSI ENC] JitsiMeetExternalAPI UNDEFINED');
      alert('Jitsi n\'est pas chargé. Rechargez la page.');
      return;
    }

    if (this.jitsiApi) {
      try { this.jitsiApi.dispose(); } catch {}
      this.jitsiApi = null;
    }

    const container = document.querySelector('#jitsi-container-enc') as HTMLElement;
    if (!container) {
      setTimeout(() => this.initJitsi(), 300);
      return;
    }

    const w = container.offsetWidth;
    const h = container.offsetHeight;

    if (w < 100 || h < 100) {
      setTimeout(() => this.initJitsi(), 300);
      return;
    }

    console.log(`✅ [JITSI ENC] Conteneur prêt (${w}x${h})`);

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // 1️⃣ Récupérer le token JWT du backend
    this.utilisateurService.getJitsiToken({
      userId: String(currentUser?.id || 'enc-' + Date.now()),
      userName: this.adminName,
      userEmail: currentUser?.email || '',
      isModerator: true
    }).subscribe({
      next: (response: any) => {
        const token = response.token;
        console.log('✅ [JITSI ENC] Token JWT reçu');

        // 2️⃣ Créer l'instance avec le JWT
        const options = {
          roomName: `${JAAS_APP_ID}/${this.meetRoomName}`,
          jwt: token,
          width: w,
          height: h,
          parentNode: container,
          userInfo: {
            displayName: this.adminName,
            email: currentUser?.email || ''
          },
          configOverwrite: {
            prejoinPageEnabled: false,
            prejoinConfig: { enabled: false },
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true,
            enableWelcomePage: false,
            requireDisplayName: false,

            // 🆕 DÉSACTIVER AMPLITUDE (fait disparaître les erreurs rouges)
            analytics: {
              disabled: true
            },
            disableStats: true,
            disableThirdPartyRequests: true,

            toolbarButtons: [
              'microphone', 'camera', 'desktop', 'fullscreen',
              'hangup', 'chat', 'raisehand', 'participants-pane',
              'tileview', 'settings', 'select-background', 'stats', 'shortcuts'
            ],
            notifications: [],
            fileRecordingsEnabled: false,
            liveStreamingEnabled: false,
            defaultLanguage: 'fr'
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_POWERED_BY: false,
            MOBILE_APP_PROMO: false,
            DEFAULT_BACKGROUND: '#1a1a2e',
            TOOLBAR_ALWAYS_VISIBLE: true
          }
        };

        try {
          this.jitsiApi = new JitsiMeetExternalAPI(this.jitsiDomain, options);
          console.log('✅ [JITSI ENC] Instance créée');

          this.jitsiApi.addEventListener('videoConferenceJoined', () => {
            console.log('✅✅✅ [JITSI ENC] CONFÉRENCE REJOINTE');
          });

          this.jitsiApi.addEventListener('participantJoined', (p: any) => {
            this.meetParticipants.push({ id: p.id, displayName: p.displayName });
          });

          this.jitsiApi.addEventListener('participantLeft', (p: any) => {
            this.meetParticipants = this.meetParticipants.filter(x => x.id !== p.id);
          });

          this.jitsiApi.addEventListener('screenSharingStatusChanged', (data: any) => {
            this.meetIsScreenSharing = data.on;
          });

          this.jitsiApi.addEventListener('incomingMessage', (msg: any) => {
            this.meetChatMessages.push({
              author: msg.nick || 'Participant',
              text: msg.message,
              time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            });
          });

          this.jitsiApi.addEventListener('videoConferenceLeft', () => {
            console.log('📹 [JITSI ENC] Conférence quittée');
            this.arretMeet();
          });

        } catch (error) {
          console.error('❌ [JITSI ENC] Erreur création:', error);
        }
      },
      error: (err) => {
        console.error('❌ [JITSI ENC] Erreur token:', err);
      }
    });
  }
  // Contrôles
  toggleVideo(): void {
    this.myVideoOn = !this.myVideoOn;
    if (this.jitsiApi) this.jitsiApi.executeCommand('toggleVideo');
  }

  toggleMic(): void {
    this.myMicOn = !this.myMicOn;
    if (this.jitsiApi) this.jitsiApi.executeCommand('toggleAudio');
  }

  toggleScreenShare(): void {
    if (this.jitsiApi) this.jitsiApi.executeCommand('toggleShareScreen');
  }

  toggleTileView(): void {
    if (this.jitsiApi) this.jitsiApi.executeCommand('toggleTileView');
  }

  async toggleFullscreen(): Promise<void> {
    const wrapper = document.querySelector('.meet-active-wrapper') as HTMLElement;
    if (!wrapper) return;
    if (!document.fullscreenElement) {
      await wrapper.requestFullscreen();
      this.meetIsFullscreen = true;
    } else {
      await document.exitFullscreen();
      this.meetIsFullscreen = false;
    }
  }

  envoyerMeetChat(): void {
    if (!this.meetChatInput.trim() || !this.jitsiApi) return;
    this.jitsiApi.executeCommand('sendChatMessage', this.meetChatInput.trim());
    this.meetChatInput = '';
  }

@HostListener('window:resize')
onResize(): void {
  if (!this.jitsiApi || typeof this.jitsiApi.resize !== 'function') return;
  const container = document.querySelector('#jitsi-container-enc') as HTMLElement;
  if (container) {
    try {
      this.jitsiApi.resize(container.offsetWidth || 900, container.offsetHeight || 500);
    } catch (e) { /* ignore */ }
  }
}

  arretMeet(): void {
    console.log('📹 [DETAIL] Arrêt MANUEL');

    this.nettoyerMeet();

    if (this.meetTimer) {
      clearInterval(this.meetTimer);
      this.meetTimer = null;
    }

    this.meetActive = false;
    this.meetIsScreenSharing = false;
    this.meetParticipants = [];
    this.meetChatMessages = [];
    this.meetDuration = 0;
    this.pendingJitsiInit = false;

    this.activeTab = 'heures';

    if (this.stagiaire) {
      this.wsService.arreterMeet(this.stagiaire.stagiaireId, this.adminName);
    }

    this.incomingCallUrl = '';
    this.meetUrl = '';
    this.meetRoomName = '';
  }

  private nettoyerMeet(): void {
    if (this.meetPreviewStream) {
      this.meetPreviewStream.getTracks().forEach(t => t.stop());
      this.meetPreviewStream = null;
    }
    if (this.jitsiApi) {
      try { this.jitsiApi.executeCommand('hangup'); } catch {}
      try { this.jitsiApi.dispose(); } catch {}
      this.jitsiApi = null;
    }
  }

  copierLien(): void {
    navigator.clipboard.writeText(this.meetUrl);
    alert('🔗 Lien copié !');
  }

  getMeetTime(): string {
    const min = Math.floor(this.meetDuration / 60);
    const sec = this.meetDuration % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  // =============================================
  // APPEL ENTRANT
  // =============================================
  accepterAppel(): void {
    console.log('✅ [DETAIL] accepterAppel');

    this.showIncomingCall = false;
    if (this.incomingCallTimeout) {
      clearTimeout(this.incomingCallTimeout);
      this.incomingCallTimeout = null;
    }

    this.demarrerAppelEntrant(this.incomingCallUrl);
  }

  refuserAppel(): void {
    console.log('❌ [DETAIL] refuserAppel');
    this.showIncomingCall = false;
    if (this.incomingCallTimeout) {
      clearTimeout(this.incomingCallTimeout);
      this.incomingCallTimeout = null;
    }
  }

  private computeInitials(name: string): string {
    if (!name) return 'S';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }
}