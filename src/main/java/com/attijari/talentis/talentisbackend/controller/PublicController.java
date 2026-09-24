package com.attijari.talentis.talentisbackend.controller;

import com.attijari.talentis.talentisbackend.entity.*;
import com.attijari.talentis.talentisbackend.service.PublicService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/public")
@CrossOrigin(origins = "*")
public class PublicController {

    private final PublicService publicService;

    public PublicController(PublicService publicService) {
        this.publicService = publicService;
    }

    @GetMapping("/offres")
    public ResponseEntity<List<Offre>> getOffres(
            @RequestParam(required = false) String type) {
        TypeOffre typeOffre = null;
        if (type != null && !type.isBlank()) {
            try { typeOffre = TypeOffre.valueOf(type.toUpperCase()); }
            catch (IllegalArgumentException ignored) {}
        }
        return ResponseEntity.ok(publicService.getOffresOuvertes(typeOffre));
    }

    @GetMapping("/chiffres-cles")
    public ResponseEntity<List<ChiffreCle>> getChiffresCles() {
        return ResponseEntity.ok(publicService.getChiffresCles());
    }

    @GetMapping("/valeurs")
    public ResponseEntity<List<Valeur>> getValeurs() {
        return ResponseEntity.ok(publicService.getValeurs());
    }

    @GetMapping("/agences")
    public ResponseEntity<List<Agence>> getAgences() {
        return ResponseEntity.ok(publicService.getAgences());
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        List<Offre> offres = publicService.getOffresOuvertes(null);
        long nbStages = offres.stream()
                .filter(o -> o.getType() == TypeOffre.STAGE).count();
        long nbEmplois = offres.stream()
                .filter(o -> o.getType() == TypeOffre.EMPLOI).count();

        return ResponseEntity.ok(Map.of(
                "totalOffres", offres.size(),
                "nbStages", nbStages,
                "nbEmplois", nbEmplois,
                "nbAgences", publicService.getAgences().size()
        ));
    }
}