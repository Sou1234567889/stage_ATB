package com.attijari.talentis.talentisbackend.controller;

import com.attijari.talentis.talentisbackend.dto.LoginRequest;
import com.attijari.talentis.talentisbackend.dto.RegisterRequest;
import com.attijari.talentis.talentisbackend.entity.Role;
import com.attijari.talentis.talentisbackend.entity.Utilisateur;
import com.attijari.talentis.talentisbackend.repository.UtilisateurRepository;
import com.attijari.talentis.talentisbackend.service.AuthService;
import com.attijari.talentis.talentisbackend.service.AuditLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AuditLogService auditLogService;

    public AuthController(AuthService authService, AuditLogService auditLogService) {
        this.authService = authService;
        this.auditLogService = auditLogService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/mot-de-passe-oublie")
    public ResponseEntity<?> forgotPassword(@RequestParam String email) {
        return authService.forgotPassword(email);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestParam String token, @RequestParam String nouveauMotDePasse) {
        return authService.resetPassword(token, nouveauMotDePasse);
    }
}