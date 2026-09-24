import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { UtilisateurService } from '../../services/utilisateur.service';
import { DocumentService } from '../../services/document.service';

const ROLE_ROUTES: Record<string, string> = {
  EMPLOYE: '/dashboard/candidat',
  STAGIAIRE: '/dashboard/stagiaire',
  ENCADRANT: '/dashboard/encadrant',
  RH: '/dashboard/rh',
  RESPONSABLE_RH: '/dashboard/responsable-rh',
  SUPER_ADMIN: '/dashboard/super-admin'
};

const ROLE_LABELS: Record<string, string> = {
  EMPLOYE: 'Employé',
  STAGIAIRE: 'Stagiaire',
  ENCADRANT: 'Encadrant',
  RH: 'Ressources Humaines',
  RESPONSABLE_RH: 'Responsable RH',
  SUPER_ADMIN: 'Super Admin'
};

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  currentUser: any = null;
  dashboardRoute = '/dashboard/candidat';
  roleLabel = '';

  // Onglet actif
  activeTab: 'infos' | 'password' | 'photo' = 'infos';

  // Formulaire infos
  form = {
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    adresse: ''
  };
  savingInfos = false;
  infosError = '';
  infosSuccess = '';

  // Formulaire mot de passe
  passwordForm = {
    nouveauMotDePasse: '',
    confirmation: ''
  };
  savingPassword = false;
  passwordError = '';
  passwordSuccess = '';

  // Photo de profil
  photoPreview: string | null = null;
  selectedPhotoFile: File | null = null;
  uploadingPhoto = false;
  photoError = '';
  photoSuccess = '';

  constructor(
    private utilisateurService: UtilisateurService,
    private documentService: DocumentService,
    private location: Location
  ) {}

  // 🆕 Bouton retour (cf. demande explicite)
  goBack(): void {
    this.location.back();
  }

  ngOnInit(): void {
    this.currentUser = this.utilisateurService.getCurrentUser();
    if (this.currentUser?.role) {
      this.dashboardRoute = ROLE_ROUTES[this.currentUser.role] || '/dashboard/candidat';
      this.roleLabel = ROLE_LABELS[this.currentUser.role] || this.currentUser.role;
    }

    this.form.prenom = this.currentUser?.prenom || '';
    this.form.nom = this.currentUser?.nom || '';
    this.form.email = this.currentUser?.email || '';
    this.form.telephone = this.currentUser?.telephone || '';
    this.form.adresse = this.currentUser?.adresse || '';

    this.photoPreview = this.currentUser?.photoProfilUrl
      ? this.resolveUrl(this.currentUser.photoProfilUrl)
      : null;
  }

  resolveUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `http://localhost:8088${url}`;
  }

  getInitials(): string {
    const source: string = this.currentUser?.prenom || this.currentUser?.nom || 'U';
    return source.slice(0, 2).toUpperCase();
  }

  enregistrerInfos(): void {
    if (!this.currentUser?.id) return;
    this.savingInfos = true;
    this.infosError = '';
    this.infosSuccess = '';

    this.utilisateurService.modifierUtilisateur(this.currentUser.id, this.form).subscribe({
      next: (updated) => {
        this.savingInfos = false;
        this.infosSuccess = 'Vos informations ont été mises à jour.';
        this.utilisateurService.updateCurrentUser({ ...this.currentUser, ...this.form });
        this.currentUser = { ...this.currentUser, ...this.form };
      },
      error: (err) => {
        this.savingInfos = false;
        this.infosError = err?.error?.message || 'Impossible de mettre à jour vos informations.';
      }
    });
  }

  changerMotDePasse(): void {
    if (!this.currentUser?.id) return;
    this.passwordError = '';
    this.passwordSuccess = '';

    if (!this.passwordForm.nouveauMotDePasse || this.passwordForm.nouveauMotDePasse.length < 6) {
      this.passwordError = 'Le mot de passe doit contenir au moins 6 caractères.';
      return;
    }
    if (this.passwordForm.nouveauMotDePasse !== this.passwordForm.confirmation) {
      this.passwordError = 'Les deux mots de passe ne correspondent pas.';
      return;
    }

    this.savingPassword = true;
    this.utilisateurService.modifierUtilisateur(this.currentUser.id, {
      motDePasse: this.passwordForm.nouveauMotDePasse
    }).subscribe({
      next: () => {
        this.savingPassword = false;
        this.passwordSuccess = 'Mot de passe mis à jour avec succès.';
        this.passwordForm = { nouveauMotDePasse: '', confirmation: '' };
      },
      error: (err) => {
        this.savingPassword = false;
        this.passwordError = err?.error?.message || 'Impossible de changer le mot de passe.';
      }
    });
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    if (!file) return;

    this.selectedPhotoFile = file;
    this.photoError = '';
    this.photoSuccess = '';

    const reader = new FileReader();
    reader.onload = () => { this.photoPreview = reader.result as string; };
    reader.readAsDataURL(file);
  }

  enregistrerPhoto(): void {
    if (!this.selectedPhotoFile || !this.currentUser?.id) return;
    this.uploadingPhoto = true;
    this.photoError = '';

    this.documentService.upload(this.currentUser.id, 'PHOTO_PROFIL', this.selectedPhotoFile).subscribe({
      next: (doc: any) => {
        const url = doc?.url;
        this.utilisateurService.modifierUtilisateur(this.currentUser.id, { photoProfilUrl: url }).subscribe({
          next: () => {
            this.uploadingPhoto = false;
            this.photoSuccess = 'Photo de profil mise à jour.';
            this.currentUser.photoProfilUrl = url;
            this.selectedPhotoFile = null;
          },
          error: () => {
            this.uploadingPhoto = false;
            this.photoError = "Photo envoyée mais impossible de l'associer à votre profil.";
          }
        });
      },
      error: (err) => {
        this.uploadingPhoto = false;
        this.photoError = err?.error?.message || "Impossible d'envoyer la photo.";
      }
    });
  }

  onLogout(): void {
    this.utilisateurService.logout();
  }
}