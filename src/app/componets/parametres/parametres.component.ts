import { Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-parametres',
  templateUrl: './parametres.component.html',
  styleUrls: ['./parametres.component.css']
})
export class ParametresComponent {

  @Output() back = new EventEmitter<void>();

  constructor(private router: Router, private location: Location) {}

  goBack(): void {
    this.back.emit();
    // ⚠️ CORRECTION : redirigeait avant systématiquement vers /dashboard/super-admin,
    // même pour un RH ou un stagiaire. On revient maintenant à la page d'origine.
    this.location.back();
  }
}