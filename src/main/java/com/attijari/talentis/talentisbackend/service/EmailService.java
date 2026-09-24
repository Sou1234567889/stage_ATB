package com.attijari.talentis.talentisbackend.service;

import com.attijari.talentis.talentisbackend.dto.NouvelleCandidatureRequest;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    private final JavaMailSender mailSender;

    private static final String FROM_EMAIL = "souha.said@sesame.com.tn";
    private static final String RH_EMAIL = "souha.said@sesame.com.tn";
    private static final String RESPONSABLE_RH_EMAIL = "souha.said@sesame.com.tn";

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    // =============================================
    // MÉTHODE GÉNÉRIQUE (existante)
    // =============================================
    public void sendEmail(String to, String subject, String body) {
        try {
            if (to == null || to.isBlank()) {
                logger.warn("⚠️ Email non envoyé : Destinataire vide");
                return;
            }

            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            message.setFrom(FROM_EMAIL);

            logger.info("📧 Envoi d'email à: {}", to);
            mailSender.send(message);
            logger.info("✅ Email envoyé avec succès à {}", to);

        } catch (Exception e) {
            logger.error("❌ Erreur envoi email à {}: {}", to, e.getMessage());
        }
    }

    // =============================================
    // 1️⃣ NOUVELLE CANDIDATURE → RH + Responsable RH
    // =============================================
    public void sendNouvelleCandidatureRH(NouvelleCandidatureRequest request) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(RH_EMAIL, RESPONSABLE_RH_EMAIL);
            message.setSubject("🔔 Nouvelle candidature : " + request.getOffreTitre());
            message.setText(
                    "Bonjour,\n\n" +
                            "Une nouvelle candidature a été déposée sur la plateforme Attijari Talentis.\n\n" +
                            "👤 Candidat : " + request.getCandidatNom() + "\n" +
                            "📧 Email    : " + request.getCandidatEmail() + "\n" +
                            "💼 Offre    : " + request.getOffreTitre() + "\n\n" +
                            "Connectez-vous au dashboard pour traiter cette candidature.\n\n" +
                            "Cordialement,\n" +
                            "L'équipe Attijari Talentis"
            );
            message.setFrom(FROM_EMAIL);

            mailSender.send(message);
            logger.info("✅ Email nouvelle candidature envoyé aux RH pour: {}", request.getOffreTitre());

        } catch (Exception e) {
            logger.error("❌ Erreur envoi email RH: {}", e.getMessage());
        }
    }

    // =============================================
    // 2️⃣ CANDIDATURE ACCEPTÉE → Stagiaire
    // =============================================
    public void sendCandidatureAcceptee(String to, String prenom, String offreTitre) {
        try {
            if (to == null || to.isBlank()) {
                logger.warn("⚠️ Email acceptation non envoyé : Destinataire vide");
                return;
            }

            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject("🎉 Félicitations ! Votre candidature est acceptée");
            message.setText(
                    "Bonjour " + prenom + ",\n\n" +
                            "🎉 Félicitations !\n\n" +
                            "Nous avons le plaisir de vous informer que votre candidature pour le stage :\n" +
                            "📌 \"" + offreTitre + "\"\n\n" +
                            "a été ACCEPTÉE.\n\n" +
                            "📱 Un message WhatsApp vous a également été envoyé avec les détails.\n\n" +
                            "Prochaines étapes :\n" +
                            "1. Connectez-vous à votre espace : http://localhost:4200/login\n" +
                            "2. Complétez votre profil\n" +
                            "3. Consultez les informations de votre stage\n\n" +
                            "Bienvenue dans l'équipe Attijari Talentis !\n\n" +
                            "Cordialement,\n" +
                            "L'équipe RH Attijari Bank"
            );
            message.setFrom(FROM_EMAIL);

            mailSender.send(message);
            logger.info("✅ Email acceptation envoyé à {}", to);

        } catch (Exception e) {
            logger.error("❌ Erreur envoi email acceptation à {}: {}", to, e.getMessage());
        }
    }

    // =============================================
    // 3️⃣ CANDIDATURE REFUSÉE → Stagiaire
    // =============================================
    public void sendCandidatureRefusee(String to, String prenom, String offreTitre) {
        try {
            if (to == null || to.isBlank()) {
                logger.warn("⚠️ Email refus non envoyé : Destinataire vide");
                return;
            }

            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject("Candidature pour le stage \"" + offreTitre + "\"");
            message.setText(
                    "Bonjour " + prenom + ",\n\n" +
                            "Nous vous remercions pour l'intérêt que vous portez à Attijari Bank.\n\n" +
                            "Nous avons bien étudié votre candidature pour le stage :\n" +
                            "📌 \"" + offreTitre + "\"\n\n" +
                            "Malheureusement, nous ne pouvons pas y donner une suite favorable.\n\n" +
                            "Nous vous encourageons à postuler à de futures opportunités.\n\n" +
                            "Nous vous souhaitons plein succès dans vos recherches.\n\n" +
                            "Cordialement,\n" +
                            "L'équipe RH Attijari Bank"
            );
            message.setFrom(FROM_EMAIL);

            mailSender.send(message);
            logger.info("✅ Email refus envoyé à {}", to);

        } catch (Exception e) {
            logger.error("❌ Erreur envoi email refus à {}: {}", to, e.getMessage());
        }
    }
}