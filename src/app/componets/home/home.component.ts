import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OffreService, PublicOffre } from '../../services/offre.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {

  showSignupModal = false;
  offreSelectionnee: PublicOffre | null = null;

  private destroy$ = new Subject<void>();

  constructor(private offreService: OffreService) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onOffreClick(o: PublicOffre): void {
    this.offreSelectionnee = o;
    this.showSignupModal = true;
  }

  fermerModal(): void {
    this.showSignupModal = false;
    this.offreSelectionnee = null;
  }
  
  sauverOffre(): void {
  if (this.offreSelectionnee) {
    localStorage.setItem('offre_a_postuler', JSON.stringify(this.offreSelectionnee));
  }
  this.fermerModal();
}
}