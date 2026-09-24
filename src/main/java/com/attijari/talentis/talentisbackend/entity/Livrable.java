package com.attijari.talentis.talentisbackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "livrable")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Livrable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String titre;
    private String description;
    private String fichierUrl;

    @Enumerated(EnumType.STRING)
    private StatutLivrable statut = StatutLivrable.SOUMIS;

    private String commentaireEncadrant;
    private LocalDateTime dateSoumission;
    private LocalDateTime dateRevision;

    // 🆕 Historique de versions
    private Integer version = 1;

    // 🆕 Fichier de correction renvoyé par l'encadrant au stagiaire
    // (chemin relatif, ex: "/uploads/livrables/correction_17_xxx.pdf")
    @Column(name = "fichier_correction_url")
    private String fichierCorrectionUrl;

    // 🆕 Date d'envoi de la correction (peut différer de dateRevision)
    @Column(name = "date_correction")
    private LocalDateTime dateCorrection;

    @ManyToOne
    @JoinColumn(name = "candidature_id")
    private Candidature candidature;
}