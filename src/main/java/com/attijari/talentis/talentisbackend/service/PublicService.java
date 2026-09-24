package com.attijari.talentis.talentisbackend.service;

import com.attijari.talentis.talentisbackend.entity.*;
import com.attijari.talentis.talentisbackend.repository.*;
import org.springframework.stereotype.Service;


import java.util.List;

@Service
public class PublicService {

    private final OffreRepository offreRepository;
    private final ChiffreCleRepository chiffreCleRepository;
    private final ValeurRepository valeurRepository;
    private final AgenceRepository agenceRepository;

    public PublicService(OffreRepository offreRepository,
                         ChiffreCleRepository chiffreCleRepository,
                         ValeurRepository valeurRepository,
                         AgenceRepository agenceRepository) {
        this.offreRepository = offreRepository;
        this.chiffreCleRepository = chiffreCleRepository;
        this.valeurRepository = valeurRepository;
        this.agenceRepository = agenceRepository;
    }

    public List<Offre> getOffresOuvertes(TypeOffre type) {
        if (type != null) {
            return offreRepository.findByStatutAndType(StatutOffre.OUVERTE, type);
        }
        return offreRepository.findByStatut(StatutOffre.OUVERTE);
    }

    public List<ChiffreCle> getChiffresCles() {
        return chiffreCleRepository.findByActifTrueOrderByOrdreAsc();
    }

    public List<Valeur> getValeurs() {
        return valeurRepository.findByActifTrueOrderByOrdreAsc();
    }

    public List<Agence> getAgences() {
        return agenceRepository.findByActifTrueOrderByNomAsc();
    }
}