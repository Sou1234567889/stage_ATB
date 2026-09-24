package com.attijari.talentis.talentisbackend.service;

import com.attijari.talentis.talentisbackend.dto.CandidatureRequest;
import com.attijari.talentis.talentisbackend.dto.DecisionRequest;
import com.attijari.talentis.talentisbackend.entity.*;
import com.attijari.talentis.talentisbackend.repository.CandidatureRepository;
import com.attijari.talentis.talentisbackend.repository.OffreRepository;
import com.attijari.talentis.talentisbackend.repository.PointageRepository;
import com.attijari.talentis.talentisbackend.repository.UtilisateurRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class CandidatureService {

    private static final Logger logger = LoggerFactory.getLogger(CandidatureService.class);

    // =============================================
    // DÉPENDANCES
    // =============================================
    private final CandidatureRepository candidatureRepository;
    private final OffreRepository offreRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final EmailService emailService;
    private final AuditLogService auditLogService;
    private final SmsService smsService;
    private final DocumentService documentService;
    private final NotificationService notificationService;
    private final WhatsAppService whatsAppService;
    private final PointageRepository pointageRepository;

    // =============================================
    // CONSTRUCTEUR
    // =============================================
    public CandidatureService(
            CandidatureRepository candidatureRepository,
            OffreRepository offreRepository,
            UtilisateurRepository utilisateurRepository,
            EmailService emailService,
            AuditLogService auditLogService,
            SmsService smsService,
            DocumentService documentService,
            NotificationService notificationService,
            WhatsAppService whatsAppService,
            PointageRepository pointageRepository) {
        this.candidatureRepository = candidatureRepository;
        this.offreRepository = offreRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.emailService = emailService;
        this.auditLogService = auditLogService;
        this.smsService = smsService;
        this.documentService = documentService;
        this.notificationService = notificationService;
        this.whatsAppService = whatsAppService;
        this.pointageRepository = pointageRepository;
    }

    // =============================================
    // POSTULER (JSON) — ✅ AVEC NOTIFICATIONS RH
    // =============================================
    public ResponseEntity<?> postuler(CandidatureRequest request, Long candidatId) {
        Optional<Utilisateur> optionalCandidat = utilisateurRepository.findById(candidatId);
        if (optionalCandidat.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Candidat non trouvé."));
        }

        Optional<Offre> optionalOffre = offreRepository.findById(request.getOffreId());
        if (optionalOffre.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Offre non trouvée."));
        }

        if (candidatureRepository.existsByCandidatIdAndOffreId(candidatId, request.getOffreId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vous avez déjà postulé à cette offre."));
        }

        Candidature candidature = new Candidature();
        candidature.setCandidat(optionalCandidat.get());
        candidature.setOffre(optionalOffre.get());
        candidature.setLettreMotivation(request.getLettreMotivation());
        candidature.setStatut(StatutCandidature.EN_ATTENTE);
        candidature.setDateDepot(LocalDateTime.now());

        candidature = candidatureRepository.save(candidature);

        Utilisateur candidat = optionalCandidat.get();
        Offre offre = optionalOffre.get();

        auditLogService.log(candidat, "POSTULATION", "Candidature", candidature.getId(), "127.0.0.1");

        emailService.sendEmail(
                candidat.getEmail(),
                "Confirmation de votre candidature - Talentis",
                "Bonjour " + candidat.getPrenom() + ",\n\n" +
                        "Votre candidature pour l'offre '" + offre.getTitre() + "' a été soumise avec succès.\n\n" +
                        "Nous vous informerons dès qu'une décision sera prise.\n\n" +
                        "Cordialement,\nL'équipe Talentis"
        );

        // ============================================
        // 🔔 NOTIFIER RH + RESPONSABLE_RH + SUPER_ADMIN
        // ============================================
        notifierEquipeCandidature(candidature, candidat, offre);

        return ResponseEntity.ok(candidature);
    }

    // =============================================
    // POSTULER AVEC FICHIERS (MULTIPART) — ✅ AVEC NOTIFICATIONS
    // =============================================
    public ResponseEntity<?> postulerAvecFichiers(
            Long offreId,
            String lettreMotivation,
            String telephone,
            String niveauEtude,
            String universite,
            MultipartFile cv,
            MultipartFile demandeStage,
            Long candidatId) {

        try {
            if (candidatId == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "candidatId obligatoire"));
            }

            Utilisateur candidat = utilisateurRepository.findById(candidatId)
                    .orElseThrow(() -> new RuntimeException("Candidat introuvable"));

            Offre offre = offreRepository.findById(offreId)
                    .orElseThrow(() -> new RuntimeException("Offre introuvable"));

            if (candidatureRepository.existsByCandidatIdAndOffreId(candidatId, offreId)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Vous avez déjà postulé à cette offre."));
            }

            // Règle "un seul stage actif"
            if (offre.getType() == TypeOffre.STAGE || offre.getType() == TypeOffre.STAGE_PFE) {
                List<Candidature> candidaturesCandidat = candidatureRepository.findByCandidat(candidat);
                Optional<Candidature> stageActif = candidaturesCandidat.stream()
                        .filter(c -> c.getOffre() != null &&
                                (c.getOffre().getType() == TypeOffre.STAGE
                                        || c.getOffre().getType() == TypeOffre.STAGE_PFE))
                        .filter(c -> c.getStatut() == StatutCandidature.ACCEPTE
                                || c.getStatut() == StatutCandidature.EN_COURS)
                        .findFirst();

                if (stageActif.isPresent()) {
                    String titreStageActif = stageActif.get().getOffre().getTitre();
                    return ResponseEntity.badRequest().body(Map.of(
                            "message", "Vous êtes actuellement affecté au stage « " + titreStageActif +
                                    " ». Vous ne pouvez pas postuler à un autre stage tant que celui-ci est actif."
                    ));
                }
            }

            Candidature candidature = new Candidature();
            candidature.setCandidat(candidat);
            candidature.setOffre(offre);
            candidature.setLettreMotivation(lettreMotivation);
            candidature.setStatut(StatutCandidature.EN_ATTENTE);
            candidature.setDateDepot(LocalDateTime.now());

            try { candidature.setTelephone(telephone); } catch (Exception ignored) {}
            try { candidature.setNiveauEtude(niveauEtude); } catch (Exception ignored) {}
            try { candidature.setUniversite(universite); } catch (Exception ignored) {}

            candidature = candidatureRepository.save(candidature);

            if (cv != null && !cv.isEmpty()) {
                documentService.uploadDocument(candidatId, "CV", candidature.getId(), cv);
            }
            if (demandeStage != null && !demandeStage.isEmpty()) {
                documentService.uploadDocument(candidatId, "DEMANDE_STAGE", candidature.getId(), demandeStage);
            }

            auditLogService.log(candidat, "POSTULATION", "Candidature", candidature.getId(), "127.0.0.1");

            emailService.sendEmail(
                    candidat.getEmail(),
                    "Confirmation de votre candidature - Talentis",
                    "Bonjour " + candidat.getPrenom() + ",\n\n" +
                            "Votre candidature pour l'offre '" + offre.getTitre() + "' a été soumise avec succès.\n\n" +
                            "Nous vous informerons dès qu'une décision sera prise.\n\n" +
                            "Cordialement,\nL'équipe Talentis"
            );

            // ============================================
            // 🔔 NOTIFIER RH + RESPONSABLE_RH + SUPER_ADMIN
            // ============================================
            notifierEquipeCandidature(candidature, candidat, offre);

            logger.info("✅ Candidature créée: {} pour {}", candidature.getId(), candidat.getEmail());

            return ResponseEntity.ok(candidature);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // =============================================
    // 🆕 MÉTHODE PRIVÉE : Notifier RH + Resp RH + Admin
    // =============================================
    private void notifierEquipeCandidature(Candidature candidature, Utilisateur candidat, Offre offre) {
        try {
            String nomCandidat = candidat.getPrenom() + " " + candidat.getNom();
            boolean estStage = offre.getType() == TypeOffre.STAGE
                    || offre.getType() == TypeOffre.STAGE_PFE;
            boolean estPfe = offre.getType() == TypeOffre.STAGE_PFE;

            String titreNotif;
            if (estPfe) {
                titreNotif = "🎓 Nouvelle candidature Stage PFE";
            } else if (estStage) {
                titreNotif = "🎓 Nouvelle candidature Stage";
            } else {
                titreNotif = "💼 Nouvelle candidature Emploi";
            }

            String messageNotif = nomCandidat + " a postulé pour : « " + offre.getTitre() + " »";

            // ✅ RH
            notificationService.creerNotificationPourRole(
                    Role.RH, titreNotif, messageNotif,
                    "CANDIDATURE", "CANDIDATURE_DEPOSEE",
                    "Candidature", candidature.getId(), "/dashboard/rh"
            );

            // ✅ RESPONSABLE_RH
            notificationService.creerNotificationPourRole(
                    Role.RESPONSABLE_RH, titreNotif, messageNotif,
                    "CANDIDATURE", "CANDIDATURE_DEPOSEE",
                    "Candidature", candidature.getId(), "/dashboard/responsable-rh"
            );

            // ✅ SUPER_ADMIN
            notificationService.creerNotificationPourAdmins(
                    titreNotif, messageNotif,
                    "CANDIDATURE", "CANDIDATURE_DEPOSEE",
                    "Candidature", candidature.getId(), "/dashboard/super-admin"
            );

            logger.info("🔔 Notifications candidature envoyées (RH + RespRH + Admin)");
        } catch (Exception e) {
            logger.warn("⚠️ Erreur notif candidature: {}", e.getMessage());
        }
    }

    // =============================================
    // LECTURE
    // =============================================
    public ResponseEntity<?> getAllCandidatures(String statut) {
        List<Candidature> candidatures;
        if (statut != null && !statut.isEmpty()) {
            try {
                StatutCandidature statutCandidature = StatutCandidature.valueOf(statut);
                candidatures = candidatureRepository.findByStatut(statutCandidature);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("message", "Statut invalide."));
            }
        } else {
            candidatures = candidatureRepository.findAll();
        }
        return ResponseEntity.ok(candidatures);
    }

    public ResponseEntity<?> getCandidaturesByCandidat(Long candidatId) {
        Optional<Utilisateur> optionalCandidat = utilisateurRepository.findById(candidatId);
        if (optionalCandidat.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Candidat non trouvé."));
        }
        return ResponseEntity.ok(candidatureRepository.findByCandidat(optionalCandidat.get()));
    }

    public ResponseEntity<?> getCandidaturesByEncadrant(Long encadrantId) {
        Optional<Utilisateur> optionalEncadrant = utilisateurRepository.findById(encadrantId);
        if (optionalEncadrant.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Encadrant non trouvé."));
        }
        return ResponseEntity.ok(candidatureRepository.findByEncadrant(optionalEncadrant.get()));
    }

    public ResponseEntity<?> getCandidaturesByOffre(Long offreId) {
        return ResponseEntity.ok(candidatureRepository.findByOffreId(offreId));
    }

    // =============================================
    // PRÉ-SÉLECTION & ASSIGNATION
    // =============================================
    public ResponseEntity<?> preSelectionner(Long id) {
        Optional<Candidature> optionalCandidature = candidatureRepository.findById(id);
        if (optionalCandidature.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "Candidature non trouvée."));
        }

        Candidature candidature = optionalCandidature.get();
        candidature.setStatut(StatutCandidature.EN_ANALYSE);
        candidature = candidatureRepository.save(candidature);

        auditLogService.log(candidature.getCandidat(), "PRE_SELECTION", "Candidature", candidature.getId(), "127.0.0.1");

        return ResponseEntity.ok(candidature);
    }

    public ResponseEntity<?> assignerEncadrant(Long id, Long encadrantId) {
        Optional<Candidature> optionalCandidature = candidatureRepository.findById(id);
        if (optionalCandidature.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "Candidature non trouvée."));
        }

        Optional<Utilisateur> optionalEncadrant = utilisateurRepository.findById(encadrantId);
        if (optionalEncadrant.isEmpty() || !optionalEncadrant.get().getRole().name().equals("ENCADRANT")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Encadrant non trouvé ou invalide."));
        }

        Candidature candidature = optionalCandidature.get();
        Utilisateur encadrant = optionalEncadrant.get();
        Utilisateur candidat = candidature.getCandidat();
        candidature.setEncadrant(encadrant);
        if (candidature.getStatut() == StatutCandidature.ACCEPTE) {
            candidature.setStatut(StatutCandidature.EN_COURS);
        }
        candidature = candidatureRepository.save(candidature);

        emailService.sendEmail(
                encadrant.getEmail(),
                "Nouveau stagiaire assigné - Talentis",
                "Bonjour " + encadrant.getPrenom() + ",\n\n" +
                        "Un nouveau stagiaire vous a été assigné.\n\n" +
                        "Candidat: " + candidat.getPrenom() + " " + candidat.getNom() + "\n" +
                        "Offre: " + candidature.getOffre().getTitre() + "\n\n" +
                        "Cordialement,\nL'équipe Talentis"
        );

        emailService.sendEmail(
                candidat.getEmail(),
                "Votre encadrant a été affecté - Talentis",
                "Bonjour " + candidat.getPrenom() + ",\n\n" +
                        "Votre encadrant a été affecté : " + encadrant.getPrenom() + " " + encadrant.getNom() + ".\n" +
                        "Vous pouvez maintenant consulter son profil et communiquer avec lui.\n\n" +
                        "Cordialement,\nL'équipe Talentis"
        );

        notificationService.creerNotification(
                candidat.getId(),
                "✅ Encadrant affecté",
                "Votre encadrant " + encadrant.getPrenom() + " " + encadrant.getNom()
                        + " a été affecté à votre stage « " + candidature.getOffre().getTitre() + " ».",
                "AFFECTATION"
        );

        notificationService.creerNotification(
                encadrant.getId(),
                "🎓 Nouveau stagiaire affecté",
                candidat.getPrenom() + " " + candidat.getNom()
                        + " vous a été affecté(e) pour « " + candidature.getOffre().getTitre() + " ».",
                "AFFECTATION"
        );

        if (candidat.getTelephone() != null && !candidat.getTelephone().isBlank()) {
            whatsAppService.envoyerMessage(candidat.getTelephone(),
                    "Bonjour " + candidat.getPrenom() + ", votre encadrant a été affecté : " +
                            encadrant.getPrenom() + " " + encadrant.getNom() + ". Connectez-vous pour le contacter. - Talentis");
        }
        if (encadrant.getTelephone() != null && !encadrant.getTelephone().isBlank()) {
            whatsAppService.envoyerMessage(encadrant.getTelephone(),
                    "Bonjour " + encadrant.getPrenom() + ", un nouveau stagiaire vous a été assigné : " +
                            candidat.getPrenom() + " " + candidat.getNom() + ". - Talentis");
        }

        auditLogService.log(encadrant, "AFFECTATION_ENCADRANT", "Candidature", candidature.getId(), "127.0.0.1");

        return ResponseEntity.ok(candidature);
    }

    // =============================================
    // DÉCISION (ACCEPTER / REFUSER)
    // =============================================
    public ResponseEntity<?> prendreDecision(Long id, DecisionRequest request) {
        Optional<Candidature> optionalCandidature = candidatureRepository.findById(id);
        if (optionalCandidature.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "Candidature non trouvée."));
        }

        Candidature candidature = optionalCandidature.get();
        Utilisateur candidat = candidature.getCandidat();
        Offre offre = candidature.getOffre();
        boolean estUneOffreDeStage = offre.getType() == TypeOffre.STAGE
                || offre.getType() == TypeOffre.STAGE_PFE;

        if ("ACCEPTE".equals(request.getDecision())) {
            candidature.setStatut(StatutCandidature.ACCEPTE);

            if (estUneOffreDeStage && candidat.getRole() != Role.STAGIAIRE) {
                candidat.setRole(Role.STAGIAIRE);
                candidat.setActif(true);
                utilisateurRepository.save(candidat);
                auditLogService.log(candidat, "PROMOTION_STAGIAIRE", "Utilisateur", candidat.getId(), "127.0.0.1");
            }

            // 📧 Email personnalisé
            emailService.sendCandidatureAcceptee(
                    candidat.getEmail(), candidat.getPrenom(), offre.getTitre());

            // 📱 WhatsApp personnalisé
            try {
                whatsAppService.sendMessageCandidatureAcceptee(
                        candidat.getTelephone(), candidat.getPrenom(), offre.getTitre());
            } catch (Exception e) {
                logger.warn("Échec WhatsApp acceptation: {}", e.getMessage());
            }

        } else if ("REFUSE".equals(request.getDecision())) {
            candidature.setStatut(StatutCandidature.REFUSE);

            // 📧 Email de refus
            emailService.sendCandidatureRefusee(
                    candidat.getEmail(), candidat.getPrenom(), offre.getTitre());

            // 📱 WhatsApp de refus
            try {
                String msgWa = "Bonjour " + candidat.getPrenom() + ",\n\n"
                        + "Nous vous remercions pour votre candidature au stage « "
                        + offre.getTitre() + " ».\n\n"
                        + "Après étude de votre dossier, nous ne pouvons pas y donner suite.\n\n"
                        + "Bonne chance dans vos recherches.\n- Attijari Talentis";
                whatsAppService.envoyerMessage(candidat.getTelephone(), msgWa);
            } catch (Exception e) {
                logger.warn("Échec WhatsApp refus: {}", e.getMessage());
            }

        } else {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Décision invalide. Utilisez 'ACCEPTE' ou 'REFUSE'."));
        }

        candidature.setCommentaireDecision(request.getCommentaire());
        candidature.setDateDecision(LocalDateTime.now());
        candidature = candidatureRepository.save(candidature);

        // 🔔 NOTIFICATION IN-APP pour le stagiaire (accepté/refusé)
        notificationService.notifierDecisionStagiaire(candidature, request.getDecision());

        auditLogService.log(candidat, "DECISION_CANDIDATURE", "Candidature", candidature.getId(), "127.0.0.1");

        return ResponseEntity.ok(candidature);
    }

    // =============================================
    // CHANGER STATUT
    // =============================================
    public ResponseEntity<?> changerStatut(Long id, String statut) {
        Optional<Candidature> optionalCandidature = candidatureRepository.findById(id);
        if (optionalCandidature.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "Candidature non trouvée."));
        }

        try {
            Candidature candidature = optionalCandidature.get();
            candidature.setStatut(StatutCandidature.valueOf(statut));
            candidature = candidatureRepository.save(candidature);
            return ResponseEntity.ok(candidature);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Statut invalide."));
        }
    }

    // =============================================
    // POINTAGE DES HEURES
    // =============================================
    @Transactional
    public Pointage pointerHeures(Long candidatureId, Integer heures, String commentaire, Long userId) {
        Candidature candidature = candidatureRepository.findById(candidatureId)
                .orElseThrow(() -> new RuntimeException("Candidature non trouvée"));

        Utilisateur utilisateur = utilisateurRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        int heuresDejaPointees = pointageRepository.sumHeuresByCandidatureId(candidatureId);
        int objectif = 140;

        if (heuresDejaPointees + heures > objectif) {
            throw new RuntimeException("Dépassement de l'objectif : " + (objectif - heuresDejaPointees) + "h restantes");
        }

        Pointage pointage = new Pointage();
        pointage.setCandidature(candidature);
        pointage.setHeures(heures);
        pointage.setCommentaire(commentaire);
        pointage.setDatePointage(LocalDateTime.now());
        pointage.setPointePar(utilisateur);

        return pointageRepository.save(pointage);
    }

    public Integer getHeuresTravaillees(Long candidatureId) {
        return pointageRepository.sumHeuresByCandidatureId(candidatureId);
    }

    public List<Pointage> getPointagesByCandidature(Long candidatureId) {
        return pointageRepository.findByCandidatureIdOrderByDatePointageDesc(candidatureId);
    }
}