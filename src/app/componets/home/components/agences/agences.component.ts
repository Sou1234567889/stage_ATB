import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OffreService, Agence } from '../../../../services/offre.service';

@Component({
  selector: 'app-agences',
  templateUrl: './agences.component.html',
  styleUrls: ['./agences.component.css']
})
export class AgencesComponent implements OnInit, OnDestroy {

  agences: Agence[] = [];
  loading = true;
  private destroy$ = new Subject<void>();

  constructor(private offreService: OffreService) {}

  ngOnInit(): void {
    this.offreService.getAgences()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.agences = data; this.loading = false; },
        error: () => this.loading = false
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}