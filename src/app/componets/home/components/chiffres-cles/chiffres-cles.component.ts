import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OffreService, ChiffreCle } from '../../../../services/offre.service';

@Component({
  selector: 'app-chiffres-cles',
  templateUrl: './chiffres-cles.component.html',
  styleUrls: ['./chiffres-cles.component.css']
})
export class ChiffresClesComponent implements OnInit, OnDestroy {

  chiffres: ChiffreCle[] = [];
  loading = true;
  private destroy$ = new Subject<void>();

  constructor(private offreService: OffreService) {}

  ngOnInit(): void {
    this.offreService.getChiffresCles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.chiffres = data; this.loading = false; },
        error: () => this.loading = false
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}