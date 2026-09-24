package com.attijari.talentis.talentisbackend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "pointage")
public class Pointage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer heures;

    @Column(length = 500)
    private String commentaire;

    @Column(name = "date_pointage", nullable = false)
    private LocalDateTime datePointage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidature_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Candidature candidature;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pointe_par_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "motDePasse"})
    private Utilisateur pointePar;

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getHeures() { return heures; }
    public void setHeures(Integer heures) { this.heures = heures; }

    public String getCommentaire() { return commentaire; }
    public void setCommentaire(String commentaire) { this.commentaire = commentaire; }

    public LocalDateTime getDatePointage() { return datePointage; }
    public void setDatePointage(LocalDateTime datePointage) { this.datePointage = datePointage; }

    public Candidature getCandidature() { return candidature; }
    public void setCandidature(Candidature candidature) { this.candidature = candidature; }

    public Utilisateur getPointePar() { return pointePar; }
    public void setPointePar(Utilisateur pointePar) { this.pointePar = pointePar; }
}