package com.attijari.talentis.talentisbackend.service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.*;

@Service
public class JitsiTokenService {

    private static final Logger logger = LoggerFactory.getLogger(JitsiTokenService.class);

    // ⚠️ TES VALEURS JaaS
    private static final String APP_ID = "vpaas-magic-cookie-8fbadb6a92694bd2983e200fbc8be6a2";
    private static final String KID = "vpaas-magic-cookie-8fbadb6a92694bd2983e200fbc8be6a2/4ee40f";
    private static final String PRIVATE_KEY_FILE = "jaas-private-key.pk";

    /**
     * Génère un JWT signé pour JaaS
     */
    public String genererToken(String userId, String userName, String userEmail, boolean isModerator) {
        try {
            PrivateKey privateKey = chargerClePrivee();

            Map<String, Object> headers = new HashMap<>();
            headers.put("kid", KID);
            headers.put("typ", "JWT");
            headers.put("alg", "RS256");

            Map<String, Object> user = new HashMap<>();
            user.put("id", userId);
            user.put("name", userName);
            user.put("email", userEmail);
            user.put("avatar", "");
            user.put("moderator", isModerator);

            Map<String, Object> context = new HashMap<>();
            context.put("user", user);

            Map<String, Object> features = new HashMap<>();
            features.put("livestreaming", false);
            features.put("recording", false);
            features.put("transcription", false);
            features.put("outbound-call", false);

            long now = System.currentTimeMillis() / 1000;

            Map<String, Object> payload = new HashMap<>();
            payload.put("aud", "jitsi");
            payload.put("iss", "chat");
            payload.put("sub", APP_ID);
            payload.put("room", "*");
            payload.put("exp", now + 7200);
            payload.put("nbf", now - 10);
            payload.put("context", context);
            payload.put("features", features);

            String token = Jwts.builder()
                    .setHeader(headers)
                    .setClaims(payload)
                    .signWith(privateKey, SignatureAlgorithm.RS256)
                    .compact();

            logger.info("✅ JWT Jitsi généré pour user: {}", userId);
            return token;

        } catch (Exception e) {
            logger.error("❌ Erreur génération JWT Jitsi: {}", e.getMessage(), e);
            throw new RuntimeException("Erreur génération JWT Jitsi", e);
        }
    }

    /**
     * Charge la clé privée depuis resources/
     */
    private PrivateKey chargerClePrivee() throws Exception {
        ClassPathResource resource = new ClassPathResource(PRIVATE_KEY_FILE);
        try (InputStream is = resource.getInputStream()) {
            String pem = new String(is.readAllBytes(), StandardCharsets.UTF_8);

            String privateKeyPEM = pem
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s", "");

            byte[] decoded = Base64.getDecoder().decode(privateKeyPEM);
            PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(decoded);
            KeyFactory kf = KeyFactory.getInstance("RSA");
            return kf.generatePrivate(spec);
        }
    }
}