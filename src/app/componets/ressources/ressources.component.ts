import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

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
  selector: 'app-ressources',
  templateUrl: './ressources.component.html',
  styleUrls: ['./ressources.component.css']
})
export class RessourcesComponent implements OnInit {

  ressources: Ressource[] = [
    {
      id: 1,
      slug: 'guide-du-stagiaire',
      tag: 'Guide',
      titre: 'Guide du stagiaire',
      description: "Comment préparer votre candidature et réussir votre stage chez Attijari Bank.",
      type: 'guide',
      tempsLecture: '8 min',
      datePublication: '12 Jan 2026',
      contenu: `
        <h2>Bienvenue dans votre parcours</h2>
        <p>Ce guide complet vous accompagne à chaque étape de votre stage chez Attijari Bank,
        de la préparation de votre candidature jusqu'à la fin de votre mission.</p>

        <h3>1. Préparer votre candidature</h3>
        <p>Avant de postuler, prenez le temps de :</p>
        <ul>
          <li>Rédiger un CV clair et structuré</li>
          <li>Personnaliser votre lettre de motivation</li>
          <li>Rassembler vos documents (CIN, convention de stage)</li>
        </ul>

        <h3>2. Réussir votre entretien</h3>
        <p>L'entretien est votre chance de montrer votre motivation. Préparez-vous en :</p>
        <ul>
          <li>Vous renseignant sur la banque</li>
          <li>Préparant des exemples concrets de vos compétences</li>
          <li>Posant des questions pertinentes</li>
        </ul>

        <h3>3. Intégrer l'équipe</h3>
        <p>Dès votre arrivée, soyez proactif, curieux et n'hésitez pas à poser des questions
        à votre encadrant.</p>

        <h3>4. Valoriser votre stage</h3>
        <p>À la fin de votre stage, rédigez un rapport de qualité et demandez un retour
        à votre encadrant pour préparer la suite de votre carrière.</p>
      `
    },
    {
      id: 2,
      slug: 'rediger-un-cv-efficace',
      tag: 'Conseils',
      titre: 'Rédiger un CV efficace',
      description: "Les bonnes pratiques pour créer un CV qui retient l'attention des recruteurs.",
      type: 'article',
      tempsLecture: '6 min',
      datePublication: '08 Jan 2026',
      contenu: `
        <h2>Le CV, votre première impression</h2>
        <p>Un recruteur consacre en moyenne <strong>7 secondes</strong> à la première lecture
        d'un CV. Il doit donc être clair, structuré et impactant.</p>

        <h3>Les 5 règles d'or</h3>
        <ol>
          <li><strong>Une page maximum</strong> pour un premier poste</li>
          <li><strong>Police lisible</strong> (Calibri, Arial, Helvetica)</li>
          <li><strong>Structure claire</strong> : coordonnées, expériences, formations, compétences</li>
          <li><strong>Verbes d'action</strong> : développé, piloté, optimisé...</li>
          <li><strong>Pas de fautes</strong> — relisez-vous à voix haute</li>
        </ol>

        <h3>Les erreurs à éviter</h3>
        <ul>
          <li>Photo non professionnelle</li>
          <li>Email fantaisiste (utilisez prenom.nom@...)</li>
          <li>Informations non vérifiables</li>
          <li>Trop de couleurs ou d'effets visuels</li>
        </ul>

        <h3>Le format ATS</h3>
        <p>De plus en plus d'entreprises utilisent des logiciels de tri automatique (ATS).
        Utilisez des mots-clés de l'offre pour passer les filtres.</p>
      `
    },
    {
      id: 3,
      slug: 'programme-de-stages-2026',
      tag: 'Actualité',
      titre: 'Programme de stages 2026',
      description: "Découvrez les nouvelles opportunités de stages pour l'année 2026.",
      type: 'actualite',
      datePublication: '05 Jan 2026',
      contenu: `
        <h2>Nouveau programme 2026</h2>
        <p>Attijari Bank ouvre <strong>plus de 120 places de stage</strong> pour l'année 2026
        dans ses différentes filiales et départements.</p>

        <h3>Départements concernés</h3>
        <ul>
          <li>DSI — Développement, Data, Cybersécurité</li>
          <li>Marketing &amp; Communication</li>
          <li>Ressources Humaines</li>
          <li>Audit &amp; Contrôle de gestion</li>
          <li>Commercial &amp; Relation Client</li>
        </ul>

        <h3>Calendrier des candidatures</h3>
        <table>
          <tr><th>Période</th><th>Type de stage</th></tr>
          <tr><td>Février - Juillet 2026</td><td>Stages PFE</td></tr>
          <tr><td>Juin - Août 2026</td><td>Stages d'été</td></tr>
          <tr><td>Sept - Déc 2026</td><td>Stages professionnels</td></tr>
        </table>

        <h3>Comment postuler</h3>
        <p>Rendez-vous sur la page <strong>Offres</strong> pour consulter les postes ouverts
        et déposer votre candidature en ligne.</p>
      `
    },
    {
      id: 4,
      slug: 'interview-reussir-son-entretien',
      tag: 'Vidéo',
      titre: 'Interview : réussir son entretien',
      description: "Nos experts partagent leurs conseils pour briller en entretien.",
      type: 'video',
      tempsLecture: '12 min',
      datePublication: '02 Jan 2026',
      lienExterne: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      contenu: `
        <h2>Interview exclusive</h2>
        <p>Dans cette vidéo, nos responsables RH partagent leurs conseils pour réussir
        votre entretien d'embauche chez Attijari Bank.</p>

        <h3>Au programme</h3>
        <ul>
          <li>Les questions les plus fréquentes</li>
          <li>Comment parler de ses faiblesses</li>
          <li>L'attitude à adopter</li>
          <li>Les questions à poser au recruteur</li>
        </ul>
      `
    },
    {
      id: 5,
      slug: 'rapport-annuel-2025',
      tag: 'Rapport',
      titre: 'Rapport annuel 2025',
      description: "Bilan de nos activités et perspectives pour l'année à venir.",
      type: 'rapport',
      datePublication: '20 Déc 2025',
      contenu: `
        <h2>Rapport annuel 2025</h2>
        <p>Découvrez les résultats et les temps forts de l'année 2025 chez Attijari Bank.</p>

        <h3>Chiffres clés</h3>
        <ul>
          <li>Plus de 1 200 000 clients</li>
          <li>220 agences à travers la Tunisie</li>
          <li>2 800 collaborateurs</li>
          <li>450 stagiaires accueillis</li>
        </ul>

        <h3>Temps forts</h3>
        <ul>
          <li>Lancement de la nouvelle appli mobile</li>
          <li>Ouverture de 15 nouvelles agences</li>
          <li>Digitalisation de 80% des services</li>
        </ul>
      `
    },
    {
      id: 6,
      slug: 'questions-frequentes',
      tag: 'FAQ',
      titre: 'Questions fréquentes',
      description: "Réponses aux questions les plus posées par nos candidats.",
      type: 'faq',
      datePublication: '15 Déc 2025',
      contenu: `
        <h2>Foire aux questions</h2>

        <h3>Comment postuler à un stage ?</h3>
        <p>Créez votre compte sur notre plateforme, complétez votre profil puis postulez
        directement depuis la page Offres.</p>

        <h3>Quels documents dois-je fournir ?</h3>
        <p>Un CV (PDF), une demande de stage signée par votre établissement et une lettre
        de motivation.</p>

        <h3>Quelle est la durée d'un stage ?</h3>
        <p>Entre 1 et 6 mois selon le type de stage (observation, professionnel, PFE).</p>

        <h3>Le stage est-il rémunéré ?</h3>
        <p>Oui, les stages d'une durée supérieure à 2 mois sont indemnisés selon la
        réglementation en vigueur.</p>

        <h3>Puis-je postuler à plusieurs offres ?</h3>
        <p>Oui, mais vous ne pouvez avoir qu'un seul stage actif à la fois.</p>

        <h3>Comment se déroule l'entretien ?</h3>
        <p>Un premier échange téléphonique, puis un entretien en présentiel ou en
        visioconférence avec le responsable du département.</p>
      `
    }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Stocker les ressources dans sessionStorage pour y accéder depuis la page détail
    sessionStorage.setItem('ressources_data', JSON.stringify(this.ressources));
  }

  /** Ouvre la page détail */
  ouvrirRessource(r: Ressource): void {
    this.router.navigate(['/ressources', r.slug]);
  }

  /** Libellé du lien selon le type */
  getLibelleLien(type: Ressource['type']): string {
    switch (type) {
      case 'video':     return 'Regarder';
      case 'rapport':   return 'Télécharger';
      case 'faq':       return 'Voir la FAQ';
      case 'actualite': return 'En savoir plus';
      case 'article':   return "Lire l'article";
      default:          return 'Lire le guide';
    }
  }
}