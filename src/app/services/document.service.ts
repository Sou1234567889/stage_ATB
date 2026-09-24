import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type TypeDocument =
  | 'CV'
  | 'LETTRE_MOTIVATION'
  | 'CIN_RECTO'
  | 'CIN_VERSO'
  | 'PHOTO_PROFIL'
  | 'DIPLOME'
  | 'RELEVE_NOTES'
  | 'CARTE_ETUDIANTE'
  | 'DEMANDE_STAGE'
  | 'JOURNAL_STAGE'
  | 'CONVENTION'
  | 'AUTRE';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private readonly apiUrl = `${environment.apiUrl}/documents`;

  constructor(private http: HttpClient) {}

  upload(utilisateurId: number, type: TypeDocument, file: File, candidatureId?: number): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    let url = `${this.apiUrl}/upload?utilisateurId=${utilisateurId}&type=${type}`;
    if (candidatureId) {
      url += `&candidatureId=${candidatureId}`;
    }

    return this.http.post<any>(url, formData);
  }

  getByUtilisateur(utilisateurId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/utilisateur/${utilisateurId}`);
  }

  getByCandidature(candidatureId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/candidature/${candidatureId}`);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
