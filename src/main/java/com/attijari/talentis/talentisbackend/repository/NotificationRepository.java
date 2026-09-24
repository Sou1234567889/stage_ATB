package com.attijari.talentis.talentisbackend.repository;

import com.attijari.talentis.talentisbackend.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * Récupère les notifications d'un utilisateur, en chargeant l'utilisateur associé
     * dans la même requête pour éviter le problème N+1.
     */
    @Query("SELECT n FROM Notification n " +
            "JOIN FETCH n.utilisateur u " +
            "WHERE u.id = :utilisateurId " +
            "ORDER BY n.dateCreation DESC")
    List<Notification> findByUtilisateurIdOrderByDateCreationDesc(@Param("utilisateurId") Long utilisateurId);

    /**
     * Récupère les notifications non lues d'un utilisateur, avec l'utilisateur associé.
     */
    @Query("SELECT n FROM Notification n " +
            "JOIN FETCH n.utilisateur u " +
            "WHERE u.id = :utilisateurId AND n.lu = false " +
            "ORDER BY n.dateCreation DESC")
    List<Notification> findByUtilisateurIdAndLuFalseOrderByDateCreationDesc(@Param("utilisateurId") Long utilisateurId);

    /**
     * Compte le nombre de notifications non lues pour un utilisateur.
     */
    long countByUtilisateurIdAndLuFalse(@Param("utilisateurId") Long utilisateurId);

    // =============================================
    // 🆕 RÉCUPÉRER TOUTES LES NOTIFICATIONS
    // =============================================
    /**
     * Récupère TOUTES les notifications (tous utilisateurs confondus).
     * Utilise LEFT JOIN FETCH pour inclure les notifications sans utilisateur.
     */
    @Query("SELECT n FROM Notification n " +
            "LEFT JOIN FETCH n.utilisateur u " +
            "ORDER BY n.dateCreation DESC")
    List<Notification> findAllWithUtilisateurOrderByDateCreationDesc();

    // =============================================
    // 🆕 FILTRAGE PAR ACTION (pour l'admin)
    // =============================================

    /**
     * Récupère toutes les notifications filtrées par action.
     */
    @Query("SELECT n FROM Notification n " +
            "LEFT JOIN FETCH n.utilisateur u " +
            "WHERE n.action = :action " +
            "ORDER BY n.dateCreation DESC")
    List<Notification> findAllByActionOrderByDateCreationDesc(@Param("action") String action);

    /**
     * Récupère toutes les notifications filtrées par une liste d'actions.
     */
    @Query("SELECT n FROM Notification n " +
            "LEFT JOIN FETCH n.utilisateur u " +
            "WHERE n.action IN :actions " +
            "ORDER BY n.dateCreation DESC")
    List<Notification> findAllByActionsOrderByDateCreationDesc(@Param("actions") List<String> actions);

    /**
     * Récupère toutes les notifications filtrées par type.
     */
    @Query("SELECT n FROM Notification n " +
            "LEFT JOIN FETCH n.utilisateur u " +
            "WHERE n.type = :type " +
            "ORDER BY n.dateCreation DESC")
    List<Notification> findAllByTypeOrderByDateCreationDesc(@Param("type") String type);

    /**
     * Compte les notifications non lues pour un utilisateur (par utilisateurId natif).
     */
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.utilisateur.id = :utilisateurId AND n.lu = false")
    long countNonLuesByUtilisateurId(@Param("utilisateurId") Long utilisateurId);
}