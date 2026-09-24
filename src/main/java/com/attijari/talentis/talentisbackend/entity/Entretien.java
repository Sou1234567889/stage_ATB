package com.attijari.talentis.talentisbackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "entretien")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Entretien {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime dateHeure;
    private String lieuOuLien;
    private String compteRendu;

    @Enumerated(EnumType.STRING)
    private StatutEntretien statut = StatutEntretien.PLANIFIE;

    @OneToOne
    @JoinColumn(name = "candidature_id")
    private Candidature candidature;

    @ManyToOne
    @JoinColumn(name = "encadrant_id")
    private Utilisateur encadrant;
}