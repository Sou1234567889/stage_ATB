import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface AuditLog {
  date: string;
  utilisateur: string;
  action: string;
  ip: string;
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  constructor() {}

  // Simule un appel API. Plus tard, vous remplacerez ceci par un http.get(...)
  getLogs(): Observable<AuditLog[]> {
    const mockLogs: AuditLog[] = [
      { date: '12/08 14:30', utilisateur: 'Souha Said', action: 'Connexion', ip: '10.0.1.5' },
      { date: '12/08 12:15', utilisateur: 'Aymen Mzoughi', action: 'Création d\'offre', ip: '10.0.1.8' },
      { date: '12/08 10:00', utilisateur: 'Alaa Ben Jaber', action: 'Évaluation soumise', ip: '10.0.1.3' },
    ];
    return of(mockLogs);
  }
}