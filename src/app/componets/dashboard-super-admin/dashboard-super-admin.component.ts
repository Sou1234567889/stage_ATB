import {
  Component, OnDestroy, OnInit, HostListener,
  ChangeDetectorRef
} from '@angular/core';
import { Router } from '@angular/router';
import { catchError, forkJoin, of, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UtilisateurService, RoleBackend } from '../../services/utilisateur.service';
import { OffreService } from '../../services/offre.service';
import { NotificationService, AppNotification } from '../../services/notification.service';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CandidatureNotificationService } from '../../services/candidature-notification.service';
import {
  ApexAxisChartSeries, ApexChart, ApexXAxis, ApexDataLabels,
  ApexTitleSubtitle, ApexLegend, ApexNonAxisChartSeries, ApexPlotOptions
} from 'ng-apexcharts';

export interface PlatformUser {
  id: number; firstName: string; lastName: string; email: string;
  phone: string; adresse?: string; numeroCin?: string;
  role: RoleBackend | null; actif: boolean; dateCreation: string;
}

export interface DashboardStat {
  label: string; value: number; icon: string; accentClass: string;
}

const ROLE_LABELS: Record<RoleBackend, string> = {
  SUPER_ADMIN: 'Super Admin', RESPONSABLE_RH: 'Responsable RH', RH: 'RH',
  ENCADRANT: 'Encadrant', STAGIAIRE: 'Stagiaire', EMPLOYE: 'Employé'
};

const ROLE_BADGES: Record<RoleBackend, string> = {
  SUPER_ADMIN: 'badge-red', RESPONSABLE_RH: 'badge-purple', RH: 'badge-blue',
  ENCADRANT: 'badge-green', STAGIAIRE: 'badge-orange', EMPLOYE: 'badge-gray'
};

const ROLE_COLORS: Record<string, string> = {
  'Super Admin': '#e2251b', 'Responsable RH': '#8b5cf6', 'RH': '#3b82f6',
  'Encadrant': '#10b981', 'Stagiaire': '#f7931e', 'Employé': '#6b7280'
};

@Component({
  selector: 'app-dashboard-super-admin',
  templateUrl: './dashboard-super-admin.component.html',
  styleUrls: ['./dashboard-super-admin.component.css']
})
export class DashboardSuperAdminComponent implements OnInit, OnDestroy {

  adminName = 'Super Admin';
  adminRole = 'Super Admin';
  
  // ===== NOTIFICATIONS =====
  notifications: AppNotification[] = [];
  unreadNotifications: AppNotification[] = [];
  notificationCount = 0;
  showNotifPanel = false;

    // ===== PAGINATION CANDIDATURES =====
  candidaturesCurrentPage = 1;
  candidaturesPageSize = 10;

  // ===== PAGINATION LOGS =====
  logsCurrentPage = 1;
  logsPageSize = 10;
  
  activeRoute = 'dashboard';
  stats: DashboardStat[] = [];
  statsLoading = true;
  errorMessage = '';

  rawUsers: any[] = [];
  usersLoading = true;
  selectedRole = 'TOUS';
  searchTerm = '';
  pageSize = 10;
  currentPage = 1;

  roleFilters = [
    { value: 'TOUS', label: 'Tous les rôles' },
    ...Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))
  ];

  assignableRoles: RoleBackend[] = ['STAGIAIRE', 'EMPLOYE'];

  offres: any[] = []; offresLoaded = false; offresLoading = false;
  candidatures: any[] = []; candidaturesLoaded = false; candidaturesLoading = false;
  logs: any[] = []; logsLoaded = false; logsLoading = false;

  showUserModal = false; savingUser = false; modalError = '';
  editingUserId: number | null = null;
  assigningRoleUserId: number | null = null;

  whatsappEnvoyes: Set<number> = new Set<number>();

  userForm = {
    nom: '', prenom: '', email: '', telephone: '',
    adresse: '', numeroCin: '', role: 'STAGIAIRE' as RoleBackend
  };

  // ===== GRAPHIQUES =====
  public chartConfigCandidatures: ApexChart = {
    type: 'bar', height: 320, fontFamily: 'Inter, sans-serif', toolbar: { show: false }
  };
  public seriesCandidatures: ApexAxisChartSeries = [{ name: 'Candidatures', data: [] }];
  public xaxisCandidatures: ApexXAxis = { categories: ['En attente', 'Entretien', 'Acceptée', 'Refusée'] };
  public titleCandidatures: ApexTitleSubtitle = {
    text: 'Statistiques des candidatures', align: 'left',
    style: { fontSize: '18px', fontWeight: 'bold', color: '#25396f' }
  };
  public subtitleCandidatures: ApexTitleSubtitle = {
    text: 'Répartition par statut', align: 'left',
    style: { fontSize: '13px', fontWeight: 'normal', color: '#f7931e' }
  };
  public plotOptionsCandidatures: ApexPlotOptions = {
    bar: { borderRadius: 8, columnWidth: '55%', distributed: true }
  };
  public dataLabelsCandidatures: ApexDataLabels = { enabled: false };

  public chartConfigRoles: ApexChart = {
    type: 'donut', height: 340, fontFamily: 'Inter, sans-serif'
  };
  public seriesRoles: ApexNonAxisChartSeries = [];
  public labelsRoles: string[] = [];
  public colorsRoles: string[] = ['#e2251b', '#8b5cf6', '#3b82f6', '#10b981', '#f7931e', '#6b7280'];
  public titleRoles: ApexTitleSubtitle = {
    text: 'Répartition des rôles', align: 'left',
    style: { fontSize: '18px', fontWeight: 'bold', color: '#25396f' }
  };
  public subtitleRoles: ApexTitleSubtitle = {
    text: 'Utilisateurs par rôle', align: 'left',
    style: { fontSize: '13px', fontWeight: 'normal', color: '#f7931e' }
  };
  public legendRoles: ApexLegend = {
    position: 'bottom', fontSize: '12px', markers: { width: 12, height: 12 }
  };
  public dataLabelsRoles: ApexDataLabels = { enabled: true, style: { fontSize: '12px' } };

  toastMessage = '';
  toastType: 'success' | 'error' | 'warning' | 'info' = 'info';
  showToast = false;
  toastTimeout: any;

  private destroy$ = new Subject<void>();

  constructor(
    private utilisateurService: UtilisateurService,
    private offreService: OffreService,
    private router: Router,
    public notifService: NotificationService,
    private notifCandidature: CandidatureNotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const saved = localStorage.getItem('whatsapp_envoyes');
    if (saved) {
      try { this.whatsappEnvoyes = new Set<number>(JSON.parse(saved)); }
      catch { this.whatsappEnvoyes = new Set<number>(); }
    }

    this.utilisateurService.user$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.adminName = [user.prenom, user.nom].filter(Boolean).join(' ') || user.email || 'Super Admin';
        this.adminRole = ROLE_LABELS[user.role as RoleBackend] ?? user.role ?? 'Super Admin';
      }
    });

    // ==========================================
    // 🆕 CHARGEMENT DES NOTIFICATIONS GLOBALES (Les 60)
    // ==========================================
    this.loadGlobalNotifications();

    // Écouter les mises à jour locales du service (pour les nouvelles notifs)
    this.notifService.notifications$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      // On recharge tout pour être sûr d'avoir les dernières données
      this.loadGlobalNotifications();
    });

    this.notifService.notificationAction$.pipe(takeUntil(this.destroy$)).subscribe(action => {
      if (action) this.showToastMessage(action.message, action.type, action.duration);
    });

    this.loadDashboard();
  }

  // ==========================================
  // 🆕 MÉTHODE POUR CHARGER LES 60 NOTIFICATIONS
  // ==========================================
  private loadGlobalNotifications(): void {
    this.notifService.getAllNotifications().pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        console.error('Erreur chargement notifications globales', err);
        return of([]);
      })
    ).subscribe((notifs: AppNotification[]) => {
      // On s'assure que les dates sont bien des objets Date
      this.notifications = notifs.map(n => ({
        ...n,
        timestamp: new Date(n.timestamp)
      }));

      // Calcul du nombre de non lues
      this.unreadNotifications = this.notifications.filter(n => !n.lu);
      this.notificationCount = this.unreadNotifications.length;

      console.log(`📥 ${this.notifications.length} notifications chargées, ${this.notificationCount} non lues`);

      // Forcer la détection des changements
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  // ==========================================
  // ACTIONS SUR LES NOTIFICATIONS
  // ==========================================
  
  toggleNotifPanel(): void {
    this.showNotifPanel = !this.showNotifPanel;
  }

  onNotifClick(notif: AppNotification): void {
    this.notifService.markAsRead(notif.id);
    this.showNotifPanel = false;
    
    // Mettre à jour localement
    const index = this.notifications.findIndex(n => n.id === notif.id);
    if (index !== -1) {
      this.notifications[index].lu = true;
      this.notificationCount = this.notifications.filter(n => !n.lu).length;
    }
  }

  markAllAsRead(): void {
    // Marquer toutes les notifications comme lues localement
    this.notifications = this.notifications.map(n => ({ ...n, lu: true }));
    this.unreadNotifications = [];
    this.notificationCount = 0;
    
    // Appeler le backend si nécessaire
    this.notifService.markAllAsReadForRole('SUPER_ADMIN');
  }

    // ==========================================
  // PAGINATION CANDIDATURES
  // ==========================================
  get filteredCandidatures(): any[] {
    return this.candidatures ?? [];
  }

  get candidaturesTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredCandidatures.length / this.candidaturesPageSize));
  }

  get pagedCandidatures(): any[] {
    const start = (this.candidaturesCurrentPage - 1) * this.candidaturesPageSize;
    return this.filteredCandidatures.slice(start, start + this.candidaturesPageSize);
  }

  get candidaturesPageNumbers(): number[] {
    return Array.from({ length: this.candidaturesTotalPages }, (_, i) => i + 1);
  }

  onCandidaturesPageSizeChange(): void {
    this.candidaturesCurrentPage = 1;
  }

  goToCandidaturesPage(p: number): void {
    if (p >= 1 && p <= this.candidaturesTotalPages) {
      this.candidaturesCurrentPage = p;
    }
  }

  // ==========================================
  // PAGINATION LOGS
  // ==========================================
  get filteredLogs(): any[] {
    return this.logs ?? [];
  }

  get logsTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredLogs.length / this.logsPageSize));
  }

  get pagedLogs(): any[] {
    const start = (this.logsCurrentPage - 1) * this.logsPageSize;
    return this.filteredLogs.slice(start, start + this.logsPageSize);
  }

  get logsPageNumbers(): number[] {
    return Array.from({ length: this.logsTotalPages }, (_, i) => i + 1);
  }

  onLogsPageSizeChange(): void {
    this.logsCurrentPage = 1;
  }

  goToLogsPage(p: number): void {
    if (p >= 1 && p <= this.logsTotalPages) {
      this.logsCurrentPage = p;
    }
  }

  supprimerNotif(event: Event, notif: AppNotification): void {
    event.stopPropagation();
    if (!confirm('Supprimer cette notification ?')) return;

    this.notifService.delete(notif.id);
    
    this.notifications = this.notifications.filter(n => n.id !== notif.id);
    this.notificationCount = this.notifications.filter(n => !n.lu).length;
    this.showToastMessage('Notification supprimée', 'success');
  }

  archiverNotif(event: Event, notif: AppNotification): void {
    event.stopPropagation();
    this.notifService.archiver(notif.id);
    this.notifications = this.notifications.filter(n => n.id !== notif.id);
    this.showToastMessage('Notification archivée', 'info');
  }

  marquerLue(event: Event, notif: AppNotification): void {
    event.stopPropagation();
    this.notifService.markAsRead(notif.id);
    
    const index = this.notifications.findIndex(n => n.id === notif.id);
    if (index !== -1) {
      this.notifications[index].lu = true;
      this.notificationCount = this.notifications.filter(n => !n.lu).length;
    }
  }

  // ==========================================
  // ICÔNES ET CLASSES
  // ==========================================
  getNotifIcon(type: string): string {
    const icons: Record<string, string> = {
      'APPEL': '📹', 'MESSAGE': '💬', 'DISPONIBILITE': '🟢',
      'AFFECTATION': '🎓', 'CANDIDATURE': '📋', 'LIVRABLE': '📄',
      'auth': '🔐', 'offre': '💼', 'entretien': '📅',
      'evaluation': '⭐', 'document': '📎', 'convention': '📝',
      'success': '✅', 'error': '❌', 'warning': '⚠️', 'info': 'ℹ️',
      'INSCRIPTION': '👤', 'ENVOI_WHATSAPP': '📱', 'ATTRIBUTION_ROLE': '🛡️',
      'autre': '🔔'
    };
    return icons[type] || '🔔';
  }

  getNotifTypeClass(type: string): string {
    const classes: Record<string, string> = {
      'auth': 'type-auth', 'offre': 'type-offre', 'candidature': 'type-candidature',
      'entretien': 'type-entretien', 'evaluation': 'type-evaluation',
      'livrable': 'type-livrable', 'document': 'type-document',
      'message': 'type-message', 'convention': 'type-convention',
      'APPEL': 'type-appel', 'MESSAGE': 'type-message',
      'DISPONIBILITE': 'type-dispo', 'AFFECTATION': 'type-affectation',
      'CANDIDATURE': 'type-candidature', 'LIVRABLE': 'type-livrable',
      'success': 'type-success', 'error': 'type-error',
      'warning': 'type-warning', 'info': 'type-info',
      'INSCRIPTION': 'type-info', 'ENVOI_WHATSAPP': 'type-message',
      'ATTRIBUTION_ROLE': 'type-auth', 'autre': 'type-default'
    };
    return classes[type] || 'type-default';
  }

 getTimeAgo(date: Date | string | null | undefined): string {
  // 🛡️ Protection contre null/undefined
  if (!date) return 'Date inconnue';
  
  // 🔄 Conversion en objet Date
  let d: Date;
  if (typeof date === 'string') {
    // Si la date est au format ISO sans timezone, on la force en local
    d = new Date(date);
  } else if (date instanceof Date) {
    d = date;
  } else {
    return 'Date inconnue';
  }
  
  // 🛡️ Vérification que la date est valide
  if (isNaN(d.getTime())) {
    console.warn('⚠️ Date invalide reçue:', date);
    return 'Date inconnue';
  }
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  
  // Si la date est dans le futur (problème de timezone), on la considère comme "à l'instant"
  if (diffMs < 0) return 'À l\'instant';
  
  const seconds = Math.floor(diffMs / 1000);
  const min = Math.floor(diffMs / 60000);
  const h = Math.floor(diffMs / 3600000);
  const j = Math.floor(diffMs / 86400000);
  
  if (seconds < 60) return 'À l\'instant';
  if (min < 60) return `Il y a ${min} min`;
  if (h < 24) return `Il y a ${h}h`;
  if (j === 1) return 'Hier';
  if (j < 7) return `Il y a ${j}j`;
  
  return d.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 🆕 Méthode pour naviguer vers la page complète des notifications
goToAllNotifications(): void {
  this.showNotifPanel = false;
  this.router.navigate(['/notifications']);
}
  // ==========================================
  // RESTE DU COMPOSANT (Dashboard, Users, etc.)
  // ==========================================
  
  private loadDashboard(): void {
    this.statsLoading = true;
    this.usersLoading = true;
    this.errorMessage = '';

    forkJoin({
      utilisateurs: this.utilisateurService.getAllUtilisateurs().pipe(catchError(() => of([]))),
      offres: this.offreService.getAll().pipe(catchError(() => of([]))),
      candidatures: this.utilisateurService.getAllCandidatures().pipe(catchError(() => of([]))),
      logs: this.utilisateurService.getAuditLogs().pipe(catchError(() => of([])))
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ utilisateurs, offres, candidatures, logs }) => {
        this.rawUsers = utilisateurs ?? [];
        this.offres = offres ?? [];
        this.candidatures = candidatures ?? [];
        this.logs = logs ?? [];

        this.offresLoaded = this.candidaturesLoaded = this.logsLoaded = true;

        this.stats = [
          { label: 'Utilisateurs', value: this.rawUsers.length, icon: 'users', accentClass: 'accent-purple' },
          { label: 'Offres', value: this.offres.length, icon: 'briefcase', accentClass: 'accent-orange' },
          { label: 'Candidatures', value: this.candidatures.length, icon: 'file', accentClass: 'accent-red' },
          { label: "Logs d'audit", value: this.logs.length, icon: 'shield', accentClass: 'accent-blue' }
        ];

        this.statsLoading = this.usersLoading = false;

        if (this.notifications.length === 0) {
          this.notifService.addInfo('Bienvenue', `Vous avez ${this.rawUsers.length} utilisateurs et ${this.offres.length} offres.`, ['SUPER_ADMIN']);
        }

        this.cdr.detectChanges();
        setTimeout(() => this.renderCharts(), 300);
        setTimeout(() => this.renderCharts(), 800);
      },
      error: (err) => {
        this.statsLoading = this.usersLoading = false;
        this.errorMessage = "Impossible de charger le tableau de bord.";
        console.error(err);
      }
    });
  }

  renderCharts(): void {
    const stats = this.getCandidaturesStats();
    this.seriesCandidatures = [{
      name: 'Candidatures',
      data: [stats.enAttente, stats.entretien, stats.accepte, stats.refuse]
    }];

    const rolesStats = this.getRolesStats();
    this.seriesRoles = rolesStats.values;
    this.labelsRoles = rolesStats.labels;
    this.colorsRoles = rolesStats.colors;

    this.cdr.detectChanges();
  }

  private getCandidaturesStats() {
    const s = { enAttente: 0, entretien: 0, accepte: 0, refuse: 0 };
    this.candidatures.forEach((c: any) => {
      switch (c.statut) {
        case 'EN_ATTENTE': s.enAttente++; break;
        case 'ENTRETIEN_PLANIFIE': s.entretien++; break;
        case 'ACCEPTE': s.accepte++; break;
        case 'REFUSE': s.refuse++; break;
      }
    });
    return s;
  }

  private getRolesStats() {
    const counts: Record<string, number> = {};
    this.rawUsers.forEach((u: any) => {
      const label = this.roleLabel(u.role);
      counts[label] = (counts[label] || 0) + 1;
    });
    const labels = Object.keys(counts);
    return {
      labels,
      values: labels.map(l => counts[l]),
      colors: labels.map(l => ROLE_COLORS[l] || '#94a3b8')
    };
  }

  toPlatformUser(u: any): PlatformUser {
    return {
      id: u.id, firstName: u.prenom ?? '', lastName: u.nom ?? '',
      email: u.email ?? '', phone: u.telephone ?? '',
      adresse: u.adresse ?? '', numeroCin: u.numeroCin ?? '',
      role: u.role ?? null, actif: !!u.actif, dateCreation: u.dateCreation ?? ''
    };
  }

  roleLabel(role: RoleBackend | null): string {
    if (!role) return 'En attente';
    return ROLE_LABELS[role] ?? role;
  }

  get filteredUsers(): PlatformUser[] {
    const mapped = this.rawUsers.map(u => this.toPlatformUser(u));
    const term = this.searchTerm.trim().toLowerCase();
    return mapped.filter(u => {
      const matchesRole = this.selectedRole === 'TOUS' || u.role === this.selectedRole;
      const matchesSearch = !term || `${u.firstName} ${u.lastName}`.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
      return matchesRole && matchesSearch;
    });
  }

  get totalPages(): number { return Math.max(1, Math.ceil(this.filteredUsers.length / this.pageSize)); }
  get pagedUsers(): PlatformUser[] { const s = (this.currentPage - 1) * this.pageSize; return this.filteredUsers.slice(s, s + this.pageSize); }
  get pageNumbers(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }
  get totalUsers(): number { return this.filteredUsers.length; }

  onSearchChange(): void { this.currentPage = 1; }
  onRoleChange(): void { this.currentPage = 1; }
  onPageSizeChange(): void { this.currentPage = 1; }
  goToPage(p: number): void { if (p >= 1 && p <= this.totalPages) this.currentPage = p; }

  setRoute(route: string): void {
    this.activeRoute = route;
    this.showNotifPanel = false;
    if (route === 'offres' && !this.offresLoaded) this.loadOffres();
    if (route === 'candidatures' && !this.candidaturesLoaded) this.loadCandidatures();
    if (route === 'logs' && !this.logsLoaded) this.loadLogs();

    if (route === 'dashboard') {
      this.cdr.detectChanges();
      setTimeout(() => this.renderCharts(), 300);
    }
  }

  private loadOffres(): void {
    this.offresLoading = true;
    this.offreService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (d) => {
        this.offres = d ?? [];
        this.offresLoaded = true;
        this.offresLoading = false;
        this.updateStat('Offres', this.offres.length);
      },
      error: () => {
        this.offresLoading = false;
        this.errorMessage = "Impossible de charger les offres.";
      }
    });
  }

  deleteOffre(offre: any): void {
    if (!confirm(`Supprimer l'offre "${offre.titre}" ?`)) return;
    this.offreService.deleteOffre(offre.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.loadOffres(); this.notifService.showSuccess(`Offre supprimée`); },
      error: () => { this.errorMessage = "La suppression a échoué."; }
    });
  }

  private loadCandidatures(): void {
    this.candidaturesLoading = true;
    this.utilisateurService.getAllCandidatures().pipe(takeUntil(this.destroy$)).subscribe({
      next: (d) => {
        this.candidatures = d ?? [];
        this.candidaturesCurrentPage = 1;
        this.candidaturesLoaded = true;
        this.candidaturesLoading = false;
        this.updateStat('Candidatures', this.candidatures.length);
        setTimeout(() => this.renderCharts(), 200);
      },
      error: () => {
        this.candidaturesLoading = false;
        this.errorMessage = "Impossible de charger les candidatures.";
      }
    });
  }

  deciderCandidature(candidature: any, decision: 'ACCEPTE' | 'REFUSE'): void {
    this.utilisateurService.deciderCandidature(candidature.id, { decision })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const offre = this.offres.find(o => o.id === candidature.offreId) || candidature.offre;
          if (decision === 'ACCEPTE') {
            this.notifCandidature.notifierCandidatureAcceptee(candidature, offre);
            this.notifService.showSuccess(`Candidature acceptée. Email + WhatsApp envoyés au candidat.`);
          } else {
            this.notifCandidature.notifierCandidatureRefusee(candidature, offre);
            this.notifService.showInfo(`Candidature refusée. Email envoyé au candidat.`);
          }
          this.loadCandidatures();
        },
        error: (err) => {
          this.errorMessage = "La mise à jour de la candidature a échoué.";
          console.error(err);
        }
      });
  }

  private loadLogs(): void {
    this.logsLoading = true;
    this.utilisateurService.getAuditLogs().pipe(takeUntil(this.destroy$)).subscribe({
      next: (d) => {
        this.logs = d ?? [];
        this.logsCurrentPage = 1;
        this.logsLoaded = true;
        this.logsLoading = false;
        this.updateStat("Logs d'audit", this.logs.length);
      },
      error: () => {
        this.logsLoading = false;
        this.errorMessage = "Impossible de charger les logs.";
      }
    });
  }

  private updateStat(label: string, value: number): void {
    const idx = this.stats.findIndex(s => s.label === label);
    if (idx !== -1) this.stats[idx].value = value;
  }

  onEditUser(user: PlatformUser): void {
    this.editingUserId = user.id;
    this.assigningRoleUserId = null;
    this.userForm = {
      nom: user.lastName, prenom: user.firstName, email: user.email,
      telephone: user.phone, adresse: user.adresse ?? '',
      numeroCin: user.numeroCin ?? '', role: (user.role as RoleBackend) ?? 'STAGIAIRE'
    };
    this.modalError = '';
    this.showUserModal = true;
  }

  onAssignRole(user: PlatformUser): void {
    this.assigningRoleUserId = user.id;
    this.editingUserId = null;
    this.userForm = {
      nom: user.lastName, prenom: user.firstName, email: user.email,
      telephone: user.phone, adresse: user.adresse ?? '',
      numeroCin: user.numeroCin ?? '', role: 'STAGIAIRE'
    };
    this.modalError = '';
    this.showUserModal = true;
  }

  closeUserModal(): void {
    this.showUserModal = false;
    this.editingUserId = null;
    this.assigningRoleUserId = null;
  }

  saveUser(): void {
    if (!this.userForm.nom || !this.userForm.prenom || !this.userForm.email) {
      this.modalError = 'Nom, prénom et email sont obligatoires.';
      return;
    }
    if (!this.editingUserId) return;

    this.savingUser = true;
    this.modalError = '';

    const payload = {
      nom: this.userForm.nom, prenom: this.userForm.prenom, email: this.userForm.email,
      telephone: this.userForm.telephone, adresse: this.userForm.adresse, numeroCin: this.userForm.numeroCin
    };

    this.utilisateurService.modifierUtilisateur(this.editingUserId, payload)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.savingUser = false;
          this.showUserModal = false;
          this.editingUserId = null;
          this.refreshUsersOnly();
          this.notifService.showSuccess('Utilisateur modifié');
        },
        error: (err) => {
          this.savingUser = false;
          this.modalError = err?.error?.message || 'Erreur lors de l\'enregistrement.';
        }
      });
  }

  confirmAssignRole(): void {
    if (this.assigningRoleUserId == null) return;

    this.savingUser = true;
    this.modalError = '';

    const role = this.userForm.role;
    const roleLabel = this.roleLabel(role);
    const userNom = `${this.userForm.prenom} ${this.userForm.nom}`;

    if (!confirm(`Attribuer le rôle "${roleLabel}" à ${userNom} ?`)) {
      this.savingUser = false;
      return;
    }

    this.utilisateurService.changerRole(this.assigningRoleUserId, role).subscribe({
      next: () => {
        this.savingUser = false;
        this.showUserModal = false;
        this.assigningRoleUserId = null;
        this.refreshUsersOnly();
        this.showToastMessage(`Rôle "${roleLabel}" attribué à ${userNom}`, 'success', 6000);
        this.notifService.addInfo('Rôle attribué', `${userNom} a reçu le rôle ${roleLabel}.`, ['SUPER_ADMIN']);
      },
      error: (err) => {
        this.savingUser = false;
        this.modalError = err?.error?.message || "Impossible d'attribuer le rôle.";
        this.showToastMessage(`Erreur: ${this.modalError}`, 'error');
      }
    });
  }

  onDeleteUser(user: PlatformUser): void {
    if (!confirm(`Supprimer définitivement ${user.firstName} ${user.lastName} ?`)) return;

    this.utilisateurService.supprimerUtilisateur(user.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.rawUsers = this.rawUsers.filter(u => u.id !== user.id);
        if (this.stats[0]) this.stats[0].value = this.rawUsers.length;
        this.currentPage = 1;
        this.whatsappEnvoyes.delete(user.id);
        localStorage.setItem('whatsapp_envoyes', JSON.stringify(Array.from(this.whatsappEnvoyes)));
        this.showToastMessage(`${user.firstName} supprimé`, 'success');
        setTimeout(() => this.renderCharts(), 200);
      },
      error: (err) => {
        if (err.status === 404) {
          this.rawUsers = this.rawUsers.filter(u => u.id !== user.id);
          if (this.stats[0]) this.stats[0].value = this.rawUsers.length;
          this.showToastMessage(`Déjà supprimé`, 'warning');
        } else {
          this.showToastMessage(`Erreur`, 'error');
        }
      }
    });
  }

  isWhatsappEnvoye(id: number): boolean { return this.whatsappEnvoyes.has(id); }

  marquerWhatsappEnvoye(id: number): void {
    this.whatsappEnvoyes.add(id);
    localStorage.setItem('whatsapp_envoyes', JSON.stringify(Array.from(this.whatsappEnvoyes)));
  }

  envoyerWhatsAppApresRole(user: PlatformUser): void {
    if (!user.phone?.trim()) {
      this.showToastMessage('Aucun numéro de téléphone', 'error');
      return;
    }

    const roleLabel = this.roleLabel(user.role);
    const message = `Bonjour ${user.firstName},\n\nVotre compte Attijari Talentis a été activé avec le rôle : ${roleLabel}.\n\nConnectez-vous : http://localhost:4200/login\n\nCordialement,\nL'équipe Attijari Bank`;

    this.utilisateurService.envoyerWhatsAppParId(user.id, message)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.marquerWhatsappEnvoye(user.id);
          this.showToastMessage(`WhatsApp envoyé à ${user.firstName}`, 'success');
          this.notifService.addInfo('WhatsApp envoyé', `Message envoyé à ${user.firstName} ${user.lastName}`, ['SUPER_ADMIN']);
        },
        error: (err) => this.showToastMessage(`${err.error?.message || 'Échec'}`, 'error')
      });
  }

  renvoyerWhatsApp(user: PlatformUser): void {
    this.whatsappEnvoyes.delete(user.id);
    localStorage.setItem('whatsapp_envoyes', JSON.stringify(Array.from(this.whatsappEnvoyes)));
    this.envoyerWhatsAppApresRole(user);
  }

  onExport(): void {
    const rows = this.filteredUsers.map(u =>
      [u.firstName, u.lastName, u.email, u.phone, this.roleLabel(u.role), u.actif ? 'Actif' : 'Inactif'].join(';')
    );
    const csv = ['Prenom;Nom;Email;Telephone;Role;Statut', ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utilisateurs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.showToastMessage('CSV exporté', 'success');
  }

  onExportExcel(): void {
    const headers = ['Prénom', 'Nom', 'Email', 'Rôle', 'Téléphone', 'Statut'];
    const rows = this.filteredUsers.map(u =>
      [u.firstName, u.lastName, u.email, this.roleLabel(u.role), u.phone || '—', u.actif ? 'Actif' : 'Inactif']
    );
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utilisateurs_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.showToastMessage('Excel exporté', 'success');
  }

  onExportPDF(): void {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(255, 107, 53);
    doc.text('Attijari Talentis - Liste des utilisateurs', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 14, 28);
    doc.text(`Total : ${this.filteredUsers.length} utilisateur(s)`, 14, 34);

    doc.setDrawColor(255, 107, 53);
    doc.setLineWidth(0.5);
    doc.line(14, 38, 196, 38);

    const rows = this.filteredUsers.map(u => [
      `${u.firstName} ${u.lastName}`, u.email, this.roleLabel(u.role),
      u.phone || '—', u.actif ? 'Actif' : 'Inactif'
    ]);

    autoTable(doc, {
      head: [['Nom', 'Email', 'Rôle', 'Téléphone', 'Statut']],
      body: rows,
      startY: 44,
      theme: 'striped',
      headStyles: { fillColor: [255, 107, 53], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
      bodyStyles: { fontSize: 9, textColor: [55, 65, 81] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 55 }, 2: { cellWidth: 30 }, 3: { cellWidth: 35 }, 4: { cellWidth: 20 } },
      didDrawPage: (data) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(`Page ${data.pageNumber} / ${pageCount} — Attijari Talentis © ${new Date().getFullYear()}`, 14, doc.internal.pageSize.height - 10);
      }
    });

    doc.save(`utilisateurs_${new Date().toISOString().slice(0, 10)}.pdf`);
    this.showToastMessage('PDF exporté', 'success');
  }

  showToastMessage(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 4000): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => this.showToast = false, duration);
  }

  closeToast(): void {
    this.showToast = false;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  getToastIcon(): string {
    const icons: Record<string, string> = { success: '✓', error: '✕', warning: '!', info: 'i' };
    return icons[this.toastType] || 'i';
  }

  getToastClass(): string {
    const classes: Record<string, string> = {
      success: 'toast-success', error: 'toast-error', warning: 'toast-warning', info: 'toast-info'
    };
    return classes[this.toastType] || 'toast-info';
  }

  onLogout(): void { this.utilisateurService.logout(); }

  initials(user: PlatformUser): string {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  }

  roleBadgeClass(role: RoleBackend | null): string {
    if (!role) return 'badge-pending';
    return ROLE_BADGES[role] ?? 'badge-gray';
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!(event.target as HTMLElement).closest('.notification-wrapper')) this.showNotifPanel = false;
  }

    // =============================================
  // 🆕 RAFRAÎCHIR UNIQUEMENT LES UTILISATEURS
  // =============================================
  private refreshUsersOnly(): void {
    this.usersLoading = true;
    this.utilisateurService.getAllUtilisateurs().pipe(takeUntil(this.destroy$)).subscribe({
      next: (u) => {
        this.rawUsers = u ?? [];
        this.currentPage = 1;
        this.usersLoading = false;

        // Mettre à jour la stat Utilisateurs
        if (this.stats[0]) this.stats[0].value = this.rawUsers.length;

        // Notification de succès
        this.notifService.showSuccess('Utilisateurs actualisés');

        // Redessiner les graphiques (rôles)
        setTimeout(() => this.renderCharts(), 200);
      },
      error: () => {
        this.usersLoading = false;
        this.errorMessage = "Impossible de recharger les utilisateurs.";
      }
    });
  }
}