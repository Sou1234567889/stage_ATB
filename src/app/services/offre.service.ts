import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export type StatutOffre = 'OUVERTE' | 'FERMEE' | 'CLOTUREE' | 'EN_COURS';
export type TypeOffre = 'STAGE' | 'EMPLOI';

export interface Offre {
  id: number;
  titre: string;
  description: string;
  departement: string;
  lieu: string;
  dureeEnMois: number;
  datePublication: string;
  dateLimite: string;
  profilRecherche: string;
  statut: StatutOffre;
  type: TypeOffre;
  publieParId: number;
}

export interface ChiffreCle {
  id: number; libelle: string; valeur: string; icone?: string;
}

export interface Valeur {
  id: number; titre: string; description?: string; icone?: string;
}

export interface Agence {
  id: number; nom: string; adresse?: string; ville?: string;
  telephone?: string; horaires?: string;
}

export interface PublicOffre {
  id: number; titre: string; description: string;
  departement: string; type: 'STAGE' | 'EMPLOI';
  dureeEnMois?: number; profilRecherche?: string;
}


@Injectable({
  providedIn: 'root'
})
export class OffreService {
  // ✅ URL CORRECTE - PLURIEL (correspond à @RequestMapping("/api/offres") dans OffreController)
  private readonly apiUrl = `${environment.apiUrl}/api/offres`;
private publicApiUrl = 'http://localhost:8088/api/public';

  getOffresPubliques(type?: 'STAGE' | 'EMPLOI'): Observable<Offre[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    return this.http.get<Offre[]>(`${this.publicApiUrl}/offres`, { params });
  }

getChiffresCles(): Observable<ChiffreCle[]> {
  return this.http.get<ChiffreCle[]>(`${this.publicApiUrl}/chiffres-cles`);
}

getValeurs(): Observable<Valeur[]> {
  return this.http.get<Valeur[]>(`${this.publicApiUrl}/valeurs`);
}

getAgences(): Observable<Agence[]> {
  return this.http.get<Agence[]>(`${this.publicApiUrl}/agences`);
}

getPublicStats(): Observable<any> {
  return this.http.get(`${this.publicApiUrl}/stats`);
}
  constructor(private http: HttpClient) {}

  getAll(statut?: StatutOffre): Observable<Offre[]> {
    let params = new HttpParams();
    if (statut) {
      params = params.set('statut', statut);
    }
    return this.http.get<any[]>(this.apiUrl, { params }).pipe(
      map((data: any[]) => this.mapOffres(data))
    );
  }

  getById(id: number): Observable<Offre> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((data: any) => this.mapOffre(data))
    );
  }

  create(payload: any, publieParId: number): Observable<Offre> {
    let params = new HttpParams().set('publieParId', publieParId.toString());
    return this.http.post<Offre>(this.apiUrl, payload, { params });
  }

  update(id: number, payload: any): Observable<Offre> {
    return this.http.put<Offre>(`${this.apiUrl}/${id}`, payload);
  }

  changerStatut(id: number, statut: StatutOffre): Observable<Offre> {
    let params = new HttpParams().set('statut', statut);
    return this.http.put<Offre>(`${this.apiUrl}/${id}/statut`, null, { params });
  }

  deleteOffre(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // ✅ MAPPING BDD → FRONTEND
  private mapOffres(data: any[]): Offre[] {
    if (!data || data.length === 0) return [];
    return data.map((item: any) => this.mapOffre(item));
  }

  private mapOffre(item: any): Offre {
    return {
      id: item.id,
      titre: item.titre || 'Sans titre',
      description: item.description || '',
      departement: item.departement || '—',
      lieu: item.lieu || '—',
      dureeEnMois: item.duree_en_mois || item.dureeEnMois || 0,
      datePublication: item.date_publication || item.datePublication || '—',
      dateLimite: item.date_limite || item.dateLimite || '—',
      profilRecherche: item.profil_recherche || item.profilRecherche || '',
      statut: item.statut || 'INCONNU',
      type: item.type || 'STAGE',
      publieParId: item.publie_par_id || item.publieParId || 0
    };
  }
}