package com.attijari.talentis.talentisbackend.repository;

import com.attijari.talentis.talentisbackend.entity.AuditLog;
import com.attijari.talentis.talentisbackend.entity.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findTop50ByOrderByDateActionDesc();

    List<AuditLog> findAllByOrderByDateActionDesc();

    List<AuditLog> findByUtilisateurOrderByDateActionDesc(Utilisateur utilisateur);

    List<AuditLog> findByActionOrderByDateActionDesc(String action);
    void deleteByUtilisateur(Utilisateur utilisateur);
}