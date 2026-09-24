package com.attijari.talentis.talentisbackend.service;

import com.attijari.talentis.talentisbackend.dto.MessageRequest;
import com.attijari.talentis.talentisbackend.entity.Message;
import com.attijari.talentis.talentisbackend.entity.Utilisateur;
import com.attijari.talentis.talentisbackend.repository.CandidatureRepository;
import com.attijari.talentis.talentisbackend.repository.MessageRepository;
import com.attijari.talentis.talentisbackend.repository.UtilisateurRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private static final Logger logger = LoggerFactory.getLogger(ChatService.class);

    private final MessageRepository messageRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final CandidatureRepository candidatureRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    public ChatService(MessageRepository messageRepository,
                       UtilisateurRepository utilisateurRepository,
                       CandidatureRepository candidatureRepository,
                       AuditLogService auditLogService,
                       NotificationService notificationService) {
        this.messageRepository = messageRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.candidatureRepository = candidatureRepository;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
    }

    public Message saveMessage(MessageRequest request, Long expediteurId) {
        Utilisateur expediteur = utilisateurRepository.findById(expediteurId)
                .orElseThrow(() -> new RuntimeException("Expéditeur non trouvé: " + expediteurId));

        Utilisateur destinataire = utilisateurRepository.findById(request.getDestinataireId())
                .orElseThrow(() -> new RuntimeException("Destinataire non trouvé: " + request.getDestinataireId()));

        Message message = new Message();
        message.setExpediteur(expediteur);
        message.setDestinataire(destinataire);
        message.setContenu(request.getContenu());
        message.setDateEnvoi(LocalDateTime.now());
        message.setLu(false);

        if (request.getCandidatureId() != null) {
            candidatureRepository.findById(request.getCandidatureId())
                    .ifPresent(message::setCandidature);
        }

        Message saved = messageRepository.save(message);

        // Audit log
        try {
            auditLogService.log(expediteur, "ENVOI_MESSAGE", "Message",
                    saved.getId(), "127.0.0.1");
        } catch (Exception e) {
            logger.warn("Audit log échoué: {}", e.getMessage());
        }

        // 🆕 NOTIFICATIONS
        try {
            String nomExp = expediteur.getPrenom() + " " + expediteur.getNom();
            String apercu = request.getContenu().length() > 60
                    ? request.getContenu().substring(0, 60) + "..."
                    : request.getContenu();

            // Notifier le destinataire
            notificationService.creerNotification(
                    destinataire,
                    "💬 Nouveau message",
                    nomExp + " : " + apercu,
                    "MESSAGE", "ENVOI_MESSAGE",
                    "Message", saved.getId(),
                    "/chat/" + expediteur.getId()
            );

            // Notifier tous les SUPER_ADMIN
            notificationService.creerNotificationPourAdmins(
                    "💬 Message échangé",
                    nomExp + " a envoyé un message à " + destinataire.getPrenom(),
                    "MESSAGE", "ENVOI_MESSAGE",
                    "Message", saved.getId(), "/chat"
            );
        } catch (Exception e) {
            logger.warn("Notification message échouée: {}", e.getMessage());
        }

        return saved;
    }

    public List<Message> getHistorique(Long userId1, Long userId2) {
        Utilisateur u1 = utilisateurRepository.findById(userId1)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        Utilisateur u2 = utilisateurRepository.findById(userId2)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        List<Message> messages = messageRepository.findByExpediteurAndDestinataire(u1, u2);
        messages.addAll(messageRepository.findByExpediteurAndDestinataire(u2, u1));

        return messages.stream()
                .sorted((a, b) -> a.getDateEnvoi().compareTo(b.getDateEnvoi()))
                .collect(Collectors.toList());
    }

    public List<Message> getMessagesNonLus(Long utilisateurId) {
        Utilisateur utilisateur = utilisateurRepository.findById(utilisateurId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        return messageRepository.findByDestinataireAndLuFalse(utilisateur);
    }

    public Message marquerCommeLu(Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message non trouvé"));
        message.setLu(true);
        return messageRepository.save(message);
    }
}