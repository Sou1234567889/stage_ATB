package com.attijari.talentis.talentisbackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;   // ← AJOUT

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "utilisateur")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Utilisateur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;
    private String prenom;

    @Column(unique = true, nullable = false)
    private String email;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)   // ← AJOUT
    @Column(nullable = false)
    private String motDePasse;

    @Enumerated(EnumType.STRING)
    private Role role;

    private String poste;
    private String agence;

    @Column(unique = true, length = 20)
    private String numeroCin;
    private String cinRectoUrl;
    private String cinVersoUrl;

    private String photoProfilUrl;
    private String adresse;
    private String ville;
    private String pays = "Tunisie";
    private String telephone;

    private boolean actif = true;
    private LocalDateTime dateCreation = LocalDateTime.now();

    // 🆕 Réinitialisation de mot de passe
    @JsonIgnore
    @Column(name = "reset_token")
    private String resetToken;

    @JsonIgnore
    @Column(name = "reset_token_expiration")
    private LocalDateTime resetTokenExpiration;

    // Relations
    @JsonIgnore
    @OneToMany(mappedBy = "candidat")
    private List<Candidature> candidatures = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "encadrant")
    private List<Candidature> candidaturesEncadrees = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "encadrant")
    private List<Evaluation> evaluations = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "utilisateur")
    private List<Document> documents = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "expediteur")
    private List<Message> messagesEnvoyes = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "destinataire")
    private List<Message> messagesRecus = new ArrayList<>();
}