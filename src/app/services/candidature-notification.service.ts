import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class CandidatureNotificationService {

  private apiUrl = 'http://localhost:8088/api'; // ← adapter à votre backend

  constructor(
    private http: HttpClient,
    private notifService: NotificationService
  ) {}

  /**
   * 🔔 Notifie RH + Responsable RH qu'une nouvelle candidature a été déposée
   */
  notifierNouvelleCandidature(candidature: any, offre: any, candidat: any): void {
    // Notification in-app pour RH
    this.notifService.addInfo(
      'Nouvelle candidature',
      `${candidat.prenom} ${candidat.nom} a postulé à "${offre.titre}"`,
      ['RH']
    );

    // Notification in-app pour Responsable RH
    this.notifService.addInfo(
      'Nouvelle candidature',
      `${candidat.prenom} ${candidat.nom} a postulé à "${offre.titre}"`,
      ['RESPONSABLE_RH']
    );

    // Envoi email aux RH + Resp RH (via backend)
    this.http.post(`${this.apiUrl}/notifications/nouvelle-candidature`, {
      candidatureId: candidature.id,
      offreTitre: offre.titre,
      candidatNom: `${candidat.prenom} ${candidat.nom}`,
      candidatEmail: candidat.email
    }).subscribe({
      next: () => console.log('✅ Emails envoyés aux RH'),
      error: (err) => console.error('❌ Erreur envoi emails:', err)
    });
  }

  /**
   * 🔔 Notifie le stagiaire que sa candidature a été acceptée
   * + Envoie Email + WhatsApp
   */
  notifierCandidatureAcceptee(candidature: any, offre: any): void {
    const candidat = candidature.candidat;
    const message = `Bonjour ${candidat.prenom},\n\n` +
      `🎉 Félicitations ! Votre candidature pour le stage "${offre.titre}" a été ACCEPTÉE.\n\n` +
      `📧 Un email détaillé vous a été envoyé.\n` +
      `📱 Vous recevrez également un message WhatsApp de confirmation.\n\n` +
      `Connectez-vous à votre espace : http://localhost:4200/login\n\n` +
      `Cordialement,\nL'équipe Attijari Talentis`;

    // Notification in-app pour le stagiaire
    this.notifService.addInfo(
      'Candidature acceptée',
      `Votre candidature pour "${offre.titre}" a été acceptée !`,
      ['STAGIAIRE']
    );

    // Envoi email + WhatsApp via backend
    this.http.post(`${this.apiUrl}/notifications/candidature-acceptee`, {
      candidatureId: candidature.id,
      candidatEmail: candidat.email,
      candidatTelephone: candidat.telephone,
      candidatNom: `${candidat.prenom} ${candidat.nom}`,
      offreTitre: offre.titre,
      message: message
    }).subscribe({
      next: () => console.log('✅ Email + WhatsApp envoyés au candidat'),
      error: (err) => console.error('❌ Erreur envoi:', err)
    });
  }

  /**
   * 🔔 Notifie le stagiaire que sa candidature a été refusée
   */
  notifierCandidatureRefusee(candidature: any, offre: any): void {
    const candidat = candidature.candidat;
    const message = `Bonjour ${candidat.prenom},\n\n` +
      `Nous avons bien étudié votre candidature pour le stage "${offre.titre}".\n\n` +
      `Malheureusement, nous ne pouvons pas y donner une suite favorable.\n\n` +
      `Nous vous souhaitons bonne chance dans vos recherches.\n\n` +
      `Cordialement,\nL'équipe Attijari Talentis`;

    this.notifService.addInfo(
      'Candidature refusée',
      `Votre candidature pour "${offre.titre}" n'a pas été retenue.`,
      ['STAGIAIRE']
    );

    this.http.post(`${this.apiUrl}/notifications/candidature-refusee`, {
      candidatureId: candidature.id,
      candidatEmail: candidat.email,
      candidatNom: `${candidat.prenom} ${candidat.nom}`,
      offreTitre: offre.titre,
      message: message
    }).subscribe({
      next: () => console.log('✅ Email de refus envoyé'),
      error: (err) => console.error('❌ Erreur:', err)
    });
  }
}