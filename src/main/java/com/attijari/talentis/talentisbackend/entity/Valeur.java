package com.attijari.talentis.talentisbackend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "valeurs")
public class Valeur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String titre;

    @Column(length = 500)
    private String description;

    private String icone;

    private Integer ordre;

    @Column(nullable = false)
    private Boolean actif = true;

    public Valeur() {}

    public Valeur(String titre, String description, String icone, Integer ordre, Boolean actif) {
        this.titre = titre;
        this.description = description;
        this.icone = icone;
        this.ordre = ordre;
        this.actif = actif;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getIcone() { return icone; }
    public void setIcone(String icone) { this.icone = icone; }

    public Integer getOrdre() { return ordre; }
    public void setOrdre(Integer ordre) { this.ordre = ordre; }

    public Boolean getActif() { return actif; }
    public void setActif(Boolean actif) { this.actif = actif; }
}