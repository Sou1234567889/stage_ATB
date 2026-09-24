package com.attijari.talentis.talentisbackend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

@Service
public class SmsService {

    private static final Logger logger = LoggerFactory.getLogger(SmsService.class);
    private final RestTemplate restTemplate;

    @Value("${attijari.sms.url:https://openbank.stb.com.tn/api/students/subscription/sendsms}")
    private String smsUrl;

    @Value("${attijari.sms.subscription-key:55c87b41825244d7b0299f66e3bda7f6}")
    private String subscriptionKey;

    @Value("${attijari.sms.sender-name:Attijari Talentis}")
    private String senderName;

    @Value("${attijari.sms.enabled:true}")
    private boolean smsEnabled;

    @Value("${attijari.sms.mock-mode:false}")
    private boolean mockMode;

    public SmsService() {
        this.restTemplate = new RestTemplate();
    }

    public void envoyerSms(String numeroTelephone, String message) {
        logger.info("📱 Envoi SMS à: {}", numeroTelephone);

        // 1. Vérifier si le service est activé
        if (!smsEnabled) {
            logger.warn("⚠️ Service SMS désactivé");
            return;
        }

        // 2. Valider les paramètres
        if (numeroTelephone == null || numeroTelephone.isBlank()) {
            logger.warn("⚠️ Numéro de téléphone invalide");
            return;
        }

        if (message == null || message.isBlank()) {
            logger.warn("⚠️ Message invalide");
            return;
        }

        // 3. Mode mock pour le développement
        if (mockMode) {
            logger.info("✅ [MOCK] SMS envoyé à {}: {}", numeroTelephone, message);
            return;
        }

        try {
            // 4. Normaliser le numéro
            String numeroNormalise = normaliserNumeroTunisien(numeroTelephone);
            logger.info("📱 Numéro normalisé: {}", numeroNormalise);

            // 5. Limiter le message à 160 caractères
            if (message.length() > 160) {
                message = message.substring(0, 157) + "...";
                logger.info("✂️ Message tronqué à 160 caractères");
            }

            // 6. Construire la requête comme dans Reclamation STB
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Ocp-Apim-Subscription-Key", subscriptionKey);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("phoneNumber", numeroNormalise);
            requestBody.put("message", message);
            requestBody.put("senderName", senderName);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            logger.info("📤 Envoi à: {}", smsUrl);
            logger.info("📤 Body: {}", requestBody);

            // 7. Envoyer la requête
            ResponseEntity<String> response = restTemplate.exchange(
                    smsUrl,
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            logger.info("📡 Code HTTP: {}", response.getStatusCode());
            logger.info("📄 Réponse: {}", response.getBody());

            // 8. Analyser la réponse
            if (response.getStatusCode() == HttpStatus.OK) {
                String responseBody = response.getBody();
                if (responseBody != null && responseBody.contains("Processed")) {
                    logger.info("✅ SMS envoyé avec succès à {}", numeroNormalise);
                } else {
                    logger.warn("⚠️ Réponse inattendue: {}", responseBody);
                }
            } else {
                logger.warn("⚠️ Réponse SMS non OK: {}", response.getStatusCode());
            }

        } catch (Exception e) {
            logger.error("❌ Erreur envoi SMS: {}", e.getMessage());
        }
    }

    /**
     * Normalise un numéro tunisien vers le format international +216XXXXXXXX.
     * Gère les formats courants saisis par les utilisateurs :
     *   "99250025"        -> "+21699250025"
     *   "0099250025"      -> "+21699250025"
     *   "21699250025"     -> "+21699250025"
     *   "+21699250025"    -> "+21699250025" (déjà correct, inchangé)
     *   "216 99 250 025"  -> "+21699250025" (espaces ignorés)
     */
    private String normaliserNumeroTunisien(String numero) {
        // On retire tout sauf les chiffres et le "+" initial éventuel
        String nettoye = numero.trim().replaceAll("[^0-9+]", "");

        if (nettoye.startsWith("+216")) {
            return nettoye;
        }
        if (nettoye.startsWith("00216")) {
            return "+216" + nettoye.substring(5);
        }
        if (nettoye.startsWith("216") && nettoye.length() == 11) {
            return "+" + nettoye;
        }
        if (nettoye.startsWith("+")) {
            // Un autre indicatif pays a déjà été saisi volontairement -> on ne touche pas
            return nettoye;
        }
        // Numéro local à 8 chiffres (ex: 99250025) -> on ajoute l'indicatif
        if (nettoye.length() == 8) {
            return "+216" + nettoye;
        }
        // Cas non reconnu : on renvoie tel quel, au moins loggé pour investigation
        logger.warn("⚠️ Format de numéro non reconnu, envoyé tel quel: {}", numero);
        return nettoye;
    }
}