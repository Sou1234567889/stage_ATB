package com.attijari.talentis.talentisbackend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "offre")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Offre {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String titre;
    private String description;
    private String profilRecherche;
    private String departement;
    private String lieu;
    private Integer dureeEnMois;
    private LocalDate dateLimite;
    private LocalDate datePublication;

    @Enumerated(EnumType.STRING)
    private StatutOffre statut = StatutOffre.OUVERTE;

    @Enumerated(EnumType.STRING)
    private TypeOffre type = TypeOffre.STAGE;

    @ManyToOne
    @JoinColumn(name = "publie_par_id")
    @JsonIgnoreProperties({"candidatures", "offres", "motDePasse", "cinRectoUrl", "cinVersoUrl", "photoProfilUrl"})
    private Utilisateur publiePar;

    @OneToMany(mappedBy = "offre")
    @JsonIgnore
    private List<Candidature> candidatures = new ArrayList<>();

    // ==========================================
    // 🎓 CHAMPS SPÉCIFIQUES AUX STAGES PFE
    // ==========================================

    @Column(length = 200)
    private String niveauEtudeRequis;      // Ex: "Bac+3", "Bac+5"

    @Column(length = 300)
    private String specialiteRequise;      // Ex: "Informatique"

    private Integer nombrePlacesTotal;     // Ex: 5 stagiaires

    @Column(length = 200)
    private String periodeStage;           // Ex: "Février 2026 - Juillet 2026"

    @Column(length = 1000)
    private String avantages;              // Ex: "Indemnité, Transport"

    @Column(length = 1000)
    private String prerequis;              // Ex: "Autonomie, Esprit d'analyse"

    // ==========================================
    // 📚 LISTE DES SUJETS PFE
    // ==========================================

    @OneToMany(mappedBy = "offre", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<SujetPfe> sujets = new ArrayList<>();

    // Helper pour ajouter un sujet
    public void addSujet(SujetPfe sujet) {
        sujets.add(sujet);
        sujet.setOffre(this);
    }

    public void clearSujets() {
        for (SujetPfe s : sujets) {
            s.setOffre(null);
        }
        sujets.clear();
    }
}