package com.attijari.talentis.talentisbackend.config;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * Filet de sécurité global : quelle que soit l'exception qui survient
 * (y compris hors des try/catch des contrôleurs, par exemple au moment
 * du flush/commit d'une transaction @Transactional), elle est
 * systématiquement transformée en réponse JSON avec un champ "message"
 * non vide.
 *
 * Sans ceci, une exception qui échappe à un try/catch de contrôleur
 * produit la page d'erreur par défaut de Spring Boot, dont le champ
 * "message" est vide par défaut (server.error.include-message=never) —
 * ce qui, côté Angular, déclenchait un message générique du type
 * "Impossible d'attribuer le rôle." au lieu de la vraie cause.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> handleDataIntegrityViolation(DataIntegrityViolationException e) {
        Throwable racine = racineDe(e);
        System.err.println("❌ Contrainte base de données violée: " + racine.getMessage());
        e.printStackTrace();

        Map<String, String> error = new HashMap<>();
        error.put("message", "Contrainte base de données violée : " + racine.getMessage());
        error.put("success", "false");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGenericException(Exception e) {
        Throwable racine = racineDe(e);
        System.err.println("❌ Exception non gérée: " + racine.getMessage());
        e.printStackTrace();

        Map<String, String> error = new HashMap<>();
        error.put("message", "Erreur serveur : " + racine.getMessage());
        error.put("success", "false");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    private Throwable racineDe(Throwable t) {
        Throwable racine = t;
        while (racine.getCause() != null && racine.getCause() != racine) {
            racine = racine.getCause();
        }
        return racine;
    }
}
