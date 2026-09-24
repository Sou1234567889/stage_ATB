package com.attijari.talentis.talentisbackend.dto;

import lombok.Data;

@Data
public class EntretienRequest {
    private Long candidatureId;
    private String dateHeure;
    private String lieuOuLien;
    private String compteRendu;
}