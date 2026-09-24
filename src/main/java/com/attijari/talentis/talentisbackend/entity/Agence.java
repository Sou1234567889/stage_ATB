package com.attijari.talentis.talentisbackend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "agences")
public class Agence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nom;

    private String adresse;
    private String ville;
    private String telephone;
    private String horaires;

    @Column(nullable = false)
    private Boolean actif = true;

    public Agence() {}

    public Agence(String nom, String adresse, String ville, String telephone, String horaires, Boolean actif) {
        this.nom = nom;
        this.adresse = adresse;
        this.ville = ville;
        this.telephone = telephone;
        this.horaires = horaires;
        this.actif = actif;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }

    public String getAdresse() { return adresse; }
    public void setAdresse(String adresse) { this.adresse = adresse; }

    public String getVille() { return ville; }
    public void setVille(String ville) { this.ville = ville; }

    public String getTelephone() { return telephone; }
    public void setTelephone(String telephone) { this.telephone = telephone; }

    public String getHoraires() { return horaires; }
    public void setHoraires(String horaires) { this.horaires = horaires; }

    public Boolean getActif() { return actif; }
    public void setActif(Boolean actif) { this.actif = actif; }
}