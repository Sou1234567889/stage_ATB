package com.attijari.talentis.talentisbackend.entity;

public enum StatutCandidature {
    EN_ATTENTE,
    EN_ANALYSE,
    ENTRETIEN_PLANIFIE,
    ENTRETIEN_REALISE,
    ACCEPTE,
    REFUSE,
    // 🆕 Suivi du stage une fois la candidature acceptée (cf. cahier des charges §2)
    EN_COURS,
    TERMINEE
}