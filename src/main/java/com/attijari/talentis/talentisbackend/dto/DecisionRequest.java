package com.attijari.talentis.talentisbackend.dto;

import lombok.Data;

@Data
public class DecisionRequest {
    private Long candidatureId;
    private String decision;
    private String commentaire;
}