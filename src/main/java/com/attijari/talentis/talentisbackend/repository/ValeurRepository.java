package com.attijari.talentis.talentisbackend.repository;

import com.attijari.talentis.talentisbackend.entity.Valeur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ValeurRepository extends JpaRepository<Valeur, Long> {
    List<Valeur> findByActifTrueOrderByOrdreAsc();
}