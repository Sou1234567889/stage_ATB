package com.attijari.talentis.talentisbackend.controller;

import com.attijari.talentis.talentisbackend.dto.EvaluationRequest;
import com.attijari.talentis.talentisbackend.service.EvaluationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/evaluations")
public class EvaluationController {

    private final EvaluationService evaluationService;

    public EvaluationController(EvaluationService evaluationService) {
        this.evaluationService = evaluationService;
    }

    @PostMapping
    public ResponseEntity<?> evaluerCandidat(@RequestBody EvaluationRequest request) {
        return evaluationService.evaluerCandidat(request);
    }

    @GetMapping("/candidature/{candidatureId}")
    public ResponseEntity<?> getEvaluationByCandidature(@PathVariable Long candidatureId) {
        return evaluationService.getEvaluationByCandidature(candidatureId);
    }

    @GetMapping("/encadrant/{encadrantId}")
    public ResponseEntity<?> getEvaluationsByEncadrant(@PathVariable Long encadrantId) {
        return evaluationService.getEvaluationsByEncadrant(encadrantId);
    }
}