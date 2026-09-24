import { Component, OnDestroy, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UtilisateurService } from '../../services/utilisateur.service';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { WebSocketService } from '../../services/websocket.service';
import { Stagiaire } from './stagiaire-detail/stagiaire-detail.component';

export interface DashboardStat {
  label: string;
  value: number;
  icon: string;
  accentClass: string;
}

@Component({
  selector: 'app-dashboard-encadrant',
  templateUrl: './dashboard-encadrant.component.html',
  styleUrls: ['./dashboard-encadrant.component.css']
})
export class DashboardEncadrantComponent implements OnInit, OnDestroy {
// ===== TOAST =====
toastMessage = '';
toastType: 'success' | 'error' | 'warning' | 'info' = 'info';
showToast = false;
toastTimeout: any;
  // ===== USER =====
  adminName = 'Encadrant';
  adminRole = 'Encadrant';
  private currentUserId: number | null = null;

  // ===== FOOTER =====
  currentYear = new Date().getFullYear();

  // ===== NOTIFICATIONS =====
  notificationCount = 0;
  showNotifPanel = false;
  notifications: AppNotification[] = [];
  unreadNotifications: AppNotification[] = [];

  // ===== NAV =====
  activeRoute = 'dashboard';

  // ===== STAGIAIRES =====
  stagiaires: Stagiaire[] = [];
  stats: DashboardStat[] = [];
  loading = true;
  errorMessage = '';

  selectedStagiaire: Stagiaire | null = null;
  chatMessages: any[] = [];
  newMessage = '';

  // ===== RECHERCHE & FILTRES =====
  searchQuery = '';
  filterStatut: 'ALL' | 'EN_COURS' | 'TERMINEE' | 'ACCEPTE' = 'ALL';

  // ===== APPEL ENTRANT =====
  showIncomingCall = false;
  incomingCallFrom = '';
  incomingCallRole = 'Stagiaire';
  incomingCallInitials = 'S';
  incomingCallUrl = '';
  incomingCallFromId: number | null = null;
  private incomingCallTimeout: any = null;

  // 🆕 URL à rejoindre automatiquement par le composant enfant
  pendingMeetUrl: string | null = null;

 

  private destroy$ = new Subject<void>();

  constructor(
    private utilisateurService: UtilisateurService,
    private router: Router,
    public notifService: NotificationService,
    private wsService: WebSocketService
  ) {}

  ngOnInit(): void {
    console.log('🟢 [ENCADRANT] ngOnInit');

    // ===== USER =====
    this.utilisateurService.user$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.currentUserId = user.id;
        this.adminName = [user.prenom, user.nom].filter(Boolean).join(' ') || user.email || 'Encadrant';
        this.notifService.chargerDepuisBackend(user.id);
        this.wsService.connect(user.id);
      }
    });

    // ===== NOTIFICATIONS =====
    this.notifService.notifications$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.notifications = this.notifService.getForRole('ENCADRANT');
      this.unreadNotifications = this.notifService.getUnreadForRole('ENCADRANT');
      this.notificationCount = this.notifService.getUnreadCountForRole('ENCADRANT');
    });

    this.notifService.notificationAction$.pipe(takeUntil(this.destroy$)).subscribe(action => {
      if (action) this.showToastMessage(action.message, action.type, action.duration);
    });

    // ===== CHAT =====
    this.wsService.chat$.pipe(takeUntil(this.destroy$)).subscribe((msg) => {
      if (!msg) return;
      if (msg.expediteurId === this.currentUserId) return;

      const stagiaire = this.stagiaires.find(s => s.stagiaireId === msg.expediteurId);
      if (stagiaire) {
        stagiaire.messages = stagiaire.messages || [];
        stagiaire.messages.push({
          id: Date.now(),
          auteur: msg.expediteurNom,
          contenu: msg.contenu,
          date: msg.date,
          isMoi: false
        });
        if (this.selectedStagiaire?.stagiaireId === msg.expediteurId) {
          this.selectedStagiaire.messages = stagiaire.messages;
          this.chatMessages = stagiaire.messages;
        }
      }
      this.showToastMessage(`💬 Nouveau message de ${msg.expediteurNom}`, 'info');
    });

    // ===== APPEL ENTRANT =====
    this.wsService.meet$.pipe(takeUntil(this.destroy$)).subscribe((msg) => {
      console.log('📩 [ENCADRANT] meet$ reçu:', msg);
      if (!msg) return;
      if (msg.expediteurId === this.currentUserId) return;

      if (msg.type === 'MEET_START') {
        this.incomingCallFrom = msg.expediteurNom || 'Stagiaire';
        this.incomingCallUrl = msg.contenu || '';
        this.incomingCallInitials = this.computeInitials(this.incomingCallFrom);
        this.incomingCallRole = 'Stagiaire';
        this.incomingCallFromId = msg.expediteurId || null;
        this.showIncomingCall = true;

        if (this.incomingCallTimeout) clearTimeout(this.incomingCallTimeout);
        this.incomingCallTimeout = setTimeout(() => {
          if (this.showIncomingCall) this.refuserAppel();
        }, 45000);

        this.showToastMessage(`📹 Appel vidéo de ${this.incomingCallFrom}`, 'info', 5000);
      }

      if (msg.type === 'MEET_END') {
        this.showIncomingCall = false;
        if (this.incomingCallTimeout) {
          clearTimeout(this.incomingCallTimeout);
          this.incomingCallTimeout = null;
        }
      }
    });

    // ===== CHARGEMENT DES STAGIAIRES =====
    const user = this.utilisateurService.getCurrentUser();
    if (user && user.id) {
      this.utilisateurService.getCandidaturesByEncadrant(user.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data: any[]) => {
            const stagesOnly = (data ?? []).filter((c: any) => {
              const typeOffre = c.offre?.type;
              if (typeOffre === 'EMPLOI') return false;
              if (typeOffre === 'STAGE') return true;
              const titre = (c.offre?.titre || '').toLowerCase();
              const motsEmploi = ['développeur java', 'devops', 'confirmé', 'ingénieur'];
              if (motsEmploi.some(mot => titre.includes(mot))) return false;
              return true;
            });

            this.stagiaires = stagesOnly.map(s => this.mapStagiaire(s));
            this.loading = false;
            this.computeStats();
          },
          error: (err) => {
            console.error('❌ Erreur:', err);
            this.errorMessage = 'Impossible de charger vos stagiaires.';
            this.loading = false;
          }
        });
    } else {
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.wsService.disconnect();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    if (this.incomingCallTimeout) clearTimeout(this.incomingCallTimeout);
  }

  // =============================================
  // GETTER : STAGIAIRES FILTRÉS
  // =============================================
  get filteredStagiaires(): Stagiaire[] {
    let result = this.stagiaires;

    if (this.filterStatut !== 'ALL') {
      result = result.filter(s => s.statut === this.filterStatut);
    }

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(s =>
        this.getNomComplet(s).toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.offreTitre || '').toLowerCase().includes(q)
      );
    }

    return result;
  }

  // =============================================
  // HELPER : ICÔNE STATS
  // =============================================
  getStatIcon(icon: string): string {
    const map: Record<string, string> = {
      'users': '👥',
      'briefcase': '💼',
      'file': '📄',
      'check': '✅'
    };
    return map[icon] || '📊';
  }

  getNotifTypeClass(type: string): string {
    const classes: { [key: string]: string } = {
      'auth': 'type-auth',
      'offre': 'type-offre',
      'candidature': 'type-candidature',
      'entretien': 'type-entretien',
      'evaluation': 'type-evaluation',
      'livrable': 'type-livrable',
      'document': 'type-document',
      'message': 'type-message',
      'convention': 'type-convention',
      'APPEL': 'type-appel',
      'MESSAGE': 'type-message',
      'DISPONIBILITE': 'type-dispo',
      'AFFECTATION': 'type-affectation',
      'autre': 'type-default'
    };
    return classes[type] || 'type-default';
  }

  getNotifIcon(type: string): string {
    const icons: Record<string, string> = {
      'APPEL': '📹',
      'MESSAGE': '💬',
      'DISPONIBILITE': '🟢',
      'AFFECTATION': '🎓',
      'CANDIDATURE': '📋',
      'LIVRABLE': '📄',
      'auth': '🔐',
      'offre': '💼',
      'entretien': '📅',
      'evaluation': '⭐',
      'document': '📎',
      'convention': '📝',
      'autre': '🔔'
    };
    return icons[type] || '🔔';
  }

  // =============================================
  // MAPPING STAGIAIRE
  // =============================================
  private mapStagiaire(s: any): Stagiaire {
    const prenom = s.candidat?.prenom || s.stagiaire?.prenom || s.utilisateur?.prenom || s.prenom || '';
    const nom = s.candidat?.nom || s.stagiaire?.nom || s.utilisateur?.nom || s.nom || '';
    const email = s.candidat?.email || s.stagiaire?.email || s.utilisateur?.email || s.email || '';
    const telephone = s.candidat?.telephone || s.stagiaire?.telephone || s.utilisateur?.telephone || s.telephone || '';
    const offreTitre = s.offre?.titre || s.offreTitre || s.titreOffre || 'Stage';
    const stagiaireId = s.candidat?.id || s.stagiaire?.id || s.utilisateur?.id || 0;

    return {
      id: s.id,
      stagiaireId,
      nom,
      prenom,
      email,
      telephone,
      offreTitre,
      statut: s.statut,
      heuresTravaillees: s.heuresTravaillees || 0,
      heuresObjectif: s.heuresObjectif || 140,
      rapports: [],
      messages: []
    };
  }

  // =============================================
  // STATISTIQUES
  // =============================================
  private computeStats(): void {
    const enCours = this.stagiaires.filter(s => s.statut === 'ACCEPTE' || s.statut === 'EN_COURS').length;
    const termines = this.stagiaires.filter(s => s.statut === 'TERMINEE').length;
    this.stats = [
      { label: 'Stagiaires assignés', value: this.stagiaires.length, icon: 'users', accentClass: 'accent-orange' },
      { label: 'Stages en cours', value: enCours, icon: 'briefcase', accentClass: 'accent-blue' },
      { label: 'Stages terminés', value: termines, icon: 'file', accentClass: 'accent-red' }
    ];
  }

  // =============================================
  // NAVIGATION
  // =============================================
  setRoute(route: string): void {
    this.activeRoute = route;
    this.showNotifPanel = false;
    this.selectedStagiaire = null;
    this.pendingMeetUrl = null;
  }

  ouvrirDetail(s: Stagiaire): void {
    this.selectedStagiaire = s;
    this.chatMessages = [...(s.messages || [])];
  }

  fermerDetail(): void {
    this.selectedStagiaire = null;
    this.chatMessages = [];
    this.pendingMeetUrl = null;
  }

  // =============================================
  // HELPERS
  // =============================================
  getNomComplet(s: Stagiaire): string { return `${s.prenom} ${s.nom}`.trim() || 'Stagiaire'; }
  getInitiales(s: Stagiaire): string { return `${s.prenom?.charAt(0) || ''}${s.nom?.charAt(0) || ''}`.toUpperCase() || 'S'; }
  getOffreTitre(s: Stagiaire): string { return s.offreTitre || '—'; }

  getStatutLabel(statut: string): string {
    const l: Record<string, string> = {
      'ACCEPTE': 'Accepté',
      'EN_ANALYSE': 'En analyse',
      'REFUSE': 'Refusé',
      'EN_ATTENTE': 'En attente',
      'ENTRETIEN_PLANIFIE': 'Entretien planifié',
      'EN_COURS': 'En cours',
      'TERMINEE': 'Terminé'
    };
    return l[statut] || statut || '—';
  }

  statutBadgeClass(statut: string): string {
    switch (statut) {
      case 'ACCEPTE': return 'badge-blue';
      case 'EN_ANALYSE':
      case 'EN_ATTENTE': return 'badge-orange';
      case 'REFUSE': return 'badge-red';
      case 'ENTRETIEN_PLANIFIE': return 'badge-purple';
      default: return 'badge-gray';
    }
  }

  // =============================================
  // APPEL ENTRANT
  // =============================================
  accepterAppel(): void {
    console.log('✅ [ENCADRANT] accepterAppel');
    this.showIncomingCall = false;
    if (this.incomingCallTimeout) {
      clearTimeout(this.incomingCallTimeout);
      this.incomingCallTimeout = null;
    }

    // Trouver le stagiaire qui appelle
    const stagiaire = this.stagiaires.find(
      s => s.stagiaireId === this.incomingCallFromId ||
           this.getNomComplet(s) === this.incomingCallFrom
    );

    if (stagiaire) {
      // 🆕 Stocker l'URL pour la transmettre au composant enfant
      this.pendingMeetUrl = this.incomingCallUrl;
      console.log('🔵 [ENCADRANT] pendingMeetUrl:', this.pendingMeetUrl);
      this.ouvrirDetail(stagiaire);
    } else {
      this.showToastMessage('Stagiaire introuvable', 'warning');
    }
  }

  refuserAppel(): void {
    console.log('❌ [ENCADRANT] refuserAppel');
    this.showIncomingCall = false;
    if (this.incomingCallTimeout) {
      clearTimeout(this.incomingCallTimeout);
      this.incomingCallTimeout = null;
    }
    if (this.incomingCallFromId) {
      this.wsService.arreterMeet(this.incomingCallFromId, this.adminName);
    }
    this.showToastMessage('📞 Appel refusé', 'warning', 2500);
  }

  private computeInitials(name: string): string {
    if (!name) return 'S';
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
    this.notifService.markAllAsReadForRole('ENCADRANT');
    this.showNotifPanel = false;
  }

  getNotificationTimeAgo(date: Date | string): string {
    const now = new Date();
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!d || isNaN(d.getTime())) return 'Date inconnue';
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diff < 1) return 'À l\'instant';
    if (diff < 60) return `Il y a ${diff} min`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `Il y a ${h}h`;
    return `Il y a ${Math.floor(h / 24)}j`;
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
    const i: Record<string, string> = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    return i[this.toastType] || 'ℹ️';
  }

  getToastClass(): string {
    const c: Record<string, string> = { success: 'toast-success', error: 'toast-error', warning: 'toast-warning', info: 'toast-info' };
    return c[this.toastType] || 'toast-info';
  }

  onLogout(): void { this.utilisateurService.logout(); }

  supprimerNotif(event: Event, notif: AppNotification): void {
  event.stopPropagation();
  if (!confirm(`Supprimer cette notification ?`)) return;

  this.notifService.delete(notif.id);
  this.showToastMessage('Notification supprimée', 'success');
  this.notificationCount = this.notifService.getUnreadCountForRole('XXX'); // ← rôle
  this.notifications = this.notifService.getForRole('XXX');
}

archiverNotif(event: Event, notif: AppNotification): void {
  event.stopPropagation();
  this.notifService.archiver(notif.id);
  this.showToastMessage('Notification archivée', 'info');
  this.notifications = this.notifService.getForRole('XXX');
}

marquerLue(event: Event, notif: AppNotification): void {
  event.stopPropagation();
  this.notifService.markAsRead(notif.id);
  this.notificationCount = this.notifService.getUnreadCountForRole('XXX');
  this.notifications = this.notifService.getForRole('XXX');
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
}