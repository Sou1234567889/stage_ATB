package com.attijari.talentis.talentisbackend.repository;

import com.attijari.talentis.talentisbackend.entity.Entretien;
import com.attijari.talentis.talentisbackend.entity.StatutEntretien;
import com.attijari.talentis.talentisbackend.entity.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EntretienRepository extends JpaRepository<Entretien, Long> {

    // ✅ RETOURNE une List (peut y avoir plusieurs entretiens pour une candidature)
    List<Entretien> findByCandidatureId(Long candidatureId);

    // ✅ RETOURNE un Optional (un seul entretien)
    Optional<Entretien> findFirstByCandidatureIdOrderByDateHeureDesc(Long candidatureId);

    // ✅ RETOURNE une List
    List<Entretien> findByEncadrant(Utilisateur encadrant);

    // ✅ RETOURNE une List
    List<Entretien> findByStatut(StatutEntretien statut);

    // ✅ RETOURNE une List
    List<Entretien> findByDateHeureBetween(LocalDateTime debut, LocalDateTime fin);

    // ✅ RETOURNE un boolean
    boolean existsByCandidatureId(Long candidatureId);

    // ✅ RETOURNE un Optional
    Optional<Entretien> findByCandidatureIdAndStatut(Long candidatureId, StatutEntretien statut);
}