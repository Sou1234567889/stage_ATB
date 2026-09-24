package com.attijari.talentis.talentisbackend.dto;

import lombok.Data;

@Data
public class EvaluationRequest {
    private Long candidatureId;
    private Integer noteCompetencesTechniques;
    private Integer noteSoftSkills;
    private Integer noteAutonomie;
    private Integer noteIntegration;
    private String appreciationGenerale;
    private String recommandation;
}