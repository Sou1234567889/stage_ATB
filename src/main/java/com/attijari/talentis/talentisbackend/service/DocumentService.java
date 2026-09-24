package com.attijari.talentis.talentisbackend.service;

import com.attijari.talentis.talentisbackend.entity.Candidature;
import com.attijari.talentis.talentisbackend.entity.Document;
import com.attijari.talentis.talentisbackend.entity.TypeDocument;
import com.attijari.talentis.talentisbackend.entity.Utilisateur;
import com.attijari.talentis.talentisbackend.repository.CandidatureRepository;
import com.attijari.talentis.talentisbackend.repository.DocumentRepository;
import com.attijari.talentis.talentisbackend.repository.UtilisateurRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final CandidatureRepository candidatureRepository;
    private final AuditLogService auditLogService;

    private final String UPLOAD_DIR = "uploads/";

    public DocumentService(DocumentRepository documentRepository,
                           UtilisateurRepository utilisateurRepository,
                           CandidatureRepository candidatureRepository,
                           AuditLogService auditLogService) {
        this.documentRepository = documentRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.candidatureRepository = candidatureRepository;
        this.auditLogService = auditLogService;
    }

    public ResponseEntity<?> uploadDocument(Long utilisateurId, String type, Long candidatureId, MultipartFile file) {
        Optional<Utilisateur> optionalUtilisateur = utilisateurRepository.findById(utilisateurId);
        if (optionalUtilisateur.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Utilisateur non trouvé.");
            return ResponseEntity.badRequest().body(error);
        }

        try {
            // Créer le dossier si inexistant
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Générer un nom de fichier unique
            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Path filePath = uploadPath.resolve(fileName);

            // Sauvegarder le fichier
            Files.copy(file.getInputStream(), filePath);

            // Enregistrer dans la base de données
            Document document = new Document();
            document.setUtilisateur(optionalUtilisateur.get());
            document.setNomFichier(fileName);
            document.setUrl("/uploads/" + fileName);
            document.setDateDepot(LocalDateTime.now());

            // ✅ CORRECTIF : candidatureId était reçu mais jamais utilisé —
            // les documents n'étaient donc jamais rattachés à une candidature.
            if (candidatureId != null) {
                Optional<Candidature> optionalCandidature = candidatureRepository.findById(candidatureId);
                optionalCandidature.ifPresent(document::setCandidature);
            }

            try {
                document.setType(TypeDocument.valueOf(type));
            } catch (IllegalArgumentException e) {
                document.setType(TypeDocument.AUTRE);
            }

            document = documentRepository.save(document);

            // Audit log
            auditLogService.log(optionalUtilisateur.get(), "UPLOAD_DOCUMENT", "Document", document.getId(), "127.0.0.1");

            return ResponseEntity.ok(document);

        } catch (IOException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Erreur lors de l'upload du fichier: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    public ResponseEntity<?> getDocumentsByUtilisateur(Long utilisateurId) {
        Optional<Utilisateur> optionalUtilisateur = utilisateurRepository.findById(utilisateurId);
        if (optionalUtilisateur.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Utilisateur non trouvé.");
            return ResponseEntity.badRequest().body(error);
        }

        List<Document> documents = documentRepository.findByUtilisateur(optionalUtilisateur.get());
        return ResponseEntity.ok(documents);
    }

    public ResponseEntity<?> getDocumentsByCandidature(Long candidatureId) {
        List<Document> documents = documentRepository.findByCandidatureId(candidatureId);
        return ResponseEntity.ok(documents);
    }

    public ResponseEntity<?> deleteDocument(Long id) {
        Optional<Document> optionalDocument = documentRepository.findById(id);
        if (optionalDocument.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Document non trouvé.");
            return ResponseEntity.status(404).body(error);
        }

        Document document = optionalDocument.get();

        // Supprimer le fichier physique
        try {
            Path filePath = Paths.get(UPLOAD_DIR + document.getNomFichier());
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            // Ignorer
        }

        documentRepository.deleteById(id);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Document supprimé avec succès.");
        return ResponseEntity.ok(response);
    }
}