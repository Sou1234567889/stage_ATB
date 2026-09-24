package com.attijari.talentis.talentisbackend.dto;

import lombok.Data;

@Data
public class SujetPfeDto {
    private Long id;
    private String titre;
    private String description;
    private String technologies;
    private String competencesRequises;
    private Integer nombrePlaces;
    private String objectifs;
    private String livrables;
}