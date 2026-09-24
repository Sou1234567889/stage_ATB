import { Component, OnDestroy, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UtilisateurService } from '../../services/utilisateur.service';
import { OffreService } from '../../services/offre.service';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { WebSocketService, ChatMessage as WsChatMessage } from '../../services/websocket.service';

// ✅ JAAS_APP_ID HORS DE LA CLASSE
const JAAS_APP_ID = 'vpaas-magic-cookie-8fbadb6a92694bd2983e200fbc8be6a2';

declare var JitsiMeetExternalAPI: any;

export interface Message {
  id: number;
  auteur: string;
  contenu: string;
  date: string;
  isMoi: boolean;
}

@Component({
  selector: 'app-dashboard-stagiere',
  templateUrl: './dashboard-stagiere.component.html',
  styleUrls: ['./dashboard-stagiere.component.css']
})
export class DashboardStagiereComponent implements OnInit, OnDestroy {

  // ===== TOAST =====
  toastMessage = '';
  toastType: 'success' | 'error' | 'warning' | 'info' = 'info';
  showToast = false;
  toastTimeout: any;

  // ===== USER =====
  stagiereName = 'Stagiaire';
  currentUser: any = null;
  private currentUserId: number | null = null;

  // ===== FOOTER =====
  currentYear = new Date().getFullYear();

  // ===== NOTIFICATIONS =====
  notificationCount = 0;
  showNotifPanel = false;
  notifications: AppNotification[] = [];
  unreadNotifications: AppNotification[] = [];

  // ===== NAV =====
  activeSection: 'accueil' | 'livrables' | 'offres' | 'profil' | 'aide' = 'accueil';

  // ===== DATA =====
  candidature: any = null;
  livrables: any[] = [];
  encadrant: any = null;

  loadingCandidature = true;
  loadingLivrables = false;
  errorMessage = '';

  // ===== LIVRABLE MODAL =====
  showLivrableModal = false;
  savingLivrable = false;
  livrableForm = { titre: '', description: '', lienFichier: '' };
  livrableError = '';

  // ===== OFFRES =====
  offres: any[] = [];
  loadingOffres = false;

  // ===== POSTULER MODAL =====
  showPostulerModal = false;
  selectedOffre: any = null;
  cvFile: File | null = null;
  demandeStageFile: File | null = null;
  submittingPostuler = false;
  postulerError = '';
  postulerSuccess = '';

  postulerForm = {
    lettreMotivation: '',
    telephone: '',
    niveauEtude: '',
    universite: ''
  };

  // ===== CHAT =====
  showChatPanel = false;
  newMessage = '';
  chatMessages: Message[] = [];

  // ===== MEET =====
  showMeetPanel = false;
  meetActive = false;
  meetDuration = 0;
  meetTimer: any;
  meetUrl = '';
  meetRoomName = '';
  jitsiApi: any = null;
  jitsiDomain = '8x8.vc';

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

  myVideoOn = true;
  myMicOn = true;
  meetParticipants: { id: string; displayName: string }[] = [];
  meetIsScreenSharing = false;
  meetIsFullscreen = false;
  meetPanelTab: 'chat' | 'participants' | 'info' = 'participants';
  meetChatMessages: { author: string; text: string; time: string }[] = [];
  meetChatInput = '';

  // ===== APPEL ENTRANT =====
  showIncomingCall = false;
  incomingCallFrom = '';
  incomingCallRole = 'Encadrant';
  incomingCallInitials = 'E';
  incomingCallUrl = '';
  private incomingCallTimeout: any = null;

  appelEnCours = false;

  // ===== HEURES =====
  heuresTravaillees = 40;
  heuresObjectif = 140;

  private destroy$ = new Subject<void>();

  constructor(
    private utilisateurService: UtilisateurService,
    private offreService: OffreService,
    private router: Router,
    public notifService: NotificationService,
    private wsService: WebSocketService
  ) {}

  ngOnInit(): void {
    console.log('🟢 [STAG] ngOnInit');

    this.utilisateurService.user$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.currentUserId = user.id;
        this.stagiereName = [user.prenom, user.nom].filter(Boolean).join(' ') || user.email || 'Stagiaire';
        this.wsService.connect(user.id);
        this.notifService.chargerDepuisBackend(user.id);
        this.loadMyCandidature(user.id);
      }
    });

    this.notifService.notifications$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.notifications = this.notifService.getForRole('STAGIAIRE');
      this.unreadNotifications = this.notifService.getUnreadForRole('STAGIAIRE');
      this.notificationCount = this.notifService.getUnreadCountForRole('STAGIAIRE');
    });

    this.notifService.notificationAction$.pipe(takeUntil(this.destroy$)).subscribe(action => {
      if (action) this.showToastMessage(action.message, action.type, action.duration);
    });

    this.wsService.chat$.pipe(takeUntil(this.destroy$)).subscribe((msg) => {
      if (!msg) return;
      if (msg.expediteurId === this.currentUserId) return;

      this.chatMessages.push({
        id: Date.now(),
        auteur: msg.expediteurNom,
        contenu: msg.contenu,
        date: msg.date,
        isMoi: false
      });

      if (!this.showChatPanel) {
        this.showToastMessage(`💬 Nouveau message de ${msg.expediteurNom}`, 'info');
      }
    });

    this.wsService.meet$.pipe(takeUntil(this.destroy$)).subscribe((msg) => {
      console.log('📩 [STAG] meet$ reçu:', msg);
      if (!msg) return;
      if (msg.expediteurId === this.currentUserId) return;

      if (msg.type === 'MEET_START') {
        this.incomingCallFrom = msg.expediteurNom;
        this.incomingCallUrl = msg.contenu;
        this.incomingCallInitials = this.computeInitials(msg.expediteurNom);
        this.incomingCallRole = 'Encadrant';
        this.showIncomingCall = true;

        if (this.incomingCallTimeout) clearTimeout(this.incomingCallTimeout);
        this.incomingCallTimeout = setTimeout(() => {
          if (this.showIncomingCall) this.refuserAppel();
        }, 45000);

        this.showToastMessage(`📹 Appel vidéo de ${msg.expediteurNom}`, 'info', 5000);
      }

      if (msg.type === 'MEET_END') {
        console.log('📹 [STAG] L\'encadrant a quitté → fermeture auto');

        this.showIncomingCall = false;
        if (this.incomingCallTimeout) {
          clearTimeout(this.incomingCallTimeout);
          this.incomingCallTimeout = null;
        }

        this.showToastMessage(`📹 ${msg.expediteurNom} a quitté la visioconférence`, 'info', 4000);
        this.fermerMeetAutomatiquement();
      }
    });

    this.loadOffres();
  }

  getTimeAgo(date: Date | string): string {
    const now = new Date();
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!d || isNaN(d.getTime())) return 'Date inconnue';
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diff < 1) return 'À l\'instant';
    if (diff < 60) return `Il y a ${diff} min`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `Il y a ${h}h`;
    const j = Math.floor(h / 24);
    if (j === 1) return 'Hier';
    return `Il y a ${j}j`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.nettoyerMeet();
    this.wsService.disconnect();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    if (this.meetTimer) clearInterval(this.meetTimer);
    if (this.incomingCallTimeout) clearTimeout(this.incomingCallTimeout);
  }

  // =============================================
  // APPELER L'ENCADRANT
  // =============================================
  appelerEncadrant(): void {
    console.log('📞 [STAG] appelerEncadrant()');

    if (!this.encadrant?.id) {
      this.showToastMessage('❌ Aucun encadrant affecté à votre stage', 'error', 4000);
      return;
    }

    if (this.meetActive || this.appelEnCours) {
      this.showToastMessage('⚠️ Un appel est déjà en cours', 'warning', 3000);
      return;
    }

    console.log('📞 [STAG] Appel vers:', this.encadrant.prenom, this.encadrant.nom);

    this.appelEnCours = true;
    this.showChatPanel = false;
    this.showMeetPanel = true;
    this.showNotifPanel = false;

    // ✅ URL avec JaaS_APP_ID
    this.meetRoomName = `talentis-stage-${this.candidature?.id || 'demo'}`;
    this.meetUrl = `https://8x8.vc/${JAAS_APP_ID}/${this.meetRoomName}`;

    try {
      this.wsService.demarrerMeet(this.encadrant.id, this.stagiereName, this.meetUrl);
      console.log('✅ [STAG] Signal MEET_START envoyé');
      this.showToastMessage(`📞 Appel en cours vers ${this.encadrant.prenom}...`, 'info', 4000);
    } catch (e) {
      console.error('❌ [STAG] Erreur envoi WS:', e);
      this.showToastMessage('❌ Impossible d\'envoyer l\'appel', 'error');
      this.appelEnCours = false;
      return;
    }

    this.ouvrirApercuMeet();

    setTimeout(() => {
      if (this.appelEnCours && !this.meetActive) {
        console.log('⏱️ [STAG] Délai écoulé → rejoindre automatiquement');
        this.rejoindreMeet();
      }
    }, 2000);
  }

  // =============================================
  // FERMETURE AUTOMATIQUE
  // =============================================
  private fermerMeetAutomatiquement(): void {
    console.log('🔴 [STAG] Fermeture auto de la visio');
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
    this.showMeetPanel = false;
    this.appelEnCours = false;

    this.incomingCallUrl = '';
    this.meetUrl = '';
    this.meetRoomName = '';
  }

  // =============================================
  // CHARGEMENT
  // =============================================
  private loadMyCandidature(userId: number): void {
    this.loadingCandidature = true;
    this.utilisateurService.getCandidaturesByCandidat(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any[]) => {
          const accepted = (data || []).find(c => c.statut === 'ACCEPTE');
          this.candidature = accepted || (data && data.length > 0 ? data[0] : null);
          this.loadingCandidature = false;

          if (this.candidature) {
            this.encadrant = this.candidature.encadrant || null;
            console.log('✅ [STAG] Encadrant chargé:', this.encadrant);
            this.loadMyLivrables(this.candidature.id);

            if (this.encadrant?.id && this.currentUserId) {
              this.loadChatHistory(this.currentUserId, this.encadrant.id);
            }
          }
        },
        error: () => {
          this.loadingCandidature = false;
          this.errorMessage = 'Impossible de charger vos données.';
        }
      });
  }

  private loadChatHistory(userId1: number, userId2: number): void {
    this.utilisateurService.getChatHistorique(userId1, userId2)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages: any[]) => {
          this.chatMessages = (messages || []).map(m => ({
            id: m.id,
            auteur: m.expediteur?.id === userId1 ? 'Moi'
              : `${m.expediteur?.prenom || ''} ${m.expediteur?.nom || ''}`.trim(),
            contenu: m.contenu,
            date: m.dateEnvoi,
            isMoi: m.expediteur?.id === userId1
          }));
        }
      });
  }

  private loadMyLivrables(candidatureId: number): void {
    this.loadingLivrables = true;
    this.utilisateurService.getLivrablesByCandidature(candidatureId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any[]) => {
          this.livrables = data || [];
          this.loadingLivrables = false;
        },
        error: () => { this.loadingLivrables = false; }
      });
  }

  private loadOffres(): void {
    this.loadingOffres = true;
    this.offreService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any[]) => {
          this.offres = (data || []).filter(o => o.statut === 'OUVERTE' && o.type === 'STAGE');
          this.loadingOffres = false;
        },
        error: () => { this.loadingOffres = false; }
      });
  }

  // =============================================
  // STATS
  // =============================================
  get aUnStageActif(): boolean {
    return !!this.candidature && (this.candidature.statut === 'ACCEPTE' || this.candidature.statut === 'EN_COURS');
  }

  get stageActifTitre(): string {
    return this.candidature?.offre?.titre || 'votre stage actuel';
  }

  get totalLivrables(): number { return this.livrables.length; }
  get livrablesSoumis(): number { return this.livrables.filter(l => l.statut === 'SOUMIS').length; }
  get livrablesApprouves(): number { return this.livrables.filter(l => l.statut === 'APPROUVE').length; }
  get livrablesAReviser(): number { return this.livrables.filter(l => l.statut === 'A_MODIFIER' || l.statut === 'EN_REVISION').length; }

  get progressionPct(): number {
    if (this.heuresObjectif === 0) return 0;
    return Math.min(100, Math.round((this.heuresTravaillees / this.heuresObjectif) * 100));
  }

  // =============================================
  // NAVIGATION
  // =============================================
  setSection(section: 'accueil' | 'livrables' | 'offres' | 'profil' | 'aide'): void {
    this.activeSection = section;
    this.showNotifPanel = false;
  }

  // =============================================
  // POSTULER
  // =============================================
  ouvrirPostulerModal(offre: any): void {
    if (this.aUnStageActif) {
      this.showToastMessage(`Vous avez déjà un stage actif.`, 'warning', 5000);
      return;
    }
    this.selectedOffre = offre;
    this.showPostulerModal = true;
    this.cvFile = null;
    this.demandeStageFile = null;
    this.postulerError = '';
    this.postulerSuccess = '';
    this.postulerForm = {
      lettreMotivation: '',
      telephone: this.currentUser?.telephone || '',
      niveauEtude: '',
      universite: ''
    };
  }

  fermerPostulerModal(): void {
    this.showPostulerModal = false;
    this.selectedOffre = null;
  }

  onCvChange(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.cvFile = file;
      this.postulerError = '';
    } else {
      this.postulerError = 'Le CV doit être au format PDF';
      this.cvFile = null;
    }
  }

  onDemandeStageChange(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.demandeStageFile = file;
      this.postulerError = '';
    } else {
      this.postulerError = 'La demande de stage doit être au format PDF';
      this.demandeStageFile = null;
    }
  }

  postuler(): void {
    if (!this.postulerForm.lettreMotivation || !this.postulerForm.telephone ||
        !this.postulerForm.niveauEtude || !this.postulerForm.universite) {
      this.postulerError = 'Veuillez remplir tous les champs obligatoires';
      return;
    }
    if (!this.cvFile) { this.postulerError = 'Veuillez joindre votre CV (PDF)'; return; }
    if (!this.demandeStageFile) { this.postulerError = 'Veuillez joindre votre demande de stage (PDF)'; return; }
    if (!this.selectedOffre) { this.postulerError = 'Aucune offre sélectionnée'; return; }

    this.submittingPostuler = true;
    this.postulerError = '';

    const formData = new FormData();
    formData.append('offreId', String(this.selectedOffre.id));
    formData.append('lettreMotivation', this.postulerForm.lettreMotivation);
    formData.append('telephone', this.postulerForm.telephone);
    formData.append('niveauEtude', this.postulerForm.niveauEtude);
    formData.append('universite', this.postulerForm.universite);
    formData.append('cv', this.cvFile);
    formData.append('demandeStage', this.demandeStageFile);
    if (this.currentUserId) formData.append('candidatId', String(this.currentUserId));

    this.utilisateurService.postulerOffre(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.submittingPostuler = false;
          this.postulerSuccess = '✅ Candidature effectuée avec succès / envoyée !';
          this.showToastMessage('✅ Candidature effectuée avec succès / envoyée !', 'success', 4000);
          setTimeout(() => {
            this.fermerPostulerModal();
            this.postulerSuccess = '';
            this.setSection('accueil');
            if (this.currentUserId) this.loadMyCandidature(this.currentUserId);
          }, 2000);
        },
        error: (err: any) => {
          this.submittingPostuler = false;
          this.postulerError = err?.error?.message || 'Erreur lors de l\'envoi';
        }
      });
  }

  // =============================================
  // LIVRABLES
  // =============================================
  openLivrableModal(): void {
    this.livrableForm = { titre: '', description: '', lienFichier: '' };
    this.livrableError = '';
    this.showLivrableModal = true;
  }

  closeLivrableModal(): void { this.showLivrableModal = false; }

  submitLivrable(): void {
    if (!this.livrableForm.titre || !this.livrableForm.description) {
      this.livrableError = 'Le titre et la description sont obligatoires.';
      return;
    }
    if (!this.candidature) { this.livrableError = 'Aucune candidature.'; return; }

    this.savingLivrable = true;
    const payload = {
      titre: this.livrableForm.titre,
      description: this.livrableForm.description,
      lienFichier: this.livrableForm.lienFichier || null,
      candidatureId: this.candidature.id
    };

    this.utilisateurService.soumettreLivrable(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.savingLivrable = false;
          this.showLivrableModal = false;
          this.showToastMessage('✅ Livrable soumis', 'success');
          this.loadMyLivrables(this.candidature.id);
        },
        error: (err: any) => {
          this.savingLivrable = false;
          this.livrableError = err?.error?.message || 'Erreur';
        }
      });
  }

  statutLabel(statut: string): string {
    const map: Record<string, string> = {
      SOUMIS: 'Soumis', EN_REVISION: 'En révision',
      A_MODIFIER: 'À modifier', APPROUVE: 'Approuvé'
    };
    return map[statut] || statut;
  }

  statutClass(statut: string): string {
    const map: Record<string, string> = {
      SOUMIS: 'badge-wait', EN_REVISION: 'badge-rev',
      A_MODIFIER: 'badge-ko', APPROUVE: 'badge-ok'
    };
    return map[statut] || 'badge-wait';
  }

  // =============================================
  // CHAT
  // =============================================
  toggleChatPanel(): void {
    this.showChatPanel = !this.showChatPanel;
    if (this.showChatPanel) this.showMeetPanel = false;
  }

  envoyerMessage(): void {
    if (!this.newMessage.trim()) return;
    const contenu = this.newMessage.trim();
    this.chatMessages.push({
      id: Date.now(), auteur: 'Moi', contenu,
      date: new Date().toISOString(), isMoi: true
    });
    if (this.encadrant && this.encadrant.id) {
      this.wsService.envoyerMessage(this.encadrant.id, contenu, this.stagiereName);
    }
    this.newMessage = '';
  }

  // =============================================
  // BOOK PFE
  // =============================================
  telechargerBookPfe(): void {
    this.utilisateurService.getBookPfe().subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `book-pfe-${new Date().getFullYear()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.showToastMessage('✅ Book PFE téléchargé', 'success');
      },
      error: (err) => {
        console.error('Erreur Book PFE:', err);
        this.showToastMessage('❌ Impossible de générer le Book PFE', 'error');
      }
    });
  }

  // =============================================
  // MEET
  // =============================================
  toggleMeetPanel(): void {
    this.showMeetPanel = !this.showMeetPanel;
    if (this.showMeetPanel) {
      this.showChatPanel = false;
      this.ouvrirApercuMeet();
    } else {
      if (!this.meetActive) this.nettoyerMeet();
    }
  }

  async ouvrirApercuMeet(): Promise<void> {
    this.meetRoomName = `talentis-stage-${this.candidature?.id || 'demo'}`;
    // ✅ URL JaaS
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
    } catch (err) {
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
        const videoEl = document.querySelector('#meet-preview-video-stag') as HTMLVideoElement;
        if (videoEl) {
          videoEl.srcObject = stream;
          videoEl.muted = true;
          videoEl.play().catch(() => {});
        }
      }, 50);
    } catch (err) {
      console.error('❌ preview:', err);
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

  rejoindreMeet(): void {
    console.log('🔵 [STAG] rejoindreMeet()');

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

    setTimeout(() => this.initJitsi(), 500);
  }

   // =============================================
  // INIT JITSI AVEC JaaS (sans erreurs Amplitude)
  // =============================================
  private initJitsi(): void {
    console.log('🔵 [JITSI STAG] initJitsi()');

    if (typeof JitsiMeetExternalAPI === 'undefined') {
      console.error('❌ [JITSI STAG] JitsiMeetExternalAPI UNDEFINED');
      this.showToastMessage('Jitsi n\'est pas chargé. Rechargez la page.', 'error', 5000);
      return;
    }

    if (this.jitsiApi) {
      try { this.jitsiApi.dispose(); } catch {}
      this.jitsiApi = null;
    }

    const container = document.querySelector('#jitsi-container-stag') as HTMLElement;
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

    console.log(`✅ [JITSI STAG] Conteneur prêt (${w}x${h})`);

    // 1️⃣ Récupérer le token JWT du backend
    this.utilisateurService.getJitsiToken({
      userId: String(this.currentUserId || 'stag-' + Date.now()),
      userName: this.stagiereName,
      userEmail: this.currentUser?.email || '',
      isModerator: true
    }).subscribe({
      next: (response: any) => {
        const token = response.token;
        console.log('✅ [JITSI STAG] Token JWT reçu');

        // 2️⃣ Créer l'instance avec le JWT
        const options = {
          roomName: `${JAAS_APP_ID}/${this.meetRoomName}`,
          jwt: token,
          width: w,
          height: h,
          parentNode: container,
          userInfo: {
            displayName: this.stagiereName,
            email: this.currentUser?.email || ''
          },
          configOverwrite: {
            prejoinPageEnabled: false,
            prejoinConfig: { enabled: false },
            startWithAudioMuted: !this.meetDeviceSelection.audioEnabled,
            startWithVideoMuted: !this.meetDeviceSelection.videoEnabled,
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
          console.log('✅ [JITSI STAG] Instance créée');

          this.jitsiApi.addEventListener('videoConferenceJoined', () => {
            console.log('✅✅✅ [JITSI STAG] CONFÉRENCE REJOINTE');
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
            console.log('📹 [JITSI STAG] Conférence quittée');
            this.arretMeet();
          });

        } catch (error) {
          console.error('❌ [JITSI STAG] Erreur création:', error);
        }
      },
      error: (err) => {
        console.error('❌ [JITSI STAG] Erreur token:', err);
        this.showToastMessage('Impossible de récupérer le token Jitsi', 'error');
      }
    });
  }

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
    const wrapper = document.querySelector('.meet-active-wrapper-stag') as HTMLElement;
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
    const container = document.querySelector('#jitsi-container-stag') as HTMLElement;
    if (container) {
      try {
        this.jitsiApi.resize(container.offsetWidth || 900, container.offsetHeight || 500);
      } catch (e) { /* ignore */ }
    }
  }

  arretMeet(): void {
    console.log('📹 [STAG] Arrêt MANUEL');
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
    this.showMeetPanel = false;
    this.appelEnCours = false;

    if (this.encadrant?.id) {
      this.wsService.arreterMeet(this.encadrant.id, this.stagiereName);
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

  getMeetTime(): string {
    const min = Math.floor(this.meetDuration / 60);
    const sec = this.meetDuration % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  copierLien(): void {
    navigator.clipboard.writeText(this.meetUrl);
    this.showToastMessage('🔗 Lien copié !', 'success');
  }

  // =============================================
  // APPEL ENTRANT
  // =============================================
  accepterAppel(): void {
    console.log('✅ [STAG] accepterAppel');

    this.showIncomingCall = false;
    if (this.incomingCallTimeout) {
      clearTimeout(this.incomingCallTimeout);
      this.incomingCallTimeout = null;
    }

    this.meetUrl = this.incomingCallUrl;
    this.meetRoomName = this.incomingCallUrl.split('/').pop() || '';

    if (this.meetPreviewStream) {
      this.meetPreviewStream.getTracks().forEach(t => t.stop());
      this.meetPreviewStream = null;
    }

    this.showMeetPanel = true;
    this.showChatPanel = false;
    this.meetActive = true;
    this.meetDuration = 0;
    this.myVideoOn = true;
    this.myMicOn = true;

    if (this.meetTimer) clearInterval(this.meetTimer);
    this.meetTimer = setInterval(() => this.meetDuration++, 1000);

    setTimeout(() => this.initJitsi(), 800);

    this.incomingCallUrl = '';
  }

  refuserAppel(): void {
    this.showIncomingCall = false;
    if (this.incomingCallTimeout) {
      clearTimeout(this.incomingCallTimeout);
      this.incomingCallTimeout = null;
    }
    if (this.encadrant?.id) {
      this.wsService.arreterMeet(this.encadrant.id, this.stagiereName);
    }
    this.showToastMessage('📞 Appel refusé', 'warning', 2500);
  }

  private computeInitials(name: string): string {
    if (!name) return 'E';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  // =============================================
  // NOTIFICATIONS
  // =============================================
  toggleNotifPanel(): void { this.showNotifPanel = !this.showNotifPanel; }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-wrapper')) this.showNotifPanel = false;
  }

  onNotifClick(notif: AppNotification): void {
    this.notifService.markAsRead(notif.id);
    if (notif.lien) {
      this.router.navigateByUrl(notif.lien);
      this.showNotifPanel = false;
    }
  }

  markAllAsRead(): void {
    this.notifService.markAllAsReadForRole('STAGIAIRE');
    this.showNotifPanel = false;
  }

  getNotifTypeClass(type: string): string {
    const classes: { [key: string]: string } = {
      'auth': 'type-auth', 'offre': 'type-offre', 'candidature': 'type-candidature',
      'entretien': 'type-entretien', 'evaluation': 'type-evaluation',
      'livrable': 'type-livrable', 'document': 'type-document',
      'message': 'type-message', 'convention': 'type-convention',
      'APPEL': 'type-appel', 'MESSAGE': 'type-message',
      'DISPONIBILITE': 'type-dispo', 'AFFECTATION': 'type-affectation',
      'autre': 'type-default'
    };
    return classes[type] || 'type-default';
  }

  getNotifIcon(type: string): string {
    const icons: Record<string, string> = {
      'APPEL': '📹', 'MESSAGE': '💬', 'DISPONIBILITE': '🟢',
      'AFFECTATION': '🎓', 'CANDIDATURE': '📋', 'LIVRABLE': '📄',
      'auth': '🔐', 'offre': '💼', 'entretien': '📅',
      'evaluation': '⭐', 'document': '📎', 'convention': '📝',
      'autre': '🔔'
    };
    return icons[type] || '🔔';
  }

  getNotificationTimeAgo(date: Date | string): string {
    const now = new Date();
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!dateObj || isNaN(dateObj.getTime())) return 'Date inconnue';
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return 'À l\'instant';
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffHour < 24) return `Il y a ${diffHour}h`;
    if (diffDay === 1) return 'Hier';
    return `Il y a ${diffDay}j`;
  }

  // =============================================
  // TOAST
  // =============================================
  showToastMessage(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 3000): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => { this.showToast = false; }, duration);
  }

  closeToast(): void {
    this.showToast = false;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  getToastIcon(): string {
    const icons: Record<string, string> = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    return icons[this.toastType] || 'ℹ️';
  }

  getToastClass(): string {
    const classes: Record<string, string> = {
      success: 'toast-success', error: 'toast-error',
      warning: 'toast-warning', info: 'toast-info'
    };
    return classes[this.toastType] || 'toast-info';
  }

  logout(): void { this.utilisateurService.logout(); }

  initials(name: string): string {
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  supprimerNotif(event: Event, notif: AppNotification): void {
    event.stopPropagation();
    if (!confirm(`Supprimer cette notification ?`)) return;
    this.notifService.delete(notif.id);
    this.showToastMessage('Notification supprimée', 'success');
    this.notificationCount = this.notifService.getUnreadCountForRole('STAGIAIRE');
    this.notifications = this.notifService.getForRole('STAGIAIRE');
  }

  archiverNotif(event: Event, notif: AppNotification): void {
    event.stopPropagation();
    this.notifService.archiver(notif.id);
    this.showToastMessage('Notification archivée', 'info');
    this.notifications = this.notifService.getForRole('STAGIAIRE');
  }

  marquerLue(event: Event, notif: AppNotification): void {
    event.stopPropagation();
    this.notifService.markAsRead(notif.id);
    this.notificationCount = this.notifService.getUnreadCountForRole('STAGIAIRE');
    this.notifications = this.notifService.getForRole('STAGIAIRE');
  }
}