package com.attijari.talentis.talentisbackend.service;

import com.attijari.talentis.talentisbackend.dto.LoginRequest;
import com.attijari.talentis.talentisbackend.dto.RegisterRequest;
import com.attijari.talentis.talentisbackend.entity.Candidature;
import com.attijari.talentis.talentisbackend.entity.Role;
import com.attijari.talentis.talentisbackend.entity.StatutCandidature;
import com.attijari.talentis.talentisbackend.entity.Utilisateur;
import com.attijari.talentis.talentisbackend.repository.CandidatureRepository;
import com.attijari.talentis.talentisbackend.repository.UtilisateurRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AuthService {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AuditLogService auditLogService;
    private final CandidatureRepository candidatureRepository;
    private final NotificationService notificationService;

    public AuthService(UtilisateurRepository utilisateurRepository,
                       PasswordEncoder passwordEncoder,
                       EmailService emailService,
                       AuditLogService auditLogService,
                       CandidatureRepository candidatureRepository,
                       NotificationService notificationService) {
        this.utilisateurRepository = utilisateurRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.auditLogService = auditLogService;
        this.candidatureRepository = candidatureRepository;
        this.notificationService = notificationService;
    }

    public ResponseEntity<?> login(LoginRequest request) {
        Optional<Utilisateur> optionalUser = utilisateurRepository.findByEmail(request.getEmail());

        if (optionalUser.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Email ou mot de passe incorrect.");
            return ResponseEntity.status(401).body(error);
        }

        Utilisateur utilisateur = optionalUser.get();

        if (!passwordEncoder.matches(request.getMotDePasse(), utilisateur.getMotDePasse())) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Email ou mot de passe incorrect.");
            return ResponseEntity.status(401).body(error);
        }

        if (!utilisateur.isActif()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Votre compte est désactivé. Contactez l'administrateur.");
            return ResponseEntity.status(403).body(error);
        }

        auditLogService.log(utilisateur, "CONNEXION", "Utilisateur", utilisateur.getId(), "127.0.0.1");

        // 🔔 Notifier les stagiaires quand un ENCADRANT se connecte
        if (utilisateur.getRole() == Role.ENCADRANT) {
            notifierStagiairesConnexionEncadrant(utilisateur);
        }

        // 🔔 Notifier les encadrants quand un STAGIAIRE se connecte
        if (utilisateur.getRole() == Role.STAGIAIRE) {
            notifierEncadrantsConnexionStagiaire(utilisateur);
        }

        utilisateur.setMotDePasse(null);
        return ResponseEntity.ok(utilisateur);
    }

    /**
     * 🔔 Notifie tous les stagiaires actifs d'un encadrant qu'il vient de se connecter
     *    + notifie les admins
     */
    private void notifierStagiairesConnexionEncadrant(Utilisateur encadrant) {
        try {
            List<Candidature> candidatures = candidatureRepository.findByEncadrant(encadrant);
            for (Candidature c : candidatures) {
                if (c.getCandidat() != null
                        && (c.getStatut() == StatutCandidature.ACCEPTE
                        || c.getStatut() == StatutCandidature.EN_COURS)) {
                    notificationService.creerNotification(
                            c.getCandidat().getId(),
                            "🟢 Votre encadrant est en ligne",
                            encadrant.getPrenom() + " " + encadrant.getNom()
                                    + " vient de se connecter. Vous pouvez le contacter.",
                            "DISPONIBILITE"
                    );
                }
            }

            // 🆕 Notifier les admins de la connexion de cet encadrant
            notificationService.creerNotificationPourAdmins(
                    "📹 Appel encadrant",
                    "L'encadrant " + encadrant.getPrenom() + " " + encadrant.getNom()
                            + " (" + encadrant.getEmail() + ") vient de se connecter.",
                    "DISPONIBILITE", "CONNEXION_ENCADRANT",
                    "Utilisateur", encadrant.getId(), "/utilisateurs"
            );

            System.out.println("✅ Notifs de connexion envoyées aux stagiaires de "
                    + encadrant.getEmail());
        } catch (Exception e) {
            System.err.println("⚠️ Erreur notif connexion encadrant: " + e.getMessage());
        }
    }

    /**
     * 🔔 Notifie tous les encadrants d'un stagiaire qu'il vient de se connecter
     *    + notifie les admins
     */
    private void notifierEncadrantsConnexionStagiaire(Utilisateur stagiaire) {
        try {
            List<Candidature> candidatures = candidatureRepository.findByCandidat(stagiaire);
            for (Candidature c : candidatures) {
                if (c.getEncadrant() != null
                        && (c.getStatut() == StatutCandidature.ACCEPTE
                        || c.getStatut() == StatutCandidature.EN_COURS)) {
                    notificationService.creerNotification(
                            c.getEncadrant().getId(),
                            "🟢 Votre stagiaire est en ligne",
                            stagiaire.getPrenom() + " " + stagiaire.getNom()
                                    + " vient de se connecter.",
                            "DISPONIBILITE"
                    );
                }
            }

            // 🆕 Notifier les admins de la connexion de ce stagiaire
            notificationService.creerNotificationPourAdmins(
                    "🎓 Appel stagiaire",
                    "Le stagiaire " + stagiaire.getPrenom() + " " + stagiaire.getNom()
                            + " (" + stagiaire.getEmail() + ") vient de se connecter.",
                    "DISPONIBILITE", "CONNEXION_STAGIAIRE",
                    "Utilisateur", stagiaire.getId(), "/utilisateurs"
            );

            System.out.println("✅ Notifs de connexion envoyées aux encadrants de "
                    + stagiaire.getEmail());
        } catch (Exception e) {
            System.err.println("⚠️ Erreur notif connexion stagiaire: " + e.getMessage());
        }
    }

    public ResponseEntity<?> register(RegisterRequest request) {
        if (utilisateurRepository.findByEmail(request.getEmail()).isPresent()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Cet email est déjà utilisé.");
            return ResponseEntity.badRequest().body(error);
        }

        if (request.getNumeroCin() != null &&
                !request.getNumeroCin().isBlank() &&
                utilisateurRepository.findByNumeroCin(request.getNumeroCin()).isPresent()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Ce numéro de CIN est déjà utilisé.");
            return ResponseEntity.badRequest().body(error);
        }

        Utilisateur utilisateur = new Utilisateur();
        utilisateur.setNom(request.getNom());
        utilisateur.setPrenom(request.getPrenom());
        utilisateur.setEmail(request.getEmail());

        if (request.getMotDePasse() != null && !request.getMotDePasse().isBlank()) {
            utilisateur.setMotDePasse(passwordEncoder.encode(request.getMotDePasse()));
        } else {
            utilisateur.setMotDePasse(passwordEncoder.encode("Attijari2025!"));
        }

        utilisateur.setRole(null);
        utilisateur.setNumeroCin(request.getNumeroCin());
        utilisateur.setAdresse(request.getAdresse());
        utilisateur.setVille(request.getVille());
        utilisateur.setPays(request.getPays() != null ? request.getPays() : "Tunisie");
        utilisateur.setTelephone(request.getTelephone());
        utilisateur.setActif(false);
        utilisateur.setDateCreation(LocalDateTime.now());

        utilisateur = utilisateurRepository.save(utilisateur);

        // ✅ CORRIGÉ : utilise `utilisateur` au lieu de `saved`
        notificationService.creerNotificationPourAdmins(
                "👤 Nouvelle inscription",
                utilisateur.getPrenom() + " " + utilisateur.getNom() + " vient de s'inscrire sur Talentis.",
                "INSCRIPTION", "INSCRIPTION",
                "Utilisateur", utilisateur.getId(), "/utilisateurs"
        );

        auditLogService.log(utilisateur, "INSCRIPTION", "Utilisateur", utilisateur.getId(), "127.0.0.1");

        try {
            emailService.sendEmail(
                    utilisateur.getEmail(),
                    "Inscription en attente de validation - Attijari Bank",
                    "Bonjour " + utilisateur.getPrenom() + ",\n\n" +
                            "Votre inscription a été enregistrée avec succès.\n\n" +
                            "Un administrateur doit attribuer un rôle à votre compte avant de pouvoir vous connecter.\n\n" +
                            "Vous recevrez un email de confirmation dès que votre compte sera activé.\n\n" +
                            "Cordialement,\n" +
                            "L'équipe Attijari Bank"
            );
        } catch (Exception e) {
            System.err.println("Erreur envoi email: " + e.getMessage());
        }

        utilisateur.setMotDePasse(null);
        return ResponseEntity.ok(utilisateur);
    }

    public ResponseEntity<?> forgotPassword(String email) {
        Optional<Utilisateur> optionalUser = utilisateurRepository.findByEmail(email);

        if (optionalUser.isEmpty()) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Si cet email existe, un lien de réinitialisation vous a été envoyé.");
            return ResponseEntity.ok(response);
        }

        Utilisateur utilisateur = optionalUser.get();
        String token = java.util.UUID.randomUUID().toString();
        utilisateur.setResetToken(token);
        utilisateur.setResetTokenExpiration(LocalDateTime.now().plusHours(24));
        utilisateurRepository.save(utilisateur);

        String resetLink = "http://localhost:4200/reset-password?token=" + token;

        emailService.sendEmail(
                utilisateur.getEmail(),
                "Réinitialisation de votre mot de passe - Talentis",
                "Bonjour " + utilisateur.getPrenom() + ",\n\n" +
                        "Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :\n\n" +
                        resetLink + "\n\n" +
                        "Ce lien expire dans 24h.\n\n" +
                        "Cordialement,\n" +
                        "L'équipe Talentis"
        );

        Map<String, String> response = new HashMap<>();
        response.put("message", "Un lien de réinitialisation a été envoyé à votre email.");
        return ResponseEntity.ok(response);
    }

    public ResponseEntity<?> resetPassword(String token, String nouveauMotDePasse) {
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lien de réinitialisation invalide."));
        }
        if (nouveauMotDePasse == null || nouveauMotDePasse.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le nouveau mot de passe est requis."));
        }

        Optional<Utilisateur> optionalUser = utilisateurRepository.findByResetToken(token);
        if (optionalUser.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lien de réinitialisation invalide ou déjà utilisé."));
        }

        Utilisateur utilisateur = optionalUser.get();
        if (utilisateur.getResetTokenExpiration() == null
                || utilisateur.getResetTokenExpiration().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ce lien de réinitialisation a expiré. Veuillez refaire une demande."));
        }

        utilisateur.setMotDePasse(passwordEncoder.encode(nouveauMotDePasse));
        utilisateur.setResetToken(null);
        utilisateur.setResetTokenExpiration(null);
        utilisateurRepository.save(utilisateur);

        auditLogService.log(utilisateur, "REINITIALISATION_MDP", "Utilisateur", utilisateur.getId(), "127.0.0.1");

        Map<String, String> response = new HashMap<>();
        response.put("message", "Mot de passe réinitialisé avec succès.");
        return ResponseEntity.ok(response);
    }
}