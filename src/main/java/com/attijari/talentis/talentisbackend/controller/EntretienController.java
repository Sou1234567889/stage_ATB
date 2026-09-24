package com.attijari.talentis.talentisbackend.controller;

import com.attijari.talentis.talentisbackend.dto.EntretienRequest;
import com.attijari.talentis.talentisbackend.service.EntretienService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/entretiens")
public class EntretienController {

    private final EntretienService entretienService;

    public EntretienController(EntretienService entretienService) {
        this.entretienService = entretienService;
    }

    @PostMapping
    public ResponseEntity<?> planifierEntretien(@RequestBody EntretienRequest request) {
        return entretienService.planifierEntretien(request);
    }

    @GetMapping("/candidature/{candidatureId}")
    public ResponseEntity<?> getEntretienByCandidature(@PathVariable Long candidatureId) {
        return entretienService.getEntretienByCandidature(candidatureId);
    }

    @GetMapping("/encadrant/{encadrantId}")
    public ResponseEntity<?> getEntretiensByEncadrant(@PathVariable Long encadrantId) {
        return entretienService.getEntretiensByEncadrant(encadrantId);
    }

    @PutMapping("/{id}/realiser")
    public ResponseEntity<?> realiserEntretien(@PathVariable Long id, @RequestBody String compteRendu) {
        return entretienService.realiserEntretien(id, compteRendu);
    }

    @PutMapping("/{id}/annuler")
    public ResponseEntity<?> annulerEntretien(@PathVariable Long id) {
        return entretienService.annulerEntretien(id);
    }
}