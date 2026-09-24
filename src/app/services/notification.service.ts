import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface AppNotification {
  id: number;
  titre: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'APPEL' | 'MESSAGE' | 'DISPONIBILITE' | 'AFFECTATION' | 'CANDIDATURE' | 'LIVRABLE' | 'auth' | 'offre' | 'entretien' | 'evaluation' | 'document' | 'convention' | 'autre' | 'INSCRIPTION' | 'ENVOI_WHATSAPP' | 'ATTRIBUTION_ROLE';
  action?: string;
  timestamp: Date;
  lu: boolean;
  archivee?: boolean;
  roles?: string[];
  lien?: string;
  utilisateur?: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    role: string;
  };
  action_obj?: {
    label: string;
    url: string;
  };
}

export interface NotificationAction {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {

  private store: AppNotification[] = [];
  private readonly apiUrl = `${environment.apiUrl}/api/notifications`;
  private utilisateurIdActuel: number | null = null;

  private subject = new BehaviorSubject<AppNotification[]>(this.store);
  notifications$ = this.subject.asObservable();

  private notificationSubject = new Subject<NotificationAction>();
  notificationAction$ = this.notificationSubject.asObservable();

  constructor(private http: HttpClient) {}

  // =============================================
  // CHARGEMENT GLOBAL (Pour la cloche du Super Admin)
  // =============================================
  getAllNotifications(action?: string): Observable<AppNotification[]> {
    console.log('📥 Chargement de TOUTES les notifications...', action ? `(action: ${action})` : '');
    const url = action
      ? `${this.apiUrl}/all?action=${encodeURIComponent(action)}`
      : `${this.apiUrl}/all`;

    return this.http.get<any[]>(url).pipe(
      map((data: any[]) => {
        return (data || []).map(n => ({
          id: n.id,
          titre: n.titre || 'Notification',
          message: n.message || '',
          type: (n.type || 'info') as any,
          action: n.action,
          timestamp: this.parseDate(n.dateCreation || n.timestamp),
          lu: n.lu ?? false,
          archivee: false,
          lien: n.url || n.lien,
          roles: n.roles || undefined,
          utilisateur: n.utilisateur || null
        }));
      }),
      catchError(err => {
        console.error('❌ Erreur chargement notifications globales', err);
        return of([]);
      })
    );
  }

  /**
   * Récupère les statistiques par catégorie pour l'admin.
   */
  getAdminStats(): Observable<{ [key: string]: number }> {
    return this.http.get<{ [key: string]: number }>(`${this.apiUrl}/all/stats`).pipe(
      catchError(err => {
        console.error('❌ Erreur stats notifications admin', err);
        return of({});
      })
    );
  }

  // =============================================
  // Utilitaire — Parse date (Jackson array ou ISO string)
  // =============================================
  private parseDate(dateInput: any): Date {
    if (!dateInput) return new Date();
    if (dateInput instanceof Date) return dateInput;

    // Format Jackson : [year, month, day, hour, minute, second]
    if (Array.isArray(dateInput)) {
      const [year, month, day, hour = 0, minute = 0, second = 0] = dateInput;
      return new Date(year, month - 1, day, hour, minute, second);
    }

    // Format string
    if (typeof dateInput === 'string') {
      const normalized = dateInput.includes(' ') && !dateInput.includes('T')
        ? dateInput.replace(' ', 'T')
        : dateInput;
      return new Date(normalized);
    }

    return new Date(dateInput);
  }

  // =============================================
  // CHARGEMENT PAR UTILISATEUR
  // =============================================
  chargerDepuisBackend(utilisateurId: number): void {
    if (!utilisateurId) return;
    this.utilisateurIdActuel = utilisateurId;

    console.log('📥 Chargement notifications user ID:', utilisateurId);

    this.http.get<any[]>(`${this.apiUrl}/utilisateur/${utilisateurId}`).subscribe({
      next: (data) => {
        this.store = (data || []).map(n => ({
          id: n.id,
          titre: n.titre || 'Notification',
          message: n.message || '',
          type: (n.type || 'info') as any,
          action: n.action,
          timestamp: this.parseDate(n.dateCreation || n.timestamp),
          lu: n.lu ?? false,
          archivee: false,
          lien: n.url || n.lien,
          roles: n.roles || undefined
        }));
        this.subject.next([...this.store]);
      },
      error: (err) => console.error('❌ Erreur chargement notifications:', err)
    });
  }

  // =============================================
  // GETTERS
  // =============================================
  getForRole(role?: string): AppNotification[] {
    if (!role) return this.store;
    return this.store.filter(n => !n.roles || n.roles.length === 0 || n.roles.includes(role));
  }

  getUnreadCountForRole(role?: string): number {
    return this.getForRole(role).filter(n => !n.lu).length;
  }

  getTotalUnreadCount(): number {
    return this.store.filter(n => !n.lu).length;
  }

  getUnreadForRole(role?: string): AppNotification[] {
    return this.getForRole(role).filter(n => !n.lu);
  }

  getReadForRole(role?: string): AppNotification[] {
    return this.getForRole(role).filter(n => n.lu);
  }

  // =============================================
  // ACTION — Marquer lu
  // =============================================
  markAsRead(id: number): void {
    this.store = this.store.map(n => n.id === id ? { ...n, lu: true } : n);
    this.subject.next([...this.store]);
    this.http.put(`${this.apiUrl}/${id}/lu`, {}).subscribe({ error: () => {} });
  }

  markAllAsReadForRole(role?: string): void {
    this.store = this.store.map(n => ({ ...n, lu: true }));
    this.subject.next([...this.store]);
    if (this.utilisateurIdActuel) {
      this.http.put(`${this.apiUrl}/utilisateur/${this.utilisateurIdActuel}/tout-lire`, {})
        .subscribe({ error: () => {} });
    }
  }

  markAllAsRead(): void {
    this.store = this.store.map(n => ({ ...n, lu: true }));
    this.subject.next([...this.store]);
  }

  // =============================================
  // ACTION — Supprimer / Archiver
  // =============================================
  remove(id: number): void {
    this.store = this.store.filter(n => n.id !== id);
    this.subject.next([...this.store]);
  }

  delete(id: number): void {
    this.remove(id);
  }

  // =============================================
  // ✅ ARCHIVER (corrigé)
  // =============================================
  archiver(id: number): void {
    // Si pas d'endpoint backend, on retire localement
    this.store = this.store.filter(n => n.id !== id);
    this.subject.next([...this.store]);

    // Tentative côté backend (silencieuse si pas d'endpoint)
    this.http.put(`${this.apiUrl}/${id}/archiver`, {}).subscribe({
      next: () => console.log('✅ Notification archivée côté backend:', id),
      error: () => console.log('ℹ️ Archivage local uniquement pour:', id)
    });
  }

  // =============================================
  // ✅ MARQUER NON LUE (corrigé)
  // =============================================
  markAsUnread(id: number): void {
    this.store = this.store.map(n => n.id === id ? { ...n, lu: false } : n);
    this.subject.next([...this.store]);

    this.http.put(`${this.apiUrl}/${id}/non-lu`, {}).subscribe({
      next: () => console.log('✅ Marqué non lu côté backend:', id),
      error: () => console.log('ℹ️ Marquage non lu local uniquement pour:', id)
    });
  }

  // =============================================
  // Désarchiver
  // =============================================
  desarchiver(id: number): void {
    const notif = this.store.find(n => n.id === id);
    if (notif) {
      (notif as any).archivee = false;
      this.subject.next([...this.store]);
    }
  }

  // =============================================
  // CRÉATION LOCALE
  // =============================================
  add(notif: Omit<AppNotification, 'id' | 'timestamp' | 'lu'>): AppNotification {
    const newNotif: AppNotification = {
      ...notif,
      id: Date.now(),
      timestamp: new Date(),
      lu: false
    };
    this.store = [newNotif, ...this.store];
    this.subject.next([...this.store]);
    return newNotif;
  }

  addSuccess(titre: string, message: string, roles?: string[], lien?: string): AppNotification {
    return this.add({ titre, message, type: 'success', roles, lien } as any);
  }

  addInfo(titre: string, message: string, roles?: string[], lien?: string): AppNotification {
    return this.add({ titre, message, type: 'info', roles, lien } as any);
  }

  addWarning(titre: string, message: string, roles?: string[], lien?: string): AppNotification {
    return this.add({ titre, message, type: 'warning', roles, lien } as any);
  }

  addError(titre: string, message: string, roles?: string[], lien?: string): AppNotification {
    return this.add({ titre, message, type: 'error', roles, lien } as any);
  }

  // =============================================
  // TOASTS
  // =============================================
  showSuccess(message: string, duration: number = 3000): void {
    this.notificationSubject.next({ type: 'success', message, duration });
  }

  showError(message: string, duration: number = 5000): void {
    this.notificationSubject.next({ type: 'error', message, duration });
  }

  showWarning(message: string, duration: number = 4000): void {
    this.notificationSubject.next({ type: 'warning', message, duration });
  }

  showInfo(message: string, duration: number = 3000): void {
    this.notificationSubject.next({ type: 'info', message, duration });
  }

  showNotification(action: NotificationAction): void {
    this.notificationSubject.next(action);
  }

  // =============================================
  // UTILITAIRES
  // =============================================
  timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 5) return 'À l\'instant';
    if (seconds < 60) return `Il y a ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `Il y a ${days}j`;
    const months = Math.floor(days / 30);
    if (months < 12) return `Il y a ${months} mois`;
    const years = Math.floor(months / 12);
    return `Il y a ${years} an${years > 1 ? 's' : ''}`;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  getIconForType(type: string): string {
    const icons: Record<string, string> = {
      success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️',
      'APPEL': '📹', 'MESSAGE': '💬', 'DISPONIBILITE': '🟢',
      'AFFECTATION': '🎓', 'CANDIDATURE': '📋', 'LIVRABLE': '📄',
      'auth': '🔐', 'offre': '💼', 'entretien': '📅',
      'evaluation': '⭐', 'document': '📎', 'convention': '📝',
      'INSCRIPTION': '👤', 'ENVOI_WHATSAPP': '📱', 'ATTRIBUTION_ROLE': '🛡️',
      'autre': '🔔'
    };
    return icons[type] || '📢';
  }

  getClassForType(type: string): string {
    const classes: Record<string, string> = {
      success: 'notification-success', error: 'notification-error',
      warning: 'notification-warning', info: 'notification-info'
    };
    return classes[type] || 'notification-info';
  }

  getColorForType(type: string): string {
    const colors: Record<string, string> = {
      success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6'
    };
    return colors[type] || '#6b7280';
  }

  // =============================================
  // FILTRES
  // =============================================
  search(keyword: string, role?: string): AppNotification[] {
    const notifications = role ? this.getForRole(role) : this.store;
    const lowerKeyword = keyword.toLowerCase();
    return notifications.filter(n =>
      n.titre.toLowerCase().includes(lowerKeyword) ||
      n.message.toLowerCase().includes(lowerKeyword)
    );
  }

  getByType(type: string, role?: string): AppNotification[] {
    const notifications = role ? this.getForRole(role) : this.store;
    return notifications.filter(n => n.type === type);
  }

  getCountByType(role?: string): Record<string, number> {
    const notifications = role ? this.getForRole(role) : this.store;
    const counts: Record<string, number> = { success: 0, error: 0, warning: 0, info: 0 };
    notifications.forEach(n => {
      counts[n.type] = (counts[n.type] || 0) + 1;
    });
    return counts;
  }
}