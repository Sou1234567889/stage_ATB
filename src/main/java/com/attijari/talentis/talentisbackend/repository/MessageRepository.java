package com.attijari.talentis.talentisbackend.repository;

import com.attijari.talentis.talentisbackend.entity.Message;
import com.attijari.talentis.talentisbackend.entity.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    /**
     * Messages entre deux utilisateurs (expéditeur → destinataire).
     */
    List<Message> findByExpediteurAndDestinataire(Utilisateur expediteur, Utilisateur destinataire);

    /**
     * Messages non lus d'un destinataire.
     */
    List<Message> findByDestinataireAndLuFalse(Utilisateur destinataire);

    /**
     * Messages liés à une candidature.
     */
    List<Message> findByCandidatureId(Long candidatureId);

    /**
     * Messages reçus par un utilisateur, triés par date décroissante.
     */
    List<Message> findByDestinataireOrderByDateEnvoiDesc(Utilisateur destinataire);

    /**
     * Nombre de messages non lus.
     */
    long countByDestinataireAndLuFalse(Utilisateur destinataire);
}