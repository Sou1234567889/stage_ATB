package com.attijari.talentis.talentisbackend.service;

import com.attijari.talentis.talentisbackend.entity.AuditLog;
import com.attijari.talentis.talentisbackend.entity.Utilisateur;
import com.attijari.talentis.talentisbackend.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void log(Utilisateur utilisateur, String action, String entite, Long entiteId, String ip) {
        try {
            AuditLog log = new AuditLog();

            // ⚠️ NE PAS MODIFIER l'utilisateur, juste utiliser ses données
            log.setUtilisateur(utilisateur);
            log.setAction(action);
            log.setEntiteConcernee(entite);
            log.setEntiteId(entiteId);
            log.setAdresseIp(ip);
            log.setDateAction(LocalDateTime.now());

            // ✅ SAUVEGARDER SEULEMENT LE LOG
            auditLogRepository.save(log);
            System.out.println("✅ Audit log créé: " + action);
        } catch (Exception e) {
            System.err.println("❌ Erreur création audit log: " + e.getMessage());
        }
    }
}