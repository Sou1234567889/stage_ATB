package com.attijari.talentis.talentisbackend.repository;

import com.attijari.talentis.talentisbackend.entity.Role;
import com.attijari.talentis.talentisbackend.entity.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {

    Optional<Utilisateur> findByEmail(String email);

    Optional<Utilisateur> findByNumeroCin(String numeroCin);

    Optional<Utilisateur> findByResetToken(String resetToken);

    // ✅ UNE SEULE méthode findByRole (avec l'enum)
    List<Utilisateur> findByRole(Role role);

    List<Utilisateur> findByActifFalse();

    List<Utilisateur> findByActifTrue();

    boolean existsByEmail(String email);

    @Modifying
    @Transactional
    @Query("UPDATE Utilisateur u SET u.role = :role, u.actif = true WHERE u.id = :id")
    int updateRoleAndActif(@Param("id") Long id, @Param("role") Role role);
}