import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UtilisateurService } from '../../services/utilisateur.service';
import { NotificationService, AppNotification } from '../../services/notification.service';

export interface DashboardStat {
  label: string;
  value: number;
  icon: string;
  accentClass: string;
}

@Component({
  selector: 'app-dashboard-candidat',
  templateUrl: './dashboard-candidat.component.html',
  styleUrls: ['./dashboard-candidat.component.css']
})
export class DashboardCandidatComponent implements OnInit, OnDestroy {

  // ---- Header ----
  adminName = 'Candidat';
  adminRole = 'Candidat';
  notificationCount = 0;
  notifications: AppNotification[] = [];

  // 'dashboard' | 'candidatures'
  activeRoute = 'dashboard';

  // ---- Data ----
  candidatures: any[] = [];
  stats: DashboardStat[] = [];
  loading = true;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private utilisateurService: UtilisateurService,
    public notifService: NotificationService
  ) {}

  ngOnInit(): void {
    this.utilisateurService.user$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.adminName = [user.prenom, user.nom].filter(Boolean).join(' ') || user.email || 'Candidat';
        this.notifService.chargerDepuisBackend(user.id);
      }
    });

    this.notifService.notifications$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.notifications = this.notifService.getForRole('EMPLOYE');
      this.notificationCount = this.notifService.getUnreadCountForRole('EMPLOYE');
    });

    const user = this.utilisateurService.getCurrentUser();
    if (user && user.id) {
      this.utilisateurService.getCandidaturesByCandidat(user.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: (data: any[]) => {
          this.candidatures = data ?? [];
          this.loading = false;
          this.computeStats();
        },
        error: () => {
          this.errorMessage = 'Impossible de charger vos candidatures.';
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
  }

  setRoute(route: string): void {
    this.activeRoute = route;
  }

  private computeStats(): void {
    const enCours = this.candidatures.filter(c => c.statut === 'EN_ATTENTE' || c.statut === 'EN_ANALYSE' || c.statut === 'ENTRETIEN_PLANIFIE' || c.statut === 'ENTRETIEN_REALISE').length;
    const acceptees = this.candidatures.filter(c => c.statut === 'ACCEPTE').length;
    const refusees = this.candidatures.filter(c => c.statut === 'REFUSE').length;

    this.stats = [
      { label: 'Candidatures envoyées', value: this.candidatures.length, icon: 'file', accentClass: 'accent-orange' },
      { label: 'En cours', value: enCours, icon: 'briefcase', accentClass: 'accent-blue' },
      { label: 'Acceptées', value: acceptees, icon: 'shield', accentClass: 'accent-purple' },
      { label: 'Refusées', value: refusees, icon: 'file', accentClass: 'accent-red' }
    ];
  }

  getStatusClass(statut: string): string {
    const map: { [key: string]: string } = {
      'EN_ATTENTE': 'badge-orange',
      'EN_ANALYSE': 'badge-orange',
      'ENTRETIEN_PLANIFIE': 'badge-purple',
      'ENTRETIEN_REALISE': 'badge-purple',
      'ACCEPTE': 'badge-blue',
      'REFUSE': 'badge-red'
    };
    return map[statut] || 'badge-gray';
  }

  onLogout(): void {
    this.utilisateurService.logout();
  }

  
}
