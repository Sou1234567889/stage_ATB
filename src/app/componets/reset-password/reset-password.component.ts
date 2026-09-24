import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UtilisateurService } from '../../services/utilisateur.service';

// Validateur : les deux mots de passe doivent être identiques
function motsDePasseIdentiquesValidator(group: AbstractControl): ValidationErrors | null {
  const mdp = group.get('nouveauMotDePasse')?.value;
  const confirmation = group.get('confirmation')?.value;
  return mdp === confirmation ? null : { motsDePasseDifferents: true };
}

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  token: string | null = null;
  tokenAbsent = false;

  succes = false;
  erreur = '';
  chargement = false;

  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private utilisateurService: UtilisateurService
  ) {
    this.form = this.fb.group(
      {
        nouveauMotDePasse: ['', [Validators.required, Validators.minLength(8)]],
        confirmation: ['', Validators.required]
      },
      { validators: motsDePasseIdentiquesValidator }
    );
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.tokenAbsent = true;
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  submit(): void {
    if (this.form.invalid || !this.token) {
      this.form.markAllAsTouched();
      return;
    }

    this.chargement = true;
    this.erreur = '';
    this.succes = false;

    this.utilisateurService
      .resetPassword(this.token, this.form.value.nouveauMotDePasse)
      .subscribe({
        next: () => {
          this.chargement = false;
          this.succes = true;
          setTimeout(() => this.router.navigate(['/login']), 2500);
        },
        error: (err: any) => {
          this.chargement = false;
          this.erreur = err.error?.message || 'Erreur lors de la réinitialisation du mot de passe.';
        }
      });
  }
}