package com.attijari.talentis.talentisbackend.service;

import com.attijari.talentis.talentisbackend.entity.*;
import com.attijari.talentis.talentisbackend.repository.CandidatureRepository;
import com.attijari.talentis.talentisbackend.repository.NotificationRepository;
import com.attijari.talentis.talentisbackend.repository.UtilisateurRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final CandidatureRepository candidatureRepository;

    public NotificationService(
            NotificationRepository notificationRepository,
            UtilisateurRepository utilisateurRepository,
            CandidatureRepository candidatureRepository) {
        this.notificationRepository = notificationRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.candidatureRepository = candidatureRepository;
    }

    // =============================================
    // LECTURE
    // =============================================
    @Transactional(readOnly = true)
    public List<Notification> getNotificationsUtilisateur(Long utilisateurId) {
        return notificationRepository.findByUtilisateurIdOrderByDateCreationDesc(utilisateurId);
    }

    @Transactional(readOnly = true)
    public long compterNonLues(Long utilisateurId) {
        return notificationRepository.countByUtilisateurIdAndLuFalse(utilisateurId);
    }

    @Transactional(readOnly = true)
    public List<Notification> getAllNotifications() {
        logger.info("📱 Récupération de TOUTES les notifications");
        return notificationRepository.findAllWithUtilisateurOrderByDateCreationDesc();
    }

    // =============================================
    // 🆕 FILTRAGE POUR L'ADMIN
    // =============================================

    /**
     * Récupère toutes les notifications filtrées par action (ex: INSCRIPTION, CONNEXION_ENCADRANT...)
     */
    @Transactional(readOnly = true)
    public List<Notification> getAllByAction(String action) {
        logger.info("🔍 Filtrage notifications par action: {}", action);
        return notificationRepository.findAllByActionOrderByDateCreationDesc(action);
    }

    /**
     * Récupère toutes les notifications filtrées par une liste d'actions
     */
    @Transactional(readOnly = true)
    public List<Notification> getAllByActions(List<String> actions) {
        logger.info("🔍 Filtrage notifications par actions: {}", actions);
        return notificationRepository.findAllByActionsOrderByDateCreationDesc(actions);
    }

    /**
     * Récupère toutes les notifications filtrées par type (ex: DISPONIBILITE, CANDIDATURE...)
     */
    @Transactional(readOnly = true)
    public List<Notification> getAllByType(String type) {
        logger.info("🔍 Filtrage notifications par type: {}", type);
        return notificationRepository.findAllByTypeOrderByDateCreationDesc(type);
    }

    /**
     * Retourne des statistiques par catégorie pour l'admin
     */
    @Transactional(readOnly = true)
    public Map<String, Long> getStatsParCategorie() {
        List<Notification> all = notificationRepository.findAllWithUtilisateurOrderByDateCreationDesc();
        Map<String, Long> stats = new java.util.LinkedHashMap<>();
        stats.put("total", (long) all.size());
        stats.put("nonLues", all.stream().filter(n -> !n.isLu()).count());
        stats.put("INSCRIPTION", all.stream().filter(n -> "INSCRIPTION".equals(n.getAction())).count());
        stats.put("CONNEXION_ENCADRANT", all.stream().filter(n -> "CONNEXION_ENCADRANT".equals(n.getAction())).count());
        stats.put("CONNEXION_STAGIAIRE", all.stream().filter(n -> "CONNEXION_STAGIAIRE".equals(n.getAction())).count());
        stats.put("CANDIDATURE", all.stream().filter(n ->
                n.getAction() != null && n.getAction().startsWith("CANDIDATURE")).count());
        stats.put("ENTRETIEN", all.stream().filter(n ->
                n.getAction() != null && n.getAction().startsWith("ENTRETIEN")).count());
        stats.put("DISPONIBILITE", all.stream().filter(n -> "DISPONIBILITE".equals(n.getType())).count());
        return stats;
    }

    // =============================================
    // ÉCRITURE
    // =============================================
    @Transactional
    public void marquerCommeLue(Long notificationId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification non trouvée: " + notificationId));
        n.setLu(true);
        notificationRepository.save(n);
    }

    @Transactional
    public void marquerToutesCommeLues(Long utilisateurId) {
        List<Notification> notifs = notificationRepository
                .findByUtilisateurIdAndLuFalseOrderByDateCreationDesc(utilisateurId);
        notifs.forEach(n -> n.setLu(true));
        notificationRepository.saveAll(notifs);
    }

    // =============================================
    // CRÉATION
    // =============================================
    @Transactional
    public void creerNotification(Long utilisateurId, String titre, String message, String type) {
        Utilisateur u = utilisateurRepository.findById(utilisateurId).orElse(null);
        if (u == null) {
            logger.warn("⚠️ Utilisateur introuvable: {}", utilisateurId);
            return;
        }
        Notification n = new Notification();
        n.setUtilisateur(u);
        n.setTitre(titre);
        n.setMessage(message);
        n.setType(type);
        n.setLu(false);
        n.setDateCreation(LocalDateTime.now());
        notificationRepository.save(n);
    }

    @Transactional
    public void creerNotification(Notification notification) {
        if (notification.getUtilisateur() != null && notification.getUtilisateur().getId() != null) {
            utilisateurRepository.findById(notification.getUtilisateur().getId())
                    .ifPresent(notification::setUtilisateur);
        }
        notification.setDateCreation(LocalDateTime.now());
        notification.setLu(false);
        notificationRepository.save(notification);
    }

    @Transactional
    public void creerNotification(Utilisateur utilisateur, String titre, String message,
                                  String type, String action, String entiteConcernee,
                                  Long entiteId, String url) {
        Notification n = new Notification();
        n.setUtilisateur(utilisateur);
        n.setTitre(titre);
        n.setMessage(message);
        n.setType(type);
        n.setAction(action);
        n.setEntiteConcernee(entiteConcernee);
        n.setEntiteId(entiteId);
        n.setUrl(url);
        n.setDateCreation(LocalDateTime.now());
        n.setLu(false);
        notificationRepository.save(n);
    }

    // =============================================
    // 🆕 NOTIFIER TOUS LES SUPER_ADMIN
    // =============================================
    @Transactional
    public void creerNotificationPourAdmins(String titre, String message,
                                            String type, String action,
                                            String entiteConcernee, Long entiteId,
                                            String url) {
        List<Utilisateur> admins = utilisateurRepository.findByRole(Role.SUPER_ADMIN);
        logger.info("🔔 Envoi notification à {} admin(s)", admins.size());

        for (Utilisateur admin : admins) {
            try {
                creerNotification(admin, titre, message, type, action,
                        entiteConcernee, entiteId, url);
            } catch (Exception e) {
                logger.warn("⚠️ Échec notif admin {} : {}", admin.getId(), e.getMessage());
            }
        }
    }

    // =============================================
    // 🆕 NOTIFIER UN RÔLE SPÉCIFIQUE
    // =============================================
    @Transactional
    public void creerNotificationPourRole(Role role, String titre, String message,
                                          String type, String action,
                                          String entiteConcernee, Long entiteId,
                                          String url) {
        List<Utilisateur> users = utilisateurRepository.findByRole(role);
        for (Utilisateur u : users) {
            creerNotification(u, titre, message, type, action,
                    entiteConcernee, entiteId, url);
        }
    }

    // =============================================
    // HELPERS
    // =============================================
    public Candidature getCandidatureById(Long id) {
        return candidatureRepository.findById(id).orElse(null);
    }

    public Utilisateur getUtilisateurById(Long id) {
        return utilisateurRepository.findById(id).orElse(null);
    }
    // =============================================
// 🆕 NOTIFIER LE STAGIAIRE (ACCEPTÉ / REFUSÉ)
// =============================================
    @Transactional
    public void notifierDecisionStagiaire(Candidature candidature, String decision) {
        Utilisateur candidat = candidature.getCandidat();
        Offre offre = candidature.getOffre();
        if (candidat == null || offre == null) return;

        String titre;
        String message;
        String action;

        if ("ACCEPTE".equals(decision)) {
            titre = "🎉 Candidature acceptée";
            message = "Félicitations ! Votre candidature pour « " + offre.getTitre()
                    + " » a été acceptée.";
            action = "CANDIDATURE_ACCEPTEE";
        } else {
            titre = "❌ Candidature refusée";
            message = "Votre candidature pour « " + offre.getTitre()
                    + " » n'a pas été retenue.";
            action = "CANDIDATURE_REFUSEE";
        }

        // 1. Notification in-app pour le stagiaire
        creerNotification(
                candidat,
                titre,
                message,
                "CANDIDATURE",
                action,
                "Candidature",
                candidature.getId(),
                "/dashboard/stagiere"
        );

        logger.info("🔔 Notification {} envoyée au stagiaire {}", action, candidat.getId());
    }
}