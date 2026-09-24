package com.attijari.talentis.talentisbackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "evaluation")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Evaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer noteCompetencesTechniques;
    private Integer noteSoftSkills;
    private Integer noteAutonomie;
    private Integer noteIntegration;
    private String appreciationGenerale;

    @Enumerated(EnumType.STRING)
    private Recommandation recommandation;

    private LocalDateTime dateEvaluation;

    @OneToOne
    @JoinColumn(name = "candidature_id")
    private Candidature candidature;

    @ManyToOne
    @JoinColumn(name = "encadrant_id")
    private Utilisateur encadrant;
}