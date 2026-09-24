package com.attijari.talentis.talentisbackend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "convention")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Convention {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "candidature_id")
    private Candidature candidature;

    private LocalDate dateDebut;
    private LocalDate dateFin;
    private String fichierUrl;

    @Enumerated(EnumType.STRING)
    private StatutConvention statut = StatutConvention.EN_PREPARATION;

    private LocalDateTime dateGeneration = LocalDateTime.now();
    private LocalDateTime dateSignature;
}
