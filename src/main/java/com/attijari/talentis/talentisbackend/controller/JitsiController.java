package com.attijari.talentis.talentisbackend.controller;

import com.attijari.talentis.talentisbackend.service.JitsiTokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/jitsi")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class JitsiController {

    private final JitsiTokenService jitsiTokenService;

    public JitsiController(JitsiTokenService jitsiTokenService) {
        this.jitsiTokenService = jitsiTokenService;
    }

    /**
     * POST /api/jitsi/token
     * Body: { userId, userName, userEmail, isModerator }
     * Response: { token: "..." }
     */
    @PostMapping("/token")
    public ResponseEntity<?> getToken(@RequestBody Map<String, Object> body) {
        try {
            String userId = (String) body.getOrDefault("userId", "user-" + System.currentTimeMillis());
            String userName = (String) body.getOrDefault("userName", "Utilisateur");
            String userEmail = (String) body.getOrDefault("userEmail", "");
            Boolean isModerator = (Boolean) body.getOrDefault("isModerator", false);

            String token = jitsiTokenService.genererToken(userId, userName, userEmail, isModerator);
            return ResponseEntity.ok(Map.of("token", token));

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}