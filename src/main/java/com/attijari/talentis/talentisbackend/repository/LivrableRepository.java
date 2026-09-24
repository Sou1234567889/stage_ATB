package com.attijari.talentis.talentisbackend.repository;

import com.attijari.talentis.talentisbackend.entity.Candidature;
import com.attijari.talentis.talentisbackend.entity.Livrable;
import com.attijari.talentis.talentisbackend.entity.StatutLivrable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LivrableRepository extends JpaRepository<Livrable, Long> {

    // ✅ Méthode correcte
    List<Livrable> findByCandidatureId(Long candidatureId);

    List<Livrable> findByStatut(StatutLivrable statut);


    List<Livrable> findByCandidatureIdAndStatut(Long candidatureId, StatutLivrable statut);
    void deleteByCandidature(Candidature candidature);
}