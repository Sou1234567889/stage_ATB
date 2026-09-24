package com.attijari.talentis.talentisbackend.repository;

import com.attijari.talentis.talentisbackend.entity.ChiffreCle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChiffreCleRepository extends JpaRepository<ChiffreCle, Long> {
    List<ChiffreCle> findByActifTrueOrderByOrdreAsc();
}