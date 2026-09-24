package com.attijari.talentis.talentisbackend.controller;

import com.attijari.talentis.talentisbackend.service.DocumentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadDocument(
            @RequestParam Long utilisateurId,
            @RequestParam String type,
            @RequestParam(required = false) Long candidatureId,
            @RequestParam("file") MultipartFile file) {
        return documentService.uploadDocument(utilisateurId, type, candidatureId, file);
    }

    @GetMapping("/utilisateur/{utilisateurId}")
    public ResponseEntity<?> getDocumentsByUtilisateur(@PathVariable Long utilisateurId) {
        return documentService.getDocumentsByUtilisateur(utilisateurId);
    }

    @GetMapping("/candidature/{candidatureId}")
    public ResponseEntity<?> getDocumentsByCandidature(@PathVariable Long candidatureId) {
        return documentService.getDocumentsByCandidature(candidatureId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDocument(@PathVariable Long id) {
        return documentService.deleteDocument(id);
    }
}