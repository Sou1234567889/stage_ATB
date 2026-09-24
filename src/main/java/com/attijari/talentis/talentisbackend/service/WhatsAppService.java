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
public class WhatsAppService {

    private static final Logger logger = LoggerFactory.getLogger(WhatsAppService.class);
    private final RestTemplate restTemplate;

    @Value("${green-api.instance-id:710522731231}")
    private String instanceId;

    @Value("${green-api.api-token:00bbad9f94d0474ead9436dbb254809305518f0a9dbd459292}")
    private String apiToken;

    @Value("${green-api.host:https://7105.api.greenapi.com}")
    private String host;

    public WhatsAppService() {
        this.restTemplate = new RestTemplate();
        logger.info("✅ WhatsApp Service initialisé avec instance: {}", instanceId);
    }

    /**
     * Envoie un message WhatsApp via l'API REST Green-API
     */
    public WhatsAppResult envoyerWhatsApp(String numeroTelephone, String message) {
        try {
            logger.info("📱 Demande d'envoi WhatsApp à: {}", numeroTelephone);

            // 1. Valider les paramètres
            if (numeroTelephone == null || numeroTelephone.isBlank()) {
                return new WhatsAppResult(false, "Numéro de téléphone invalide", null, null);
            }

            if (message == null || message.isBlank()) {
                return new WhatsAppResult(false, "Message invalide", null, null);
            }

            // 2. Nettoyer le numéro (format attendu: 216XXXXXXXX@c.us)
            String chatId = nettoyerNumero(numeroTelephone) + "@c.us";
            logger.info("📱 Chat ID: {}", chatId);

            // 3. Construire l'URL de l'API Green-API
            String url = String.format("%s/waInstance%s/sendMessage/%s",
                    host, instanceId, apiToken);
            logger.info("📤 URL: {}", url);

            // 4. Construire le body de la requête
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("chatId", chatId);
            requestBody.put("message", message);

            // 5. Configurer les headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            // 6. Envoyer la requête
            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            logger.info("📡 Code HTTP: {}", response.getStatusCode());
            logger.info("📄 Réponse: {}", response.getBody());

            // 7. Analyser la réponse
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map responseBody = response.getBody();

                // Vérifier si la réponse contient un idMessage
                if (responseBody.containsKey("idMessage")) {
                    String messageId = (String) responseBody.get("idMessage");
                    logger.info("✅ WhatsApp envoyé avec succès à {}", numeroTelephone);
                    logger.info("📝 ID Message: {}", messageId);
                    return new WhatsAppResult(true, "WhatsApp envoyé avec succès", numeroTelephone, messageId);
                } else {
                    logger.warn("⚠️ Réponse sans idMessage: {}", responseBody);
                    return new WhatsAppResult(false, "Erreur: réponse sans idMessage", numeroTelephone, null);
                }
            } else {
                logger.error("❌ Erreur envoi WhatsApp: {}", response.getBody());
                return new WhatsAppResult(false, "Erreur: " + response.getBody(), numeroTelephone, null);
            }

        } catch (Exception e) {
            logger.error("❌ Erreur envoi WhatsApp: {}", e.getMessage(), e);
            return new WhatsAppResult(false, "Erreur: " + e.getMessage(), numeroTelephone, null);
        }
    }

    /**
     * Envoie un message texte simple
     */
    public boolean envoyerMessage(String numeroTelephone, String message) {
        WhatsAppResult result = envoyerWhatsApp(numeroTelephone, message);
        return result.isSuccess();
    }

    /**
     * Nettoie le numéro de téléphone
     */
    private String nettoyerNumero(String numero) {
        if (numero == null) return null;

        // Supprimer les espaces, tirets, parenthèses
        String nettoye = numero.replaceAll("[\\s\\-()]", "");

        // Enlever le + si présent
        if (nettoye.startsWith("+")) {
            nettoye = nettoye.substring(1);
        }

        // Enlever le 00 si présent
        if (nettoye.startsWith("00")) {
            nettoye = nettoye.substring(2);
        }

        // Si le numéro a 8 chiffres, ajouter 216 (Tunisie)
        if (nettoye.matches("\\d{8}")) {
            return "216" + nettoye;
        }

        return nettoye;
    }

    /**
     * Vérifie le statut de la connexion
     */
    public boolean isConnected() {
        try {
            String url = String.format("%s/waInstance%s/getStateInstance/%s",
                    host, instanceId, apiToken);

            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String state = (String) response.getBody().get("stateInstance");
                return "authorized".equals(state);
            }
            return false;
        } catch (Exception e) {
            logger.error("❌ Erreur vérification statut: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Récupère les informations de l'instance
     */
    public Map<String, Object> getInstanceInfo() {
        try {
            String url = String.format("%s/waInstance%s/getSettings/%s",
                    host, instanceId, apiToken);

            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
            return Map.of("status", "Instance non disponible");
        } catch (Exception e) {
            return Map.of("error", e.getMessage());
        }
    }
    /**
     * 📱 Message de bienvenue après attribution de rôle
     */
    public void sendMessageBienvenue(String numeroTelephone, String prenom, String role) {
        String message = String.format(
                "Bonjour %s,\n\n" +
                        "🎉 Votre compte Attijari Talentis a été activé avec le rôle : %s.\n\n" +
                        "Connectez-vous : http://localhost:4200/login\n\n" +
                        "Cordialement,\n" +
                        "L'équipe Attijari Bank",
                prenom, role
        );
        envoyerMessage(numeroTelephone, message);
    }

    /**
     * 📱 Message de candidature acceptée
     */
    public void sendMessageCandidatureAcceptee(String numeroTelephone, String prenom, String offreTitre) {
        String message = String.format(
                "🎉 Bonjour %s,\n\n" +
                        "Félicitations ! Votre candidature pour le stage \"%s\" a été ACCEPTÉE.\n\n" +
                        "Connectez-vous à votre espace : http://localhost:4200/login\n\n" +
                        "Cordialement,\n" +
                        "L'équipe Attijari Talentis",
                prenom, offreTitre
        );
        envoyerMessage(numeroTelephone, message);
    }
    // =============================================
    // CLASSE INTERNE POUR LE RÉSULTAT
    // =============================================
    public static class WhatsAppResult {
        private final boolean success;
        private final String message;
        private final String phoneNumber;
        private final String messageId;

        public WhatsAppResult(boolean success, String message, String phoneNumber, String messageId) {
            this.success = success;
            this.message = message;
            this.phoneNumber = phoneNumber;
            this.messageId = messageId;
        }

        public boolean isSuccess() { return success; }
        public String getMessage() { return message; }
        public String getPhoneNumber() { return phoneNumber; }
        public String getMessageId() { return messageId; }
    }
}