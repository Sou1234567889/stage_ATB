package com.attijari.talentis.talentisbackend.dto;

import lombok.Data;

@Data
public class LivrableRequest {
    private String titre;
    private String description;
    private String lienFichier;
    private Long candidatureId;
}