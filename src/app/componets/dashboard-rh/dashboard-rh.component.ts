import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UtilisateurService } from '../../services/utilisateur.service';
import { NotificationService, AppNotification } from '../../services/notification.service';

// ============================================================
// 📦 INTERFACES
// ============================================================
export interface SujetPfe {
  id?: number;
  titre: string;
  description: string;
  technologies: string;
  competencesRequises: string;
  nombrePlaces: number;
  objectifs: string;
  livrables: string;
}

export interface OffrePfeForm {
  titre: string;
  departement: string;
  lieu: string;
  description: string;
  profilRecherche: string;
  type: 'STAGE_PFE';
  dateLimite: string;
  niveauEtudeRequis: string;
  specialiteRequise: string;
  nombrePlacesTotal: number;
  periodeStage: string;
  avantages: string;
  prerequis: string;
  sujets: SujetPfe[];
}

export interface DashboardStat {
  label: string;
  value: number | string;
  icon: string;
  accentClass: string;
}

@Component({
  selector: 'app-dashboard-rh',
  templateUrl: './dashboard-rh.component.html',
  styleUrls: ['./dashboard-rh.component.css']
})
export class DashboardRhComponent implements OnInit, OnDestroy {

  // ---- Header ----
  adminName = 'RH';
  adminRole = 'Ressources Humaines';
  notificationCount = 0;
  notifications: AppNotification[] = [];
  showNotifications = false;

  activeRoute = 'dashboard';

  // ---- Data ----
  offres: any[] = [];
  candidatures: any[] = [];
  encadrants: any[] = [];
  recruteurs: any[] = [];
  stats: DashboardStat[] = [];

  offresLoading = true;
  candidaturesLoading = true;
  errorMessage = '';

  // ---- Modal Offre classique ----
  showOffreModal = false;
  savingOffre = false;
  modalError = '';
  editingOffreId: number | null = null;
  offreForm = {
    titre: '',
    departement: '',
    lieu: '',
    profilRecherche: '',
    description: '',
    dureeEnMois: 3,
    dateLimite: '',
    type: 'STAGE' as 'STAGE' | 'STAGE_PFE' | 'EMPLOI'
  };

  // ---- Modal Offre PFE ----
  showOffrePfeModal = false;
  savingOffrePfe = false;
  editingOffrePfeId: number | null = null;
  offrePfeForm: OffrePfeForm = this.creerFormPfeVide();

  // ---- Modal Affecter Encadrant ----
  showEncadrantModal = false;
  candidatureSelectionnee: any = null;
  encadrantSelectionne: number | null = null;
  savingEncadrant = false;

  // =============================================
  // 📄 BOOK PFE PAR ANNÉE
  // =============================================
  showBookPfeAnneeModal = false;
  anneesDisponibles: number[] = [2025, 2026, 2027, 2028];
  anneeSelectionnee: number | null = null;
  bookPfeLoading = false;

  // =============================================
  // 📄 PAGINATION
  // =============================================
  offresPage = 1;
  offresPageSize = 10;
  offresTotalPages = 1;

  candidaturesPage = 1;
  candidaturesPageSize = 10;
  candidaturesTotalPages = 1;

  recruteursPage = 1;
  recruteursPageSize = 10;
  recruteursTotalPages = 1;

  private currentUser: any = null;
  private destroy$ = new Subject<void>();

  constructor(
    private utilisateurService: UtilisateurService,
    private router: Router,
    public notifService: NotificationService
  ) {}

  // =============================================
  // 🚀 LIFECYCLE
  // =============================================
  ngOnInit(): void {
    this.utilisateurService.user$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.adminName = [user.prenom, user.nom].filter(Boolean).join(' ') || user.email || 'RH';
        this.adminRole = user.role === 'RESPONSABLE_RH' ? 'Responsable RH' : 'Ressources Humaines';
        this.notifService.chargerDepuisBackend(user.id);
      }
    });
    if (!this.currentUser) {
      this.currentUser = this.utilisateurService.getCurrentUser();
    }

    this.notifService.notifications$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      const role = this.currentUser?.role === 'RESPONSABLE_RH' ? 'RESPONSABLE_RH' : 'RH';
      this.notifications = this.notifService.getForRole(role);
      this.notificationCount = this.notifService.getUnreadCountForRole(role);
    });

    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =============================================
  // 📢 NOTIFICATIONS
  // =============================================
  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  marquerNotificationLue(n: AppNotification): void {
    if (!n.lu) {
      this.notifService.markAsRead(n.id);
    }
  }

  marquerToutesLues(): void {
    const role = this.currentUser?.role === 'RESPONSABLE_RH' ? 'RESPONSABLE_RH' : 'RH';
    this.notifService.markAllAsReadForRole(role);
  }

  // =============================================
  // 🧭 ROUTES
  // =============================================
  setRoute(route: string): void {
    this.activeRoute = route;
    this.showNotifications = false;
    if (route === 'offres') this.loadOffres();
    if (route === 'candidatures') this.loadCandidatures();
    if (route === 'recruteurs') this.loadRecruteurs();
  }

  // =============================================
  // 📥 CHARGEMENT
  // =============================================
  private loadDashboard(): void {
    this.offresLoading = true;
    this.candidaturesLoading = true;
    this.errorMessage = '';

    forkJoin({
      offres: this.utilisateurService.getAllOffres(),
      candidatures: this.utilisateurService.getAllCandidatures(),
      utilisateurs: this.utilisateurService.getAllUtilisateurs()
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ offres, candidatures, utilisateurs }) => {
        this.offres = offres ?? [];
        this.candidatures = candidatures ?? [];
        this.encadrants = (utilisateurs ?? []).filter((u: any) => u.role === 'ENCADRANT');
        this.recruteurs = (utilisateurs ?? []).filter((u: any) => u.role === 'RH' || u.role === 'RESPONSABLE_RH');
        this.offresLoading = false;
        this.candidaturesLoading = false;
        this.recalculerPagination();
        this.computeStats();
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les données.';
        this.offresLoading = false;
        this.candidaturesLoading = false;
      }
    });
  }

  private loadOffres(): void {
    this.offresLoading = true;
    this.utilisateurService.getAllOffres().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.offres = data ?? [];
        this.offresLoading = false;
        this.recalculerPagination();
        this.computeStats();
      },
      error: () => {
        this.offresLoading = false;
        this.errorMessage = 'Impossible de charger les offres.';
      }
    });
  }

  private loadCandidatures(): void {
    this.candidaturesLoading = true;
    this.utilisateurService.getAllCandidatures().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.candidatures = data ?? [];
        this.candidaturesLoading = false;
        this.recalculerPagination();
        this.computeStats();
      },
      error: () => {
        this.candidaturesLoading = false;
        this.errorMessage = 'Impossible de charger les candidatures.';
      }
    });
  }

  private loadRecruteurs(): void {
    this.utilisateurService.getAllUtilisateurs().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.recruteurs = (data ?? []).filter((u: any) => u.role === 'RH' || u.role === 'RESPONSABLE_RH');
        this.recalculerPagination();
        this.computeStats();
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les recruteurs.';
      }
    });
  }

  // =============================================
  // 📄 PAGINATION
  // =============================================
  private recalculerPagination(): void {
    this.offresTotalPages = Math.max(1, Math.ceil(this.offres.length / this.offresPageSize));
    this.candidaturesTotalPages = Math.max(1, Math.ceil(this.candidatures.length / this.candidaturesPageSize));
    this.recruteursTotalPages = Math.max(1, Math.ceil(this.recruteurs.length / this.recruteursPageSize));

    if (this.offresPage > this.offresTotalPages) this.offresPage = 1;
    if (this.candidaturesPage > this.candidaturesTotalPages) this.candidaturesPage = 1;
    if (this.recruteursPage > this.recruteursTotalPages) this.recruteursPage = 1;
  }

  get offresPaginees(): any[] {
    const start = (this.offresPage - 1) * this.offresPageSize;
    return this.offres.slice(start, start + this.offresPageSize);
  }

  get candidaturesPaginees(): any[] {
    const start = (this.candidaturesPage - 1) * this.candidaturesPageSize;
    return this.candidatures.slice(start, start + this.candidaturesPageSize);
  }

  get recruteursPagines(): any[] {
    const start = (this.recruteursPage - 1) * this.recruteursPageSize;
    return this.recruteurs.slice(start, start + this.recruteursPageSize);
  }

  get pagesOffres(): number[] {
    return Array.from({ length: this.offresTotalPages }, (_, i) => i + 1);
  }
  get pagesCandidatures(): number[] {
    return Array.from({ length: this.candidaturesTotalPages }, (_, i) => i + 1);
  }
  get pagesRecruteurs(): number[] {
    return Array.from({ length: this.recruteursTotalPages }, (_, i) => i + 1);
  }

  changerPageOffres(p: number): void {
    if (p < 1 || p > this.offresTotalPages) return;
    this.offresPage = p;
  }
  changerPageCandidatures(p: number): void {
    if (p < 1 || p > this.candidaturesTotalPages) return;
    this.candidaturesPage = p;
  }
  changerPageRecruteurs(p: number): void {
    if (p < 1 || p > this.recruteursTotalPages) return;
    this.recruteursPage = p;
  }

  // =============================================
  // 📊 STATS
  // =============================================
  private computeStats(): void {
    const offresOuvertes = this.offres.filter(o => o.statut === 'OUVERTE').length;
    const candidaturesEnAttente = this.candidatures.filter(
      c => c.statut === 'EN_ATTENTE' || c.statut === 'EN_ANALYSE'
    ).length;
    const candidaturesAcceptees = this.candidatures.filter(c => c.statut === 'ACCEPTE').length;
    const totalDecidees = this.candidatures.filter(
      c => c.statut === 'ACCEPTE' || c.statut === 'REFUSE'
    ).length;
    const tauxConversion = totalDecidees > 0
      ? Math.round((candidaturesAcceptees / totalDecidees) * 100)
      : 0;

    this.stats = [
      { label: 'Offres publiées',         value: this.offres.length,   icon: 'briefcase', accentClass: 'accent-orange' },
      { label: 'Offres ouvertes',         value: offresOuvertes,        icon: 'briefcase', accentClass: 'accent-blue'   },
      { label: 'Candidatures en attente', value: candidaturesEnAttente, icon: 'file',      accentClass: 'accent-red'    },
      { label: 'Taux conversion',         value: tauxConversion + '%',  icon: 'shield',    accentClass: 'accent-purple' }
    ];
  }

  // =============================================
  // 📝 OFFRES - CRUD CLASSIQUE
  // =============================================
  openOffreModal(): void {
    this.offreForm = {
      titre: '',
      departement: '',
      lieu: '',
      profilRecherche: '',
      description: '',
      dureeEnMois: 3,
      dateLimite: '',
      type: 'STAGE'
    };
    this.modalError = '';
    this.editingOffreId = null;
    this.showOffreModal = true;
  }

  closeOffreModal(): void {
    this.showOffreModal = false;
    this.editingOffreId = null;
  }

  saveOffre(): void {
    if (!this.offreForm.titre || !this.offreForm.departement) {
      this.modalError = 'Le titre et le département sont obligatoires.';
      return;
    }
    const publieParId = this.currentUser?.id;
    if (!publieParId) {
      this.modalError = "Utilisateur non identifié.";
      return;
    }

    this.savingOffre = true;
    this.modalError = '';

    const offreData = {
      ...this.offreForm,
      dateLimite: this.offreForm.dateLimite || null
    };

    this.utilisateurService.createOffre(offreData, publieParId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.savingOffre = false;
        this.showOffreModal = false;
        this.loadOffres();
        this.notifService.showSuccess('Offre créée avec succès !');
      },
      error: (err) => {
        this.savingOffre = false;
        this.modalError = "Erreur lors de la création: " + (err.error?.message || '');
      }
    });
  }

  modifierOffre(offre: any): void {
    if (offre.type === 'STAGE_PFE') {
      this.modifierOffrePfe(offre);
      return;
    }

    this.offreForm = {
      titre: offre.titre || '',
      departement: offre.departement || '',
      lieu: offre.lieu || '',
      profilRecherche: offre.profilRecherche || '',
      description: offre.description || '',
      dureeEnMois: offre.dureeEnMois || 3,
      dateLimite: offre.dateLimite?.split('T')[0] || '',
      type: offre.type || 'STAGE'
    };
    this.editingOffreId = offre.id;
    this.modalError = '';
    this.showOffreModal = true;
  }

  updateOffre(): void {
    if (!this.offreForm.titre || !this.offreForm.departement) {
      this.modalError = 'Le titre et le département sont obligatoires.';
      return;
    }
    if (!this.editingOffreId) {
      this.modalError = 'Offre non identifiée.';
      return;
    }

    this.savingOffre = true;
    this.modalError = '';

    const offreData = {
      ...this.offreForm,
      dateLimite: this.offreForm.dateLimite || null
    };

    this.utilisateurService.modifierOffre(this.editingOffreId, offreData).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.savingOffre = false;
        this.showOffreModal = false;
        this.loadOffres();
        this.notifService.showSuccess('Offre modifiée avec succès !');
      },
      error: (err) => {
        this.savingOffre = false;
        this.modalError = "Erreur lors de la modification: " + (err.error?.message || '');
      }
    });
  }

  deleteOffre(o: any): void {
    if (!confirm(`Supprimer l'offre "${o.titre}" ?`)) { return; }
    this.utilisateurService.deleteOffre(o.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.offres = this.offres.filter(x => x.id !== o.id);
        this.recalculerPagination();
        this.computeStats();
        this.notifService.showSuccess('Offre supprimée avec succès');
      },
      error: () => {
        this.errorMessage = "Impossible de supprimer cette offre.";
        this.notifService.showError('Erreur lors de la suppression');
      }
    });
  }

  // =============================================
  // 🎓 OFFRES PFE - CRUD
  // =============================================
  creerFormPfeVide(): OffrePfeForm {
    return {
      titre: '',
      departement: '',
      lieu: '',
      description: '',
      profilRecherche: '',
      type: 'STAGE_PFE',
      dateLimite: '',
      niveauEtudeRequis: 'Bac+5',
      specialiteRequise: '',
      nombrePlacesTotal: 1,
      periodeStage: '',
      avantages: '',
      prerequis: '',
      sujets: []
    };
  }

  openOffrePfeModal(): void {
    this.offrePfeForm = this.creerFormPfeVide();
    this.ajouterSujet();
    this.modalError = '';
    this.editingOffrePfeId = null;
    this.showOffrePfeModal = true;
  }

  closeOffrePfeModal(): void {
    this.showOffrePfeModal = false;
    this.editingOffrePfeId = null;
  }

  ajouterSujet(): void {
    this.offrePfeForm.sujets.push({
      titre: '',
      description: '',
      technologies: '',
      competencesRequises: '',
      nombrePlaces: 1,
      objectifs: '',
      livrables: ''
    });
  }

  supprimerSujet(index: number): void {
    this.offrePfeForm.sujets.splice(index, 1);
  }

  modifierOffrePfe(offre: any): void {
    this.offrePfeForm = {
      titre: offre.titre || '',
      departement: offre.departement || '',
      lieu: offre.lieu || '',
      description: offre.description || '',
      profilRecherche: offre.profilRecherche || '',
      type: 'STAGE_PFE',
      dateLimite: offre.dateLimite?.split('T')[0] || '',
      niveauEtudeRequis: offre.niveauEtudeRequis || 'Bac+5',
      specialiteRequise: offre.specialiteRequise || '',
      nombrePlacesTotal: offre.nombrePlacesTotal || 1,
      periodeStage: offre.periodeStage || '',
      avantages: offre.avantages || '',
      prerequis: offre.prerequis || '',
      sujets: (offre.sujets || []).map((s: any) => ({
        id: s.id,
        titre: s.titre || '',
        description: s.description || '',
        technologies: s.technologies || '',
        competencesRequises: s.competencesRequises || '',
        nombrePlaces: s.nombrePlaces || 1,
        objectifs: s.objectifs || '',
        livrables: s.livrables || ''
      }))
    };
    if (this.offrePfeForm.sujets.length === 0) {
      this.ajouterSujet();
    }
    this.editingOffrePfeId = offre.id;
    this.modalError = '';
    this.showOffrePfeModal = true;
  }

  saveOffrePfe(): void {
    if (!this.offrePfeForm.titre || !this.offrePfeForm.departement) {
      this.modalError = 'Le titre et le département sont obligatoires.';
      return;
    }
    if (this.offrePfeForm.sujets.length === 0) {
      this.modalError = 'Ajoutez au moins un sujet PFE.';
      return;
    }
    for (let i = 0; i < this.offrePfeForm.sujets.length; i++) {
      if (!this.offrePfeForm.sujets[i].titre) {
        this.modalError = `Le titre du sujet N°${i + 1} est obligatoire.`;
        return;
      }
    }

    const publieParId = this.currentUser?.id;
    if (!publieParId && !this.editingOffrePfeId) {
      this.modalError = "Utilisateur non identifié.";
      return;
    }

    const payload: any = {
      ...this.offrePfeForm,
      dateLimite: this.offrePfeForm.dateLimite || null
    };

    this.savingOffrePfe = true;
    this.modalError = '';

    const request$ = this.editingOffrePfeId
      ? this.utilisateurService.modifierOffre(this.editingOffrePfeId, payload)
      : this.utilisateurService.createOffre(payload, publieParId!);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.savingOffrePfe = false;
        this.showOffrePfeModal = false;
        this.loadOffres();
        this.notifService.showSuccess(
          this.editingOffrePfeId
            ? 'Offre PFE modifiée avec succès !'
            : 'Offre PFE créée avec succès !'
        );
      },
      error: (err) => {
        this.savingOffrePfe = false;
        this.modalError = "Erreur: " + (err.error?.message || err.message || '');
      }
    });
  }

  // =============================================
  // 📄 CANDIDATURES
  // =============================================
  deciderCandidature(c: any, decision: 'ACCEPTE' | 'REFUSE'): void {
    this.utilisateurService.deciderCandidature(c.id, { decision }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        c.statut = decision;
        this.computeStats();
        this.notifService.showSuccess(`Candidature ${decision === 'ACCEPTE' ? 'acceptée' : 'refusée'} avec succès`);

        if (decision === 'ACCEPTE') {
          this.envoyerNotificationEntretien(c);
        }
      },
      error: () => {
        this.errorMessage = 'Impossible de mettre à jour cette candidature.';
        this.notifService.showError('Erreur lors de la décision');
      }
    });
  }

  envoyerNotificationEntretien(candidature: any): void {
    const candidat = candidature.candidat;
    const offre = candidature.offre;

    if (!candidat || !candidat.email) return;

    const lieu = offre?.lieu || 'À confirmer';
    const message = `Bonjour ${candidat.prenom}, un entretien est prévu pour le poste "${offre?.titre}". Lieu: ${lieu}. Confirmez votre disponibilité. - Attijari Workspace`;

    this.utilisateurService.envoyerWhatsApp(candidat.telephone, message).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => console.log('✅ WhatsApp envoyé à', candidat.telephone),
      error: (err) => console.error('❌ Erreur WhatsApp:', err)
    });
  }

  // =============================================
  // 👤 AFFECTER ENCADRANT
  // =============================================
  openAffecterEncadrant(candidature: any): void {
    this.candidatureSelectionnee = candidature;
    this.encadrantSelectionne = null;
    this.modalError = '';
    this.showEncadrantModal = true;
  }

  closeEncadrantModal(): void {
    this.showEncadrantModal = false;
    this.candidatureSelectionnee = null;
    this.encadrantSelectionne = null;
    this.modalError = '';
  }

  affecterEncadrant(): void {
    if (!this.encadrantSelectionne) {
      this.modalError = 'Veuillez sélectionner un encadrant.';
      return;
    }

    this.savingEncadrant = true;
    this.modalError = '';

    this.utilisateurService.assignerEncadrant(
      this.candidatureSelectionnee.id,
      this.encadrantSelectionne
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.savingEncadrant = false;
        this.closeEncadrantModal();
        this.loadCandidatures();
        this.notifService.showSuccess('Encadrant affecté avec succès !');
      },
      error: () => {
        this.savingEncadrant = false;
        this.modalError = "Erreur lors de l'affectation de l'encadrant.";
        this.notifService.showError('Erreur lors de l\'affectation');
      }
    });
  }

  // =============================================
  // 📄 BOOK PFE PAR ANNÉE
  // =============================================
  openBookPfeAnneeModal(): void {
    this.anneeSelectionnee = new Date().getFullYear();
    this.showBookPfeAnneeModal = true;

    this.utilisateurService.getAnneesDisponiblesBookPfe().pipe(takeUntil(this.destroy$)).subscribe({
      next: (annees) => {
        this.anneesDisponibles = (annees && annees.length > 0)
          ? annees
          : [2025, 2026, 2027, 2028];
      },
      error: () => {
        this.anneesDisponibles = [2025, 2026, 2027, 2028];
      }
    });
  }

  closeBookPfeAnneeModal(): void {
    this.showBookPfeAnneeModal = false;
    this.anneeSelectionnee = null;
  }

  telechargerBookPfeAnnee(): void {
    if (!this.anneeSelectionnee) {
      this.notifService.showError('Veuillez sélectionner une année');
      return;
    }

    this.bookPfeLoading = true;
    const annee = this.anneeSelectionnee;

    this.utilisateurService.getBookPfeParAnnee(annee).pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `book-pfe-${annee}-${annee + 1}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.bookPfeLoading = false;
        this.showBookPfeAnneeModal = false;
        this.notifService.showSuccess('Book PFE téléchargé');
      },
      error: (err: any) => {
        this.bookPfeLoading = false;
        console.error('Erreur Book PFE année:', err);
        this.notifService.showError('Impossible de générer le Book PFE pour cette année');
      }
    });
  }

  // =============================================
  // 📄 BOOK PFE PAR OFFRE
  // =============================================
  telechargerBookPfeParOffre(offre: any): void {
    if (!offre || !offre.id) {
      this.notifService.showError('Offre introuvable');
      return;
    }
    if (offre.type !== 'STAGE_PFE') {
      this.notifService.showError('Le Book PFE est réservé aux offres de type Stage PFE');
      return;
    }

    this.utilisateurService.getBookPfeParOffre(offre.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeTitre = (offre.titre || 'offre-' + offre.id)
          .replace(/[^a-zA-Z0-9-_]/g, '-')
          .toLowerCase();
        a.download = `book-pfe-${safeTitre}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.notifService.showSuccess('Book PFE téléchargé');
      },
      error: (err: any) => {
        console.error('Erreur Book PFE:', err);
        this.notifService.showError('Impossible de générer le Book PFE');
      }
    });
  }

  // =============================================
  // 🏷️ HELPERS
  // =============================================
  statutBadgeClass(statut: string): string {
    const map: Record<string, string> = {
      'OUVERTE': 'badge-blue',
      'ACCEPTE': 'badge-green',
      'EN_COURS': 'badge-orange',
      'EN_ATTENTE': 'badge-orange',
      'EN_ANALYSE': 'badge-orange',
      'CLOTUREE': 'badge-red',
      'REFUSE': 'badge-red',
      'ENTRETIEN_PLANIFIE': 'badge-purple',
      'ENTRETIEN_REALISE': 'badge-purple'
    };
    return map[statut] || 'badge-gray';
  }

  initials(u: any): string {
    const p = (u.prenom || u.firstName || '').charAt(0);
    const n = (u.nom || u.lastName || '').charAt(0);
    return `${p}${n}`.toUpperCase() || '—';
  }

  onLogout(): void {
    this.utilisateurService.logout();
  }
}