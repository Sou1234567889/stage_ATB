package com.attijari.talentis.talentisbackend.service;

import com.attijari.talentis.talentisbackend.entity.*;
import com.attijari.talentis.talentisbackend.repository.CandidatureRepository;
import com.attijari.talentis.talentisbackend.repository.OffreRepository;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.*;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.*;
import org.slf4j.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDate;
import java.util.List;

@Service
public class BookPfeService {

    private static final Logger logger = LoggerFactory.getLogger(BookPfeService.class);

    private final CandidatureRepository candidatureRepository;
    private final OffreRepository offreRepository;

    private static final DeviceRgb ORANGE = new DeviceRgb(246, 135, 31);
    private static final DeviceRgb ROUGE  = new DeviceRgb(226, 37, 27);
    private static final DeviceRgb GRIS   = new DeviceRgb(245, 245, 245);

    public BookPfeService(CandidatureRepository candidatureRepository,
                          OffreRepository offreRepository) {
        this.candidatureRepository = candidatureRepository;
        this.offreRepository = offreRepository;
    }

    // ============================================================
    // GÉNÉRATION POUR UNE OFFRE PFE SPÉCIFIQUE
    // ============================================================
    @Transactional(readOnly = true)
    public byte[] genererBookPfeParOffre(Long offreId) {
        logger.info("🚀 Début génération Book PFE pour l'offre {}", offreId);

        Offre offre = offreRepository.findById(offreId)
                .orElseThrow(() -> new RuntimeException("Offre PFE introuvable : " + offreId));

        if (offre.getType() != TypeOffre.STAGE_PFE) {
            throw new RuntimeException("L'offre " + offreId + " n'est pas de type STAGE_PFE.");
        }

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document doc = new Document(pdf);
            doc.setMargins(40, 40, 40, 40);

            // 1. Page de garde
            ajouterPageGarde(doc, offre);
            doc.add(new AreaBreak(AreaBreakType.NEXT_PAGE));

            // 2. Sommaire (uniquement les sujets de CETTE offre)
            ajouterSommaire(doc, offre);
            doc.add(new AreaBreak(AreaBreakType.NEXT_PAGE));

            // 3. Détail de l'offre + ses sujets
            ajouterSectionOffre(doc, offre);
            doc.add(new AreaBreak(AreaBreakType.NEXT_PAGE));

            // 4. Liste des stagiaires affectés à CETTE offre
            ajouterListeStagiaires(doc, offre);

            doc.close();
            logger.info("✅ Book PFE offre {} généré : {} bytes", offreId, baos.size());
            return baos.toByteArray();

        } catch (Exception e) {
            logger.error("❌ Erreur critique génération Book PFE offre {}: {}", offreId, e.getMessage(), e);
            throw new RuntimeException("Erreur génération Book PFE: " + e.getMessage(), e);
        }
    }

    // ============================================================
    // PAGE DE GARDE
    // ============================================================
    private void ajouterPageGarde(Document doc, Offre offre) {
        try {
            InputStream logoStream = getClass().getClassLoader()
                    .getResourceAsStream("static/images/attijari-logo.png");

            if (logoStream != null) {
                byte[] logoBytes = logoStream.readAllBytes();
                Image logo = new Image(com.itextpdf.io.image.ImageDataFactory.create(logoBytes));
                logo.setWidth(150);
                logo.setTextAlignment(TextAlignment.CENTER);
                doc.add(logo);
            } else {
                logger.warn("⚠ Logo introuvable dans static/images/attijari-logo.png");
            }
        } catch (Exception e) {
            logger.warn("⚠ Erreur chargement logo: {}", e.getMessage());
        }

        doc.add(new Paragraph("\n\n\n"));

        doc.add(new Paragraph("BOOK PFE")
                .setFontSize(42).setBold()
                .setFontColor(ROUGE)
                .setTextAlignment(TextAlignment.CENTER));

        doc.add(new Paragraph("Recueil des Sujets de Projets de Fin d'Études")
                .setFontSize(18).setItalic()
                .setFontColor(ORANGE)
                .setTextAlignment(TextAlignment.CENTER));

        doc.add(new Paragraph("\n\n"));

        // ✅ Afficher le titre de l'offre concernée
        doc.add(new Paragraph(offre.getTitre() != null ? offre.getTitre() : "—")
                .setFontSize(20).setBold()
                .setTextAlignment(TextAlignment.CENTER));

        doc.add(new Paragraph("\n"));
        doc.add(new Paragraph("Année universitaire " + LocalDate.now().getYear()
                + " — " + (LocalDate.now().getYear() + 1))
                .setFontSize(16)
                .setTextAlignment(TextAlignment.CENTER));

        doc.add(new Paragraph("\n\n\n\n"));
        doc.add(new Paragraph("Attijari Bank — Direction des Ressources Humaines")
                .setFontSize(14).setBold()
                .setTextAlignment(TextAlignment.CENTER));

        doc.add(new Paragraph("Document confidentiel — Usage interne")
                .setFontSize(10).setItalic()
                .setFontColor(ColorConstants.GRAY)
                .setTextAlignment(TextAlignment.CENTER));
    }

    // ============================================================
    // SOMMAIRE (uniquement les sujets de l'offre passée)
    // ============================================================
    private void ajouterSommaire(Document doc, Offre offre) {
        doc.add(new Paragraph("SOMMAIRE DES SUJETS")
                .setFontSize(22).setBold()
                .setFontColor(ROUGE)
                .setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph("\n"));

        List<SujetPfe> sujets = offre.getSujets();

        if (sujets == null || sujets.isEmpty()) {
            doc.add(new Paragraph("Aucun sujet PFE enregistré pour cette offre.").setFontSize(14).setItalic());
            return;
        }

        Table table = new Table(UnitValue.createPercentArray(new float[]{1, 4, 3, 2}))
                .useAllAvailableWidth();

        String[] headers = {"N°", "Titre du sujet", "Technologies", "Places"};
        for (String h : headers) {
            Cell c = new Cell().add(new Paragraph(h).setBold().setFontColor(ColorConstants.WHITE));
            c.setBackgroundColor(ROUGE);
            c.setTextAlignment(TextAlignment.CENTER);
            table.addHeaderCell(c);
        }

        int num = 1;
        for (SujetPfe s : sujets) {
            table.addCell(new Cell().add(new Paragraph(String.valueOf(num++)))
                    .setTextAlignment(TextAlignment.CENTER));
            table.addCell(new Cell().add(new Paragraph(
                    s.getTitre() != null ? s.getTitre() : "—")));
            table.addCell(new Cell().add(new Paragraph(
                    s.getTechnologies() != null ? s.getTechnologies() : "—")));
            table.addCell(new Cell().add(new Paragraph(
                            s.getNombrePlaces() != null ? String.valueOf(s.getNombrePlaces()) : "—"))
                    .setTextAlignment(TextAlignment.CENTER));
        }
        doc.add(table);
    }

    // ============================================================
    // SECTION D'UNE OFFRE (infos + ses sujets)
    // ============================================================
    private void ajouterSectionOffre(Document doc, Offre offre) {
        Paragraph titreOffre = new Paragraph(
                offre.getTitre() != null ? offre.getTitre() : "Sans titre")
                .setFontSize(20).setBold()
                .setFontColor(ColorConstants.WHITE)
                .setTextAlignment(TextAlignment.CENTER)
                .setBackgroundColor(ROUGE)
                .setPadding(8);
        doc.add(titreOffre);
        doc.add(new Paragraph("\n"));

        Table infos = new Table(UnitValue.createPercentArray(new float[]{1, 2}))
                .useAllAvailableWidth();

        ajouterLigneInfo(infos, "Département", offre.getDepartement());
        ajouterLigneInfo(infos, "Lieu", offre.getLieu());
        ajouterLigneInfo(infos, "Niveau requis", offre.getNiveauEtudeRequis());
        ajouterLigneInfo(infos, "Spécialité", offre.getSpecialiteRequise());
        ajouterLigneInfo(infos, "Nombre de places",
                offre.getNombrePlacesTotal() != null ? String.valueOf(offre.getNombrePlacesTotal()) : "—");
        ajouterLigneInfo(infos, "Période", offre.getPeriodeStage());
        ajouterLigneInfo(infos, "Date limite",
                offre.getDateLimite() != null ? offre.getDateLimite().toString() : "—");
        ajouterLigneInfo(infos, "Avantages", offre.getAvantages());
        ajouterLigneInfo(infos, "Prérequis", offre.getPrerequis());

        doc.add(infos);
        doc.add(new Paragraph("\n"));

        if (offre.getDescription() != null && !offre.getDescription().isBlank()) {
            doc.add(new Paragraph("Description de l'offre")
                    .setFontSize(14).setBold().setFontColor(ORANGE));
            doc.add(new Paragraph(offre.getDescription()).setFontSize(11));
            doc.add(new Paragraph("\n"));
        }

        if (offre.getSujets() != null && !offre.getSujets().isEmpty()) {
            doc.add(new Paragraph("Sujets proposés (" + offre.getSujets().size() + ")")
                    .setFontSize(16).setBold().setFontColor(ROUGE));
            doc.add(new Paragraph("\n"));

            int i = 1;
            for (SujetPfe s : offre.getSujets()) {
                ajouterSujet(doc, s, i++);
                doc.add(new Paragraph("\n"));
            }
        }
    }

    private void ajouterLigneInfo(Table table, String label, String valeur) {
        Cell c1 = new Cell().add(new Paragraph(label).setBold().setFontSize(10));
        c1.setBackgroundColor(GRIS);
        Cell c2 = new Cell().add(new Paragraph(valeur != null ? valeur : "—").setFontSize(10));
        table.addCell(c1);
        table.addCell(c2);
    }

    private void ajouterSujet(Document doc, SujetPfe s, int numero) {
        doc.add(new Paragraph("Sujet N° " + numero + " : "
                + (s.getTitre() != null ? s.getTitre() : "—"))
                .setFontSize(14).setBold().setFontColor(ORANGE));
        doc.add(new Paragraph("\n"));

        Table t = new Table(UnitValue.createPercentArray(new float[]{1, 2}))
                .useAllAvailableWidth();

        ajouterLigneInfo(t, "Technologies", s.getTechnologies());
        ajouterLigneInfo(t, "Compétences requises", s.getCompetencesRequises());
        ajouterLigneInfo(t, "Nombre de places",
                s.getNombrePlaces() != null ? String.valueOf(s.getNombrePlaces()) : "—");
        ajouterLigneInfo(t, "Objectifs", s.getObjectifs());
        ajouterLigneInfo(t, "Livrables attendus", s.getLivrables());

        doc.add(t);

        if (s.getDescription() != null && !s.getDescription().isBlank()) {
            doc.add(new Paragraph("\n"));
            doc.add(new Paragraph("Description : ").setBold().setFontSize(11));
            doc.add(new Paragraph(s.getDescription()).setFontSize(10));
        }
    }

    // ============================================================
    // LISTE DES STAGIAIRES AFFECTÉS À CETTE OFFRE UNIQUEMENT
    // ============================================================
    private void ajouterListeStagiaires(Document doc, Offre offre) {
        doc.add(new Paragraph("STAGIAIRES PFE AFFECTÉS")
                .setFontSize(22).setBold()
                .setFontColor(ROUGE)
                .setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph("\n"));

        List<Candidature> stagiaires;
        try {
            // ✅ Filtrer par offre ET par statut ACCEPTE
            stagiaires = candidatureRepository
                    .findByStatutAndOffre_Type(StatutCandidature.ACCEPTE, TypeOffre.STAGE_PFE)
                    .stream()
                    .filter(c -> c.getOffre() != null && c.getOffre().getId().equals(offre.getId()))
                    .toList();
        } catch (Exception e) {
            logger.error("❌ Erreur requête stagiaires: {}", e.getMessage(), e);
            stagiaires = List.of();
        }

        logger.info("📄 Book PFE offre {} : {} stagiaire(s) trouvé(s)",
                offre.getId(), stagiaires.size());

        if (stagiaires.isEmpty()) {
            doc.add(new Paragraph("Aucun stagiaire PFE affecté pour le moment à cette offre.")
                    .setFontSize(14).setItalic());
            return;
        }

        Table table = new Table(UnitValue.createPercentArray(new float[]{1, 2, 2, 3, 2}))
                .useAllAvailableWidth();

        String[] headers = {"N°", "Nom & Prénom", "École", "Sujet PFE", "Encadrant"};
        for (String h : headers) {
            Cell c = new Cell().add(new Paragraph(h).setBold().setFontColor(ColorConstants.WHITE));
            c.setBackgroundColor(ROUGE);
            c.setTextAlignment(TextAlignment.CENTER);
            table.addHeaderCell(c);
        }

        int num = 1;
        for (Candidature c : stagiaires) {
            String nom = c.getCandidat() != null
                    ? safe(c.getCandidat().getPrenom()) + " " + safe(c.getCandidat().getNom())
                    : "—";
            String ecole = c.getUniversite() != null ? c.getUniversite() : "—";
            String sujet = c.getOffre() != null && c.getOffre().getTitre() != null
                    ? c.getOffre().getTitre() : "—";
            String encadrant = c.getEncadrant() != null
                    ? safe(c.getEncadrant().getPrenom()) + " " + safe(c.getEncadrant().getNom())
                    : "Non affecté";

            table.addCell(new Cell().add(new Paragraph(String.valueOf(num++)))
                    .setTextAlignment(TextAlignment.CENTER));
            table.addCell(new Cell().add(new Paragraph(nom.trim())));
            table.addCell(new Cell().add(new Paragraph(ecole)));
            table.addCell(new Cell().add(new Paragraph(sujet)));
            table.addCell(new Cell().add(new Paragraph(encadrant.trim())));
        }
        doc.add(table);
    }

    private String safe(String s) {
        return s != null ? s : "";
    }

    @Transactional(readOnly = true)
    public byte[] genererBookPfe() {
        logger.info("🚀 Début génération Book PFE global (toutes les offres PFE)");

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document doc = new Document(pdf);
            doc.setMargins(40, 40, 40, 40);

            // Page de garde globale (sans offre spécifique)
            ajouterPageGardeGlobale(doc);
            doc.add(new AreaBreak(AreaBreakType.NEXT_PAGE));

            // Liste des offres PFE
            List<Offre> offresPfe = offreRepository.findByTypeWithSujets(TypeOffre.STAGE_PFE);
            for (Offre offre : offresPfe) {
                ajouterSectionOffre(doc, offre);
                doc.add(new AreaBreak(AreaBreakType.NEXT_PAGE));
            }

            doc.close();
            logger.info("✅ Book PFE global généré : {} bytes", baos.size());
            return baos.toByteArray();

        } catch (Exception e) {
            logger.error("❌ Erreur génération Book PFE global: {}", e.getMessage(), e);
            throw new RuntimeException("Erreur génération Book PFE global: " + e.getMessage(), e);
        }
    }

    // Page de garde sans offre spécifique
    private void ajouterPageGardeGlobale(Document doc) {
        try {
            InputStream logoStream = getClass().getClassLoader()
                    .getResourceAsStream("static/images/attijari-logo.png");
            if (logoStream != null) {
                byte[] logoBytes = logoStream.readAllBytes();
                Image logo = new Image(com.itextpdf.io.image.ImageDataFactory.create(logoBytes));
                logo.setWidth(150);
                logo.setTextAlignment(TextAlignment.CENTER);
                doc.add(logo);
            }
        } catch (Exception e) {
            logger.warn("⚠ Erreur chargement logo: {}", e.getMessage());
        }

        doc.add(new Paragraph("\n\n\n"));
        doc.add(new Paragraph("BOOK PFE")
                .setFontSize(42).setBold()
                .setFontColor(ROUGE)
                .setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph("Recueil complet des Sujets de Projets de Fin d'Études")
                .setFontSize(18).setItalic()
                .setFontColor(ORANGE)
                .setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph("\n\n"));
        doc.add(new Paragraph("Année universitaire " + LocalDate.now().getYear()
                + " — " + (LocalDate.now().getYear() + 1))
                .setFontSize(16)
                .setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph("\n\n\n\n"));
        doc.add(new Paragraph("Attijari Bank — Direction des Ressources Humaines")
                .setFontSize(14).setBold()
                .setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph("Document confidentiel — Usage interne")
                .setFontSize(10).setItalic()
                .setFontColor(ColorConstants.GRAY)
                .setTextAlignment(TextAlignment.CENTER));
    }

    // ============================================================
// GÉNÉRATION BOOK PFE PAR ANNÉE (toutes les offres d'une année)
// ============================================================
    @Transactional(readOnly = true)
    public byte[] genererBookPfeParAnnee(int annee) {
        logger.info("🚀 Début génération Book PFE pour l'année {}", annee);

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document doc = new Document(pdf);
            doc.setMargins(40, 40, 40, 40);

            // Récupérer toutes les offres PFE dont l'année correspond
            List<Offre> offresPfe = offreRepository.findByTypeWithSujets(TypeOffre.STAGE_PFE);

            // Filtrer par année (basé sur datePublication ou dateLimite)
            List<Offre> offresAnnee = offresPfe.stream()
                    .filter(o -> {
                        LocalDate ref = o.getDatePublication() != null
                                ? o.getDatePublication()
                                : o.getDateLimite();
                        return ref != null && ref.getYear() == annee;
                    })
                    .toList();

            if (offresAnnee.isEmpty()) {
                logger.warn("⚠ Aucune offre PFE trouvée pour l'année {}", annee);
                throw new RuntimeException("Aucune offre PFE trouvée pour l'année " + annee);
            }

            logger.info("📄 {} offre(s) PFE trouvée(s) pour {}", offresAnnee.size(), annee);

            // 1. Page de garde avec l'année
            ajouterPageGardeAnnee(doc, annee);
            doc.add(new AreaBreak(AreaBreakType.NEXT_PAGE));

            // 2. Sommaire global
            ajouterSommaireAnnee(doc, offresAnnee, annee);
            doc.add(new AreaBreak(AreaBreakType.NEXT_PAGE));

            // 3. Une section par offre
            for (Offre offre : offresAnnee) {
                ajouterSectionOffre(doc, offre);
                doc.add(new AreaBreak(AreaBreakType.NEXT_PAGE));
            }

            // 4. Stagiaires de l'année
            ajouterListeStagiairesAnnee(doc, annee);

            doc.close();
            logger.info("✅ Book PFE année {} généré : {} bytes", annee, baos.size());
            return baos.toByteArray();

        } catch (Exception e) {
            logger.error("❌ Erreur génération Book PFE année {}: {}", annee, e.getMessage(), e);
            throw new RuntimeException("Erreur génération Book PFE: " + e.getMessage(), e);
        }
    }

    // Page de garde pour une année
    private void ajouterPageGardeAnnee(Document doc, int annee) {
        try {
            InputStream logoStream = getClass().getClassLoader()
                    .getResourceAsStream("static/images/attijari-logo.png");
            if (logoStream != null) {
                byte[] logoBytes = logoStream.readAllBytes();
                Image logo = new Image(com.itextpdf.io.image.ImageDataFactory.create(logoBytes));
                logo.setWidth(150);
                logo.setTextAlignment(TextAlignment.CENTER);
                doc.add(logo);
            }
        } catch (Exception e) {
            logger.warn("⚠ Erreur chargement logo: {}", e.getMessage());
        }

        doc.add(new Paragraph("\n\n\n"));
        doc.add(new Paragraph("BOOK PFE " + annee)
                .setFontSize(42).setBold()
                .setFontColor(ROUGE)
                .setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph("Recueil des Sujets de Projets de Fin d'Études")
                .setFontSize(18).setItalic()
                .setFontColor(ORANGE)
                .setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph("\n\n"));
        doc.add(new Paragraph("Année universitaire " + annee + " — " + (annee + 1))
                .setFontSize(16)
                .setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph("\n\n\n\n"));
        doc.add(new Paragraph("Attijari Bank — Direction des Ressources Humaines")
                .setFontSize(14).setBold()
                .setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph("Document confidentiel — Usage interne")
                .setFontSize(10).setItalic()
                .setFontColor(ColorConstants.GRAY)
                .setTextAlignment(TextAlignment.CENTER));
    }

    // Sommaire global pour une année
    private void ajouterSommaireAnnee(Document doc, List<Offre> offres, int annee) {
        doc.add(new Paragraph("SOMMAIRE DES SUJETS — " + annee)
                .setFontSize(22).setBold()
                .setFontColor(ROUGE)
                .setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph("\n"));

        Table table = new Table(UnitValue.createPercentArray(new float[]{1, 4, 3, 2, 2}))
                .useAllAvailableWidth();

        String[] headers = {"N°", "Titre du sujet", "Technologies", "Offre", "Places"};
        for (String h : headers) {
            Cell c = new Cell().add(new Paragraph(h).setBold().setFontColor(ColorConstants.WHITE));
            c.setBackgroundColor(ROUGE);
            c.setTextAlignment(TextAlignment.CENTER);
            table.addHeaderCell(c);
        }

        int num = 1;
        for (Offre offre : offres) {
            if (offre.getSujets() == null) continue;
            for (SujetPfe s : offre.getSujets()) {
                table.addCell(new Cell().add(new Paragraph(String.valueOf(num++)))
                        .setTextAlignment(TextAlignment.CENTER));
                table.addCell(new Cell().add(new Paragraph(s.getTitre() != null ? s.getTitre() : "—")));
                table.addCell(new Cell().add(new Paragraph(s.getTechnologies() != null ? s.getTechnologies() : "—")));
                table.addCell(new Cell().add(new Paragraph(offre.getTitre() != null ? offre.getTitre() : "—")));
                table.addCell(new Cell().add(new Paragraph(
                                s.getNombrePlaces() != null ? String.valueOf(s.getNombrePlaces()) : "—"))
                        .setTextAlignment(TextAlignment.CENTER));
            }
        }
        doc.add(table);
    }

    // Stagiaires pour l'année
    private void ajouterListeStagiairesAnnee(Document doc, int annee) {
        doc.add(new Paragraph("STAGIAIRES PFE AFFECTÉS — " + annee)
                .setFontSize(22).setBold()
                .setFontColor(ROUGE)
                .setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph("\n"));

        List<Candidature> stagiaires;
        try {
            stagiaires = candidatureRepository
                    .findByStatutAndOffre_Type(StatutCandidature.ACCEPTE, TypeOffre.STAGE_PFE)
                    .stream()
                    .filter(c -> c.getDateDecision() != null
                            && c.getDateDecision().getYear() == annee)
                    .toList();
        } catch (Exception e) {
            logger.error("❌ Erreur requête stagiaires: {}", e.getMessage(), e);
            stagiaires = List.of();
        }

        if (stagiaires.isEmpty()) {
            doc.add(new Paragraph("Aucun stagiaire PFE affecté pour l'année " + annee + ".")
                    .setFontSize(14).setItalic());
            return;
        }

        Table table = new Table(UnitValue.createPercentArray(new float[]{1, 2, 2, 3, 2}))
                .useAllAvailableWidth();

        String[] headers = {"N°", "Nom & Prénom", "École", "Sujet PFE", "Encadrant"};
        for (String h : headers) {
            Cell c = new Cell().add(new Paragraph(h).setBold().setFontColor(ColorConstants.WHITE));
            c.setBackgroundColor(ROUGE);
            c.setTextAlignment(TextAlignment.CENTER);
            table.addHeaderCell(c);
        }

        int num = 1;
        for (Candidature c : stagiaires) {
            String nom = c.getCandidat() != null
                    ? safe(c.getCandidat().getPrenom()) + " " + safe(c.getCandidat().getNom())
                    : "—";
            String ecole = c.getUniversite() != null ? c.getUniversite() : "—";
            String sujet = c.getOffre() != null && c.getOffre().getTitre() != null
                    ? c.getOffre().getTitre() : "—";
            String encadrant = c.getEncadrant() != null
                    ? safe(c.getEncadrant().getPrenom()) + " " + safe(c.getEncadrant().getNom())
                    : "Non affecté";

            table.addCell(new Cell().add(new Paragraph(String.valueOf(num++)))
                    .setTextAlignment(TextAlignment.CENTER));
            table.addCell(new Cell().add(new Paragraph(nom.trim())));
            table.addCell(new Cell().add(new Paragraph(ecole)));
            table.addCell(new Cell().add(new Paragraph(sujet)));
            table.addCell(new Cell().add(new Paragraph(encadrant.trim())));
        }
        doc.add(table);
    }

    @Transactional(readOnly = true)
    public List<Integer> getAnneesDisponibles() {
        return offreRepository.findByTypeWithSujets(TypeOffre.STAGE_PFE).stream()
                .map(o -> o.getDatePublication() != null ? o.getDatePublication().getYear()
                        : (o.getDateLimite() != null ? o.getDateLimite().getYear() : null))
                .filter(java.util.Objects::nonNull)
                .distinct()
                .sorted()
                .toList();
    }
}