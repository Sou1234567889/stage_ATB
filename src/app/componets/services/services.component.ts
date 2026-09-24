import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

export interface Service {
  id: number;
  slug: string;
  categorie: string;
  titre: string;
  description: string;
  details: string[];
  contenu: string;
}

export interface Avantage {
  id: number;
  numero: string;
  titre: string;
  description: string;
}

@Component({
  selector: 'app-services',
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.css']
})
export class ServicesComponent implements OnInit {

  services: Service[] = [
    {
      id: 1,
      slug: 'comptes-bancaires',
      categorie: 'Particuliers',
      titre: 'Comptes bancaires',
      description: 'Comptes courants, comptes épargne, comptes professionnels adaptés à vos besoins.',
      details: ['Compte courant classique', 'Compte épargne rémunéré', 'Compte professionnel', 'Compte joint'],
      contenu: `
        <h2>Nos comptes bancaires</h2>
        <p>Attijari Bank vous propose une gamme complète de comptes bancaires adaptés à votre profil et à vos projets.</p>

        <h3>Compte courant classique</h3>
        <p>Le compte idéal pour gérer vos opérations quotidiennes avec une carte bancaire et un accès en ligne 24h/24.</p>

        <h3>Compte épargne rémunéré</h3>
        <p>Faites fructifier votre épargne avec un taux préférentiel et une disponibilité permanente de vos fonds.</p>

        <h3>Compte professionnel</h3>
        <p>Une solution dédiée aux indépendants, professions libérales et petites entreprises.</p>

        <h3>Compte joint</h3>
        <p>Partagez un compte avec votre conjoint ou un partenaire pour une gestion simplifiée.</p>

        <h3>Avantages</h3>
        <ul>
          <li>Aucun frais de tenue de compte la 1ère année</li>
          <li>Carte bancaire internationale gratuite</li>
          <li>Application mobile complète</li>
          <li>Service client 7j/7</li>
        </ul>
      `
    },
    {
      id: 2,
      slug: 'cartes-bancaires',
      categorie: 'Paiement',
      titre: 'Cartes bancaires',
      description: 'Cartes de débit, crédit et prépayées avec des avantages exclusifs.',
      details: ['Visa Classic', 'Visa Gold', 'Mastercard Platinum', 'Cartes prépayées'],
      contenu: `
        <h2>Cartes bancaires Attijari</h2>
        <p>Des cartes pensées pour tous vos besoins, en Tunisie comme à l'international.</p>

        <h3>Visa Classic</h3>
        <p>La carte essentielle pour vos retraits et paiements au quotidien, acceptée partout dans le monde.</p>

        <h3>Visa Gold</h3>
        <p>Une carte premium avec des plafonds élevés et des assurances voyage incluses.</p>

        <h3>Mastercard Platinum</h3>
        <p>Le summum du prestige avec conciergerie 24/7, accès aux salons VIP et avantages exclusifs.</p>

        <h3>Cartes prépayées</h3>
        <p>Contrôlez votre budget et sécurisez vos achats en ligne avec nos cartes rechargeables.</p>

        <h3>Services inclus</h3>
        <ul>
          <li>Assurance voyage</li>
          <li>Notifications SMS en temps réel</li>
          <li>Paiement sans contact</li>
          <li>Blocage/déblocage instantané via l'app</li>
        </ul>
      `
    },
    {
      id: 3,
      slug: 'credits',
      categorie: 'Financement',
      titre: 'Crédits',
      description: 'Crédits immobiliers, personnels, automobiles et professionnels.',
      details: ['Crédit immobilier', 'Crédit personnel', 'Crédit auto', 'Crédit professionnel'],
      contenu: `
        <h2>Solutions de financement</h2>
        <p>Attijari Bank vous accompagne dans la réalisation de tous vos projets avec des solutions de crédit adaptées.</p>

        <h3>Crédit immobilier</h3>
        <p>Financez l'achat de votre logement avec un taux compétitif et une durée allant jusqu'à 25 ans.</p>

        <h3>Crédit personnel</h3>
        <p>Obtenez un financement rapide pour vos projets personnels (voyage, études, aménagement...).</p>

        <h3>Crédit automobile</h3>
        <p>Roulez en toute liberté avec un crédit auto jusqu'à 7 ans et 100% du prix du véhicule.</p>

        <h3>Crédit professionnel</h3>
        <p>Développez votre activité avec des solutions de financement pour les entreprises de toutes tailles.</p>
      `
    },
    {
      id: 4,
      slug: 'investissements',
      categorie: 'Placement',
      titre: 'Investissements',
      description: 'Placements financiers, assurance-vie et gestion de patrimoine.',
      details: ['OPCVM', 'Assurance-vie', 'Gestion de patrimoine', 'Investissements immobiliers'],
      contenu: `
        <h2>Faites fructifier votre patrimoine</h2>
        <p>Nos experts vous accompagnent dans la construction d'un patrimoine solide et diversifié.</p>

        <h3>OPCVM</h3>
        <p>Investissez dans des fonds gérés par des professionnels, adaptés à votre profil de risque.</p>

        <h3>Assurance-vie</h3>
        <p>Préparez votre retraite et transmettez votre patrimoine dans les meilleures conditions fiscales.</p>

        <h3>Gestion de patrimoine</h3>
        <p>Un conseiller dédié pour optimiser la gestion de vos actifs.</p>

        <h3>Investissements immobiliers</h3>
        <p>Identifiez les meilleures opportunités du marché immobilier tunisien.</p>
      `
    },
    {
      id: 5,
      slug: 'banque-en-ligne',
      categorie: 'Digital',
      titre: 'Banque en ligne',
      description: 'Services digitaux sécurisés, accessibles 24h/24 et 7j/7.',
      details: ['Application mobile', 'Web banking', 'Notifications push', 'Virements instantanés'],
      contenu: `
        <h2>La banque dans votre poche</h2>
        <p>Gérez vos comptes partout et à tout moment avec nos services digitaux sécurisés.</p>

        <h3>Application mobile</h3>
        <p>Disponible sur iOS et Android, notre app vous donne accès à tous vos services bancaires.</p>

        <h3>Web banking</h3>
        <p>Une plateforme complète accessible depuis votre navigateur, sans installation.</p>

        <h3>Notifications push</h3>
        <p>Restez informé en temps réel de toutes vos transactions.</p>

        <h3>Virements instantanés</h3>
        <p>Transférez de l'argent en quelques secondes vers vos proches ou vos partenaires.</p>
      `
    },
    {
      id: 6,
      slug: 'services-entreprises',
      categorie: 'Entreprises',
      titre: 'Services entreprises',
      description: 'Financement, trésorerie et accompagnement des entreprises.',
      details: ['Comptes professionnels', 'Financement court terme', 'Trade finance', 'Cash management'],
      contenu: `
        <h2>Solutions pour entreprises</h2>
        <p>Attijari Bank accompagne les entreprises de toutes tailles dans leur développement.</p>

        <h3>Comptes professionnels</h3>
        <p>Des comptes dédiés aux besoins des entreprises avec des services sur mesure.</p>

        <h3>Financement court terme</h3>
        <p>Gérez votre trésorerie avec des solutions flexibles et réactives.</p>

        <h3>Trade finance</h3>
        <p>Accompagnez votre développement à l'international avec nos solutions d'import-export.</p>

        <h3>Cash management</h3>
        <p>Optimisez la gestion de vos flux financiers avec nos outils digitaux.</p>
      `
    }
  ];

  avantages: Avantage[] = [
    {
      id: 1,
      numero: '01',
      titre: 'Rapidité',
      description: 'Des services digitaux qui vous font gagner du temps grâce à des processus optimisés.'
    },
    {
      id: 2,
      numero: '02',
      titre: 'Sécurité',
      description: 'Vos données et transactions sont protégées selon les standards les plus élevés du secteur bancaire.'
    },
    {
      id: 3,
      numero: '03',
      titre: 'Personnalisation',
      description: 'Des offres adaptées à votre profil et à vos objectifs, avec un conseiller dédié.'
    }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    sessionStorage.setItem('services_data', JSON.stringify(this.services));
  }

  ouvrirService(s: Service): void {
    this.router.navigate(['/services', s.slug]);
  }
}