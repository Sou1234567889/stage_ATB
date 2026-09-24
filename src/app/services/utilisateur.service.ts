import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export type StatutCandidature = 'EN_ATTENTE' | 'ENTRETIEN_PLANIFIE' | 'ACCEPTE' | 'REFUSE';
export type StatutOffre = 'OUVERTE' | 'FERMEE' | 'CLOTUREE' | 'EN_COURS';
export type StatutLivrable = 'SOUMIS' | 'EN_REVISION' | 'A_MODIFIER' | 'APPROUVE';
export type RoleBackend = 'SUPER_ADMIN' | 'RESPONSABLE_RH' | 'RH' | 'ENCADRANT' | 'STAGIAIRE' | 'EMPLOYE';

@Injectable({
  providedIn: 'root'
})
export class UtilisateurService {
  private baseUrl = environment.apiUrl;
  private apiUrl = `${environment.apiUrl}/api`;
  private utilisateurUrl = `${this.apiUrl}/utilisateurs`;
  
  private userSubject = new BehaviorSubject<any | null>(null);
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    const user = localStorage.getItem('user');
    if (user) {
      this.userSubject.next(JSON.parse(user));
    }
  }



  // =============================================
  // 🔐 AUTHENTIFICATION
  // =============================================

  register(data: any): Observable<any> {
    return this.http.post(`${this.utilisateurUrl}/auth/register`, data);
  }

  login(credentials: { email: string; motDePasse: string }): Observable<any> {
    return this.http.post<any>(`${this.utilisateurUrl}/auth/login`, credentials).pipe(
      tap(user => {
        localStorage.setItem('user', JSON.stringify(user));
        this.userSubject.next(user);
      })
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.utilisateurUrl}/auth/mot-de-passe-oublie`, { email });
  }

  resetPassword(token: string, nouveauMotDePasse: string): Observable<any> {
    return this.http.post(`${this.utilisateurUrl}/auth/reset-password`, { token, nouveauMotDePasse });
  }

  logout(): void {
    localStorage.removeItem('user');
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  getCurrentUser(): any {
    return this.userSubject.value;
  }

  updateCurrentUser(user: any): void {
    localStorage.setItem('user', JSON.stringify(user));
    this.userSubject.next(user);
  }

  // =============================================
  // 👤 UTILISATEURS (CRUD)
  // =============================================

  getAllUtilisateurs(): Observable<any[]> {
    return this.http.get<any[]>(this.utilisateurUrl);
  }

  getUtilisateurById(id: number): Observable<any> {
    return this.http.get<any>(`${this.utilisateurUrl}/${id}`);
  }

  creerUtilisateur(utilisateur: any): Observable<any> {
    return this.http.post<any>(this.utilisateurUrl, utilisateur);
  }

  modifierUtilisateur(id: number, utilisateur: any): Observable<any> {
    return this.http.put<any>(`${this.utilisateurUrl}/${id}`, utilisateur);
  }

  supprimerUtilisateur(id: number): Observable<any> {
    return this.http.delete(`${this.utilisateurUrl}/${id}`);
  }

  changerRole(id: number, role: RoleBackend): Observable<any> {
    const params = new HttpParams().set('role', role);
    return this.http.put<any>(
      `${this.utilisateurUrl}/${id}/role`,
      null,
      { params }
    );
  }

  /**
 * Envoie un WhatsApp à un utilisateur via son ID
 * Utilise l'endpoint backend : POST /api/utilisateurs/{id}/whatsapp
 */
envoyerWhatsAppParId(userId: number, message: string): Observable<any> {
  const url = `${this.utilisateurUrl}/${userId}/whatsapp`;
  console.log('📤 POST WhatsApp par ID:', url);
  return this.http.post(url, { message }).pipe(
    catchError((error) => {
      console.error('❌ Erreur WhatsApp par ID:', error);
      return throwError(() => error);
    })
  );
}

getChatHistorique(userId1: number, userId2: number): Observable<any[]> {
  return this.http.get<any[]>(
    `${this.apiUrl}/chat/historique?userId1=${userId1}&userId2=${userId2}`
  );
}

  // =============================================
  // 📄 CANDIDATURES
  // =============================================

  postuler(candidatId: number, offreId: number): Observable<any> {
    let params = new HttpParams()
      .set('candidatId', candidatId.toString())
      .set('offreId', offreId.toString());
    return this.http.post<any>(`${this.utilisateurUrl}/candidatures`, null, { params });
  }

  // 🆕 Pointer des heures sur une candidature
pointerHeures(candidatureId: number, heures: number, userId: number, commentaire: string = ''): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/candidatures/${candidatureId}/pointer`, {
    heures,
    userId,
    commentaire
  });
}

// 🆕 Récupérer les heures travaillées
getHeuresTravaillees(candidatureId: number): Observable<{ totalHeures: number, objectif: number }> {
  return this.http.get<{ totalHeures: number, objectif: number }>(
    `${this.apiUrl}/candidatures/${candidatureId}/heures`
  );
}

// 🆕 Historique des pointages
getPointages(candidatureId: number): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/candidatures/${candidatureId}/pointages`);
}

  getAllCandidatures(statut?: StatutCandidature): Observable<any[]> {
    let params = new HttpParams();
    if (statut) {
      params = params.set('statut', statut);
    }
    return this.http.get<any[]>(`${this.utilisateurUrl}/candidatures`, { params });
  }

  getCandidaturesByCandidat(candidatId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.utilisateurUrl}/candidatures/candidat/${candidatId}`);
  }

  getCandidaturesByEncadrant(encadrantId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.utilisateurUrl}/candidatures/encadrant/${encadrantId}`);
  }

  preSelectionnerCandidature(id: number): Observable<any> {
    return this.http.put<any>(`${this.utilisateurUrl}/candidatures/${id}/preselectionner`, null);
  }

  assignerEncadrant(id: number, encadrantId: number): Observable<any> {
    let params = new HttpParams().set('encadrantId', encadrantId.toString());
    return this.http.put<any>(`${this.utilisateurUrl}/candidatures/${id}/assigner-encadrant`, null, { params });
  }

  deciderCandidature(id: number, payload: { decision: 'ACCEPTE' | 'REFUSE' }): Observable<any> {
    return this.http.put<any>(`${this.utilisateurUrl}/candidatures/${id}/decision`, payload);
  }

  // =============================================
// CANDIDATURES
// =============================================

/**
 * Postuler à une offre avec FormData (CV + demande de stage)
 */
postulerOffre(formData: FormData): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/candidatures/postuler`, formData);
}



/**
 * Notifier le stagiaire que sa candidature a été acceptée
 * (Déclenche l'envoi d'email + WhatsApp côté backend)
 */
notifierCandidatureAcceptee(candidatureId: number): Observable<any> {
  return this.http.post<any>(
    `${this.apiUrl}/notifications/candidature-acceptee/${candidatureId}`,
    {}
  );
}

/**
 * Notifier le stagiaire que sa candidature a été refusée
 * (Déclenche l'envoi d'email côté backend)
 */
notifierCandidatureRefusee(candidatureId: number): Observable<any> {
  return this.http.post<any>(
    `${this.apiUrl}/notifications/candidature-refusee/${candidatureId}`,
    {}
  );
}

  // =============================================
  // 💼 OFFRES
  // =============================================

  getAllOffres(statut?: StatutOffre): Observable<any[]> {
    let params = new HttpParams();
    if (statut) {
      params = params.set('statut', statut);
    }
    return this.http.get<any[]>(`${this.utilisateurUrl}/offre`, { params });
  }

  getOffreById(id: number): Observable<any> {
    return this.http.get<any>(`${this.utilisateurUrl}/offre/${id}`);
  }

  createOffre(offre: any, publieParId: number): Observable<any> {
    let params = new HttpParams().set('publieParId', publieParId.toString());
    return this.http.post<any>(`${this.utilisateurUrl}/offre`, offre, { params });
  }

  modifierOffre(id: number, offre: any): Observable<any> {
    return this.http.put<any>(`${this.utilisateurUrl}/offre/${id}`, offre);
  }

  deleteOffre(id: number): Observable<any> {
    return this.http.delete<any>(`${this.utilisateurUrl}/offre/${id}`);
  }

  changerStatutOffre(id: number, statut: StatutOffre): Observable<any> {
    let params = new HttpParams().set('statut', statut);
    return this.http.put<any>(`${this.utilisateurUrl}/offre/${id}/statut`, null, { params });
  }

  // =============================================
  // 📦 LIVRABLES
  // =============================================

  soumettreLivrable(payload: any): Observable<any> {
    return this.http.post<any>(`${this.utilisateurUrl}/livrables`, payload);
  }

  getLivrablesByCandidature(candidatureId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.utilisateurUrl}/livrables/candidature/${candidatureId}`);
  }

  reviserLivrable(id: number, statut: StatutLivrable, commentaire?: string): Observable<any> {
    let params = new HttpParams().set('statut', statut);
    if (commentaire) {
      params = params.set('commentaire', commentaire);
    }
    return this.http.put<any>(`${this.utilisateurUrl}/livrables/${id}/reviser`, null, { params });
  }

  // =============================================
  // 📊 AUDIT LOGS
  // =============================================

  getAuditLogs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.utilisateurUrl}/audit/logs`);
  }

  getAuditLogsByUtilisateur(utilisateurId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.utilisateurUrl}/audit/logs/utilisateur/${utilisateurId}`);
  }

  getAuditLogsByAction(action: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.utilisateurUrl}/audit/logs/action/${action}`);
  }

  createAuditLog(log: any): Observable<any> {
    return this.http.post<any>(`${this.utilisateurUrl}/audit/logs`, log);
  }

  // =============================================
  // 📢 NOTIFICATIONS
  // =============================================

  getNotifications(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/notifications`);
  }

  marquerNotificationCommeNonLue(id: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/notifications/${id}/non-lue`, {});
  }

  

  supprimerNotification(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/notifications/${id}`);
  }

  supprimerNotificationsLues(utilisateurId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/notifications/utilisateur/${utilisateurId}/supprimer-lues`);
  }

  creerNotification(notification: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/notifications`, notification);
  }

  // =============================================
  // 📱 SMS
  // =============================================

  envoyerSms(phoneNumber: string, message: string): Observable<any> {
    const url = `${this.apiUrl}/sms/send`;
    console.log('📤 Envoi SMS vers:', url);
    console.log('📱 Numéro:', phoneNumber);
    console.log('📝 Message:', message);
    
    return this.http.post(url, { phoneNumber, message }).pipe(
      catchError((error) => {
        console.error('❌ Erreur envoi SMS:', error);
        return throwError(() => error);
      })
    );
  }

  testSms(phone: string): Observable<any> {
    const url = `${this.apiUrl}/sms/test`;
    return this.http.get(url, { params: { phone } }).pipe(
      catchError((error) => {
        console.error('❌ Erreur test SMS:', error);
        return throwError(() => error);
      })
    );
  }

  getSmsStatus(): Observable<any> {
    const url = `${this.apiUrl}/sms/status`;
    return this.http.get(url).pipe(
      catchError((error) => {
        console.error('❌ Erreur status SMS:', error);
        return throwError(() => error);
      })
    );
  }



// =============================================
// 📱 WHATSAPP
// =============================================

/**
 * Envoie un message WhatsApp via Green-API
 */
envoyerWhatsApp(phoneNumber: string, message: string): Observable<any> {
    const url = `${this.apiUrl}/whatsapp/send`;
    return this.http.post(url, { phoneNumber, message }).pipe(
        catchError((error) => {
            console.error('❌ Erreur WhatsApp:', error);
            return throwError(() => error);
        })
    );
}

/**
 * Vérifie le statut WhatsApp
 */
getWhatsAppStatus(): Observable<any> {
    const url = `${this.apiUrl}/whatsapp/status`;
    return this.http.get(url).pipe(
        catchError((error) => {
            console.error('❌ Erreur status WhatsApp:', error);
            return throwError(() => error);
        })
    );
}

// =============================================
// 📧 ENVOI D'EMAIL
// =============================================

/**
 * Envoie un email
 */
envoyerEmail(email: string, sujet: string, corps: string): Observable<any> {
  const url = `${this.apiUrl}/email/send`;
  return this.http.post(url, { email, sujet, corps }).pipe(
    catchError((error) => {
      console.error('❌ Erreur envoi email:', error);
      return throwError(() => error);
    })
  );
}



// =============================================
// 📢 NOTIFICATIONS
// =============================================

/**
 * Récupère les notifications d'un utilisateur
 */
getNotificationsByUtilisateur(utilisateurId: number): Observable<any[]> {
    // ✅ URL CORRECTE
    const url = `${this.apiUrl}/notifications/utilisateur/${utilisateurId}`;
    console.log('📤 GET Notifications:', url);
    return this.http.get<any[]>(url).pipe(
        catchError((error) => {
            console.error('❌ Erreur getNotifications:', error);
            return throwError(() => error);
        })
    );
}

/**
 * Récupère le nombre de notifications non lues
 */
getNotificationsNonLues(utilisateurId: number): Observable<any> {
    const url = `${this.apiUrl}/notifications/utilisateur/${utilisateurId}/non-lues-count`;
    console.log('📤 GET Unread count:', url);
    return this.http.get<any>(url).pipe(
        catchError((error) => {
            console.error('❌ Erreur unread count:', error);
            return throwError(() => error);
        })
    );
}

/**
 * Marque une notification comme lue
 */
marquerNotificationCommeLue(id: number): Observable<any> {
    const url = `${this.apiUrl}/notifications/${id}/lu`;
    console.log('📤 PUT Mark as read:', url);
    return this.http.put(url, {}).pipe(
        catchError((error) => {
            console.error('❌ Erreur mark as read:', error);
            return throwError(() => error);
        })
    );
}

/**
 * Marque toutes les notifications comme lues
 */
marquerToutesNotificationsLues(utilisateurId: number): Observable<any> {
    const url = `${this.apiUrl}/notifications/utilisateur/${utilisateurId}/tout-lire`;
    console.log('📤 PUT Mark all as read:', url);
    return this.http.put(url, {}).pipe(
        catchError((error) => {
            console.error('❌ Erreur mark all as read:', error);
            return throwError(() => error);
        })
    );
}

// Upload d'un fichier de correction par l'encadrant
uploaderFichierCorrection(livrableId: number, formData: FormData) {
  return this.http.post<any>(
    `${this.apiUrl}/livrables/${livrableId}/correction`,
    formData
  );
}

// Aperçu d'un livrable (déjà existant normalement, sinon :)
getLivrableById(livrableId: number) {
  return this.http.get<any>(`${this.apiUrl}/livrables/${livrableId}`);
}



creerOffrePfe(data: any): Observable<any> {
  return this.http.post(`${this.apiUrl}/offres`, data);
}

modifierOffrePfe(id: number, data: any): Observable<any> {
  return this.http.put(`${this.apiUrl}/offres/${id}`, data);
}


getBookPfeParOffre(offreId: number): Observable<Blob> {
  return this.http.get(`${this.apiUrl}/offres/${offreId}/book-pfe`, {
    responseType: 'blob'
  });
}


getBookPfe(): Observable<Blob> {
  return this.http.get(`${this.apiUrl}/offres/book-pfe`, {
    responseType: 'blob'
  });
}



// ⚠️ À ajouter dans utilisateur.service.ts

getJitsiToken(data: {
  userId: string;
  userName: string;
  userEmail: string;
  isModerator: boolean;
}): Observable<{ token: string }> {
  return this.http.post<{ token: string }>(
    `${this.apiUrl}/jitsi/token`,
    data
  );
}

// ✅ Book PFE par année
getBookPfeParAnnee(annee: number): Observable<Blob> {
  return this.http.get(`${this.apiUrl}/offres/book-pfe/annee/${annee}`, {
    responseType: 'blob'
  });
}

// ✅ Liste des années disponibles
getAnneesDisponiblesBookPfe(): Observable<number[]> {
  return this.http.get<number[]>(`${this.apiUrl}/offres/book-pfe/annees`);
}

}