package com.attijari.talentis.talentisbackend.dto;

public class NouvelleCandidatureRequest {

    private Long candidatureId;
    private String offreTitre;
    private String candidatNom;
    private String candidatEmail;

    public NouvelleCandidatureRequest() {}

    public NouvelleCandidatureRequest(Long candidatureId, String offreTitre,
                                      String candidatNom, String candidatEmail) {
        this.candidatureId = candidatureId;
        this.offreTitre = offreTitre;
        this.candidatNom = candidatNom;
        this.candidatEmail = candidatEmail;
    }

    public Long getCandidatureId() { return candidatureId; }
    public String getOffreTitre() { return offreTitre; }
    public String getCandidatNom() { return candidatNom; }
    public String getCandidatEmail() { return candidatEmail; }

    public void setCandidatureId(Long candidatureId) { this.candidatureId = candidatureId; }
    public void setOffreTitre(String offreTitre) { this.offreTitre = offreTitre; }
    public void setCandidatNom(String candidatNom) { this.candidatNom = candidatNom; }
    public void setCandidatEmail(String candidatEmail) { this.candidatEmail = candidatEmail; }
}