import { Component, OnInit } from '@angular/core';

export interface MiniStat {
  id: number;
  valeur: string;
  label: string;
}

export interface Valeur {
  id: number;
  numero: string;
  titre: string;
  description: string;
}

@Component({
  selector: 'app-a-propos',
  templateUrl: './a-propos.component.html',
  styleUrls: ['./a-propos.component.css']
})
export class AProposComponent implements OnInit {

  miniStats: MiniStat[] = [
    { id: 1, valeur: '1968',   label: 'Année de création' },
    { id: 2, valeur: '200+',   label: 'Agences' },
    { id: 3, valeur: '1M+',    label: 'Clients' },
    { id: 4, valeur: '2500+',  label: 'Collaborateurs' }
  ];

  valeurs: Valeur[] = [
    {
      id: 1,
      numero: '01',
      titre: 'Proximité',
      description: 'Toujours proches de nos clients, partout en Tunisie grâce à un vaste réseau d\'agences.'
    },
    {
      id: 2,
      numero: '02',
      titre: 'Innovation',
      description: 'Des solutions bancaires modernes et digitales pour simplifier votre quotidien.'
    },
    {
      id: 3,
      numero: '03',
      titre: 'Excellence',
      description: 'Le meilleur service à chaque instant, porté par une équipe engagée et experte.'
    },
    {
      id: 4,
      numero: '04',
      titre: 'Confiance',
      description: 'Une relation durable et transparente construite sur plus de 50 ans d\'histoire.'
    }
  ];

  constructor() {}

  ngOnInit(): void {}
}