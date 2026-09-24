package com.attijari.talentis.talentisbackend.dto;

public class ChatMessage {
    private Long expediteurId;
    private String expediteurNom;
    private Long destinataireId;
    private String contenu;
    private String date;
    private String type; // "CHAT", "MEET_START", "MEET_END"

    public ChatMessage() {}

    public ChatMessage(Long expediteurId, String expediteurNom, Long destinataireId,
                       String contenu, String date, String type) {
        this.expediteurId = expediteurId;
        this.expediteurNom = expediteurNom;
        this.destinataireId = destinataireId;
        this.contenu = contenu;
        this.date = date;
        this.type = type;
    }

    public Long getExpediteurId() { return expediteurId; }
    public void setExpediteurId(Long expediteurId) { this.expediteurId = expediteurId; }

    public String getExpediteurNom() { return expediteurNom; }
    public void setExpediteurNom(String expediteurNom) { this.expediteurNom = expediteurNom; }

    public Long getDestinataireId() { return destinataireId; }
    public void setDestinataireId(Long destinataireId) { this.destinataireId = destinataireId; }

    public String getContenu() { return contenu; }
    public void setContenu(String contenu) { this.contenu = contenu; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
}