package com.attijari.talentis.talentisbackend.controller;

import com.attijari.talentis.talentisbackend.service.BookPfeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/offres")
@CrossOrigin(origins = "*")
public class BookPfeController {

    private static final Logger logger = LoggerFactory.getLogger(BookPfeController.class);
    private final BookPfeService bookPfeService;

    public BookPfeController(BookPfeService bookPfeService) {
        this.bookPfeService = bookPfeService;
    }

    // ✅ Book PFE par offre
    @GetMapping("/{offreId}/book-pfe")
    public ResponseEntity<byte[]> telechargerBookPfeParOffre(@PathVariable Long offreId) {
        logger.info("📥 Requête Book PFE pour l'offre {}", offreId);
        try {
            byte[] pdf = bookPfeService.genererBookPfeParOffre(offreId);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "book-pfe-offre-" + offreId + ".pdf");
            return ResponseEntity.ok().headers(headers).body(pdf);
        } catch (Exception e) {
            logger.error("❌ Erreur Book PFE offre {}: {}", offreId, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ✅ NEW : Book PFE par année
    @GetMapping("/book-pfe/annee/{annee}")
    public ResponseEntity<byte[]> telechargerBookPfeParAnnee(@PathVariable int annee) {
        logger.info("📥 Requête Book PFE pour l'année {}", annee);
        try {
            byte[] pdf = bookPfeService.genererBookPfeParAnnee(annee);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "book-pfe-" + annee + "-" + (annee + 1) + ".pdf");
            return ResponseEntity.ok().headers(headers).body(pdf);
        } catch (Exception e) {
            logger.error("❌ Erreur Book PFE année {}: {}", annee, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ✅ NEW : Liste des années disponibles
    @GetMapping("/book-pfe/annees")
    public ResponseEntity<java.util.List<Integer>> getAnneesDisponibles() {
        try {
            java.util.List<Integer> annees = bookPfeService.getAnneesDisponibles();
            return ResponseEntity.ok(annees);
        } catch (Exception e) {
            logger.error("❌ Erreur récupération années: {}", e.getMessage(), e);
            return ResponseEntity.ok(java.util.List.of());
        }
    }
}