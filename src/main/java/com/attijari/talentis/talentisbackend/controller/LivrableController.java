package com.attijari.talentis.talentisbackend.controller;

import com.attijari.talentis.talentisbackend.dto.LivrableRequest;
import com.attijari.talentis.talentisbackend.entity.Livrable;
import com.attijari.talentis.talentisbackend.service.LivrableService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/livrables")
public class LivrableController {

    private final LivrableService livrableService;

    public LivrableController(LivrableService livrableService) {
        this.livrableService = livrableService;
    }

    // =============================================
    // SOUMISSION PAR LE STAGIAIRE (JSON)
    // =============================================
    @PostMapping
    public ResponseEntity<?> soumettreLivrable(@RequestBody LivrableRequest request) {
        return livrableService.soumettreLivrable(request);
    }

    // =============================================
    // LISTE PAR CANDIDATURE
    // =============================================
    @GetMapping("/candidature/{candidatureId}")
    public ResponseEntity<List<Livrable>> getLivrablesByCandidature(@PathVariable Long candidatureId) {
        return ResponseEntity.ok(livrableService.getLivrablesByCandidature(candidatureId));
    }

    // =============================================
    // DÉTAIL D'UN LIVRABLE
    // =============================================
    @GetMapping("/{id}")
    public ResponseEntity<?> getLivrableById(@PathVariable Long id) {
        return livrableService.getLivrableById(id);
    }

    // =============================================
    // RÉVISION (ENCADRANT) : APPROUVER / A_MODIFIER
    // =============================================
    @PutMapping("/{id}/reviser")
    public ResponseEntity<?> reviserLivrable(
            @PathVariable Long id,
            @RequestParam String statut,
            @RequestParam(required = false) String commentaire) {
        return livrableService.reviserLivrable(id, statut, commentaire);
    }

    // =============================================
    // 🆕 UPLOAD D'UN FICHIER DE CORRECTION (ENCADRANT)
    // =============================================
    @PostMapping(value = "/{livrableId}/correction", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploaderCorrection(
            @PathVariable Long livrableId,
            @RequestParam("fichier") MultipartFile fichier,
            @RequestParam(value = "commentaire", required = false) String commentaire) {
        return livrableService.uploaderCorrection(livrableId, fichier, commentaire);
    }
}