package com.attijari.talentis.talentisbackend.controller;

import com.attijari.talentis.talentisbackend.dto.CandidatureRequest;
import com.attijari.talentis.talentisbackend.dto.DecisionRequest;
import com.attijari.talentis.talentisbackend.entity.Pointage;
import com.attijari.talentis.talentisbackend.service.BookPfeService;
import com.attijari.talentis.talentisbackend.service.CandidatureService;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/candidatures")
public class CandidatureController {

    private final CandidatureService candidatureService;
    private final BookPfeService bookPfeService;

    public CandidatureController(CandidatureService candidatureService,
                                 BookPfeService bookPfeService) {
        this.candidatureService = candidatureService;
        this.bookPfeService = bookPfeService;
    }

    // =============================================
    // POSTULER (MULTIPART)
    // =============================================
    @PostMapping(value = "/postuler", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> postuler(
            @RequestParam("offreId") Long offreId,
            @RequestParam("lettreMotivation") String lettreMotivation,
            @RequestParam("telephone") String telephone,
            @RequestParam("niveauEtude") String niveauEtude,
            @RequestParam("universite") String universite,
            @RequestParam("cv") MultipartFile cv,
            @RequestParam("demandeStage") MultipartFile demandeStage,
            @RequestParam(value = "candidatId", required = false) Long candidatId
    ) {
        return candidatureService.postulerAvecFichiers(
                offreId, lettreMotivation, telephone, niveauEtude, universite,
                cv, demandeStage, candidatId
        );
    }

    // =============================================
    // 🆕 BOOK PFE — Téléchargement PDF
    // =============================================
    @GetMapping("/book-pfe")
    public ResponseEntity<byte[]> telechargerBookPfe() {
        byte[] pdf = bookPfeService.genererBookPfe();
        return ResponseEntity.ok()
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", "attachment; filename=\"book-pfe.pdf\"")
                .body(pdf);
    }

    // =============================================
    // POINTAGE
    // =============================================
    @PostMapping("/{candidatureId}/pointer")
    public ResponseEntity<?> pointerHeures(
            @PathVariable Long candidatureId,
            @RequestBody Map<String, Object> request) {
        try {
            Integer heures = (Integer) request.getOrDefault("heures", 8);
            String commentaire = (String) request.getOrDefault("commentaire", "");
            Long userId = ((Number) request.get("userId")).longValue();

            Pointage pointage = candidatureService.pointerHeures(candidatureId, heures, commentaire, userId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("pointage", pointage);
            response.put("totalHeures", candidatureService.getHeuresTravaillees(candidatureId));

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/{candidatureId}/heures")
    public ResponseEntity<?> getHeuresTravaillees(@PathVariable Long candidatureId) {
        Map<String, Object> response = new HashMap<>();
        response.put("totalHeures", candidatureService.getHeuresTravaillees(candidatureId));
        response.put("objectif", 140);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{candidatureId}/pointages")
    public ResponseEntity<List<Pointage>> getPointages(@PathVariable Long candidatureId) {
        return ResponseEntity.ok(candidatureService.getPointagesByCandidature(candidatureId));
    }

    // =============================================
    // LECTURE
    // =============================================
    @GetMapping
    public ResponseEntity<?> getAllCandidatures(@RequestParam(required = false) String statut) {
        return candidatureService.getAllCandidatures(statut);
    }

    @GetMapping("/candidat/{candidatId}")
    public ResponseEntity<?> getCandidaturesByCandidat(@PathVariable Long candidatId) {
        return candidatureService.getCandidaturesByCandidat(candidatId);
    }

    @GetMapping("/encadrant/{encadrantId}")
    public ResponseEntity<?> getCandidaturesByEncadrant(@PathVariable Long encadrantId) {
        return candidatureService.getCandidaturesByEncadrant(encadrantId);
    }

    @GetMapping("/offre/{offreId}")
    public ResponseEntity<?> getCandidaturesByOffre(@PathVariable Long offreId) {
        return candidatureService.getCandidaturesByOffre(offreId);
    }

    // =============================================
    // WORKFLOW
    // =============================================
    @PutMapping("/{id}/preselectionner")
    public ResponseEntity<?> preSelectionner(@PathVariable Long id) {
        return candidatureService.preSelectionner(id);
    }

    @PutMapping("/{id}/assigner-encadrant")
    public ResponseEntity<?> assignerEncadrant(@PathVariable Long id, @RequestParam Long encadrantId) {
        return candidatureService.assignerEncadrant(id, encadrantId);
    }

    @PutMapping("/{id}/decision")
    public ResponseEntity<?> prendreDecision(@PathVariable Long id, @RequestBody DecisionRequest request) {
        return candidatureService.prendreDecision(id, request);
    }

    @PutMapping("/{id}/statut")
    public ResponseEntity<?> changerStatut(@PathVariable Long id, @RequestParam String statut) {
        return candidatureService.changerStatut(id, statut);
    }
}