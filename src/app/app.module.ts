import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgApexchartsModule } from 'ng-apexcharts';
// Composants
import { Login } from './componets/login/login.component';
import { Signup } from './componets/signup/signup.component';
import { HomeComponent } from './componets/home/home.component';
import { ProfileComponent } from './componets/profile/profile.component';
import { ForgrtMotDePasseComponent } from './componets/forgrt-mot-de-passe/forgrt-mot-de-passe.component';
import { ResetPasswordComponent } from './componets/reset-password/reset-password.component';
import { OffresListComponent } from './componets/offres-list/offres-list.component';
import { NotificationsComponent } from './componets/notifications/notifications.component';
import { ParametresComponent } from './componets/parametres/parametres.component';
import { RolesPermissionsComponent } from './componets/roles-permissions/roles-permissions.component';

// Dashboards
import { DashboardSuperAdminComponent } from './componets/dashboard-super-admin/dashboard-super-admin.component';
import { DashboardEncadrantComponent } from './componets/dashboard-encadrant/dashboard-encadrant.component';
import { StagiaireDetailComponent } from './componets/dashboard-encadrant/stagiaire-detail/stagiaire-detail.component';
import { DashboardRhComponent } from './componets/dashboard-rh/dashboard-rh.component';
import { DashboardResponsableRhComponent } from './componets/dashboard-responsable-rh/dashboard-responsable-rh.component';
import { DashboardStagiereComponent } from './componets/dashboard-stagiere/dashboard-stagiere.component';
import { DashboardCandidatComponent } from './componets/dashboard-candidat/dashboard-candidat.component';
import { VisioComponent } from './componets/visio/visio.component';
import { OffresStagiaireComponent } from './componets/offres-stagiaire/offres-stagiaire.component';
import { ChiffresClesComponent } from './componets/home/components/chiffres-cles/chiffres-cles.component';
import { ValeursComponent } from './componets/home/components/valeurs/valeurs.component';
import { AgencesComponent } from './componets/home/components/agences/agences.component';
import { AProposComponent } from './componets/a-propos/a-propos.component';
import { ServicesComponent } from './componets/services/services.component';
import { RessourcesComponent } from './componets/ressources/ressources.component';
import { ContactComponent } from './componets/contact/contact.component';
import { BackToDashboardComponent } from './componets/shared/back-to-dashboard/back-to-dashboard.component';
import { IncomingCallComponent } from './componets/shared/incoming-call/incoming-call.component';
import { RouterModule } from '@angular/router';
import { RessourceDetailComponent } from './componets/ressources/ressource-detail/ressource-detail.component';
import { ServiceDetailComponent } from './componets/services/service-detail/service-detail.component';

@NgModule({
  declarations: [
    AppComponent,
    Login,
    Signup,
    HomeComponent,
    ProfileComponent,
    ForgrtMotDePasseComponent,
    ResetPasswordComponent,
    OffresListComponent,
    NotificationsComponent,
    ParametresComponent,
    RolesPermissionsComponent,

    // Dashboards
    DashboardSuperAdminComponent,
    DashboardEncadrantComponent,
    StagiaireDetailComponent,
    DashboardRhComponent,
    DashboardResponsableRhComponent,
    DashboardStagiereComponent,
    DashboardCandidatComponent,
    VisioComponent,
    OffresStagiaireComponent,
    ChiffresClesComponent,
    ValeursComponent,
    AgencesComponent,
    AProposComponent,
    ServicesComponent,
    RessourcesComponent,
    ContactComponent,
    BackToDashboardComponent,
    IncomingCallComponent,
    RessourceDetailComponent,
    ServiceDetailComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,              
    FormsModule, 
    RouterModule.forRoot([]),              
    ReactiveFormsModule,       
    HttpClientModule,
     NgApexchartsModule,          
    AppRoutingModule
  ],
    exports: [
    BackToDashboardComponent  
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }