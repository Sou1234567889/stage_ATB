import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-back-to-dashboard',
  templateUrl: './back-to-dashboard.component.html',
  styleUrls: ['./back-to-dashboard.component.css']
})
export class BackToDashboardComponent {

  @Input() label: string = 'Retour au tableau de bord';
  @Input() fallbackUrl: string = '/dashboard/super-admin';
  @Input() useHistory: boolean = false;

  constructor(private router: Router, private location: Location) {}

  goBack(): void {
    if (this.useHistory) {
      this.location.back();
    } else {
      this.router.navigate([this.fallbackUrl]);
    }
  }
}