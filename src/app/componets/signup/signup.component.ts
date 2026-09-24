import {
  Component
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';

import {
  Router
} from '@angular/router';

import {
  UtilisateurService
} from '../../services/utilisateur.service';


/* =========================================================
   VALIDATEUR MOT DE PASSE
   ========================================================= */

export const passwordMatchValidator: ValidatorFn =
(
  control: AbstractControl
): ValidationErrors | null => {

  const motDePasse =
    control.get('motDePasse');

  const confirmMotDePasse =
    control.get('confirmMotDePasse');

  if (
    motDePasse &&
    confirmMotDePasse &&
    motDePasse.value !== confirmMotDePasse.value
  ) {

    return {
      passwordMismatch: true
    };

  }

  return null;
};


/* =========================================================
   COMPONENT
   ========================================================= */

@Component({
  selector: 'app-signup',

  templateUrl: './signup.component.html',

  styleUrls: ['./signup.component.css']
})
export class Signup {

  form: FormGroup;

  erreur = '';

  chargement = false;

  showPassword = false;

  showConfirmPassword = false;


  /* =======================================================
     CONSTRUCTOR
     ======================================================= */

  constructor(
    private fb: FormBuilder,

    private utilisateurService: UtilisateurService, // ✅ Changé

    private router: Router
  ) {

    this.form = this.fb.group({

      /* Informations personnelles */

      nom: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      prenom: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      email: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ],

      numeroCin: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[0-9]{7,8}$/)
        ]
      ],


      /* Adresse */

      adresse: [
        ''
      ],

      ville: [
        ''
      ],


      /* Téléphone Tunisie */

      telephone: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[0-9\s-]{8,12}$/)
        ]
      ],


      /* Mot de passe */

      motDePasse: [
        '',
        [
          Validators.required,
          Validators.minLength(6)
        ]
      ],

      confirmMotDePasse: [
        '',
        Validators.required
      ],


      /* Conditions */

      acceptConditions: [
        false,
        Validators.requiredTrue
      ]

    }, {
      validators: passwordMatchValidator
    });

  }


  /* =======================================================
     PASSWORD VISIBILITY
     ======================================================= */

  togglePasswordVisibility(): void {

    this.showPassword =
      !this.showPassword;

  }


  toggleConfirmPasswordVisibility(): void {

    this.showConfirmPassword =
      !this.showConfirmPassword;

  }


  /* =======================================================
     SUBMIT
     ======================================================= */

  submit(): void {

    /* Vérification formulaire */

    if (this.form.invalid) {

      Object.keys(
        this.form.controls
      ).forEach(key => {

        this.form
          .get(key)
          ?.markAsTouched();

      });

      return;
    }


    /* Vérification mot de passe */

    if (
      this.form.value.motDePasse !==
      this.form.value.confirmMotDePasse
    ) {

      this.erreur =
        'Les mots de passe ne correspondent pas.';

      return;
    }


    /* Loading */

    this.chargement = true;

    this.erreur = '';


    /* =====================================================
       TELEPHONE
       ===================================================== */

    const numero =
      this.form.value.telephone
        .replace(/\s/g, '')
        .replace(/-/g, '');


    const telephoneComplet =
      `+216${numero}`;


    /* =====================================================
       DATA
       ===================================================== */

  const signupData = {
  nom: this.form.value.nom,
  prenom: this.form.value.prenom,
  email: this.form.value.email,

  motDePasse: this.form.value.motDePasse,
  confirmMotDePasse: this.form.value.confirmMotDePasse,

  numeroCin: this.form.value.numeroCin,

  adresse: this.form.value.adresse || '',
  ville: this.form.value.ville || '',
  pays: 'TN',

  telephone: telephoneComplet


};


    /* =====================================================
       REGISTER
       ===================================================== */

    this.utilisateurService // ✅ Changé
      .register(signupData)
      .subscribe({

        next: () => {

          this.chargement = false;

          this.router.navigate([
            '/login'
          ]);

        },


               error: (err: any) => {

          this.chargement = false;

          console.error('❌ Erreur inscription:', err);

          if (err.status === 0) {
            this.erreur =
              "Impossible de contacter le serveur. Vérifiez que le backend Spring Boot tourne bien sur http://localhost:8088.";
          } else if (err.status === 400) {
            this.erreur =
              err.error?.message ||
              'Données invalides. Vérifiez votre CIN, votre email et votre téléphone.';
          } else if (err.status === 500) {
            this.erreur =
              err.error?.message ||
              'Erreur serveur. Réessayez dans quelques instants.';
          } else {
            this.erreur =
              err.error?.message ||
              "Erreur lors de l'inscription.";
          }

        }

      });

   

  }

}