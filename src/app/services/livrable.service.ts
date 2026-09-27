import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LivrableService {
  private readonly apiUrl = environment.apiUrl + '/livrables';

  constructor(private http: HttpClient) {}

  soumettre(payload: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload);
  }

  getByCandidature(candidatureId: number): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl + '/candidature/' + candidatureId);
  }

  reviser(id: number, statut: string, commentaire?: string): Observable<any> {
    const params: any = { statut };
    if (commentaire) params.commentaire = commentaire;
    return this.http.put<any>(this.apiUrl + '/' + id + '/reviser', null, { params });
  }
}
