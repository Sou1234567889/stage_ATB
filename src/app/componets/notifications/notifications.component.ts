import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { UtilisateurService } from '../../services/utilisateur.service';
import { NotificationService, AppNotification } from '../../services/notification.service';

// =============================================
// INTERFACES
// =============================================
export interface Notification {
  id: number;
  titre: string;
  message: string;
  type: string;
  action: string;
  lu: boolean;
  dateCreation: Date | string;
  utilisateurId?: number;
  utilisateur?: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    role: string;
  };
  entiteConcernee?: string;
  entiteId?: number;
  url?: string;
}

export interface NotificationStats {
  total: number;
  nonLues: number;
  lues: number;
  aujourdhui: number;
  cetteSemaine: number;
  ceMois: number;
}

export interface AdminCategory {
  key: string;
  label: string;
  icon: string;
  actions?: string[];
  type?: string;
  count: number;
}

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit {

  @Output() back = new EventEmitter<void>();

  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  loading = false;
  Math = Math;
  errorMessage = '';

  isAdmin = false;

  stats: NotificationStats = {
    total: 0,
    nonLues: 0,
    lues: 0,
    aujourdhui: 0,
    cetteSemaine: 0,
    ceMois: 0
  };

  adminCategories: AdminCategory[] = [
    { key: 'all',                 label: 'Toutes',              icon: '',  count: 0 },
    { key: 'INSCRIPTION',         label: 'Inscriptions',        icon: '',  actions: ['INSCRIPTION'],                       count: 0 },
    { key: 'CONNEXION_ENCADRANT', label: 'Appels encadrant',    icon: '',  actions: ['CONNEXION_ENCADRANT', 'DEMARRAGE_APPEL'], count: 0 },
    { key: 'CONNEXION_STAGIAIRE', label: 'Appels stagiaire',    icon: '',  actions: ['CONNEXION_STAGIAIRE'],               count: 0 },
    { key: 'CANDIDATURE',         label: 'Candidatures',        icon: '',  actions: ['CANDIDATURE_ACCEPTEE','CANDIDATURE_REFUSEE','CANDIDATURE_DEPOSEE','POSTULATION'], count: 0 },
    { key: 'ENTRETIEN',           label: 'Entretiens',          icon: '',  actions: ['ENTRETIEN_PLANIFIE','ENTRETIEN_REALISE'], count: 0 },
    { key: 'DISPONIBILITE',       label: 'Connexions',          icon: '',  type: 'DISPONIBILITE',                          count: 0 },
    { key: 'AUTRE',               label: 'Autres',              icon: '',  count: 0 },
  ];
  activeCategory = 'all';

  filterType: 'all' | 'unread' | 'read' = 'all';
  searchTerm = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  pages: number[] = [];

  // Sélection
  selectedIds: Set<number> = new Set<number>();

  private utilisateurId = 1;
  private currentUserId = 1;

  private excludedActions: string[] = [
    'DELETE_NOTIFICATION',
    'MARK_AS_READ',
    'MARK_AS_UNREAD',
    'MARK_ALL_AS_READ',
    'DELETE_ALL_READ'
  ];

  // =============================================
  // CONSTRUCTEUR
  // =============================================
  constructor(
    private router: Router,
    private location: Location,
    private utilisateurService: UtilisateurService,
    private notificationService: NotificationService
  ) {
    const currentUser = this.utilisateurService.getCurrentUser();
    if (currentUser) {
      this.utilisateurId = currentUser.id;
      this.currentUserId = currentUser.id;
      this.isAdmin = currentUser.role === 'SUPER_ADMIN';
    }
  }

  ngOnInit(): void {
    this.loadNotifications();
  }

  // =============================================
  // GESTION DES IDS SUPPRIMÉS
  // =============================================
  private getDeletedIds(): number[] {
    const saved = localStorage.getItem('deleted_notifications');
    return saved ? JSON.parse(saved) : [];
  }

  private saveDeletedIds(ids: number[]): void {
    localStorage.setItem('deleted_notifications', JSON.stringify(ids));
  }

  // =============================================
  // CHARGEMENT
  // =============================================
  loadNotifications(): void {
    this.loading = true;
    this.errorMessage = '';
    const deletedIds = this.getDeletedIds();

    if (this.isAdmin) {
      this.loadAdminNotifications(deletedIds);
    } else {
      this.loadAuditLogs(deletedIds);
    }
  }

  private loadAdminNotifications(deletedIds: number[]): void {
    this.notificationService.getAllNotifications().subscribe({
      next: (data: AppNotification[]) => {
        const filtered = data.filter(n => !deletedIds.includes(n.id));

        this.notifications = filtered.map(n => ({
          id: n.id,
          titre: n.titre || 'Notification',
          message: n.message || '',
          type: (n.type as string) || 'autre',
          action: (n.action as string) || '',
          lu: n.lu,
          dateCreation: n.timestamp || new Date(),
          utilisateur: n.utilisateur ? {
            id: n.utilisateur.id,
            nom: n.utilisateur.nom || '',
            prenom: n.utilisateur.prenom || '',
            email: n.utilisateur.email || '',
            role: n.utilisateur.role || ''
          } : undefined
        }));

        this.updateCategoryCounts();
        this.selectedIds.clear();
        this.updateStats();
        this.applyFilters();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('❌ Erreur chargement notifications admin', err);
        this.errorMessage = `Erreur ${err.status}: ${err.message}`;
        this.loading = false;
        this.notifications = [];
        this.updateStats();
        this.applyFilters();
      }
    });
  }

  private loadAuditLogs(deletedIds: number[]): void {
    this.utilisateurService.getAuditLogs().subscribe({
      next: (data: any[]) => {
        if (!data || data.length === 0) {
          this.notifications = [];
          this.updateStats();
          this.applyFilters();
          this.loading = false;
          return;
        }

        const filteredData = data.filter((item: any) => {
          return !this.excludedActions.includes(item.action) &&
                 !deletedIds.includes(item.id);
        });

        this.notifications = filteredData.map((item: any) => ({
          id: item.id,
          titre: this.getLogTitle(item.action),
          message: this.getLogMessage(item),
          type: this.getLogType(item.action),
          action: item.action,
          lu: item.lu || false,
          dateCreation: item.dateAction || item.date_action || new Date(),
          utilisateurId: item.utilisateurId || item.utilisateur_id,
          utilisateur: item.utilisateur || {
            id: item.utilisateurId || item.utilisateur_id || 0,
            nom: item.nom || 'Inconnu',
            prenom: item.prenom || 'Utilisateur',
            email: item.email || 'unknown@email.com',
            role: item.role || 'UNKNOWN'
          },
          entiteConcernee: item.entiteConcernee || item.entite_concernee,
          entiteId: item.entiteId || item.entite_id
        }));

        this.selectedIds.clear();
        this.updateStats();
        this.applyFilters();
        this.loading = false;
      },
      error: (error: any) => {
        this.errorMessage = `Erreur ${error.status}: ${error.message}`;
        this.loading = false;
        this.notifications = [];
        this.updateStats();
        this.applyFilters();
      }
    });
  }

  // =============================================
  // CATÉGORIES
  // =============================================
  updateCategoryCounts(): void {
    const all = this.notifications;
    this.adminCategories = this.adminCategories.map(cat => {
      if (cat.key === 'all') return { ...cat, count: all.length };

      if (cat.key === 'AUTRE') {
        const knownActions = this.adminCategories
          .filter(c => c.key !== 'all' && c.key !== 'AUTRE')
          .flatMap(c => c.actions || []);
        const knownTypes = this.adminCategories
          .filter(c => c.key !== 'all' && c.key !== 'AUTRE' && c.type)
          .map(c => c.type!);
        const autreCount = all.filter(n =>
          !knownActions.includes(n.action) && !knownTypes.includes(n.type)
        ).length;
        return { ...cat, count: autreCount };
      }

      if (cat.actions && cat.actions.length > 0) {
        return { ...cat, count: all.filter(n => cat.actions!.includes(n.action)).length };
      }
      if (cat.type) {
        return { ...cat, count: all.filter(n => n.type === cat.type).length };
      }
      return { ...cat, count: 0 };
    });
  }

  onCategoryChange(catKey: string): void {
    this.activeCategory = catKey;
    this.currentPage = 1;
    this.selectedIds.clear();
    this.applyFilters();
  }

  private filterByCategory(notifs: Notification[]): Notification[] {
    if (this.activeCategory === 'all') return notifs;

    const cat = this.adminCategories.find(c => c.key === this.activeCategory);
    if (!cat) return notifs;

    if (cat.key === 'AUTRE') {
      const knownActions = this.adminCategories
        .filter(c => c.key !== 'all' && c.key !== 'AUTRE')
        .flatMap(c => c.actions || []);
      const knownTypes = this.adminCategories
        .filter(c => c.key !== 'all' && c.key !== 'AUTRE' && c.type)
        .map(c => c.type!);
      return notifs.filter(n => !knownActions.includes(n.action) && !knownTypes.includes(n.type));
    }

    if (cat.actions && cat.actions.length > 0) {
      return notifs.filter(n => cat.actions!.includes(n.action));
    }
    if (cat.type) {
      return notifs.filter(n => n.type === cat.type);
    }
    return notifs;
  }

  // =============================================
  // TITRES / MESSAGES pour audit logs
  // =============================================
  private getLogTitle(action: string): string {
    const titles: {[key: string]: string} = {
      'CONNEXION': 'Connexion utilisateur',
      'INSCRIPTION': 'Inscription',
      'CREATION_OFFRE': 'Nouvelle offre créée',
      'MODIFICATION_OFFRE': 'Offre modifiée',
      'SUPPRESSION_OFFRE': 'Offre supprimée',
      'POSTULATION': 'Nouvelle candidature',
      'CANDIDATURE_DEPOSEE': 'Candidature déposée',
      'CANDIDATURE_ACCEPTEE': 'Candidature acceptée',
      'CANDIDATURE_REFUSEE': 'Candidature refusée',
      'GENERATION_CONVENTION': 'Convention générée',
      'ENTRETIEN_PLANIFIE': 'Entretien planifié',
      'ENTRETIEN_REALISE': 'Entretien réalisé',
      'EVALUATION_CREEE': 'Évaluation créée',
      'LIVRABLE_SOUMIS': 'Livrable soumis',
      'MESSAGE_ENVOYE': 'Message envoyé',
      'ENVOI_MESSAGE': 'Message envoyé',
      'CONNEXION_ENCADRANT': 'Appel encadrant',
      'CONNEXION_STAGIAIRE': 'Appel stagiaire',
    };
    return titles[action] || `Action: ${action}`;
  }

  private getLogMessage(log: any): string {
    const utilisateur = log.utilisateur
      ? `${log.utilisateur.prenom || ''} ${log.utilisateur.nom || ''}`.trim()
      : 'Un utilisateur';

    const messages: {[key: string]: string} = {
      'CONNEXION': `${utilisateur} s'est connecté(e) à la plateforme.`,
      'INSCRIPTION': `${utilisateur} vient de s'inscrire sur Talentis.`,
      'CREATION_OFFRE': `${utilisateur} a créé une nouvelle offre.`,
      'MODIFICATION_OFFRE': `${utilisateur} a modifié une offre.`,
      'SUPPRESSION_OFFRE': `${utilisateur} a supprimé une offre.`,
      'POSTULATION': `${utilisateur} a postulé à une offre.`,
      'CANDIDATURE_DEPOSEE': `${utilisateur} a déposé une candidature.`,
      'CANDIDATURE_ACCEPTEE': `La candidature de ${utilisateur} a été acceptée.`,
      'CANDIDATURE_REFUSEE': `La candidature de ${utilisateur} a été refusée.`,
      'GENERATION_CONVENTION': `${utilisateur} a généré une convention.`,
      'ENTRETIEN_PLANIFIE': `${utilisateur} a planifié un entretien.`,
      'ENTRETIEN_REALISE': `Un entretien a été réalisé par ${utilisateur}.`,
      'EVALUATION_CREEE': `${utilisateur} a créé une évaluation.`,
      'LIVRABLE_SOUMIS': `${utilisateur} a soumis un nouveau livrable.`,
      'MESSAGE_ENVOYE': `${utilisateur} a envoyé un message.`,
      'ENVOI_MESSAGE': `${utilisateur} a envoyé un message.`
    };
    return messages[log.action] || `${utilisateur} a effectué l'action: ${log.action}`;
  }

  private getLogType(action: string): string {
    const types: {[key: string]: string} = {
      'CONNEXION': 'auth',
      'INSCRIPTION': 'auth',
      'CREATION_OFFRE': 'offre',
      'MODIFICATION_OFFRE': 'offre',
      'SUPPRESSION_OFFRE': 'offre',
      'POSTULATION': 'candidature',
      'CANDIDATURE_DEPOSEE': 'candidature',
      'CANDIDATURE_ACCEPTEE': 'candidature',
      'CANDIDATURE_REFUSEE': 'candidature',
      'GENERATION_CONVENTION': 'convention',
      'ENTRETIEN_PLANIFIE': 'entretien',
      'ENTRETIEN_REALISE': 'entretien',
      'EVALUATION_CREEE': 'evaluation',
      'LIVRABLE_SOUMIS': 'livrable',
      'MESSAGE_ENVOYE': 'message',
      'ENVOI_MESSAGE': 'message'
    };
    return types[action] || 'autre';
  }

  // =============================================
  // STATS
  // =============================================
  updateStats(): void {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    this.stats.total = this.notifications.length;
    this.stats.nonLues = this.notifications.filter(n => !n.lu).length;
    this.stats.lues = this.notifications.filter(n => n.lu).length;
    this.stats.aujourdhui = this.notifications.filter(n => new Date(n.dateCreation) >= today).length;
    this.stats.cetteSemaine = this.notifications.filter(n => new Date(n.dateCreation) >= weekAgo).length;
    this.stats.ceMois = this.notifications.filter(n => new Date(n.dateCreation) >= monthAgo).length;
  }

  // =============================================
  // FILTRES
  // =============================================
  applyFilters(): void {
    let filtered = [...this.notifications];

    if (this.isAdmin) {
      filtered = this.filterByCategory(filtered);
    }

    if (this.filterType === 'unread') {
      filtered = filtered.filter(n => !n.lu);
    } else if (this.filterType === 'read') {
      filtered = filtered.filter(n => n.lu);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(n =>
        n.titre.toLowerCase().includes(term) ||
        n.message.toLowerCase().includes(term) ||
        n.type.toLowerCase().includes(term) ||
        n.action.toLowerCase().includes(term) ||
        (n.utilisateur?.nom?.toLowerCase().includes(term) || false) ||
        (n.utilisateur?.prenom?.toLowerCase().includes(term) || false)
      );
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.dateCreation).getTime();
      const dateB = new Date(b.dateCreation).getTime();
      return dateB - dateA;
    });

    this.filteredNotifications = filtered;
    this.updatePagination();
  }

  onFilterChange(type: 'all' | 'unread' | 'read'): void {
    this.filterType = type;
    this.currentPage = 1;
    this.selectedIds.clear();
    this.applyFilters();
  }

  onSearchChange(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.currentPage = 1;
    this.selectedIds.clear();
    this.applyFilters();
  }

  // =============================================
  // PAGINATION
  // =============================================
  updatePagination(): void {
    const total = this.filteredNotifications.length;

    const parsedSize = Number(this.pageSize);
    this.pageSize = (isNaN(parsedSize) || parsedSize < 1) ? 10 : parsedSize;

    const parsedPage = Number(this.currentPage);
    this.currentPage = (isNaN(parsedPage) || parsedPage < 1) ? 1 : parsedPage;

    this.totalPages = Math.max(1, Math.ceil(total / this.pageSize));
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;

    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  getPagesArray(): number[] {
    const total = this.filteredNotifications.length;
    const size = Number(this.pageSize) || 10;
    const pagesCount = Math.max(1, Math.ceil(total / size));
    return Array.from({ length: pagesCount }, (_, i) => i + 1);
  }

  get paginatedNotifications(): Notification[] {
    const page = Number(this.currentPage) || 1;
    const size = Number(this.pageSize) || 10;
    const start = (page - 1) * size;
    return this.filteredNotifications.slice(start, start + size);
  }

  getStartIndex(): number {
    if (this.filteredNotifications.length === 0) return 0;
    const page = Number(this.currentPage) || 1;
    const size = Number(this.pageSize) || 10;
    return (page - 1) * size + 1;
  }

  getEndIndex(): number {
    if (this.filteredNotifications.length === 0) return 0;
    const page = Number(this.currentPage) || 1;
    const size = Number(this.pageSize) || 10;
    return Math.min(page * size, this.filteredNotifications.length);
  }

  goToPage(page: number): void {
    const p = Number(page);
    if (isNaN(p)) return;
    if (p >= 1 && p <= this.totalPages) this.currentPage = p;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  previousPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  onPageSizeChange(value: any): void {
    const newSize = Number(value);
    this.pageSize = (isNaN(newSize) || newSize < 1) ? 10 : newSize;
    this.currentPage = 1;
    this.updatePagination();
  }

  changePageSize(size: number): void {
    this.onPageSizeChange(size);
  }

  // =============================================
  // SÉLECTION
  // =============================================
  isSelected(id: number): boolean {
    return this.selectedIds.has(id);
  }

  toggleSelect(id: number): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  get allPageSelected(): boolean {
    const page = this.paginatedNotifications;
    return page.length > 0 && page.every(n => this.selectedIds.has(n.id));
  }

  get somePageSelected(): boolean {
    return this.paginatedNotifications.some(n => this.selectedIds.has(n.id));
  }

  toggleSelectPage(): void {
    const page = this.paginatedNotifications;
    if (this.allPageSelected) {
      page.forEach(n => this.selectedIds.delete(n.id));
    } else {
      page.forEach(n => this.selectedIds.add(n.id));
    }
  }

  selectAllFiltered(): void {
    this.filteredNotifications.forEach(n => this.selectedIds.add(n.id));
  }

  clearSelection(): void {
    this.selectedIds.clear();
  }

  // =============================================
  // ACTIONS : LUE / NON LUE
  // =============================================
  markAsRead(notif: Notification): void {
    if (notif.lu) return;

    this.notificationService.markAsRead(notif.id);
    this.notifications = this.notifications.map(n =>
      n.id === notif.id ? { ...n, lu: true } : n
    );
    this.updateStats();
    this.updateCategoryCounts();
    this.applyFilters();
  }

  markAsUnread(notif: Notification): void {
    if (!notif.lu) return;

    this.notificationService.markAsUnread(notif.id);
    this.notifications = this.notifications.map(n =>
      n.id === notif.id ? { ...n, lu: false } : n
    );
    this.updateStats();
    this.updateCategoryCounts();
    this.applyFilters();
  }

  toggleRead(notif: Notification): void {
    if (notif.lu) {
      this.markAsUnread(notif);
    } else {
      this.markAsRead(notif);
    }
  }

  markAllAsRead(): void {
    this.notifications = this.notifications.map(n => ({ ...n, lu: true }));
    this.notificationService.markAllAsReadForRole('SUPER_ADMIN');
    this.updateStats();
    this.updateCategoryCounts();
    this.applyFilters();
    this.showToastMessage('Toutes les notifications sont lues', 'success');
  }

  // =============================================
  // ACTIONS : ARCHIVER
  // =============================================
  archiverNotif(notif: Notification): void {
    if (!confirm('Archiver cette notification ?')) return;

    this.notificationService.archiver(notif.id);
    this.notifications = this.notifications.filter(n => n.id !== notif.id);
    this.selectedIds.delete(notif.id);

    this.updateStats();
    this.updateCategoryCounts();
    this.applyFilters();
    this.showToastMessage('Notification archivée', 'info');
  }

  archiveSelected(): void {
    if (this.selectedIds.size === 0) return;
    if (!confirm(`Archiver ${this.selectedIds.size} notification(s) ?`)) return;

    this.selectedIds.forEach(id => this.notificationService.archiver(id));
    this.notifications = this.notifications.filter(n => !this.selectedIds.has(n.id));
    this.selectedIds.clear();

    this.updateStats();
    this.updateCategoryCounts();
    this.applyFilters();
    this.showToastMessage('Notifications archivées', 'info');
  }

  // =============================================
  // ACTIONS : SUPPRIMER
  // =============================================
  deleteNotification(id: number): void {
    if (!confirm('Supprimer cette notification ?')) return;

    this.notificationService.delete(id);
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.selectedIds.delete(id);

    // Persister la suppression
    const deleted = this.getDeletedIds();
    if (!deleted.includes(id)) {
      deleted.push(id);
      this.saveDeletedIds(deleted);
    }

    this.updateStats();
    this.updateCategoryCounts();
    this.applyFilters();
    this.showToastMessage('Notification supprimée', 'success');
  }

  deleteSelected(): void {
    if (this.selectedIds.size === 0) return;
    if (!confirm(`Supprimer ${this.selectedIds.size} notification(s) ?`)) return;

    const idsToDelete = Array.from(this.selectedIds);
    idsToDelete.forEach(id => this.notificationService.delete(id));

    // Persister
    const deleted = this.getDeletedIds();
    idsToDelete.forEach(id => { if (!deleted.includes(id)) deleted.push(id); });
    this.saveDeletedIds(deleted);

    this.notifications = this.notifications.filter(n => !this.selectedIds.has(n.id));
    this.selectedIds.clear();

    this.updateStats();
    this.updateCategoryCounts();
    this.applyFilters();
    this.showToastMessage('Notifications supprimées', 'success');
  }

  deleteAllRead(): void {
    const readNotifs = this.notifications.filter(n => n.lu);
    if (readNotifs.length === 0) {
      this.showToastMessage('Aucune notification lue à supprimer', 'info');
      return;
    }
    if (!confirm(`Supprimer ${readNotifs.length} notification(s) lue(s) ?`)) return;

    const idsToDelete = readNotifs.map(n => n.id);
    idsToDelete.forEach(id => this.notificationService.delete(id));

    const deleted = this.getDeletedIds();
    idsToDelete.forEach(id => { if (!deleted.includes(id)) deleted.push(id); });
    this.saveDeletedIds(deleted);

    this.notifications = this.notifications.filter(n => !n.lu);

    this.updateStats();
    this.updateCategoryCounts();
    this.applyFilters();
    this.showToastMessage('Notifications lues supprimées', 'success');
  }

  // =============================================
  // HELPERS AFFICHAGE
  // =============================================
  getNotificationTitle(notification: Notification): string {
    return notification.titre || `Action: ${notification.action}`;
  }

  getNotificationMessage(notification: Notification): string {
    return notification.message || `${notification.utilisateur?.prenom || 'Un utilisateur'} a effectué une action.`;
  }

  getActionLabel(action: string): string {
    const labels: {[key: string]: string} = {
      'CONNEXION': 'Connexion',
      'INSCRIPTION': 'Inscription',
      'CREATION_OFFRE': 'Offre',
      'MODIFICATION_OFFRE': 'Offre modifiée',
      'SUPPRESSION_OFFRE': 'Offre supprimée',
      'POSTULATION': 'Candidature',
      'PRE_SELECTION': 'Pré-sélection',
      'DECISION_CANDIDATURE': 'Décision',
      'PLANIFICATION_ENTRETIEN': 'Entretien',
      'ENTRETIEN_REALISE': 'Entretien réalisé',
      'EVALUATION': 'Évaluation',
      'EVALUATION_CREEE': 'Évaluation',
      'SOUMISSION_LIVRABLE': 'Livrable',
      'LIVRABLE_SOUMIS': 'Livrable',
      'REVISION_LIVRABLE': 'Livrable révisé',
      'UPLOAD_DOCUMENT': 'Document',
      'ENVOI_MESSAGE': 'Message',
      'MESSAGE_ENVOYE': 'Message',
      'GENERATION_CONVENTION': 'Convention',
      'CANDIDATURE_DEPOSEE': 'Candidature',
      'CANDIDATURE_ACCEPTEE': 'Candidature acceptée',
      'CANDIDATURE_REFUSEE': 'Candidature refusée',
      'ENTRETIEN_PLANIFIE': 'Entretien',
      'CONNEXION_ENCADRANT': 'Appel encadrant',
      'CONNEXION_STAGIAIRE': 'Appel stagiaire',
      'APPEL': 'Appel',
      'DEMARRAGE_APPEL': 'Appel démarré',
      'FIN_APPEL': 'Appel terminé',
      'MESSAGE': 'Message',
      'DOCUMENT': 'Document',
      'CANDIDATURE': 'Candidature',
      'ATTRIBUTION_ROLE': 'Rôle attribué',
      'ENVOI_WHATSAPP': 'WhatsApp',
    };
    return labels[action] || action || 'Action';
  }

  getTypeClass(type: string): string {
    const classes: {[key: string]: string} = {
      'auth': 'type-auth',
      'offre': 'type-offre',
      'candidature': 'type-candidature',
      'CANDIDATURE': 'type-candidature',
      'entretien': 'type-entretien',
      'ENTRETIEN': 'type-entretien',
      'evaluation': 'type-evaluation',
      'EVALUATION': 'type-evaluation',
      'livrable': 'type-livrable',
      'LIVRABLE': 'type-livrable',
      'document': 'type-document',
      'DOCUMENT': 'type-document',
      'message': 'type-message',
      'MESSAGE': 'type-message',
      'convention': 'type-convention',
      'CONVENTION': 'type-convention',
      'DISPONIBILITE': 'type-dispo',
      'INSCRIPTION': 'type-inscription',
      'ATTRIBUTION_ROLE': 'type-inscription',
      'ENVOI_WHATSAPP': 'type-message',
      'APPEL': 'type-appel',
      'info': 'type-info',
      'success': 'type-success',
      'warning': 'type-warning',
      'error': 'type-error',
      'autre': 'type-default'
    };
    return classes[type] || 'type-default';
  }

  getTypeIcon(type: string, action: string): string {
    // Gardé pour compatibilité, mais pas utilisé dans le HTML sans icônes
    return '';
  }

  getTimeAgo(date: Date | string): string {
    const now = new Date();
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (!dateObj || isNaN(dateObj.getTime())) return 'Date inconnue';

    const diffMs = now.getTime() - dateObj.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);

    if (diffMin < 1) return 'À l\'instant';
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffHour < 24) return `Il y a ${diffHour}h`;
    if (diffDay === 1) return 'Hier';
    if (diffDay < 7) return `Il y a ${diffDay}j`;
    if (diffWeek < 4) return `Il y a ${diffWeek} sem`;
    if (diffMonth < 12) return `Il y a ${diffMonth} mois`;
    return dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // =============================================
  // TOAST (local au composant)
  // =============================================
  showToastMessage(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    if (type === 'success') this.notificationService.showSuccess(message);
    else if (type === 'error') this.notificationService.showError(message);
    else if (type === 'warning') this.notificationService.showWarning(message);
    else this.notificationService.showInfo(message);
  }

  // =============================================
  // NAVIGATION
  // =============================================
  goBack(): void {
    this.back.emit();
    this.location.back();
  }
}