import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Location } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OffreService, Offre } from '../../services/offre.service';
import { UtilisateurService } from '../../services/utilisateur.service';
import { DocumentService } from '../../services/document.service';

@Component({
  selector: 'app-offres-list',
  templateUrl: './offres-list.component.html',
  styleUrls: ['./offres-list.component.css']
})
export class OffresListComponent implements OnInit, OnDestroy {

  // 🆕 MODE : 'admin' (dashboard, comportement actuel) | 'public' (accueil, lecture seule)
  @Input() mode: 'admin' | 'public' = 'admin';

  // 🆕 OUTPUT : émet l'offre cliquée vers le parent (HomeComponent)
  @Output() offreClicked = new EventEmitter<Offre>();

  offres: Offre[] = [];
  loading = true;
  errorMessage = '';

  currentUser: any = null;
  isStagiaire = false;

  filtreType: 'TOUS' | 'STAGE' | 'EMPLOI' = 'TOUS';

  offresDejaPostulees = new Set<number>();

  showPostulerModal = false;
  offreSelectionnee: Offre | null = null;
  lettreMotivation = '';
  postulerEnCours = false;
  postulerError = '';
  postulerSuccess = '';

  cvFile: File | null = null;
  diplomeFile: File | null = null;
  carteEtudianteFile: File | null = null;
  cinFile: File | null = null;
  demandeStageFile: File | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private offreService: OffreService,
    private utilisateurService: UtilisateurService,
    private documentService: DocumentService,
    private location: Location
  ) {}

  goBack(): void {
    this.location.back();
  }

  ngOnInit(): void {
    // 🔀 MODE PUBLIC : pas de user connecté, pas de candidature
    if (this.mode === 'public') {
      this.currentUser = null;
      this.isStagiaire = false;
      this.filtreType = 'TOUS';   // en public on affiche tout par défaut
      this.chargerOffresPubliques();
      return;
    }

    // 🔀 MODE ADMIN : comportement existant préservé
    this.currentUser = this.utilisateurService.getCurrentUser();
    this.isStagiaire = this.currentUser?.role === 'STAGIAIRE';
    this.filtreType = this.isStagiaire ? 'STAGE' : 'EMPLOI';

    this.chargerOffres();
    this.chargerMesCandidatures();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =============================================
  // CHARGEMENT DES OFFRES
  // =============================================

  /** 🆕 Mode public : uniquement les offres ouvertes, via endpoint /api/public/offres */
 private chargerOffresPubliques(): void {
  this.loading = true;
  this.offreService.getOffresPubliques()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        console.log('✅ Offres reçues:', data);   // 🆕 AJOUTER
        this.offres = data as any;
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Erreur API:', err);     // 🆕 AJOUTER
        console.error('Status:', err.status);     // 🆕 AJOUTER
        console.error('Message:', err.message);   // 🆕 AJOUTER
        this.errorMessage = 'Impossible de charger les offres pour le moment.';
        this.loading = false;
      }
    });
}

  /** Mode admin : comportement existant */
  chargerOffres(): void {
    this.loading = true;
    this.offreService.getAll('OUVERTE').subscribe({
      next: (data) => {
        this.offres = data;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les offres pour le moment.';
        this.loading = false;
      }
    });
  }

  chargerMesCandidatures(): void {
    if (!this.currentUser?.id) return;
    this.utilisateurService.getCandidaturesByCandidat(this.currentUser.id).subscribe({
      next: (candidatures: any[]) => {
        (candidatures || []).forEach(c => {
          const offreId = c.offre?.id || c.offreId;
          if (offreId) this.offresDejaPostulees.add(offreId);
        });
      },
      error: () => { /* silencieux */ }
    });
  }

  get offresFiltrees(): Offre[] {
    if (this.filtreType === 'TOUS') return this.offres;
    return this.offres.filter(o => o.type === this.filtreType);
  }

  dejaPostule(offreId: number): boolean {
    return this.offresDejaPostulees.has(offreId);
  }

  // =============================================
  // 🆕 CLIC SUR UNE OFFRE (dans les 2 modes)
  // =============================================
  onCardClick(offre: Offre): void {
    if (this.mode === 'public') {
      // En public → on délègue au parent (HomeComponent)
      this.offreClicked.emit(offre);
      return;
    }

    // En admin → comportement existant
    if (this.dejaPostule(offre.id)) return;
    this.ouvrirPostulerModal(offre);
  }

  // =============================================
  // POSTULER (mode admin uniquement)
  // =============================================
  ouvrirPostulerModal(offre: Offre): void {
    this.offreSelectionnee = offre;
    this.lettreMotivation = '';
    this.postulerError = '';
    this.postulerSuccess = '';
    this.cvFile = null;
    this.diplomeFile = null;
    this.carteEtudianteFile = null;
    this.cinFile = null;
    this.demandeStageFile = null;
    this.showPostulerModal = true;
  }

  fermerPostulerModal(): void {
    this.showPostulerModal = false;
    this.offreSelectionnee = null;
  }

  onFileSelected(event: Event, champ: 'cv' | 'diplome' | 'carteEtudiante' | 'cin' | 'demandeStage'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    if (champ === 'cv') this.cvFile = file;
    if (champ === 'diplome') this.diplomeFile = file;
    if (champ === 'carteEtudiante') this.carteEtudianteFile = file;
    if (champ === 'cin') this.cinFile = file;
    if (champ === 'demandeStage') this.demandeStageFile = file;
  }

  get documentsManquants(): boolean {
    if (!this.offreSelectionnee) return true;
    if (this.offreSelectionnee.type === 'EMPLOI') {
      return !this.cvFile || !this.diplomeFile;
    }
    return !this.cvFile || !this.carteEtudianteFile || !this.cinFile || !this.demandeStageFile;
  }

  confirmerPostuler(): void {
    if (!this.offreSelectionnee || !this.currentUser?.id) return;
    if (this.documentsManquants) {
      this.postulerError = 'Veuillez joindre tous les documents requis avant de postuler.';
      return;
    }

    this.postulerEnCours = true;
    this.postulerError = '';

    this.utilisateurService.postuler(this.currentUser.id, this.offreSelectionnee.id).subscribe({
      next: (candidature: any) => {
        this.uploaderDocuments(candidature?.id);
      },
      error: (err) => {
        this.postulerEnCours = false;
        this.postulerError = err?.error?.message || "Impossible d'envoyer votre candidature.";
      }
    });
  }

  private uploaderDocuments(candidatureId: number): void {
    const uploads: Array<{ file: File; type: any }> = [];
    if (this.cvFile) uploads.push({ file: this.cvFile, type: 'CV' });

    if (this.offreSelectionnee?.type === 'EMPLOI') {
      if (this.diplomeFile) uploads.push({ file: this.diplomeFile, type: 'DIPLOME' });
    } else {
      if (this.carteEtudianteFile) uploads.push({ file: this.carteEtudianteFile, type: 'CARTE_ETUDIANTE' });
      if (this.cinFile) uploads.push({ file: this.cinFile, type: 'CIN_RECTO' });
      if (this.demandeStageFile) uploads.push({ file: this.demandeStageFile, type: 'DEMANDE_STAGE' });
    }

    let restants = uploads.length;
    if (restants === 0) { this.finaliserPostulation(true); return; }

    let uneErreur = false;
    uploads.forEach(u => {
      this.documentService.upload(this.currentUser.id, u.type, u.file, candidatureId).subscribe({
        next: () => { restants--; if (restants === 0) this.finaliserPostulation(!uneErreur); },
        error: () => { uneErreur = true; restants--; if (restants === 0) this.finaliserPostulation(!uneErreur); }
      });
    });
  }

  private finaliserPostulation(toutOk: boolean): void {
    this.postulerEnCours = false;
    this.postulerSuccess = toutOk
      ? 'Candidature et documents envoyés avec succès !'
      : "Candidature envoyée, mais un ou plusieurs documents n'ont pas pu être téléversés.";
    this.offresDejaPostulees.add(this.offreSelectionnee!.id);
    setTimeout(() => this.fermerPostulerModal(), 1600);
  }

  onLogout(): void {
    this.utilisateurService.logout();
  }

  getInitials(): string {
    const source: string = this.currentUser?.prenom || this.currentUser?.nom || 'U';
    return source.slice(0, 2).toUpperCase();
  }
}