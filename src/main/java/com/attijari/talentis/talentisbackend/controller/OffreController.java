package com.attijari.talentis.talentisbackend.controller;

import com.attijari.talentis.talentisbackend.dto.OffreRequest;
import com.attijari.talentis.talentisbackend.service.OffreService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/offres")
public class OffreController {

    private final OffreService offreService;

    public OffreController(OffreService offreService) {
        this.offreService = offreService;
    }

    @GetMapping
    public ResponseEntity<?> getAllOffres(@RequestParam(required = false) String statut) {
        return offreService.getAllOffres(statut);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOffreById(@PathVariable Long id) {
        return offreService.getOffreById(id);
    }

    @PostMapping
    public ResponseEntity<?> createOffre(@RequestBody OffreRequest request, @RequestParam Long publieParId) {
        return offreService.createOffre(request, publieParId);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateOffre(@PathVariable Long id, @RequestBody OffreRequest request) {
        return offreService.updateOffre(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteOffre(@PathVariable Long id) {
        return offreService.deleteOffre(id);
    }

    @PutMapping("/{id}/statut")
    public ResponseEntity<?> changerStatut(@PathVariable Long id, @RequestParam String statut) {
        return offreService.changerStatut(id, statut);
    }
}