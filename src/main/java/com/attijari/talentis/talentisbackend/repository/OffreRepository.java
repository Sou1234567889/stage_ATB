package com.attijari.talentis.talentisbackend.repository;

import com.attijari.talentis.talentisbackend.entity.Offre;
import com.attijari.talentis.talentisbackend.entity.StatutOffre;
import com.attijari.talentis.talentisbackend.entity.TypeOffre;
import com.attijari.talentis.talentisbackend.entity.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface OffreRepository extends JpaRepository<Offre, Long> {

    List<Offre> findByStatut(StatutOffre statut);
    List<Offre> findByStatutAndDateLimiteAfter(StatutOffre statut, LocalDate date);
    List<Offre> findByPublieParId(Long publieParId);
    List<Offre> findByDepartement(String departement);
    long countByStatut(StatutOffre statut);
    List<Offre> findByPubliePar(Utilisateur utilisateur);
    List<Offre> findByStatutAndType(StatutOffre statut, TypeOffre type);

    // ⭐ INDISPENSABLE pour le Book PFE
    @Query("SELECT DISTINCT o FROM Offre o LEFT JOIN FETCH o.sujets WHERE o.type = :type")
    List<Offre> findByTypeWithSujets(@Param("type") TypeOffre type);

    // ==================== BOOK PFE QUERIES ====================

    /**
     * Récupère toutes les années distinctes pour lesquelles des offres Book PFE (STAGE_PFE) existent.
     * Utilise la date de publication pour déterminer l'année.
     */
    @Query("SELECT DISTINCT YEAR(o.datePublication) FROM Offre o " +
            "WHERE o.type = :type AND o.datePublication IS NOT NULL " +
            "ORDER BY YEAR(o.datePublication) DESC")
    List<Integer> findDistinctAnneesByType(@Param("type") TypeOffre type);

    /**
     * Récupère toutes les offres Book PFE (STAGE_PFE) pour une année donnée,
     * avec leurs sujets chargés (JOIN FETCH pour éviter le problème N+1).
     */
    @Query("SELECT DISTINCT o FROM Offre o " +
            "LEFT JOIN FETCH o.sujets " +
            "WHERE o.type = :type AND YEAR(o.datePublication) = :annee " +
            "ORDER BY o.datePublication DESC")
    List<Offre> findByTypeAndAnneeWithSujets(@Param("type") TypeOffre type, @Param("annee") int annee);
}