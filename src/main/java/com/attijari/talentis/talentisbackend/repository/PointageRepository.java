package com.attijari.talentis.talentisbackend.repository;

import com.attijari.talentis.talentisbackend.entity.Pointage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PointageRepository extends JpaRepository<Pointage, Long> {

    @Query("SELECT COALESCE(SUM(p.heures), 0) FROM Pointage p WHERE p.candidature.id = :candidatureId")
    int sumHeuresByCandidatureId(@Param("candidatureId") Long candidatureId);

    List<Pointage> findByCandidatureIdOrderByDatePointageDesc(Long candidatureId);
}