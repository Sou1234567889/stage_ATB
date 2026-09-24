package com.attijari.talentis.talentisbackend.controller;

import com.attijari.talentis.talentisbackend.dto.NouvelleCandidatureRequest;
import com.attijari.talentis.talentisbackend.entity.Notification;
import com.attijari.talentis.talentisbackend.service.EmailService;
import com.attijari.talentis.talentisbackend.service.NotificationService;
import com.attijari.talentis.talentisbackend.service.WhatsAppService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "http://localhost:4200")
public class NotificationController {

    private static final Logger logger = LoggerFactory.getLogger(NotificationController.class);

    private final NotificationService notificationService;
    private final EmailService emailService;
    private final WhatsAppService whatsAppService;

    public NotificationController(NotificationService notificationService,
                                  EmailService emailService,
                                  WhatsAppService whatsAppService) {
        this.notificationService = notificationService;
        this.emailService = emailService;
        this.whatsAppService = whatsAppService;
    }

    // =============================================
    // 🆕 TOUTES LES NOTIFICATIONS (pour admin)
    // =============================================

    /**
     * GET /api/notifications/all
     * Paramètre optionnel ?action=INSCRIPTION ou ?type=DISPONIBILITE
     * Si aucun paramètre → retourne toutes les notifications
     */
    @GetMapping("/all")
    public ResponseEntity<List<Map<String, Object>>> getAllNotifications(
            @RequestParam(value = "action", required = false) String action,
            @RequestParam(value = "type", required = false) String type) {
        try {
            logger.info("📥 Requête reçue pour les notifications admin (action={}, type={})", action, type);

            List<Notification> notifications;

            if (action != null && !action.isBlank()) {
                notifications = notificationService.getAllByAction(action);
            } else if (type != null && !type.isBlank()) {
                notifications = notificationService.getAllByType(type);
            } else {
                notifications = notificationService.getAllNotifications();
            }

            List<Map<String, Object>> result = notifications.stream()
                    .map(this::toDto)
                    .collect(Collectors.toList());

            logger.info("✅ {} notifications renvoyées", result.size());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("❌ Erreur récupération notifications: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(null);
        }
    }

    /**
     * GET /api/notifications/all/stats
     * Retourne les statistiques par catégorie pour le dashboard admin
     */
    @GetMapping("/all/stats")
    public ResponseEntity<Map<String, Long>> getStatsNotifications() {
        try {
            Map<String, Long> stats = notificationService.getStatsParCategorie();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            logger.error("❌ Erreur stats notifications: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(null);
        }
    }


    private Map<String, Object> toDto(Notification n) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", n.getId());
        dto.put("titre", n.getTitre());
        dto.put("message", n.getMessage());
        dto.put("type", n.getType());
        dto.put("action", n.getAction());
        dto.put("lu", n.isLu());
        dto.put("dateCreation", n.getDateCreation());
        dto.put("url", n.getUrl());
        dto.put("entiteConcernee", n.getEntiteConcernee());
        dto.put("entiteId", n.getEntiteId());

        if (n.getUtilisateur() != null) {
            Map<String, Object> u = new HashMap<>();
            u.put("id", n.getUtilisateur().getId());
            u.put("prenom", n.getUtilisateur().getPrenom());
            u.put("nom", n.getUtilisateur().getNom());
            u.put("email", n.getUtilisateur().getEmail());
            u.put("role", n.getUtilisateur().getRole());
            dto.put("utilisateur", u);
        }
        return dto;
    }

    // =============================================
    // NOTIFICATIONS UTILISATEUR
    // =============================================
    @GetMapping("/utilisateur/{utilisateurId}")
    public ResponseEntity<List<Notification>> getNotifications(@PathVariable Long utilisateurId) {
        return ResponseEntity.ok(notificationService.getNotificationsUtilisateur(utilisateurId));
    }

    @GetMapping("/utilisateur/{utilisateurId}/non-lues-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@PathVariable Long utilisateurId) {
        Map<String, Long> body = new HashMap<>();
        body.put("count", notificationService.compterNonLues(utilisateurId));
        return ResponseEntity.ok(body);
    }

    @PutMapping("/{id}/lu")
    public ResponseEntity<Void> marquerCommeLue(@PathVariable Long id) {
        notificationService.marquerCommeLue(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/utilisateur/{utilisateurId}/tout-lire")
    public ResponseEntity<Void> marquerToutesCommeLues(@PathVariable Long utilisateurId) {
        notificationService.marquerToutesCommeLues(utilisateurId);
        return ResponseEntity.ok().build();
    }

    // =============================================
    // CANDIDATURES
    // =============================================
    @PostMapping("/nouvelle-candidature")
    public ResponseEntity<?> notifierNouvelleCandidature(@RequestBody NouvelleCandidatureRequest request) {
        try {
            emailService.sendNouvelleCandidatureRH(request);
            return ResponseEntity.ok(Map.of("message", "Notifications envoyées aux RH", "email", "✅"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/candidature-acceptee/{candidatureId}")
    public ResponseEntity<?> notifierCandidatureAcceptee(@PathVariable Long candidatureId) {
        try {
            var candidature = notificationService.getCandidatureById(candidatureId);
            if (candidature == null) {
                return ResponseEntity.status(404).body(Map.of("error", "Candidature introuvable"));
            }
            var candidat = candidature.getCandidat();
            var offre = candidature.getOffre();

            emailService.sendCandidatureAcceptee(candidat.getEmail(), candidat.getPrenom(), offre.getTitre());
            whatsAppService.sendMessageCandidatureAcceptee(candidat.getTelephone(), candidat.getPrenom(), offre.getTitre());

            notificationService.creerNotification(
                    candidat,
                    "✅ Candidature acceptée",
                    "Félicitations ! Votre candidature pour \"" + offre.getTitre() + "\" est acceptée.",
                    "CANDIDATURE", "CANDIDATURE_ACCEPTEE",
                    "Candidature", candidature.getId(), "/candidatures"
            );
            notificationService.creerNotificationPourAdmins(
                    "✅ Candidature acceptée",
                    candidat.getPrenom() + " " + candidat.getNom() + " accepté pour " + offre.getTitre(),
                    "CANDIDATURE", "CANDIDATURE_ACCEPTEE",
                    "Candidature", candidature.getId(), "/candidatures"
            );

            return ResponseEntity.ok(Map.of("message", "Email + WhatsApp envoyés"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/candidature-refusee/{candidatureId}")
    public ResponseEntity<?> notifierCandidatureRefusee(@PathVariable Long candidatureId) {
        try {
            var candidature = notificationService.getCandidatureById(candidatureId);
            if (candidature == null) {
                return ResponseEntity.status(404).body(Map.of("error", "Candidature introuvable"));
            }
            var candidat = candidature.getCandidat();
            var offre = candidature.getOffre();

            emailService.sendCandidatureRefusee(candidat.getEmail(), candidat.getPrenom(), offre.getTitre());

            notificationService.creerNotification(
                    candidat,
                    "❌ Candidature refusée",
                    "Votre candidature pour \"" + offre.getTitre() + "\" n'a pas été retenue.",
                    "CANDIDATURE", "CANDIDATURE_REFUSEE",
                    "Candidature", candidature.getId(), "/candidatures"
            );
            notificationService.creerNotificationPourAdmins(
                    "❌ Candidature refusée",
                    candidat.getPrenom() + " " + candidat.getNom() + " refusé pour " + offre.getTitre(),
                    "CANDIDATURE", "CANDIDATURE_REFUSEE",
                    "Candidature", candidature.getId(), "/candidatures"
            );

            return ResponseEntity.ok(Map.of("message", "Email de refus envoyé"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // =============================================
    // WHATSAPP
    // =============================================
    @PostMapping("/whatsapp/utilisateur/{utilisateurId}")
    public ResponseEntity<?> envoyerWhatsAppUtilisateur(@PathVariable Long utilisateurId,
                                                        @RequestBody Map<String, String> body) {
        try {
            String message = body.get("message");
            if (message == null || message.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Message vide"));
            }
            var utilisateur = notificationService.getUtilisateurById(utilisateurId);
            if (utilisateur == null) {
                return ResponseEntity.status(404).body(Map.of("error", "Utilisateur introuvable"));
            }

            WhatsAppService.WhatsAppResult result =
                    whatsAppService.envoyerWhatsApp(utilisateur.getTelephone(), message);

            if (result.isSuccess()) {
                notificationService.creerNotificationPourAdmins(
                        "📱 WhatsApp envoyé",
                        "Message WhatsApp envoyé à " + utilisateur.getPrenom() + " " + utilisateur.getNom(),
                        "MESSAGE", "ENVOI_WHATSAPP",
                        "Utilisateur", utilisateur.getId(), "/utilisateurs"
                );
                return ResponseEntity.ok(Map.of("message", "WhatsApp envoyé"));
            } else {
                return ResponseEntity.status(500).body(Map.of("error", result.getMessage()));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}