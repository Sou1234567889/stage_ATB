package com.attijari.talentis.talentisbackend.controller;

import com.attijari.talentis.talentisbackend.dto.LoginRequest;
import com.attijari.talentis.talentisbackend.dto.OffreRequest;
import com.attijari.talentis.talentisbackend.dto.RegisterRequest;
import com.attijari.talentis.talentisbackend.entity.*;
import com.attijari.talentis.talentisbackend.repository.*;
import com.attijari.talentis.talentisbackend.service.EmailService;
import com.attijari.talentis.talentisbackend.service.AuditLogService;
import com.attijari.talentis.talentisbackend.service.UtilisateurService;
import com.attijari.talentis.talentisbackend.service.WhatsAppService;
import org.jetbrains.annotations.NotNull;
// Ajouter l'import
import com.attijari.talentis.talentisbackend.service.OffreService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/utilisateurs")
public class UtilisateurController {
    // ✅ AJOUTER
    private final OffreService offreService;

    @Autowired
    private UtilisateurRepository utilisateurRepository;
    @Autowired private CandidatureRepository candidatureRepository;
    @Autowired private OffreRepository offreRepository;
    @Autowired private LivrableRepository livrableRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private EmailService emailService;
    @Autowired private AuditLogService auditLogService;
    @Autowired private UtilisateurService utilisateurService;
    @Autowired private WhatsAppService whatsAppService;
    @Autowired private com.attijari.talentis.talentisbackend.service.NotificationService notificationService;
    @Autowired private com.attijari.talentis.talentisbackend.service.AuthService authService;
    @Autowired private com.attijari.talentis.talentisbackend.service.CandidatureService candidatureService;

    public UtilisateurController(UtilisateurRepository utilisateurRepository,
                                 CandidatureRepository candidatureRepository,
                                 OffreRepository offreRepository,
                                 LivrableRepository livrableRepository,
                                 AuditLogRepository auditLogRepository,
                                 PasswordEncoder passwordEncoder,
                                 EmailService emailService,
                                 AuditLogService auditLogService,
                                 WhatsAppService whatsAppService,
                                 OffreService offreService,
                                 com.attijari.talentis.talentisbackend.service.NotificationService notificationService,
                                 com.attijari.talentis.talentisbackend.service.AuthService authService,
                                 com.attijari.talentis.talentisbackend.service.CandidatureService candidatureService) {
        this.utilisateurRepository = utilisateurRepository;
        this.candidatureRepository = candidatureRepository;
        this.offreRepository = offreRepository;
        this.livrableRepository = livrableRepository;
        this.auditLogRepository = auditLogRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.auditLogService = auditLogService;
        this.whatsAppService = whatsAppService;
        this.notificationService = notificationService;
        this.authService = authService;
        this.candidatureService = candidatureService;
        this.offreService = offreService;
    }

    // =============================================
    // 🔐 AUTHENTIFICATION
    // =============================================

    @PostMapping("/auth/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        String email = request.getEmail();
        String motDePasse = request.getMotDePasse();

        Optional<Utilisateur> optionalUser = utilisateurRepository.findByEmail(email);

        if (optionalUser.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Email ou mot de passe incorrect.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }

        Utilisateur utilisateur = optionalUser.get();

        boolean matches = passwordEncoder.matches(motDePasse, utilisateur.getMotDePasse());

        if (!matches) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Email ou mot de passe incorrect.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }

        if (!utilisateur.isActif()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Votre compte est désactivé. Contactez l'administrateur.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
        }

        utilisateur.setMotDePasse(null);
        return ResponseEntity.ok(utilisateur);
    }

    @PostMapping("/auth/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            if (request.getEmail() == null || request.getEmail().isBlank()
                    || request.getMotDePasse() == null || request.getMotDePasse().isBlank()) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Email et mot de passe sont obligatoires.");
                return ResponseEntity.badRequest().body(error);
            }

            if (utilisateurRepository.findByEmail(request.getEmail()).isPresent()) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Cet email est déjà utilisé.");
                return ResponseEntity.badRequest().body(error);
            }

            if (request.getNumeroCin() != null && !request.getNumeroCin().isBlank()
                    && utilisateurRepository.findByNumeroCin(request.getNumeroCin()).isPresent()) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Ce numéro de CIN est déjà utilisé par un autre compte.");
                return ResponseEntity.badRequest().body(error);
            }

            Utilisateur utilisateur = new Utilisateur();
            utilisateur.setNom(request.getNom());
            utilisateur.setPrenom(request.getPrenom());
            utilisateur.setEmail(request.getEmail());
            utilisateur.setMotDePasse(passwordEncoder.encode(request.getMotDePasse()));
            utilisateur.setRole(null);
            utilisateur.setNumeroCin(request.getNumeroCin());
            utilisateur.setAdresse(request.getAdresse());
            utilisateur.setVille(request.getVille());
            utilisateur.setPays(request.getPays() != null ? request.getPays() : "Tunisie");
            utilisateur.setTelephone(request.getTelephone());
            utilisateur.setActif(false);
            utilisateur.setDateCreation(LocalDateTime.now());

            utilisateur = utilisateurRepository.save(utilisateur);

            auditLogService.log(utilisateur, "INSCRIPTION", "Utilisateur", utilisateur.getId(), "127.0.0.1");

            utilisateur.setMotDePasse(null);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Inscription réussie ! Votre compte sera activé dès qu'un rôle vous sera attribué par l'administrateur.");
            response.put("id", utilisateur.getId());
            response.put("email", utilisateur.getEmail());
            response.put("nom", utilisateur.getNom());
            response.put("prenom", utilisateur.getPrenom());
            response.put("role", utilisateur.getRole());
            response.put("actif", utilisateur.isActif());

            return ResponseEntity.ok(response);

        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            System.err.println("❌ Contrainte violée à l'inscription: " + e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("message", "Cet email, ce CIN ou ce numéro de téléphone est déjà utilisé.");
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            System.err.println("❌ Erreur inscription: " + e.getMessage());
            e.printStackTrace();
            Map<String, String> error = new HashMap<>();
            error.put("message", "Erreur serveur lors de l'inscription. Réessayez plus tard.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    // =============================================
    // 🏷️ ATTRIBUTION DU RÔLE
    // =============================================

    @PutMapping("/{id}/role")
    public ResponseEntity<?> attribuerRole(@PathVariable Long id, @RequestParam String role) {
        return utilisateurService.getResponseEntity(id, role);
    }

 
    // =============================================
    // 📧 ENVOI D'EMAIL
    // =============================================

    // =============================================
    // 📱 ENVOI WHATSAPP
    // =============================================


    // =============================================
    // 📝 TRADUCTION RÔLE
    // =============================================

    private String traduireRole(String role) {
        if (role == null) return "Aucun rôle défini";

        switch (role) {
            case "SUPER_ADMIN":
                return "Super Administrateur";
            case "RESPONSABLE_RH":
                return "Responsable des Ressources Humaines";
            case "RH":
                return "Ressources Humaines";
            case "ENCADRANT":
                return "Encadrant";
            case "STAGIAIRE":
                return "Stagiaire";
            case "EMPLOYE":
                return "Employé";
            default:
                return role;
        }
    }

    @PostMapping("/auth/mot-de-passe-oublie")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        // ⚠️ CORRECTION : la méthode attendait un @RequestParam alors que le
        // frontend envoie un body JSON ({ email }) — Spring ne peut pas lier
        // un @RequestParam depuis du JSON, l'appel échouait donc en 400.
        // Elle délègue aussi maintenant au vrai flux (token stocké + email envoyé).
        String email = body.get("email");
        return authService.forgotPassword(email);
    }

    @PostMapping("/auth/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        // 🆕 Endpoint manquant : aucune page front n'appelait encore la
        // réinitialisation effective du mot de passe. Le service vérifie le
        // token + son expiration avant de mettre à jour le mot de passe.
        String token = body.get("token");
        String nouveauMotDePasse = body.get("nouveauMotDePasse");
        return authService.resetPassword(token, nouveauMotDePasse);
    }

    // =============================================
    // 👤 UTILISATEURS (CRUD)
    // =============================================

    @GetMapping
    public ResponseEntity<List<Utilisateur>> getAllUtilisateurs() {
        List<Utilisateur> utilisateurs = utilisateurRepository.findAll();
        utilisateurs.forEach(u -> u.setMotDePasse(null));
        return ResponseEntity.ok(utilisateurs);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUtilisateurById(@PathVariable Long id) {
        Optional<Utilisateur> optionalUser = utilisateurRepository.findById(id);
        if (optionalUser.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Utilisateur non trouvé.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
        Utilisateur utilisateur = optionalUser.get();
        utilisateur.setMotDePasse(null);
        return ResponseEntity.ok(utilisateur);
    }

    @PostMapping
    public ResponseEntity<?> creerUtilisateur(@RequestBody Map<String, Object> request) {
        try {
            String email = (String) request.get("email");

            if (email == null || email.isBlank()) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "L'email est obligatoire.");
                return ResponseEntity.badRequest().body(error);
            }

            if (utilisateurRepository.findByEmail(email).isPresent()) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Cet email est déjà utilisé.");
                return ResponseEntity.badRequest().body(error);
            }

            String motDePasse = (String) request.get("motDePasse");
            if (motDePasse == null || motDePasse.isBlank()) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Le mot de passe est obligatoire.");
                return ResponseEntity.badRequest().body(error);
            }

            Utilisateur utilisateur = new Utilisateur();
            utilisateur.setNom((String) request.get("nom"));
            utilisateur.setPrenom((String) request.get("prenom"));
            utilisateur.setEmail(email);
            utilisateur.setMotDePasse(passwordEncoder.encode(motDePasse));

            String roleStr = (String) request.getOrDefault("role", "EMPLOYE");
            utilisateur.setRole(Role.valueOf(roleStr));

            utilisateur.setActif(true);
            utilisateur.setDateCreation(LocalDateTime.now());

            if (request.containsKey("numeroCin")) utilisateur.setNumeroCin((String) request.get("numeroCin"));
            if (request.containsKey("adresse")) utilisateur.setAdresse((String) request.get("adresse"));
            if (request.containsKey("ville")) utilisateur.setVille((String) request.get("ville"));
            if (request.containsKey("pays")) utilisateur.setPays((String) request.get("pays"));
            if (request.containsKey("telephone")) utilisateur.setTelephone((String) request.get("telephone"));
            if (request.containsKey("poste")) utilisateur.setPoste((String) request.get("poste"));
            if (request.containsKey("agence")) utilisateur.setAgence((String) request.get("agence"));

            utilisateur = utilisateurRepository.save(utilisateur);
            utilisateur.setMotDePasse(null);

            return ResponseEntity.status(HttpStatus.CREATED).body(utilisateur);

        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Valeur invalide : " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            System.err.println("❌ Erreur création utilisateur: " + e.getMessage());
            e.printStackTrace();
            Map<String, String> error = new HashMap<>();
            error.put("message", "Erreur serveur : " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> modifierUtilisateur(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        Optional<Utilisateur> optionalUser = utilisateurRepository.findById(id);
        if (optionalUser.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Utilisateur non trouvé.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }

        Utilisateur utilisateur = optionalUser.get();

        if (request.containsKey("nom")) {
            utilisateur.setNom((String) request.get("nom"));
        }
        if (request.containsKey("prenom")) {
            utilisateur.setPrenom((String) request.get("prenom"));
        }
        if (request.containsKey("email")) {
            String email = (String) request.get("email");
            if (!email.equals(utilisateur.getEmail()) && utilisateurRepository.findByEmail(email).isPresent()) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Cet email est déjà utilisé.");
                return ResponseEntity.badRequest().body(error);
            }
            utilisateur.setEmail(email);
        }
        if (request.containsKey("motDePasse") && request.get("motDePasse") != null && !((String) request.get("motDePasse")).isEmpty()) {
            utilisateur.setMotDePasse(passwordEncoder.encode((String) request.get("motDePasse")));
        }
        if (request.containsKey("role")) {
            utilisateur.setRole(Role.valueOf((String) request.get("role")));
        }
        if (request.containsKey("numeroCin")) {
            utilisateur.setNumeroCin((String) request.get("numeroCin"));
        }
        if (request.containsKey("adresse")) {
            utilisateur.setAdresse((String) request.get("adresse"));
        }
        if (request.containsKey("ville")) {
            utilisateur.setVille((String) request.get("ville"));
        }
        if (request.containsKey("pays")) {
            utilisateur.setPays((String) request.get("pays"));
        }
        if (request.containsKey("telephone")) {
            utilisateur.setTelephone((String) request.get("telephone"));
        }
        if (request.containsKey("poste")) {
            utilisateur.setPoste((String) request.get("poste"));
        }
        if (request.containsKey("agence")) {
            utilisateur.setAgence((String) request.get("agence"));
        }
        if (request.containsKey("actif")) {
            utilisateur.setActif((Boolean) request.get("actif"));
        }
        if (request.containsKey("photoProfilUrl")) {
            utilisateur.setPhotoProfilUrl((String) request.get("photoProfilUrl"));
        }

        utilisateur = utilisateurRepository.save(utilisateur);
        utilisateur.setMotDePasse(null);

        return ResponseEntity.ok(utilisateur);
    }

    // =============================================
    // 🗑️ SUPPRESSION DÉFINITIVE
    // =============================================

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> supprimerUtilisateur(@PathVariable Long id) {
        try {
            System.out.println("🗑️ Suppression définitive de l'utilisateur ID: " + id);

            Optional<Utilisateur> optionalUser = utilisateurRepository.findById(id);
            if (optionalUser.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Utilisateur non trouvé avec l'ID: " + id);
                error.put("success", "false");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }

            Utilisateur utilisateur = optionalUser.get();
            String email = utilisateur.getEmail();
            String nomComplet = (utilisateur.getPrenom() != null ? utilisateur.getPrenom() : "") + " " +
                    (utilisateur.getNom() != null ? utilisateur.getNom() : "");
            Long userId = utilisateur.getId();

            System.out.println("📋 Utilisateur à supprimer définitivement: " + email + " (ID: " + userId + ")");

            try {
                auditLogRepository.deleteByUtilisateur(utilisateur);
                System.out.println("✅ Logs d'audit supprimés");
            } catch (Exception e) {
                System.err.println("⚠️ Erreur suppression logs: " + e.getMessage());
            }

            try {
                List<Candidature> candidatures = candidatureRepository.findByCandidat(utilisateur);
                if (!candidatures.isEmpty()) {
                    for (Candidature c : candidatures) {
                        livrableRepository.deleteByCandidature(c);
                    }
                    candidatureRepository.deleteAll(candidatures);
                    System.out.println("✅ Candidatures supprimées (" + candidatures.size() + ")");
                }
            } catch (Exception e) {
                System.err.println("⚠️ Erreur suppression candidatures: " + e.getMessage());
            }

            try {
                List<Offre> offres = offreRepository.findByPubliePar(utilisateur);
                if (!offres.isEmpty()) {
                    offreRepository.deleteAll(offres);
                    System.out.println("✅ Offres supprimées (" + offres.size() + ")");
                }
            } catch (Exception e) {
                System.err.println("⚠️ Erreur suppression offres: " + e.getMessage());
            }

            utilisateurRepository.deleteById(id);
            System.out.println("✅ Utilisateur " + userId + " supprimé définitivement avec succès");

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Utilisateur supprimé définitivement avec succès.");
            response.put("id", userId);
            response.put("email", email);
            response.put("nomComplet", nomComplet.trim());
            response.put("success", true);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("❌ Erreur lors de la suppression définitive: " + e.getMessage());
            e.printStackTrace();

            Map<String, String> error = new HashMap<>();
            error.put("message", "Erreur lors de la suppression définitive: " + e.getMessage());
            error.put("success", "false");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    // =============================================
    // 📄 CANDIDATURES
    // =============================================

    @PostMapping("/candidatures")
    public ResponseEntity<?> postuler(@RequestParam Long candidatId, @RequestParam Long offreId) {
        Optional<Utilisateur> optionalCandidat = utilisateurRepository.findById(candidatId);
        if (optionalCandidat.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Candidat non trouvé.");
            return ResponseEntity.badRequest().body(error);
        }

        Optional<Offre> optionalOffre = offreRepository.findById(offreId);
        if (optionalOffre.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Offre non trouvée.");
            return ResponseEntity.badRequest().body(error);
        }

        Candidature candidature = new Candidature();
        candidature.setCandidat(optionalCandidat.get());
        candidature.setOffre(optionalOffre.get());
        candidature.setStatut(StatutCandidature.EN_ATTENTE);
        candidature.setDateDepot(LocalDateTime.now());

        candidature = candidatureRepository.save(candidature);

        Utilisateur candidatQuiPostule = optionalCandidat.get();
        Offre offreCiblee = optionalOffre.get();
        List<Utilisateur> destinataires = new java.util.ArrayList<>();
        destinataires.addAll(utilisateurRepository.findByRole(Role.RH));
        destinataires.addAll(utilisateurRepository.findByRole(Role.RESPONSABLE_RH));
        for (Utilisateur rh : destinataires) {
            notificationService.creerNotification(
                    rh,
                    "Nouvelle candidature reçue",
                    candidatQuiPostule.getPrenom() + " " + candidatQuiPostule.getNom() + " a postulé à l'offre \"" + offreCiblee.getTitre() + "\".",
                    "info",
                    "NOUVELLE_CANDIDATURE",
                    "Candidature",
                    candidature.getId(),
                    "/dashboard/rh"
            );
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(candidature);
    }

    @GetMapping("/candidatures")
    public ResponseEntity<List<Candidature>> getAllCandidatures(@RequestParam(required = false) StatutCandidature statut) {
        List<Candidature> candidatures;
        if (statut != null) {
            candidatures = candidatureRepository.findByStatut(statut);
        } else {
            candidatures = candidatureRepository.findAll();
        }
        return ResponseEntity.ok(candidatures);
    }

    @GetMapping("/candidatures/candidat/{candidatId}")
    public ResponseEntity<List<Candidature>> getCandidaturesByCandidat(@PathVariable Long candidatId) {
        Optional<Utilisateur> optionalCandidat = utilisateurRepository.findById(candidatId);
        if (optionalCandidat.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        List<Candidature> candidatures = candidatureRepository.findByCandidat(optionalCandidat.get());
        return ResponseEntity.ok(candidatures);
    }

    @GetMapping("/candidatures/encadrant/{encadrantId}")
    public ResponseEntity<List<Candidature>> getCandidaturesByEncadrant(@PathVariable Long encadrantId) {
        Optional<Utilisateur> optionalEncadrant = utilisateurRepository.findById(encadrantId);
        if (optionalEncadrant.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        List<Candidature> candidatures = candidatureRepository.findByEncadrant(optionalEncadrant.get());
        return ResponseEntity.ok(candidatures);
    }

    @PutMapping("/candidatures/{id}/preselectionner")
    public ResponseEntity<?> preSelectionnerCandidature(@PathVariable Long id) {
        Optional<Candidature> optionalCandidature = candidatureRepository.findById(id);
        if (optionalCandidature.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Candidature non trouvée.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }

        Candidature candidature = optionalCandidature.get();
        candidature.setStatut(StatutCandidature.ENTRETIEN_PLANIFIE);
        candidature = candidatureRepository.save(candidature);
        return ResponseEntity.ok(candidature);
    }

    @PutMapping("/candidatures/{id}/assigner-encadrant")
    public ResponseEntity<?> assignerEncadrant(@PathVariable Long id, @RequestParam Long encadrantId) {
        // ⚠️ CORRECTION IMPORTANTE : c'est CET endpoint que le frontend appelle
        // réellement (voir utilisateur.service.ts). Il faisait avant un simple
        // set+save sans aucune vérification de rôle ni aucune notification
        // (email/in-app/WhatsApp) — contrairement à CandidatureService.assignerEncadrant
        // qui existait déjà mais n'était jamais appelé par cette route. On délègue donc
        // maintenant vers ce service unique pour éviter la duplication et le bug.
        return candidatureService.assignerEncadrant(id, encadrantId);
    }

    @PutMapping("/candidatures/{id}/decision")
    public ResponseEntity<?> deciderCandidature(@PathVariable Long id, @RequestBody Map<String, String> request) {
        Optional<Candidature> optionalCandidature = candidatureRepository.findById(id);
        if (optionalCandidature.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Candidature non trouvée.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }

        Candidature candidature = optionalCandidature.get();
        String decision = request.get("decision");
        Utilisateur candidat = candidature.getCandidat();
        Offre offre = candidature.getOffre();
        boolean estUneOffreDeStage = offre != null && offre.getType() == TypeOffre.STAGE;

        if ("ACCEPTE".equals(decision)) {
            candidature.setStatut(StatutCandidature.ACCEPTE);

            if (estUneOffreDeStage && candidat != null && candidat.getRole() != Role.STAGIAIRE) {
                candidat.setRole(Role.STAGIAIRE);
                candidat.setActif(true);
                utilisateurRepository.save(candidat);
                auditLogService.log(candidat, "PROMOTION_STAGIAIRE", "Utilisateur", candidat.getId(), "127.0.0.1");
            }

            if (candidat != null) {
                notificationService.creerNotification(
                        candidat,
                        "Candidature acceptée",
                        "Votre candidature pour '" + offre.getTitre() + "' a été acceptée !",
                        "success",
                        "DECISION_CANDIDATURE",
                        "Candidature",
                        candidature.getId(),
                        estUneOffreDeStage ? "/dashboard/stagiaire" : "/dashboard/candidat"
                );
                try {
                    emailService.sendEmail(
                            candidat.getEmail(),
                            "Félicitations ! Votre candidature a été acceptée - Talentis",
                            "Bonjour " + candidat.getPrenom() + ",\n\nNous avons le plaisir de vous informer que votre candidature pour " + (estUneOffreDeStage ? "le stage" : "le poste") + " '" + offre.getTitre() + "' a été acceptée.\n\nCordialement,\nL'équipe Talentis"
                    );
                } catch (Exception e) {
                    System.err.println("⚠️ Échec envoi email décision: " + e.getMessage());
                }
                try {
                    whatsAppService.envoyerWhatsApp(
                            candidat.getTelephone(),
                            "Bonjour " + candidat.getPrenom() + ", félicitations ! Votre candidature pour '" + offre.getTitre() + "' a été acceptée. - Talentis"
                    );
                } catch (Exception e) {
                    System.err.println("⚠️ Échec envoi WhatsApp décision: " + e.getMessage());
                }
            }

        } else if ("REFUSE".equals(decision)) {
            candidature.setStatut(StatutCandidature.REFUSE);

            if (candidat != null) {
                notificationService.creerNotification(
                        candidat,
                        "Candidature refusée",
                        "Votre candidature pour '" + (offre != null ? offre.getTitre() : "") + "' n'a pas été retenue.",
                        "warning",
                        "DECISION_CANDIDATURE",
                        "Candidature",
                        candidature.getId(),
                        "/dashboard/candidat"
                );
                try {
                    emailService.sendEmail(
                            candidat.getEmail(),
                            "Suite à votre candidature - Talentis",
                            "Bonjour " + candidat.getPrenom() + ",\n\nNous vous remercions pour votre candidature pour '" + (offre != null ? offre.getTitre() : "") + "'.\n\nAprès étude de votre dossier, nous regrettons de vous informer qu'elle n'a pas été retenue.\n\nCordialement,\nL'équipe Talentis"
                    );
                } catch (Exception e) {
                    System.err.println("⚠️ Échec envoi email décision: " + e.getMessage());
                }
                try {
                    whatsAppService.envoyerWhatsApp(
                            candidat.getTelephone(),
                            "Bonjour " + candidat.getPrenom() + ", après étude de votre dossier pour '" + (offre != null ? offre.getTitre() : "") + "', votre candidature n'a pas été retenue. - Talentis"
                    );
                } catch (Exception e) {
                    System.err.println("⚠️ Échec envoi WhatsApp décision: " + e.getMessage());
                }
            }

        } else {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Décision invalide. Utilisez 'ACCEPTE' ou 'REFUSE'.");
            return ResponseEntity.badRequest().body(error);
        }

        candidature.setDateDecision(LocalDateTime.now());
        if (request.containsKey("commentaire")) {
            candidature.setCommentaireDecision(request.get("commentaire"));
        }

        candidature = candidatureRepository.save(candidature);

        auditLogService.log(candidat, "DECISION_CANDIDATURE", "Candidature", candidature.getId(), "127.0.0.1");

        return ResponseEntity.ok(candidature);
    }

    // =============================================
    // 💼 OFFRES
    // =============================================

    @GetMapping("/offre")
    public ResponseEntity<List<Offre>> getAllOffres(@RequestParam(required = false) StatutOffre statut) {
        List<Offre> offres;
        if (statut != null) {
            offres = offreRepository.findByStatut(statut);
        } else {
            offres = offreRepository.findAll();
        }
        return ResponseEntity.ok(offres);
    }

    @GetMapping("/offre/{id}")
    public ResponseEntity<?> getOffreById(@PathVariable Long id) {
        Optional<Offre> optionalOffre = offreRepository.findById(id);
        if (optionalOffre.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Offre non trouvée.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
        return ResponseEntity.ok(optionalOffre.get());
    }

    @PostMapping("/offre")
    public ResponseEntity<?> createOffre(
            @RequestBody OffreRequest request,
            @RequestParam Long publieParId) {

        // ✅ DÉLÉGUER AU SERVICE qui gère correctement la cascade et les sujets
        return offreService.createOffre(request, publieParId);
    }

    @PutMapping("/offre/{id}")
    public ResponseEntity<?> modifierOffre(@PathVariable Long id, @RequestBody Offre offreRequest) {
        Optional<Offre> optionalOffre = offreRepository.findById(id);
        if (optionalOffre.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Offre non trouvée.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }

        Offre offre = optionalOffre.get();
        if (offreRequest.getTitre() != null) offre.setTitre(offreRequest.getTitre());
        if (offreRequest.getDescription() != null) offre.setDescription(offreRequest.getDescription());
        if (offreRequest.getDepartement() != null) offre.setDepartement(offreRequest.getDepartement());
        if (offreRequest.getProfilRecherche() != null) offre.setProfilRecherche(offreRequest.getProfilRecherche());
        if (offreRequest.getDureeEnMois() != null) offre.setDureeEnMois(offreRequest.getDureeEnMois());
        if (offreRequest.getStatut() != null) offre.setStatut(offreRequest.getStatut());

        offre = offreRepository.save(offre);
        return ResponseEntity.ok(offre);
    }

    @DeleteMapping("/offre/{id}")
    public ResponseEntity<?> deleteOffre(@PathVariable Long id) {
        Optional<Offre> optionalOffre = offreRepository.findById(id);
        if (optionalOffre.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Offre non trouvée.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
        offreRepository.deleteById(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Offre supprimée avec succès.");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/offre/{id}/statut")
    public ResponseEntity<?> changerStatutOffre(@PathVariable Long id, @RequestParam StatutOffre statut) {
        Optional<Offre> optionalOffre = offreRepository.findById(id);
        if (optionalOffre.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Offre non trouvée.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }

        Offre offre = optionalOffre.get();
        offre.setStatut(statut);
        offre = offreRepository.save(offre);
        return ResponseEntity.ok(offre);
    }

    // =============================================
    // 📦 LIVRABLES
    // =============================================

    @PostMapping("/livrables")
    public ResponseEntity<?> soumettreLivrable(@RequestBody Livrable livrable) {
        if (livrable.getCandidature() == null || livrable.getCandidature().getId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Candidature manquante pour ce livrable."));
        }
        Optional<Candidature> optionalCandidature = candidatureRepository.findById(livrable.getCandidature().getId());
        if (optionalCandidature.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Candidature non trouvée.");
            return ResponseEntity.badRequest().body(error);
        }

        Candidature candidature = optionalCandidature.get();
        livrable.setCandidature(candidature);
        livrable.setDateSoumission(LocalDateTime.now());
        livrable.setStatut(StatutLivrable.SOUMIS);
        // 🆕 Version = nombre de dépôts déjà faits pour cette candidature + 1
        int nombreVersionsExistantes = livrableRepository.findByCandidatureId(candidature.getId()).size();
        livrable.setVersion(nombreVersionsExistantes + 1);

        livrable = livrableRepository.save(livrable);

        // 🆕 Notifier l'encadrant (section 6, étape 3 : "L'encadrant reçoit
        // automatiquement une notification"). C'était totalement absent avant.
        Utilisateur encadrant = candidature.getEncadrant();
        Utilisateur candidat = candidature.getCandidat();
        if (encadrant != null) {
            notificationService.creerNotification(
                    encadrant.getId(),
                    "Nouveau travail déposé",
                    (candidat != null ? candidat.getPrenom() + " " + candidat.getNom() : "Un stagiaire") +
                            " a déposé un nouveau travail : " + livrable.getTitre(),
                    "LIVRABLE"
            );
            try {
                emailService.sendEmail(
                        encadrant.getEmail(),
                        "Nouveau travail déposé - Talentis",
                        "Bonjour " + encadrant.getPrenom() + ",\n\n" +
                                (candidat != null ? candidat.getPrenom() + " " + candidat.getNom() : "Votre stagiaire") +
                                " vient de déposer un nouveau travail : " + livrable.getTitre() + ".\n\n" +
                                "Connectez-vous pour le consulter.\n\nCordialement,\nL'équipe Talentis"
                );
            } catch (Exception e) {
                System.err.println("⚠️ Échec envoi email nouveau livrable: " + e.getMessage());
            }
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(livrable);
    }

    @GetMapping("/livrables/candidature/{candidatureId}")
    public ResponseEntity<List<Livrable>> getLivrablesByCandidature(@PathVariable Long candidatureId) {
        List<Livrable> livrables = livrableRepository.findByCandidatureId(candidatureId);
        return ResponseEntity.ok(livrables);
    }

    @PutMapping("/livrables/{id}/reviser")
    public ResponseEntity<?> reviserLivrable(
            @PathVariable Long id,
            @RequestParam StatutLivrable statut,
            @RequestParam(required = false) String commentaire) {
        Optional<Livrable> optionalLivrable = livrableRepository.findById(id);
        if (optionalLivrable.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Livrable non trouvé.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }

        Livrable livrable = optionalLivrable.get();
        livrable.setStatut(statut);
        livrable.setDateRevision(LocalDateTime.now());
        if (commentaire != null) {
            livrable.setCommentaireEncadrant(commentaire);
        }

        livrable = livrableRepository.save(livrable);

        // 🆕 Notifier le stagiaire de la révision (section 6, étape 4).
        // Avant cette correction, le stagiaire n'était jamais informé qu'une
        // remarque avait été ajoutée ou qu'une modification était demandée.
        Utilisateur candidat = livrable.getCandidature() != null ? livrable.getCandidature().getCandidat() : null;
        if (candidat != null) {
            String titreNotif;
            String messageNotif;
            if (statut == StatutLivrable.A_MODIFIER) {
                titreNotif = "Modification demandée";
                messageNotif = "Votre encadrant demande une modification sur « " + livrable.getTitre() + " »" +
                        (commentaire != null ? " : " + commentaire : ".");
            } else if (statut == StatutLivrable.APPROUVE) {
                titreNotif = "Travail approuvé";
                messageNotif = "Votre encadrant a approuvé votre travail « " + livrable.getTitre() + " ».";
            } else {
                titreNotif = "Travail corrigé";
                messageNotif = "Votre encadrant a ajouté une remarque sur « " + livrable.getTitre() + " »" +
                        (commentaire != null ? " : " + commentaire : ".");
            }

            notificationService.creerNotification(candidat.getId(), titreNotif, messageNotif, "LIVRABLE");

            try {
                emailService.sendEmail(
                        candidat.getEmail(),
                        titreNotif + " - Talentis",
                        "Bonjour " + candidat.getPrenom() + ",\n\n" + messageNotif + "\n\nCordialement,\nL'équipe Talentis"
                );
            } catch (Exception e) {
                System.err.println("⚠️ Échec envoi email révision livrable: " + e.getMessage());
            }

            if (candidat.getTelephone() != null && !candidat.getTelephone().isBlank()) {
                try {
                    whatsAppService.envoyerWhatsApp(candidat.getTelephone(), messageNotif + " - Talentis");
                } catch (Exception e) {
                    System.err.println("⚠️ Échec envoi WhatsApp révision livrable: " + e.getMessage());
                }
            }
        }

        return ResponseEntity.ok(livrable);
    }

    // =============================================
    // 📊 AUDIT LOGS
    // =============================================

    @GetMapping("/audit/logs")
    public ResponseEntity<List<AuditLog>> getAuditLogs() {
        List<AuditLog> logs = auditLogRepository.findAllByOrderByDateActionDesc();
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/audit/logs/utilisateur/{utilisateurId}")
    public ResponseEntity<List<AuditLog>> getAuditLogsByUtilisateur(@PathVariable Long utilisateurId) {
        Optional<Utilisateur> optionalUser = utilisateurRepository.findById(utilisateurId);
        if (optionalUser.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        List<AuditLog> logs = auditLogRepository.findByUtilisateurOrderByDateActionDesc(optionalUser.get());
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/audit/logs/action/{action}")
    public ResponseEntity<List<AuditLog>> getAuditLogsByAction(@PathVariable String action) {
        List<AuditLog> logs = auditLogRepository.findByActionOrderByDateActionDesc(action);
        return ResponseEntity.ok(logs);
    }

    @PostMapping("/audit/logs")
    public ResponseEntity<?> createAuditLog(@RequestBody AuditLog auditLog) {
        if (auditLog.getUtilisateur() != null && auditLog.getUtilisateur().getId() != null) {
            Optional<Utilisateur> optionalUser = utilisateurRepository.findById(auditLog.getUtilisateur().getId());
            optionalUser.ifPresent(auditLog::setUtilisateur);
        }
        auditLog.setDateAction(LocalDateTime.now());
        auditLog = auditLogRepository.save(auditLog);
        return ResponseEntity.status(HttpStatus.CREATED).body(auditLog);
    }

    @GetMapping("/test")
    public ResponseEntity<String> test() {
        return ResponseEntity.ok("✅ Le backend fonctionne !");
    }

    // =============================================
// 📱 ENVOI WHATSAPP MANUEL
// =============================================

    @PostMapping("/{id}/whatsapp")
    public ResponseEntity<?> envoyerWhatsAppManuel(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        try {
            System.out.println("📱 Demande d'envoi WhatsApp manuel pour l'utilisateur ID: " + id);

            Optional<Utilisateur> optionalUser = utilisateurRepository.findById(id);
            if (optionalUser.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Utilisateur non trouvé.");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }

            Utilisateur utilisateur = optionalUser.get();

            if (utilisateur.getTelephone() == null || utilisateur.getTelephone().isBlank()) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Aucun numéro de téléphone pour cet utilisateur.");
                return ResponseEntity.badRequest().body(error);
            }

            String message = request.get("message");
            if (message == null || message.isBlank()) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Le message est obligatoire.");
                return ResponseEntity.badRequest().body(error);
            }

            WhatsAppService.WhatsAppResult result = whatsAppService.envoyerWhatsApp(
                    utilisateur.getTelephone(),
                    message
            );

            Map<String, Object> response = new HashMap<>();
            if (result.isSuccess()) {
                response.put("success", true);
                response.put("message", "WhatsApp envoyé avec succès");
                response.put("messageId", result.getMessageId());
                response.put("whatsappEnvoye", true);

                auditLogService.log(utilisateur, "ENVOI_WHATSAPP", "Utilisateur", utilisateur.getId(), "127.0.0.1");

                System.out.println("✅ WhatsApp envoyé à " + utilisateur.getTelephone());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Échec de l'envoi WhatsApp: " + result.getMessage());
                response.put("whatsappEnvoye", false);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }

        } catch (Exception e) {
            System.err.println("❌ Erreur envoi WhatsApp: " + e.getMessage());
            e.printStackTrace();
            Map<String, String> error = new HashMap<>();
            error.put("message", "Erreur: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}