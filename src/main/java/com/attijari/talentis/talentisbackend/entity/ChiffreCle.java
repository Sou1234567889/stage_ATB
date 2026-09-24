package com.attijari.talentis.talentisbackend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "chiffres_cles")
public class ChiffreCle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String libelle;

    @Column(nullable = false)
    private String valeur;

    private String icone;

    private Integer ordre;

    @Column(nullable = false)
    private Boolean actif = true;

    public ChiffreCle() {}

    public ChiffreCle(String libelle, String valeur, String icone, Integer ordre, Boolean actif) {
        this.libelle = libelle;
        this.valeur = valeur;
        this.icone = icone;
        this.ordre = ordre;
        this.actif = actif;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getLibelle() { return libelle; }
    public void setLibelle(String libelle) { this.libelle = libelle; }

    public String getValeur() { return valeur; }
    public void setValeur(String valeur) { this.valeur = valeur; }

    public String getIcone() { return icone; }
    public void setIcone(String icone) { this.icone = icone; }

    public Integer getOrdre() { return ordre; }
    public void setOrdre(Integer ordre) { this.ordre = ordre; }

    public Boolean getActif() { return actif; }
    public void setActif(Boolean actif) { this.actif = actif; }
}