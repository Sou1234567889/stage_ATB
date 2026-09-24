package com.attijari.talentis.talentisbackend.service;

import com.attijari.talentis.talentisbackend.dto.LivrableRequest;
import com.attijari.talentis.talentisbackend.entity.Livrable;
import com.attijari.talentis.talentisbackend.entity.StatutLivrable;
import com.attijari.talentis.talentisbackend.repository.LivrableRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class LivrableService {

    private static final String UPLOAD_DIR = "uploads/livrables";

    private final LivrableRepository livrableRepository;
    private final NotificationService notificationService;

    public LivrableService(LivrableRepository livrableRepository,
                           NotificationService notificationService) {
        this.livrableRepository = livrableRepository;
        this.notificationService = notificationService;
    }

    // =============================================
    // SOUMISSION
    // =============================================
    @Transactional
    public ResponseEntity<?> soumettreLivrable(LivrableRequest request) {
        try {
            Livrable livrable = new Livrable();
            livrable.setTitre(request.getTitre());
            livrable.setDescription(request.getDescription());
            livrable.setFichierUrl(request.getLienFichier());
            livrable.setStatut(StatutLivrable.SOUMIS);
            livrable.setDateSoumission(LocalDateTime.now());

            if (request.getCandidatureId() != null) {
                // Chargez la candidature via un repository
                // livrable.setCandidature(candidatureRepository.findById(...).get());
            }

            Livrable saved = livrableRepository.save(livrable);

            // 🔔 Notifier l'encadrant
            if (saved.getCandidature() != null
                    && saved.getCandidature().getEncadrant() != null) {
                notificationService.creerNotification(
                        saved.getCandidature().getEncadrant().getId(),
                        "Nouveau livrable soumis",
                        "Un nouveau livrable « " + saved.getTitre() + " » a été soumis.",
                        "LIVRABLE"
                );
            }

            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    // =============================================
    // LECTURE
    // =============================================
    public List<Livrable> getLivrablesByCandidature(Long candidatureId) {
        return livrableRepository.findByCandidatureId(candidatureId);
    }

    public ResponseEntity<?> getLivrableById(Long id) {
        return livrableRepository.findById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(404)
                        .body(Map.of("message", "Livrable introuvable")));
    }

    // =============================================
    // RÉVISION (APPROUVER / A_MODIFIER)
    // =============================================
    @Transactional
    public ResponseEntity<?> reviserLivrable(Long id, String statut, String commentaire) {
        Optional<Livrable> opt = livrableRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "Livrable introuvable"));
        }

        StatutLivrable s;
        try {
            s = StatutLivrable.valueOf(statut);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Statut invalide : " + statut));
        }

        Livrable livrable = opt.get();
        livrable.setStatut(s);
        livrable.setCommentaireEncadrant(commentaire);
        livrable.setDateRevision(LocalDateTime.now());

        Livrable saved = livrableRepository.save(livrable);

        // 🔔 Notifier le stagiaire
        if (saved.getCandidature() != null
                && saved.getCandidature().getCandidat() != null) {
            String message = s == StatutLivrable.APPROUVE
                    ? "Votre livrable « " + saved.getTitre() + " » a été approuvé ✅"
                    : "Votre livrable « " + saved.getTitre() + " » doit être modifié ✏️";

            notificationService.creerNotification(
                    saved.getCandidature().getCandidat().getId(),
                    s == StatutLivrable.APPROUVE ? "Livrable approuvé" : "Modification demandée",
                    message,
                    "LIVRABLE"
            );
        }

        return ResponseEntity.ok(saved);
    }

    // =============================================
    // 🆕 UPLOAD FICHIER DE CORRECTION
    // =============================================
    @Transactional
    public ResponseEntity<?> uploaderCorrection(Long livrableId,
                                                MultipartFile fichier,
                                                String commentaire) {
        Optional<Livrable> opt = livrableRepository.findById(livrableId);
        if (opt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "Livrable introuvable"));
        }

        if (fichier == null || fichier.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Aucun fichier fourni"));
        }

        try {
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);

            String originalName = fichier.getOriginalFilename() != null
                    ? fichier.getOriginalFilename() : "correction.pdf";
            String extension = "";
            int dot = originalName.lastIndexOf('.');
            if (dot >= 0) extension = originalName.substring(dot);

            String nomFichier = "correction_" + livrableId + "_" + UUID.randomUUID() + extension;
            Path destination = uploadPath.resolve(nomFichier);
            Files.copy(fichier.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);

            Livrable livrable = opt.get();
            String url = "/uploads/livrables/" + nomFichier;

            livrable.setFichierCorrectionUrl(url);
            livrable.setDateCorrection(LocalDateTime.now());

            if (commentaire != null && !commentaire.isBlank()) {
                livrable.setCommentaireEncadrant(commentaire);
            }
            livrable.setDateRevision(LocalDateTime.now());

            if (livrable.getStatut() != StatutLivrable.APPROUVE) {
                livrable.setStatut(StatutLivrable.A_MODIFIER);
            }

            Livrable saved = livrableRepository.save(livrable);

            // 🔔 Notifier le stagiaire
            if (saved.getCandidature() != null
                    && saved.getCandidature().getCandidat() != null) {
                notificationService.creerNotification(
                        saved.getCandidature().getCandidat().getId(),
                        "Correction reçue",
                        "Votre encadrant a renvoyé une correction pour « " + saved.getTitre() + " ».",
                        "LIVRABLE"
                );
            }

            return ResponseEntity.ok(saved);

        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(
                    Map.of("message", "Erreur lors de l'enregistrement du fichier : " + e.getMessage()));
        }
    }
}