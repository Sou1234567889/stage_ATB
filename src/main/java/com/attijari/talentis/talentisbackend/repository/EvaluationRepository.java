package com.attijari.talentis.talentisbackend.repository;

import com.attijari.talentis.talentisbackend.entity.Evaluation;
import com.attijari.talentis.talentisbackend.entity.Recommandation;
import com.attijari.talentis.talentisbackend.entity.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EvaluationRepository extends JpaRepository<Evaluation, Long> {

    // ✅ RETOURNE une List
    List<Evaluation> findByEncadrant(Utilisateur encadrant);

    // ✅ RETOURNE une List
    List<Evaluation> findByRecommandation(Recommandation recommandation);

    // ✅ RETOURNE un Evaluation (pas un Optional) - UNIQUE car 1 candidature = 1 evaluation
    Evaluation findByCandidatureId(Long candidatureId);

    // ✅ RETOURNE un Optional si on veut
    Optional<Evaluation> findFirstByCandidatureId(Long candidatureId);

    // ✅ RETOURNE un boolean
    boolean existsByCandidatureId(Long candidatureId);

    // ✅ RETOURNE une List
    List<Evaluation> findByEncadrantId(Long encadrantId);
}