import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UtilisateurService } from '../../services/utilisateur.service';

enum Role {
  EMPLOYE = 'EMPLOYE',
  ENCADRANT = 'ENCADRANT',
  RH = 'RH',
  RESPONSABLE_RH = 'RESPONSABLE_RH',
  SUPER_ADMIN = 'SUPER_ADMIN',
  STAGIAIRE = 'STAGIAIRE'
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class Login {
  form: FormGroup;
  erreur = '';
  chargement = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private utilisateurService: UtilisateurService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      motDePasse: ['', Validators.required]
    });

    // ✅ LOG: Vérifier l'URL de l'API
    console.log('🔧 UtilisateurService URL:', this.utilisateurService['apiUrl']);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  submit(): void {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
      return;
    }

    this.chargement = true;
    this.erreur = '';

    const credentials = this.form.value;
    
    // ✅ LOG: Afficher les identifiants envoyés
    console.log('📤 Tentative de connexion:', {
      email: credentials.email,
      motDePasse: '********'
    });

    this.utilisateurService.login(credentials).subscribe({
      next: (user: any) => {
        // ✅ LOG: Connexion réussie
        console.log('✅ Connexion réussie:', {
          id: user.id,
          email: user.email,
          role: user.role,
          nom: user.nom,
          prenom: user.prenom
        });

        this.chargement = false;
        const route = this.routeParRole(user.role);
        console.log('🔀 Redirection vers:', route);
        this.router.navigate([route]);
      },
      error: (err: any) => {
        // ✅ LOG: Erreur détaillée
        console.error('❌ Erreur de connexion:', {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          error: err.error
        });

        this.chargement = false;
        
        // ✅ Afficher un message d'erreur plus précis
        if (err.status === 401) {
          this.erreur = 'Email ou mot de passe incorrect.';
        } else if (err.status === 0) {
          this.erreur = 'Impossible de joindre le serveur. Vérifiez que le backend ';
        } else if (err.status === 404) {
          this.erreur = 'Endpoint non trouvé. Vérifiez l\'URL de l\'API.';
        } else if (err.status === 500) {
          this.erreur = 'Erreur serveur. Vérifiez les logs du backend.';
        } else {
          this.erreur = err.error?.message || 'Email ou mot de passe incorrect.';
        }
      }
    });
  }

  private routeParRole(role: Role): string {
    console.log('🎯 Rôle détecté:', role);
    
    switch (role) {
      case Role.EMPLOYE: 
        console.log('➡️ Redirection vers: /dashboard/candidat');
        return '/dashboard/candidat';
      case Role.ENCADRANT: 
        console.log('➡️ Redirection vers: /dashboard/encadrant');
        return '/dashboard/encadrant';
      case Role.RH: 
        console.log('➡️ Redirection vers: /dashboard/rh');
        return '/dashboard/rh';
      case Role.RESPONSABLE_RH: 
        console.log('➡️ Redirection vers: /dashboard/responsable-rh');
        return '/dashboard/responsable-rh';
      case Role.SUPER_ADMIN: 
        console.log('➡️ Redirection vers: /dashboard/super-admin');
        return '/dashboard/super-admin';
        case Role.STAGIAIRE:
 return'dashboard/stagiaire';
  break;
      default: 
        console.warn('⚠️ Rôle non reconnu, redirection vers /');
        return '/';
    }
  }
}