import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Livrable, LivrableRequest } from '../models/livrable.model';
import { StatutLivrable } from '../models/enums';

@Injectable({ providedIn: 'root' })
export class LivrableService {
  private readonly apiUrl = `${environment.apiUrl}/livrables`;

  constructor(private http: HttpClient) {}

  soumettre(payload: LivrableRequest): Observable<Livrable> {
    return this.http.post<Livrable>(this.apiUrl, payload);
  }

  getByCandidature(candidatureId: number): Observable<Livrable[]> {
    return this.http.get<Livrable[]>(`${this.apiUrl}/candidature/${candidatureId}`);
  }

  reviser(id: number, statut: StatutLivrable, commentaire?: string): Observable<Livrable> {
    const params: any = { statut };
    if (commentaire) params.commentaire = commentaire;
    return this.http.put<Livrable>(`${this.apiUrl}/${id}/reviser`, null, { params });
  }
}