package com.attijari.talentis.talentisbackend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "sujet_pfe")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SujetPfe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String titre;

    @Column(length = 3000)
    private String description;

    @Column(length = 1000)
    private String technologies;

    @Column(length = 1000)
    private String competencesRequises;

    private Integer nombrePlaces;

    @Column(length = 1500)
    private String objectifs;

    @Column(length = 1000)
    private String livrables;

    // ⭐ AJOUTER @JsonIgnore POUR ÉVITER LA BOUCLE INFINIE
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "offre_id", nullable = false)
    @JsonIgnore
    private Offre offre;
}