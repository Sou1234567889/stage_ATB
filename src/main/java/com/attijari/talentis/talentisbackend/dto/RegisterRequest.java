package com.attijari.talentis.talentisbackend.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String nom;
    private String prenom;
    private String email;
    private String motDePasse;
    private String numeroCin;
    private String adresse;
    private String ville;
    private String pays;
    private String telephone;
}