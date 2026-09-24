package com.attijari.talentis.talentisbackend.controller;

import com.attijari.talentis.talentisbackend.service.SmsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/sms")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class SmsController {

    private static final Logger logger = LoggerFactory.getLogger(SmsController.class);
    private final SmsService smsService;

    public SmsController(SmsService smsService) {
        this.smsService = smsService;
    }

    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> sendSms(@RequestBody Map<String, String> request) {
        String phoneNumber = request.get("phoneNumber");
        String message = request.get("message");

        logger.info("📱 Demande d'envoi SMS vers: {}", phoneNumber);
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
            // Envoyer le SMS
            smsService.envoyerSms(phoneNumber, message);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "SMS envoyé avec succès");
            response.put("phoneNumber", phoneNumber);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("❌ Erreur lors de l'envoi du SMS: {}", e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Erreur serveur: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @GetMapping("/test")
    public ResponseEntity<Map<String, Object>> testSms(@RequestParam String phone) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "OK");
        response.put("phoneNumber", phone);
        response.put("service", "SMS Service disponible");

        // Envoyer un SMS de test
        smsService.envoyerSms(
                phone,
                "Test SMS depuis Attijari Talentis - " + java.time.LocalDateTime.now()
        );

        response.put("result", "Envoyé");
        response.put("message", "SMS de test envoyé");

        return ResponseEntity.ok(response);
    }
}