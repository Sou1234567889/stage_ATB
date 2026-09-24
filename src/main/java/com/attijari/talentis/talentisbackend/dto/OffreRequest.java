package com.attijari.talentis.talentisbackend.dto;

import lombok.Data;
import java.util.List;

@Data
public class OffreRequest {
    private String titre;
    private String description;
    private String profilRecherche;
    private String departement;
    private String lieu;
    private Integer dureeEnMois;
    private String dateLimite;
    private String statut;
    private String type;


    // ✅ Champs PFE
    private String niveauEtudeRequis;
    private String specialiteRequise;
    private Integer nombrePlacesTotal;
    private String periodeStage;
    private String avantages;
    private String prerequis;
    private List<SujetPfeDto> sujets;
}