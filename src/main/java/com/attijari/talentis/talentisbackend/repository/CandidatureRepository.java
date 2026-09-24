package com.attijari.talentis.talentisbackend.repository;

import com.attijari.talentis.talentisbackend.entity.Candidature;
import com.attijari.talentis.talentisbackend.entity.StatutCandidature;
import com.attijari.talentis.talentisbackend.entity.TypeOffre;
import com.attijari.talentis.talentisbackend.entity.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CandidatureRepository extends JpaRepository<Candidature, Long> {

    List<Candidature> findByCandidat(Utilisateur candidat);

    List<Candidature> findByEncadrant(Utilisateur encadrant);

    List<Candidature> findByOffreId(Long offreId);

    List<Candidature> findByStatut(StatutCandidature statut);

    List<Candidature> findByCandidatAndStatut(Utilisateur candidat, StatutCandidature statut);

    List<Candidature> findByEncadrantAndStatut(Utilisateur encadrant, StatutCandidature statut);
    List<Candidature> findByStatutAndOffre_Type(StatutCandidature statut, TypeOffre type);

    long countByStatut(StatutCandidature statut);

    long countByCandidatId(Long candidatId);

    boolean existsByCandidatIdAndOffreId(Long candidatId, Long offreId);

    // =============================================
    // 🆕 RÉCUPÉRER UNIQUEMENT LES STAGES ENCADRÉS
    // =============================================

    /**
     * Récupère uniquement les candidatures de TYPE STAGE encadrées par cet encadrant.
     * Exclut automatiquement les candidatures d'EMPLOI.
     */
    @Query("SELECT c FROM Candidature c " +
            "WHERE c.encadrant.id = :encadrantId " +
            "AND c.offre.type = com.attijari.talentis.talentisbackend.entity.TypeOffre.STAGE " +
            "ORDER BY c.dateDepot DESC")
    List<Candidature> findStagesByEncadrant(@Param("encadrantId") Long encadrantId);

    /**
     * Idem mais avec un statut spécifique (ex: ACCEPTE, EN_COURS, TERMINEE)
     */
    @Query("SELECT c FROM Candidature c " +
            "WHERE c.encadrant.id = :encadrantId " +
            "AND c.offre.type = com.attijari.talentis.talentisbackend.entity.TypeOffre.STAGE " +
            "AND c.statut = :statut " +
            "ORDER BY c.dateDepot DESC")
    List<Candidature> findStagesByEncadrantAndStatut(
            @Param("encadrantId") Long encadrantId,
            @Param("statut") StatutCandidature statut
    );
}