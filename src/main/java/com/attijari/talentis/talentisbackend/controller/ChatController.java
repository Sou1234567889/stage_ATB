package com.attijari.talentis.talentisbackend.controller;

import com.attijari.talentis.talentisbackend.dto.ChatMessage;
import com.attijari.talentis.talentisbackend.dto.MessageRequest;
import com.attijari.talentis.talentisbackend.entity.Message;
import com.attijari.talentis.talentisbackend.service.ChatService;
import com.attijari.talentis.talentisbackend.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatService chatService;
    private final NotificationService notificationService;

    @Autowired
    public ChatController(SimpMessagingTemplate messagingTemplate,
                          ChatService chatService,
                          NotificationService notificationService) {
        this.messagingTemplate = messagingTemplate;
        this.chatService = chatService;
        this.notificationService = notificationService;
    }

    @GetMapping("/historique")
    public ResponseEntity<List<Message>> getHistorique(
            @RequestParam Long userId1,
            @RequestParam Long userId2) {
        List<Message> messages = chatService.getHistorique(userId1, userId2);
        return ResponseEntity.ok(messages);
    }

    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload ChatMessage chatMessage) {
        System.out.println("📨 [CHAT] Reçu de " + chatMessage.getExpediteurNom()
                + " (id=" + chatMessage.getExpediteurId() + ")"
                + " vers user " + chatMessage.getDestinataireId());

        try {
            MessageRequest request = new MessageRequest();
            request.setDestinataireId(chatMessage.getDestinataireId());
            request.setContenu(chatMessage.getContenu());
            chatService.saveMessage(request, chatMessage.getExpediteurId());
        } catch (Exception e) {
            System.err.println("⚠️ Erreur sauvegarde message: " + e.getMessage());
        }

        if (chatMessage.getDate() == null || chatMessage.getDate().isEmpty()) {
            chatMessage.setDate(LocalDateTime.now().toString());
        }
        if (chatMessage.getType() == null) {
            chatMessage.setType("CHAT");
        }

        messagingTemplate.convertAndSend(
                "/topic/messages/" + chatMessage.getDestinataireId(),
                chatMessage
        );
        messagingTemplate.convertAndSend(
                "/topic/messages/" + chatMessage.getExpediteurId(),
                chatMessage
        );

        // Notif sans emoji dans le titre
        try {
            String apercu = chatMessage.getContenu() != null
                    ? (chatMessage.getContenu().length() > 60
                       ? chatMessage.getContenu().substring(0, 60) + "..."
                       : chatMessage.getContenu())
                    : "";
            notificationService.creerNotification(
                    chatMessage.getDestinataireId(),
                    "Nouveau message",
                    chatMessage.getExpediteurNom() + " : « " + apercu + " »",
                    "MESSAGE"
            );
        } catch (Exception e) {
            System.err.println("⚠️ Erreur notif message: " + e.getMessage());
        }

        System.out.println("📤 [CHAT] Envoyé à /topic/messages/" + chatMessage.getDestinataireId());
    }

    @MessageMapping("/meet.start")
    public void startMeet(@Payload ChatMessage message) {
        System.out.println("📹 [MEET_START] Reçu de " + message.getExpediteurNom()
                + " (" + message.getExpediteurId() + ")"
                + " vers " + message.getDestinataireId());

        if (message.getDate() == null) {
            message.setDate(LocalDateTime.now().toString());
        }
        if (message.getType() == null) {
            message.setType("MEET_START");
        }

        messagingTemplate.convertAndSend(
                "/topic/meet/" + message.getDestinataireId(),
                message
        );

        // Notif sans emoji dans le titre
        try {
            notificationService.creerNotification(
                    message.getDestinataireId(),
                    "Appel vidéo entrant",
                    message.getExpediteurNom() + " vous appelle en visioconférence.",
                    "APPEL"
            );
            System.out.println("✅ Notif appel créée pour user " + message.getDestinataireId());
        } catch (Exception e) {
            System.err.println("⚠️ Erreur notif appel: " + e.getMessage());
        }

        System.out.println("📤 [MEET_START] Envoyé à /topic/meet/" + message.getDestinataireId());
    }

    @MessageMapping("/meet.end")
    public void endMeet(@Payload ChatMessage message) {
        System.out.println("📹 [MEET_END] Reçu de " + message.getExpediteurNom()
                + " (" + message.getExpediteurId() + ")"
                + " vers " + message.getDestinataireId());

        if (message.getDate() == null) {
            message.setDate(LocalDateTime.now().toString());
        }
        if (message.getType() == null) {
            message.setType("MEET_END");
        }

        messagingTemplate.convertAndSend(
                "/topic/meet/" + message.getDestinataireId(),
                message
        );

        // Notif sans emoji dans le titre
        try {
            notificationService.creerNotification(
                    message.getDestinataireId(),
                    "Visio terminée",
                    message.getExpediteurNom() + " a quitté la visioconférence.",
                    "APPEL"
            );
            System.out.println("✅ Notif fin d'appel créée pour user " + message.getDestinataireId());
        } catch (Exception e) {
            System.err.println("⚠️ Erreur notif fin appel: " + e.getMessage());
        }

        System.out.println("📤 [MEET_END] Envoyé à /topic/meet/" + message.getDestinataireId());
    }
}