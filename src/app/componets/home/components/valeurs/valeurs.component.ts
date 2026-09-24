import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OffreService, Valeur } from '../../../../services/offre.service';

@Component({
  selector: 'app-valeurs',
  templateUrl: './valeurs.component.html',
  styleUrls: ['./valeurs.component.css']
})
export class ValeursComponent implements OnInit, OnDestroy {

  valeurs: Valeur[] = [];
  loading = true;
  private destroy$ = new Subject<void>();

  constructor(private offreService: OffreService) {}

  ngOnInit(): void {
    this.offreService.getValeurs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.valeurs = data; this.loading = false; },
        error: () => this.loading = false
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}