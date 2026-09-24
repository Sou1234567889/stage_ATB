package com.attijari.talentis.talentisbackend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "notification")
@Getter
@Setter
@NoArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String titre;

    @Column(columnDefinition = "TEXT")
    private String message;

    private String type; // 'info' | 'success' | 'warning' | 'error' | 'auth' | 'offre' ...

    private String action;

    private boolean lu = false;

    private LocalDateTime dateCreation = LocalDateTime.now();

    @ManyToOne
    @JoinColumn(name = "utilisateur_id")
    private Utilisateur utilisateur;

    private String entiteConcernee;

    private Long entiteId;

    private String url;

    public Notification(String titre, String message, String type, String action, Utilisateur utilisateur, String entiteConcernee, Long entiteId, String url) {
        this.titre = titre;
        this.message = message;
        this.type = type;
        this.action = action;
        this.utilisateur = utilisateur;
        this.entiteConcernee = entiteConcernee;
        this.entiteId = entiteId;
        this.url = url;
        this.dateCreation = LocalDateTime.now();
        this.lu = false;
    }
}
