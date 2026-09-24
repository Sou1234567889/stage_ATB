import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface Service {
  id: number;
  slug: string;
  categorie: string;
  titre: string;
  description: string;
  details: string[];
  contenu: string;
}

@Component({
  selector: 'app-service-detail',
  templateUrl: './service-detail.component.html',
  styleUrls: ['./service-detail.component.css']
})
export class ServiceDetailComponent implements OnInit {

  service: Service | null = null;
  contenuHtml: SafeHtml = '';
  notFound = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    const dataStr = sessionStorage.getItem('services_data');

    if (!dataStr) {
      this.notFound = true;
      return;
    }

    const services: Service[] = JSON.parse(dataStr);
    const s = services.find(x => x.slug === slug);

    if (!s) {
      this.notFound = true;
      return;
    }

    this.service = s;
    this.contenuHtml = this.sanitizer.bypassSecurityTrustHtml(s.contenu);
  }

  retourListe(): void {
    this.router.navigate(['/services']);
  }
}