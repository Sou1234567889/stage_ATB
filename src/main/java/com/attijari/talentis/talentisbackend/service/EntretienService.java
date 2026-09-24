package com.attijari.talentis.talentisbackend.service;

import com.attijari.talentis.talentisbackend.dto.EntretienRequest;
import com.attijari.talentis.talentisbackend.entity.Candidature;
import com.attijari.talentis.talentisbackend.entity.Entretien;
import com.attijari.talentis.talentisbackend.entity.StatutCandidature;
import com.attijari.talentis.talentisbackend.entity.StatutEntretien;
import com.attijari.talentis.talentisbackend.entity.Utilisateur;
import com.attijari.talentis.talentisbackend.repository.CandidatureRepository;
import com.attijari.talentis.talentisbackend.repository.EntretienRepository;
import com.attijari.talentis.talentisbackend.repository.UtilisateurRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class EntretienService {

    private final EntretienRepository entretienRepository;
    private final CandidatureRepository candidatureRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final EmailService emailService;
    private final AuditLogService auditLogService;

    public EntretienService(EntretienRepository entretienRepository,
                            CandidatureRepository candidatureRepository,
                            UtilisateurRepository utilisateurRepository,
                            EmailService emailService,
                            AuditLogService auditLogService) {
        this.entretienRepository = entretienRepository;
        this.candidatureRepository = candidatureRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.emailService = emailService;
        this.auditLogService = auditLogService;
    }

    public ResponseEntity<?> planifierEntretien(EntretienRequest request) {
        Optional<Candidature> optionalCandidature = candidatureRepository.findById(request.getCandidatureId());
        if (optionalCandidature.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Candidature non trouvée.");
            return ResponseEntity.badRequest().body(error);
        }

        Candidature candidature = optionalCandidature.get();

        // Vérifier si un entretien existe déjà
        if (entretienRepository.existsByCandidatureId(request.getCandidatureId())) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Un entretien est déjà planifié pour cette candidature.");
            return ResponseEntity.badRequest().body(error);
        }

        Entretien entretien = new Entretien();
        entretien.setCandidature(candidature);
        entretien.setEncadrant(candidature.getEncadrant());
        entretien.setDateHeure(LocalDateTime.parse(request.getDateHeure(), DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        entretien.setLieuOuLien(request.getLieuOuLien());
        entretien.setStatut(StatutEntretien.PLANIFIE);

        entretien = entretienRepository.save(entretien);

        // Mettre à jour le statut de la candidature
        candidature.setStatut(StatutCandidature.ENTRETIEN_PLANIFIE);
        candidatureRepository.save(candidature);

        // Envoyer email au candidat
        emailService.sendEmail(
                candidature.getCandidat().getEmail(),
                "Entretien planifié - Talentis",
                "Bonjour " + candidature.getCandidat().getPrenom() + ",\n\nVotre entretien pour le stage '" + candidature.getOffre().getTitre() + "' a été planifié.\n\nDate: " + entretien.getDateHeure() + "\nLieu: " + entretien.getLieuOuLien() + "\n\nCordialement,\nL'équipe Talentis"
        );

        // Audit log
        auditLogService.log(candidature.getCandidat(), "PLANIFICATION_ENTRETIEN", "Entretien", entretien.getId(), "127.0.0.1");

        return ResponseEntity.ok(entretien);
    }

    public ResponseEntity<?> getEntretienByCandidature(Long candidatureId) {
        // ✅ CORRIGÉ : findByCandidatureId retourne une List
        List<Entretien> entretiens = entretienRepository.findByCandidatureId(candidatureId);

        if (entretiens.isEmpty()) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Aucun entretien planifié pour cette candidature.");
            return ResponseEntity.ok(response);
        }

        // Retourner le premier entretien trouvé
        return ResponseEntity.ok(entretiens.get(0));
    }

    public ResponseEntity<?> getEntretiensByEncadrant(Long encadrantId) {
        Optional<Utilisateur> optionalEncadrant = utilisateurRepository.findById(encadrantId);
        if (optionalEncadrant.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Encadrant non trouvé.");
            return ResponseEntity.badRequest().body(error);
        }
        List<Entretien> entretiens = entretienRepository.findByEncadrant(optionalEncadrant.get());
        return ResponseEntity.ok(entretiens);
    }

    public ResponseEntity<?> realiserEntretien(Long id, String compteRendu) {
        Optional<Entretien> optionalEntretien = entretienRepository.findById(id);
        if (optionalEntretien.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Entretien non trouvé.");
            return ResponseEntity.status(404).body(error);
        }

        Entretien entretien = optionalEntretien.get();
        entretien.setStatut(StatutEntretien.REALISE);
        entretien.setCompteRendu(compteRendu);
        entretien = entretienRepository.save(entretien);

        // Mettre à jour le statut de la candidature
        Candidature candidature = entretien.getCandidature();
        candidature.setStatut(StatutCandidature.ENTRETIEN_REALISE);
        candidatureRepository.save(candidature);

        // Audit log
        auditLogService.log(candidature.getCandidat(), "ENTRETIEN_REALISE", "Entretien", entretien.getId(), "127.0.0.1");

        return ResponseEntity.ok(entretien);
    }

    public ResponseEntity<?> annulerEntretien(Long id) {
        Optional<Entretien> optionalEntretien = entretienRepository.findById(id);
        if (optionalEntretien.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Entretien non trouvé.");
            return ResponseEntity.status(404).body(error);
        }

        Entretien entretien = optionalEntretien.get();
        entretien.setStatut(StatutEntretien.ANNULE);
        entretien = entretienRepository.save(entretien);

        // Envoyer email d'annulation
        emailService.sendEmail(
                entretien.getCandidature().getCandidat().getEmail(),
                "Annulation de l'entretien - Talentis",
                "Bonjour " + entretien.getCandidature().getCandidat().getPrenom() + ",\n\nVotre entretien prévu le " + entretien.getDateHeure() + " a été annulé.\n\nVeuillez patienter pour une nouvelle planification.\n\nCordialement,\nL'équipe Talentis"
        );

        return ResponseEntity.ok(entretien);
    }
}