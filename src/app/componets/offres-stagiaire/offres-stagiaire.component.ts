import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OffreService } from '../../services/offre.service';
import { UtilisateurService } from '../../services/utilisateur.service';
import { CandidatureNotificationService } from '../../services/candidature-notification.service';

@Component({
  selector: 'app-offres-stagiaire',
  templateUrl: './offres-stagiaire.component.html',
  styleUrls: ['./offres-stagiaire.component.css']
})
export class OffresStagiaireComponent implements OnInit {

  offres: any[] = [];
  offresLoading = true;

  showPostulerModal = false;
  selectedOffre: any = null;
  postulerForm!: FormGroup;
  cvFile: File | null = null;
  demandeStageFile: File | null = null;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private offreService: OffreService,
    private utilisateurService: UtilisateurService,
    private notifCandidature: CandidatureNotificationService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.postulerForm = this.fb.group({
      lettreMotivation: ['', Validators.required],
      telephone: ['', Validators.required],
      universite: ['', Validators.required],
      niveauEtude: ['', Validators.required]
    });

    this.loadOffres();
  }

  loadOffres(): void {
    this.offresLoading = true;
    this.offreService.getAll().subscribe({
      next: (data) => {
        this.offres = data ?? [];
        this.offresLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.offresLoading = false;
      }
    });
  }

  ouvrirPostulerModal(offre: any): void {
    this.selectedOffre = offre;
    this.showPostulerModal = true;
    this.cvFile = null;
    this.demandeStageFile = null;
    this.errorMessage = '';
    this.successMessage = '';
    this.postulerForm.reset();
  }

  fermerPostulerModal(): void {
    this.showPostulerModal = false;
    this.selectedOffre = null;
  }

  onCvChange(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.cvFile = file;
    } else {
      this.errorMessage = 'Le CV doit être au format PDF';
      this.cvFile = null;
    }
  }

  onDemandeStageChange(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.demandeStageFile = file;
    } else {
      this.errorMessage = 'La demande de stage doit être au format PDF';
      this.demandeStageFile = null;
    }
  }

  postuler(): void {
    if (this.postulerForm.invalid) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires';
      return;
    }

    if (!this.cvFile) {
      this.errorMessage = 'Veuillez joindre votre CV (PDF)';
      return;
    }

    if (!this.demandeStageFile) {
      this.errorMessage = 'Veuillez joindre votre demande de stage (PDF)';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    // Préparer les données (FormData pour upload fichiers)
    const formData = new FormData();
    formData.append('offreId', this.selectedOffre.id.toString());
    formData.append('lettreMotivation', this.postulerForm.value.lettreMotivation);
    formData.append('telephone', this.postulerForm.value.telephone);
    formData.append('universite', this.postulerForm.value.universite);
    formData.append('niveauEtude', this.postulerForm.value.niveauEtude);
    formData.append('cv', this.cvFile);
    formData.append('demandeStage', this.demandeStageFile);

    // Envoyer la candidature
    this.utilisateurService.postulerOffre(formData).subscribe({
      next: (candidature: any) => {
        this.submitting = false;
        this.successMessage = '✅ Candidature envoyée avec succès !';
        
        // 🔔 Notifier RH + Responsable RH
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        this.notifCandidature.notifierNouvelleCandidature(
          candidature,
          this.selectedOffre,
          currentUser
        );

        // Fermer le modal après 2 secondes
        setTimeout(() => {
          this.fermerPostulerModal();
          this.successMessage = '';
        }, 2000);
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err?.error?.message || 'Erreur lors de l\'envoi de la candidature';
        console.error(err);
      }
    });
  }
}