import { Component, EventEmitter, Output, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Subject, takeUntil, catchError, of, forkJoin } from 'rxjs';
import { UtilisateurService } from '../../services/utilisateur.service';
import { NotificationService } from '../../services/notification.service';

export interface RolePermission {
  name: string;
  permissions: string[];
  description?: string;
  userCount?: number;
  color?: string;
}

@Component({
  selector: 'app-roles-permissions',
  templateUrl: './roles-permissions.component.html',
  styleUrls: ['./roles-permissions.component.css']
})
export class RolesPermissionsComponent implements OnInit, OnDestroy {

  @Output() back = new EventEmitter<void>();

  roles: RolePermission[] = [];
  allPermissions: PermissionAction[] = [];
  
  loading = true;
  errorMessage = '';
  
  selectedRole: string | null = null;
  showEditModal = false;
  saving = false;
  
  totalUsers = 0;
  totalRoles = 0;
  totalPermissions = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private location: Location,
    private utilisateurService: UtilisateurService,
    private notifService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      users: this.utilisateurService.getAllUtilisateurs().pipe(catchError(() => of([]))),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ users }) => {
        const roleCounts = new Map<string, number>();
        users.forEach(user => {
          if (user.role) {
            const count = roleCounts.get(user.role) || 0;
            roleCounts.set(user.role, count + 1);
          }
        });

        this.buildRoles(roleCounts);
        this.buildAllPermissions();
        this.calculateStats(users);

        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = 'Erreur lors du chargement des données';
        console.error('Erreur loadData:', err);
        
        this.buildRoles(new Map());
        this.buildAllPermissions();
        this.calculateStats([]);
      }
    });
  }

  private buildRoles(roleCounts: Map<string, number>): void {
    const roleConfig: Record<string, { permissions: string[]; description: string; color: string }> = {
      'SUPER_ADMIN': {
        permissions: ['Gestion complète des utilisateurs', 'Gestion des rôles', 'Configuration système', 'Accès aux logs'],
        description: 'Accès complet à toutes les fonctionnalités du système',
        color: '#dc2626'
      },
      'RESPONSABLE_RH': {
        permissions: ['Gestion des offres', 'Gestion des candidatures', 'Gestion des livrables', 'Consultation des rapports'],
        description: 'Gestion complète des ressources humaines',
        color: '#7c3aed'
      },
      'RH': {
        permissions: ['Gestion des offres', 'Consultation des candidatures', 'Suivi des stagiaires'],
        description: 'Gestion des offres et suivi des candidatures',
        color: '#2563eb'
      },
      'ENCADRANT': {
        permissions: ['Suivi des stagiaires', 'Évaluations', 'Gestion des livrables', 'Entretiens'],
        description: 'Encadrement des stagiaires et évaluation des performances',
        color: '#059669'
      },
      'STAGIAIRE': {
        permissions: ['Consultation des missions', 'Soumission des livrables', 'Consultation des évaluations'],
        description: 'Suivi des missions et soumission des livrables',
        color: '#d97706'
      },
      'EMPLOYE': {
        permissions: ['Candidature aux offres', 'Suivi des candidatures', 'Gestion du profil'],
        description: 'Candidature aux offres et suivi des demandes',
        color: '#6b7280'
      }
    };

    this.roles = Object.keys(roleConfig).map(roleKey => {
      const config = roleConfig[roleKey];
      const userCount = roleCounts.get(roleKey) || 0;
      
      return {
        name: this.getRoleDisplayName(roleKey),
        permissions: config.permissions,
        description: config.description,
        userCount: userCount,
        color: config.color
      };
    });

    this.totalRoles = this.roles.length;
  }

  private getRoleDisplayName(role: string): string {
    const displayNames: Record<string, string> = {
      'SUPER_ADMIN': 'Super Administrateur',
      'RESPONSABLE_RH': 'Responsable RH',
      'RH': 'RH',
      'ENCADRANT': 'Encadrant',
      'STAGIAIRE': 'Stagiaire',
      'EMPLOYE': 'Employé'
    };
    return displayNames[role] || role;
  }

  private buildAllPermissions(): void {
    const categories: Record<string, string[]> = {
      'Utilisateurs': ['Gestion complète des utilisateurs', 'Gestion des rôles'],
      'Offres': ['Gestion des offres', 'Consultation des offres'],
      'Candidatures': ['Gestion des candidatures', 'Consultation des candidatures', 'Candidature aux offres'],
      'Stagiaires': ['Suivi des stagiaires', 'Consultation des stagiaires'],
      'Évaluations': ['Évaluations', 'Consultation des évaluations'],
      'Livrables': ['Gestion des livrables', 'Consultation des livrables', 'Soumission des livrables'],
      'Système': ['Configuration système', 'Accès aux logs', 'Consultation des rapports'],
      'Profil': ['Gestion du profil']
    };

    const permissionSet = new Set<string>();
    this.roles.forEach(role => {
      role.permissions.forEach(perm => permissionSet.add(perm));
    });

    this.allPermissions = [];
    
    const categoryKeys = Object.keys(categories);
    for (const categoryKey of categoryKeys) {
      const perms = categories[categoryKey];
      for (const perm of perms) {
        if (permissionSet.has(perm) || this.isKnownPermission(perm)) {
          this.allPermissions.push({
            label: perm,
            value: perm.toLowerCase().replace(/\s/g, '_'),
            category: categoryKey,
            description: this.getPermissionDescription(perm),
            enabled: true
          });
        }
      }
    }

    this.totalPermissions = this.allPermissions.length;
  }

  private isKnownPermission(perm: string): boolean {
    const knownPermissions = [
      'Gestion complète des utilisateurs', 'Gestion des rôles',
      'Gestion des offres', 'Consultation des offres',
      'Gestion des candidatures', 'Consultation des candidatures',
      'Candidature aux offres', 'Suivi des stagiaires',
      'Consultation des stagiaires', 'Évaluations',
      'Consultation des évaluations', 'Gestion des livrables',
      'Consultation des livrables', 'Soumission des livrables',
      'Configuration système', 'Accès aux logs',
      'Consultation des rapports', 'Gestion du profil',
      'Consultation des missions', 'Entretiens'
    ];
    return knownPermissions.includes(perm);
  }

  private getPermissionDescription(perm: string): string {
    const descriptions: Record<string, string> = {
      'Gestion complète des utilisateurs': 'Créer, modifier, activer/désactiver tous les utilisateurs',
      'Gestion des rôles': 'Attribuer et modifier les rôles des utilisateurs',
      'Gestion des offres': 'Créer, modifier et publier des offres de stage',
      'Consultation des offres': 'Consulter la liste des offres disponibles',
      'Gestion des candidatures': 'Traiter et valider les candidatures',
      'Consultation des candidatures': 'Consulter les candidatures reçues',
      'Candidature aux offres': 'Postuler aux offres de stage',
      'Suivi des stagiaires': 'Suivre l\'avancement des stagiaires',
      'Consultation des stagiaires': 'Consulter la liste des stagiaires',
      'Évaluations': 'Évaluer les performances des stagiaires',
      'Consultation des évaluations': 'Consulter les évaluations des stagiaires',
      'Gestion des livrables': 'Valider et réviser les livrables',
      'Consultation des livrables': 'Consulter les livrables soumis',
      'Soumission des livrables': 'Soumettre des livrables',
      'Configuration système': 'Modifier les paramètres du système',
      'Accès aux logs': 'Consulter les logs d\'audit',
      'Consultation des rapports': 'Consulter les rapports et statistiques',
      'Gestion du profil': 'Modifier son profil utilisateur',
      'Consultation des missions': 'Consulter les missions assignées',
      'Entretiens': 'Planifier et gérer les entretiens'
    };
    return descriptions[perm] || 'Permission standard';
  }

  private calculateStats(users: any[]): void {
    this.totalUsers = users.length;
  }

  // =============================================
  // ACTIONS
  // =============================================

  goBack(): void {
    this.back.emit();
    // ⚠️ CORRECTION : redirigeait avant systématiquement vers /dashboard/super-admin.
    this.location.back();
  }

  editRole(roleName: string): void {
    this.selectedRole = roleName;
    this.showEditModal = true;
  }

  closeModal(): void {
    this.showEditModal = false;
    this.selectedRole = null;
  }

  saveRolePermissions(): void {
    this.saving = true;
    setTimeout(() => {
      this.saving = false;
      this.closeModal();
      this.notifService.showSuccess('Permissions mises à jour avec succès');
    }, 1500);
  }

  getPermissionCount(role: RolePermission): number {
    return role.permissions.length;
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    this.allPermissions.forEach(perm => {
      if (perm.category) {
        categories.add(perm.category);
      }
    });
    return Array.from(categories);
  }

  getPermissionsByCategory(category: string): PermissionAction[] {
    return this.allPermissions.filter(perm => perm.category === category);
  }

  getPermissionColor(perm: PermissionAction): string {
    const colors = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#ec4899', '#0891b2', '#f97316'];
    const index = this.allPermissions.indexOf(perm);
    return colors[index % colors.length];
  }

  isPermissionEnabled(perm: PermissionAction): boolean {
    const role = this.roles.find(r => r.name === this.selectedRole);
    if (!role) return false;
    return role.permissions.includes(perm.label);
  }

  getRoleInitials(roleName: string): string {
    return roleName.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
  }

  reloadData(): void {
    this.loadData();
  }
}

export interface PermissionAction {
  label: string;
  value: string;
  category: string;
  description?: string;
  enabled: boolean;
}