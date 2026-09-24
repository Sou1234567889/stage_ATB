import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UtilisateurService } from '../../services/utilisateur.service'; // ✅ Changé

@Component({
  selector: 'app-forgrt-mot-de-passe',
  templateUrl: './forgrt-mot-de-passe.component.html',
  styleUrls: ['./forgrt-mot-de-passe.component.css']
})
export class ForgrtMotDePasseComponent {
  form: FormGroup;
  envoye = false;
  erreur = '';
  chargement = false;

  constructor(
    private fb: FormBuilder,
    private utilisateurService: UtilisateurService // ✅ Changé
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.get('email')?.markAsTouched();
      return;
    }

    this.chargement = true;
    this.erreur = '';
    this.envoye = false;

    // ✅ Appel au service pour envoyer le lien de réinitialisation
    this.utilisateurService.forgotPassword(this.form.value.email).subscribe({
      next: () => {
        this.chargement = false;
        this.envoye = true;
      },
      error: (err: any) => {
        this.chargement = false;
        this.erreur = err.error?.message || "Erreur lors de l'envoi du lien.";
      }
    });
  }
}