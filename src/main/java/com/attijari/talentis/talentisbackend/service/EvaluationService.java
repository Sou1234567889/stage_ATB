package com.attijari.talentis.talentisbackend.service;

import com.attijari.talentis.talentisbackend.dto.EvaluationRequest;
import com.attijari.talentis.talentisbackend.entity.Candidature;
import com.attijari.talentis.talentisbackend.entity.Evaluation;
import com.attijari.talentis.talentisbackend.entity.Recommandation;
import com.attijari.talentis.talentisbackend.entity.StatutCandidature;
import com.attijari.talentis.talentisbackend.repository.CandidatureRepository;
import com.attijari.talentis.talentisbackend.repository.EvaluationRepository;
import com.attijari.talentis.talentisbackend.repository.UtilisateurRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class EvaluationService {

    private final EvaluationRepository evaluationRepository;
    private final CandidatureRepository candidatureRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final AuditLogService auditLogService;

    public EvaluationService(EvaluationRepository evaluationRepository,
                             CandidatureRepository candidatureRepository,
                             UtilisateurRepository utilisateurRepository,
                             AuditLogService auditLogService) {
        this.evaluationRepository = evaluationRepository;
        this.candidatureRepository = candidatureRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.auditLogService = auditLogService;
    }

    public ResponseEntity<?> evaluerCandidat(EvaluationRequest request) {
        Optional<Candidature> optionalCandidature = candidatureRepository.findById(request.getCandidatureId());
        if (optionalCandidature.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Candidature non trouvée.");
            return ResponseEntity.badRequest().body(error);
        }

        Candidature candidature = optionalCandidature.get();

        // Vérifier si une évaluation existe déjà
        if (evaluationRepository.existsByCandidatureId(request.getCandidatureId())) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Une évaluation existe déjà pour cette candidature.");
            return ResponseEntity.badRequest().body(error);
        }

        Evaluation evaluation = new Evaluation();
        evaluation.setCandidature(candidature);
        evaluation.setEncadrant(candidature.getEncadrant());
        evaluation.setNoteCompetencesTechniques(request.getNoteCompetencesTechniques());
        evaluation.setNoteSoftSkills(request.getNoteSoftSkills());
        evaluation.setNoteAutonomie(request.getNoteAutonomie());
        evaluation.setNoteIntegration(request.getNoteIntegration());
        evaluation.setAppreciationGenerale(request.getAppreciationGenerale());
        evaluation.setDateEvaluation(LocalDateTime.now());

        try {
            evaluation.setRecommandation(Recommandation.valueOf(request.getRecommandation()));
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Recommandation invalide.");
            return ResponseEntity.badRequest().body(error);
        }

        evaluation = evaluationRepository.save(evaluation);

        // Mettre à jour le statut de la candidature
        candidature.setStatut(StatutCandidature.EN_ANALYSE);
        candidatureRepository.save(candidature);

        // Audit log
        auditLogService.log(candidature.getCandidat(), "EVALUATION", "Evaluation", evaluation.getId(), "127.0.0.1");

        return ResponseEntity.ok(evaluation);
    }

    public ResponseEntity<?> getEvaluationByCandidature(Long candidatureId) {
        // ✅ CORRIGÉ : findByCandidatureId retourne un Evaluation, pas un Optional
        Evaluation evaluation = evaluationRepository.findByCandidatureId(candidatureId);

        if (evaluation == null) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Aucune évaluation pour cette candidature.");
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.ok(evaluation);
    }

    public ResponseEntity<?> getEvaluationsByEncadrant(Long encadrantId) {
        var optionalEncadrant = utilisateurRepository.findById(encadrantId);
        if (optionalEncadrant.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Encadrant non trouvé.");
            return ResponseEntity.badRequest().body(error);
        }
        List<Evaluation> evaluations = evaluationRepository.findByEncadrant(optionalEncadrant.get());
        return ResponseEntity.ok(evaluations);
    }
}