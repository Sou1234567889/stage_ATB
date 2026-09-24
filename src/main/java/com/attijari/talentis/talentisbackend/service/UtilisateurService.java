package com.attijari.talentis.talentisbackend.service;

import com.attijari.talentis.talentisbackend.dto.RegisterRequest;
import com.attijari.talentis.talentisbackend.entity.Role;
import com.attijari.talentis.talentisbackend.entity.Utilisateur;
import com.attijari.talentis.talentisbackend.repository.*;
import org.jetbrains.annotations.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class UtilisateurService {

    private static final Logger logger = LoggerFactory.getLogger(UtilisateurService.class);

    @Autowired
    private UtilisateurRepository repository;
    @Autowired private EmailService emailService;
    @Autowired private AuditLogService auditLogService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private WhatsAppService whatsAppService;
    @Autowired private NotificationService notificationService;
    // 🆕 AJOUTÉ

   
    public Utilisateur inscrire(RegisterRequest req) {
        if (repository.findByEmail(req.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email déjà utilisé.");
        }

        Utilisateur u = new Utilisateur();
        u.setNom(req.getNom());
        u.setPrenom(req.getPrenom());
        u.setEmail(req.getEmail());
        u.setTelephone(req.getTelephone());
        u.setMotDePasse(passwordEncoder.encode(req.getMotDePasse()));
        u.setActif(false);
        u.setDateCreation(LocalDateTime.now());

        Utilisateur saved = repository.save(u);

        // 🆕 Notification d'inscription
        try {
            notificationService.creerNotificationPourAdmins(
                    "👤 Nouvelle inscription",
                    saved.getPrenom() + " " + saved.getNom() + " vient de s'inscrire.",
                    "INSCRIPTION", "INSCRIPTION",
                    "Utilisateur", saved.getId(), "/utilisateurs"
            );
        } catch (Exception e) {
            logger.warn("Notification inscription échouée: {}", e.getMessage());
        }

        return saved;
    }

    public Utilisateur authentifier(String email, String motDePasse) {
        Utilisateur u = repository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Email ou mot de passe incorrect."));

        if (!passwordEncoder.matches(motDePasse, u.getMotDePasse())) {
            throw new IllegalArgumentException("Email ou mot de passe incorrect.");
        }

        return u;
    }

    public Utilisateur findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable."));
    }

    public List<Utilisateur> findAll() {
        return repository.findAll();
    }

    public List<Utilisateur> findByRole(Role role) {
        return repository.findByRole(role);
    }

    // --- ADMIN ATTRIBUE LE ROLE ---
    @Transactional
    public Utilisateur changerRole(Long id, Role role) {

        Utilisateur u = findById(id);

        int updated = repository.updateRoleAndActif(id, role);

        if (updated == 0) {
            throw new RuntimeException("Impossible de mettre à jour l'utilisateur.");
        }

        Utilisateur saved = repository.findById(id).get();

        // ✅ Envoyer WhatsApp
        try {
            String message = String.format(
                    "Bonjour %s, votre compte Attijari Workspace a été activé avec le rôle : %s. " +
                            "Connectez-vous sur : http://localhost:4200/login",
                    saved.getPrenom(),
                    saved.getRole()
            );
            whatsAppService.envoyerWhatsApp(saved.getTelephone(), message);
            logger.info("✅ WhatsApp envoyé à {}", saved.getTelephone());
        } catch (Exception e) {
            logger.error("❌ Erreur envoi WhatsApp: {}", e.getMessage());
        }

        // 🆕 NOTIFICATION ATTRIBUTION DE RÔLE
        try {
            notificationService.creerNotificationPourAdmins(
                    "🛡️ Rôle attribué",
                    saved.getPrenom() + " " + saved.getNom() + " a reçu le rôle : " + role,
                    "ATTRIBUTION_ROLE", "ATTRIBUTION_ROLE",
                    "Utilisateur", saved.getId(), "/utilisateurs"
            );

            // ➕ Notifier l'utilisateur concerné
            notificationService.creerNotification(
                    saved,
                    "🎉 Compte activé",
                    "Votre compte a été activé avec le rôle : " + role,
                    "ATTRIBUTION_ROLE", "ATTRIBUTION_ROLE",
                    "Utilisateur", saved.getId(), "/dashboard"
            );
        } catch (Exception e) {
            logger.warn("Notification rôle échouée: {}", e.getMessage());
        }

        return saved;
    }

    public void desactiver(Long id) {
        Utilisateur u = findById(id);
        u.setActif(false);
        repository.save(u);
    }

    @NotNull
    public ResponseEntity<? extends Map<String, ? extends Object>> getResponseEntity(Long id, String role) {
        try {
            System.out.println("========================================");
            System.out.println("Attribution du rôle à l'utilisateur ID: " + id);
            System.out.println("Rôle demandé: " + role);

            Optional<Utilisateur> optionalUser = repository.findById(id);
            if (optionalUser.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Utilisateur non trouvé.");
                error.put("success", "false");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }

            Role nouveauRole;
            try {
                nouveauRole = Role.valueOf(role);
            } catch (IllegalArgumentException e) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Rôle invalide : " + role);
                error.put("success", "false");
                return ResponseEntity.badRequest().body(error);
            }

            Utilisateur utilisateur = optionalUser.get();

            String motDePasseExistant = utilisateur.getMotDePasse();
            if (motDePasseExistant == null || motDePasseExistant.isBlank()) {
                String defaultPassword = "Attijari2025!";
                motDePasseExistant = passwordEncoder.encode(defaultPassword);
                System.out.println("Mot de passe par défaut généré pour " + utilisateur.getEmail());
            }

            utilisateur.setRole(nouveauRole);
            utilisateur.setActif(true);
            utilisateur.setMotDePasse(motDePasseExistant);

            Utilisateur savedUtilisateur;
            try {
                savedUtilisateur = repository.saveAndFlush(utilisateur);
            } catch (Exception dbEx) {
                Throwable racine = dbEx;
                while (racine.getCause() != null && racine.getCause() != racine) {
                    racine = racine.getCause();
                }
                System.err.println("❌ Échec SQL: " + racine.getMessage());
                dbEx.printStackTrace();

                Map<String, String> error = new HashMap<>();
                error.put("message", "Erreur base de données : " + racine.getMessage());
                error.put("success", "false");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
            }

            System.out.println("Rôle attribué avec succès à " + savedUtilisateur.getEmail());
            System.out.println("Nouveau rôle: " + savedUtilisateur.getRole());

            auditLogService.log(savedUtilisateur, "ATTRIBUTION_ROLE", "Utilisateur", savedUtilisateur.getId(), "127.0.0.1");

            notificationService.creerNotification(
                    savedUtilisateur,
                    "Compte activé",
                    "Votre compte a été activé avec le rôle : " + traduireRole(nouveauRole.name()) + ".",
                    "success",
                    "ATTRIBUTION_ROLE",
                    "Utilisateur",
                    savedUtilisateur.getId(),
                    "/dashboard"
            );

            // ✅ Envoyer WhatsApp
            boolean whatsappEnvoye = false;
            boolean emailEnvoye = false;

            try {
                envoyerWhatsAppNotification(savedUtilisateur);
                whatsappEnvoye = true;
                System.out.println("✅ WhatsApp envoyé à " + savedUtilisateur.getTelephone());
            } catch (Exception e) {
                System.err.println("❌ Échec WhatsApp: " + e.getMessage());
            }

            try {
                envoyerEmailNotification(savedUtilisateur);
                emailEnvoye = true;
                System.out.println("✅ Email envoyé à " + savedUtilisateur.getEmail());
            } catch (Exception e) {
                System.err.println("❌ Échec Email: " + e.getMessage());
            }

            savedUtilisateur.setMotDePasse(null);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Rôle attribué avec succès !");
            response.put("utilisateur", savedUtilisateur);
            response.put("whatsappEnvoye", whatsappEnvoye);
            response.put("emailEnvoye", emailEnvoye);
            response.put("success", true);

            System.out.println("========================================");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Throwable racine = e;
            while (racine.getCause() != null && racine.getCause() != racine) {
                racine = racine.getCause();
            }
            System.err.println("Erreur: " + racine.getMessage());
            e.printStackTrace();

            Map<String, String> error = new HashMap<>();
            error.put("message", "Erreur: " + racine.getMessage());
            error.put("success", "false");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    private void envoyerEmailNotification(Utilisateur utilisateur) {
        if (utilisateur.getEmail() == null || utilisateur.getEmail().isBlank()) {
            System.err.println("Email non envoyé : Adresse email manquante");
            return;
        }

        try {
            String prenom = utilisateur.getPrenom() != null ? utilisateur.getPrenom() : "Utilisateur";
            String role = utilisateur.getRole() != null ? utilisateur.getRole().toString() : "Rôle attribué";
            String roleFr = traduireRole(role);

            String sujet = "Votre compte Attijari Workspace a été activé";

            String corps = String.format(
                    "Bonjour %s,\n\n" +
                            "Nous avons le plaisir de vous informer que votre compte Attijari Workspace a été activé avec succès.\n\n" +
                            "Rôle attribué : %s\n" +
                            "Email : %s\n\n" +
                            "Lien de connexion : http://localhost:4200/login\n\n" +
                            "Pour vous connecter :\n" +
                            "• Email : %s\n" +
                            "• Mot de passe : Celui que vous avez choisi lors de l'inscription\n\n" +
                            "Si vous avez oublié votre mot de passe, utilisez la fonction Mot de passe oublié sur la page de connexion.\n\n" +
                            "Cordialement,\n" +
                            "L'équipe Attijari Bank",
                    prenom,
                    roleFr,
                    utilisateur.getEmail(),
                    utilisateur.getEmail()
            );

            emailService.sendEmail(utilisateur.getEmail(), sujet, corps);
            System.out.println("Email envoyé avec succès à " + utilisateur.getEmail());

        } catch (Exception e) {
            System.err.println("Échec envoi email à " + utilisateur.getEmail() + ": " + e.getMessage());
        }
    }
    private String traduireRole(String role) {
        if (role == null) return "Aucun rôle défini";

        switch (role) {
            case "SUPER_ADMIN":
                return "Super Administrateur";
            case "RESPONSABLE_RH":
                return "Responsable des Ressources Humaines";
            case "RH":
                return "Ressources Humaines";
            case "ENCADRANT":
                return "Encadrant";
            case "STAGIAIRE":
                return "Stagiaire";
            case "EMPLOYE":
                return "Employé";
            default:
                return role;
        }
    }
    private void envoyerWhatsAppNotification(Utilisateur utilisateur) {
        if (utilisateur.getTelephone() == null || utilisateur.getTelephone().isBlank()) {
            System.err.println("WhatsApp non envoyé : Numéro de téléphone manquant");
            return;
        }

        try {
            String prenom = utilisateur.getPrenom() != null ? utilisateur.getPrenom() : "Utilisateur";
            String role = utilisateur.getRole() != null ? utilisateur.getRole().toString() : "Rôle attribué";
            String roleFr = traduireRole(role);

            String message = String.format(
                    "Bonjour %s, votre compte Attijari Workspace a été activé avec le rôle : %s. Connectez-vous sur : http://localhost:4200/login",
                    prenom, roleFr
            );

            WhatsAppService.WhatsAppResult result = whatsAppService.envoyerWhatsApp(
                    utilisateur.getTelephone(),
                    message
            );

            if (result.isSuccess()) {
                System.out.println("✅ WhatsApp envoyé à " + utilisateur.getTelephone());
                System.out.println("📝 ID: " + result.getMessageId());
            } else {
                System.err.println("❌ Échec WhatsApp: " + result.getMessage());
            }

        } catch (Exception e) {
            System.err.println("❌ Erreur WhatsApp à " + utilisateur.getTelephone() + ": " + e.getMessage());
        }
    }


}