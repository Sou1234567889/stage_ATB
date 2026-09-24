import { NgModule } from '@angular/core';
import { RouterModule, Routes, ExtraOptions } from '@angular/router';

import { Login } from './componets/login/login.component';
import { Signup } from './componets/signup/signup.component';
import { ForgrtMotDePasseComponent } from './componets/forgrt-mot-de-passe/forgrt-mot-de-passe.component';
import { ResetPasswordComponent } from './componets/reset-password/reset-password.component';
import { DashboardCandidatComponent } from './componets/dashboard-candidat/dashboard-candidat.component';
import { DashboardEncadrantComponent } from './componets/dashboard-encadrant/dashboard-encadrant.component';
import { DashboardRhComponent } from './componets/dashboard-rh/dashboard-rh.component';
import { DashboardResponsableRhComponent } from './componets/dashboard-responsable-rh/dashboard-responsable-rh.component';
import { DashboardSuperAdminComponent } from './componets/dashboard-super-admin/dashboard-super-admin.component';
import { DashboardStagiereComponent } from './componets/dashboard-stagiere/dashboard-stagiere.component';
import { ParametresComponent } from './componets/parametres/parametres.component';
import { RolesPermissionsComponent } from './componets/roles-permissions/roles-permissions.component';
import { NotificationsComponent } from './componets/notifications/notifications.component';
import { OffresListComponent } from './componets/offres-list/offres-list.component';
import { ProfileComponent } from './componets/profile/profile.component';
import { HomeComponent } from './componets/home/home.component';
import { ContactComponent } from './componets/contact/contact.component';
import { RessourcesComponent } from './componets/ressources/ressources.component';
import { ServicesComponent } from './componets/services/services.component';
import { AProposComponent } from './componets/a-propos/a-propos.component';
import { RessourceDetailComponent } from './componets/ressources/ressource-detail/ressource-detail.component';
import { ServiceDetailComponent } from './componets/services/service-detail/service-detail.component';

const routes: Routes = [
  // ============================================
  // PAGE D'ACCUEIL (avec pathMatch full)
  // ============================================
  { path: '', component: HomeComponent, pathMatch: 'full' },

  // ============================================
  // AUTHENTIFICATION
  // ============================================
  { path: 'login', component: Login },
  { path: 'signup', component: Signup },
  { path: 'mot-de-passe-oublie', component: ForgrtMotDePasseComponent },
  { path: 'reset-password', component: ResetPasswordComponent },

  // ============================================
  // PAGES PUBLIQUES
  // ============================================
  { path: 'a-propos', component: AProposComponent },
  { path: 'services', component: ServicesComponent },
  { path: 'services/:slug', component: ServiceDetailComponent },
  { path: 'ressources', component: RessourcesComponent },
  { path: 'ressources/:slug', component: RessourceDetailComponent },
  { path: 'contact', component: ContactComponent },

  // ⚠️ Cette route reste pour compatibilité, mais tu peux aussi
  // rediriger vers l'accueil avec le fragment :
  // { path: 'offres', redirectTo: '/', pathMatch: 'full' },
  { path: 'offres', component: OffresListComponent },

  // ============================================
  // UTILISATEUR CONNECTÉ
  // ============================================
  { path: 'profile', component: ProfileComponent },

  // ============================================
  // DASHBOARDS PAR RÔLE
  // ============================================
  { path: 'dashboard/candidat', component: DashboardCandidatComponent },
  { path: 'dashboard/encadrant', component: DashboardEncadrantComponent },
  { path: 'dashboard/rh', component: DashboardRhComponent },
  { path: 'dashboard/responsable-rh', component: DashboardResponsableRhComponent },
  { path: 'dashboard/super-admin', component: DashboardSuperAdminComponent },
  { path: 'dashboard/stagiaire', component: DashboardStagiereComponent },

  // ============================================
  // ADMINISTRATION
  // ============================================
  { path: 'parametres', component: ParametresComponent },
  { path: 'roles-permissions', component: RolesPermissionsComponent },
  { path: 'notifications', component: NotificationsComponent },

  // ============================================
  // ⚠️ ROUTE WILDCARD — DOIT ÊTRE EN DERNIER
  // ============================================
  { path: '**', redirectTo: '', pathMatch: 'full' }
];

// ============================================
// 🆕 OPTIONS DE SCROLLING
// ============================================
const routerOptions: ExtraOptions = {
  // Remonte en haut à chaque navigation
  scrollPositionRestoration: 'top',
  // ✅ Active le scroll vers les ancres (#offres-section)
  anchorScrolling: 'enabled',
  // Décalage de 80px (hauteur de la navbar fixe)
  scrollOffset: [0, 80]
};

@NgModule({
  imports: [RouterModule.forRoot(routes, routerOptions)],
  exports: [RouterModule]
})
export class AppRoutingModule {}