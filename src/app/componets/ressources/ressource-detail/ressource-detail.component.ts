import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';

export interface Ressource {
  id: number;
  slug: string;
  tag: string;
  titre: string;
  description: string;
  contenu: string;
  type: 'guide' | 'article' | 'video' | 'rapport' | 'faq' | 'actualite';
  lienExterne?: string;
  tempsLecture?: string;
  datePublication?: string;
}

@Component({
  selector: 'app-ressource-detail',
  templateUrl: './ressource-detail.component.html',
  styleUrls: ['./ressource-detail.component.css']
})
export class RessourceDetailComponent implements OnInit {

  ressource: Ressource | null = null;
  contenuHtml: SafeHtml = '';
  videoUrl: SafeResourceUrl | null = null;
  notFound = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');

    // Récupérer depuis sessionStorage
    const dataStr = sessionStorage.getItem('ressources_data');
    if (!dataStr) {
      this.notFound = true;
      return;
    }

    const ressources: Ressource[] = JSON.parse(dataStr);
    const r = ressources.find(x => x.slug === slug);

    if (!r) {
      this.notFound = true;
      return;
    }

    this.ressource = r;
    this.contenuHtml = this.sanitizer.bypassSecurityTrustHtml(r.contenu);

    if (r.type === 'video' && r.lienExterne) {
      this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(r.lienExterne);
    }
  }

  retourListe(): void {
    this.router.navigate(['/ressources']);
  }
}