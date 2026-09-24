package com.attijari.talentis.talentisbackend.service;

import com.attijari.talentis.talentisbackend.dto.OffreRequest;
import com.attijari.talentis.talentisbackend.dto.SujetPfeDto;
import com.attijari.talentis.talentisbackend.entity.*;
import com.attijari.talentis.talentisbackend.repository.OffreRepository;
import com.attijari.talentis.talentisbackend.repository.UtilisateurRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class OffreService {
    private static final Logger logger = LoggerFactory.getLogger(OffreService.class);

    private final OffreRepository offreRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final AuditLogService auditLogService;

    public OffreService(OffreRepository offreRepository,
                        UtilisateurRepository utilisateurRepository,
                        AuditLogService auditLogService) {
        this.offreRepository = offreRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.auditLogService = auditLogService;
    }

    public ResponseEntity<?> getAllOffres(String statut) {
        List<Offre> offres;
        if (statut != null && !statut.isEmpty()) {
            try {
                StatutOffre statutOffre = StatutOffre.valueOf(statut);
                offres = offreRepository.findByStatut(statutOffre);
            } catch (IllegalArgumentException e) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Statut invalide.");
                return ResponseEntity.badRequest().body(error);
            }
        } else {
            offres = offreRepository.findAll();
        }
        return ResponseEntity.ok(offres);
    }

    public ResponseEntity<?> getOffreById(Long id) {
        Optional<Offre> optionalOffre = offreRepository.findById(id);
        if (optionalOffre.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Offre non trouvée.");
            return ResponseEntity.status(404).body(error);
        }
        return ResponseEntity.ok(optionalOffre.get());
    }

    @Transactional
    public ResponseEntity<?> createOffre(OffreRequest request, Long publieParId) {
        logger.info("📥 Création offre - type: {}", request.getType());

        Optional<Utilisateur> optionalUser = utilisateurRepository.findById(publieParId);
        if (optionalUser.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Utilisateur non trouvé.");
            return ResponseEntity.badRequest().body(error);
        }

        // 1️⃣ Créer l'offre SANS les sujets
        Offre offre = new Offre();
        offre.setTitre(request.getTitre());
        offre.setDescription(request.getDescription());
        offre.setProfilRecherche(request.getProfilRecherche());
        offre.setDepartement(request.getDepartement());
        offre.setLieu(request.getLieu());
        offre.setDureeEnMois(request.getDureeEnMois());
        offre.setDatePublication(LocalDate.now());
        offre.setPubliePar(optionalUser.get());

        if (request.getDateLimite() != null && !request.getDateLimite().isBlank()) {
            offre.setDateLimite(LocalDate.parse(request.getDateLimite(), DateTimeFormatter.ISO_LOCAL_DATE));
        }

        if (request.getStatut() != null) {
            try {
                offre.setStatut(StatutOffre.valueOf(request.getStatut()));
            } catch (IllegalArgumentException e) {
                offre.setStatut(StatutOffre.OUVERTE);
            }
        }

        if (request.getType() != null) {
            try {
                offre.setType(TypeOffre.valueOf(request.getType()));
            } catch (IllegalArgumentException e) {
                offre.setType(TypeOffre.STAGE);
            }
        }

        // 2️⃣ Champs PFE
        if (offre.getType() == TypeOffre.STAGE_PFE) {
            offre.setNiveauEtudeRequis(request.getNiveauEtudeRequis());
            offre.setSpecialiteRequise(request.getSpecialiteRequise());
            offre.setNombrePlacesTotal(request.getNombrePlacesTotal());
            offre.setPeriodeStage(request.getPeriodeStage());
            offre.setAvantages(request.getAvantages());
            offre.setPrerequis(request.getPrerequis());
        }

        // 3️⃣ SAUVEGARDER L'OFFRE D'ABORD (pour obtenir un ID)
        offre = offreRepository.save(offre);
        logger.info("✅ Offre sauvegardée: id={}", offre.getId());

        // 4️⃣ AJOUTER LES SUJETS APRÈS (l'offre a maintenant un ID)
        if (offre.getType() == TypeOffre.STAGE_PFE
                && request.getSujets() != null
                && !request.getSujets().isEmpty()) {

            logger.info("📚 Ajout de {} sujets", request.getSujets().size());

            for (SujetPfeDto s : request.getSujets()) {
                SujetPfe sujet = new SujetPfe();
                sujet.setTitre(s.getTitre());
                sujet.setDescription(s.getDescription());
                sujet.setTechnologies(s.getTechnologies());
                sujet.setCompetencesRequises(s.getCompetencesRequises());
                sujet.setNombrePlaces(s.getNombrePlaces());
                sujet.setObjectifs(s.getObjectifs());
                sujet.setLivrables(s.getLivrables());
                sujet.setOffre(offre);   // ⭐ LIAISON CRITIQUE

                offre.addSujet(sujet);
            }

            // 5️⃣ Sauvegarder l'offre AVEC ses sujets
            offre = offreRepository.save(offre);
            logger.info("✅ Offre + sujets sauvegardés: id={}, nb_sujets={}",
                    offre.getId(), offre.getSujets().size());
        }

        auditLogService.log(optionalUser.get(), "CREATION_OFFRE", "Offre", offre.getId(), "127.0.0.1");

        return ResponseEntity.ok(offre);
    }

    @Transactional
    public ResponseEntity<?> updateOffre(Long id, OffreRequest request) {
        Optional<Offre> optionalOffre = offreRepository.findById(id);
        if (optionalOffre.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Offre non trouvée.");
            return ResponseEntity.status(404).body(error);
        }

        Offre offre = optionalOffre.get();

        if (request.getTitre() != null) offre.setTitre(request.getTitre());
        if (request.getDescription() != null) offre.setDescription(request.getDescription());
        if (request.getProfilRecherche() != null) offre.setProfilRecherche(request.getProfilRecherche());
        if (request.getDepartement() != null) offre.setDepartement(request.getDepartement());
        if (request.getLieu() != null) offre.setLieu(request.getLieu());
        if (request.getDureeEnMois() != null) offre.setDureeEnMois(request.getDureeEnMois());

        if (request.getDateLimite() != null && !request.getDateLimite().isBlank()) {
            offre.setDateLimite(LocalDate.parse(request.getDateLimite(), DateTimeFormatter.ISO_LOCAL_DATE));
        }

        if (request.getStatut() != null) {
            try {
                offre.setStatut(StatutOffre.valueOf(request.getStatut()));
            } catch (IllegalArgumentException ignored) {}
        }

        if (request.getType() != null) {
            try {
                offre.setType(TypeOffre.valueOf(request.getType()));
            } catch (IllegalArgumentException ignored) {}
        }

        // ===== Champs PFE =====
        if (offre.getType() == TypeOffre.STAGE_PFE) {
            if (request.getNiveauEtudeRequis() != null) offre.setNiveauEtudeRequis(request.getNiveauEtudeRequis());
            if (request.getSpecialiteRequise() != null) offre.setSpecialiteRequise(request.getSpecialiteRequise());
            if (request.getNombrePlacesTotal() != null) offre.setNombrePlacesTotal(request.getNombrePlacesTotal());
            if (request.getPeriodeStage() != null) offre.setPeriodeStage(request.getPeriodeStage());
            if (request.getAvantages() != null) offre.setAvantages(request.getAvantages());
            if (request.getPrerequis() != null) offre.setPrerequis(request.getPrerequis());

            // Mise à jour des sujets (remplacement complet)
            if (request.getSujets() != null) {
                offre.clearSujets();
                for (SujetPfeDto s : request.getSujets()) {
                    SujetPfe sujet = new SujetPfe();
                    sujet.setTitre(s.getTitre());
                    sujet.setDescription(s.getDescription());
                    sujet.setTechnologies(s.getTechnologies());
                    sujet.setCompetencesRequises(s.getCompetencesRequises());
                    sujet.setNombrePlaces(s.getNombrePlaces());
                    sujet.setObjectifs(s.getObjectifs());
                    sujet.setLivrables(s.getLivrables());
                    offre.addSujet(sujet);
                }
            }
        }

        offre = offreRepository.save(offre);

        auditLogService.log(offre.getPubliePar(), "MODIFICATION_OFFRE", "Offre", offre.getId(), "127.0.0.1");

        return ResponseEntity.ok(offre);
    }

    public ResponseEntity<?> deleteOffre(Long id) {
        Optional<Offre> optionalOffre = offreRepository.findById(id);
        if (optionalOffre.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Offre non trouvée.");
            return ResponseEntity.status(404).body(error);
        }

        Offre offre = optionalOffre.get();
        offreRepository.deleteById(id);
        auditLogService.log(offre.getPubliePar(), "SUPPRESSION_OFFRE", "Offre", id, "127.0.0.1");

        Map<String, String> response = new HashMap<>();
        response.put("message", "Offre supprimée avec succès.");
        return ResponseEntity.ok(response);
    }

    public ResponseEntity<?> changerStatut(Long id, String statut) {
        Optional<Offre> optionalOffre = offreRepository.findById(id);
        if (optionalOffre.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Offre non trouvée.");
            return ResponseEntity.status(404).body(error);
        }

        try {
            Offre offre = optionalOffre.get();
            offre.setStatut(StatutOffre.valueOf(statut));
            offre = offreRepository.save(offre);

            auditLogService.log(offre.getPubliePar(), "CHANGEMENT_STATUT_OFFRE", "Offre", offre.getId(), "127.0.0.1");

            return ResponseEntity.ok(offre);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Statut invalide.");
            return ResponseEntity.badRequest().body(error);
        }
    }
}