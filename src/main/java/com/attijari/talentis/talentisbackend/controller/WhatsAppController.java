package com.attijari.talentis.talentisbackend.controller;

import com.attijari.talentis.talentisbackend.service.WhatsAppService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/whatsapp")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class WhatsAppController {

    private static final Logger logger = LoggerFactory.getLogger(WhatsAppController.class);
    private final WhatsAppService whatsAppService;

    public WhatsAppController(WhatsAppService whatsAppService) {
        this.whatsAppService = whatsAppService;
    }

    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> sendWhatsApp(@RequestBody Map<String, String> request) {
        String phoneNumber = request.get("phoneNumber");
        String message = request.get("message");

        logger.info("📱 Demande d'envoi WhatsApp vers: {}", phoneNumber);
        logger.info("📝 Message: {}", message);

        // Validation
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Numéro de téléphone requis");
            return ResponseEntity.badRequest().body(error);
        }

        if (message == null || message.trim().isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Message requis");
            return ResponseEntity.badRequest().body(error);
        }

        try {
            WhatsAppService.WhatsAppResult result = whatsAppService.envoyerWhatsApp(phoneNumber, message);

            Map<String, Object> response = new HashMap<>();
            response.put("success", result.isSuccess());
            response.put("message", result.getMessage());
            response.put("phoneNumber", result.getPhoneNumber());
            response.put("messageId", result.getMessageId());

            if (result.isSuccess()) {
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.badRequest().body(response);
            }

        } catch (Exception e) {
            logger.error("❌ Erreur lors de l'envoi WhatsApp: {}", e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Erreur serveur: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @GetMapping("/test")
    public ResponseEntity<Map<String, Object>> testWhatsApp(@RequestParam String phone) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "OK");
        response.put("phoneNumber", phone);
        response.put("service", "WhatsApp Service disponible");
        response.put("isConnected", whatsAppService.isConnected());
        response.put("instanceInfo", whatsAppService.getInstanceInfo());

        // Envoyer un message de test
        boolean sent = whatsAppService.envoyerMessage(phone,
                "Test WhatsApp depuis Attijari Workspace - " + java.time.LocalDateTime.now());
        response.put("testMessageSent", sent);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        Map<String, Object> response = new HashMap<>();
        response.put("isConnected", whatsAppService.isConnected());
        response.put("instanceInfo", whatsAppService.getInstanceInfo());
        response.put("message", "Service WhatsApp opérationnel");
        return ResponseEntity.ok(response);
    }
}