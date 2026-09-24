package com.attijari.talentis.talentisbackend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "candidature")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Candidature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "candidat_id")
    @JsonIgnoreProperties({"candidatures", "offres", "motDePasse", "cinRectoUrl", "cinVersoUrl", "photoProfilUrl"})
    private Utilisateur candidat;

    @ManyToOne
    @JoinColumn(name = "encadrant_id")
    @JsonIgnoreProperties({"candidatures", "offres", "motDePasse", "cinRectoUrl", "cinVersoUrl", "photoProfilUrl"})
    private Utilisateur encadrant;

    @ManyToOne
    @JoinColumn(name = "offre_id")
    @JsonIgnoreProperties({"candidatures", "publiePar"})
    private Offre offre;

    @Enumerated(EnumType.STRING)
    private StatutCandidature statut = StatutCandidature.EN_ATTENTE;

    private String lettreMotivation;
    private String commentaireDecision;
    private LocalDateTime dateDepot;
    private LocalDateTime dateDecision;

    // =============================================
    // 🆕 CHAMPS AJOUTÉS (formulaire de postulation)
    // =============================================
    @Column(name = "telephone")
    private String telephone;

    @Column(name = "niveau_etude")
    private String niveauEtude;

    @Column(name = "universite")
    private String universite;

    // =============================================
    // RELATIONS
    // =============================================
    @OneToMany(mappedBy = "candidature")
    @JsonIgnore
    private List<Document> documents = new ArrayList<>();

    @OneToOne(mappedBy = "candidature")
    @JsonIgnore
    private Entretien entretien;

    @OneToOne(mappedBy = "candidature")
    @JsonIgnore
    private Evaluation evaluation;

    @OneToMany(mappedBy = "candidature")
    @JsonIgnore
    private List<Livrable> livrables = new ArrayList<>();
}