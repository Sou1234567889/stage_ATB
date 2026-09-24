package com.attijari.talentis.talentisbackend.repository;

import com.attijari.talentis.talentisbackend.entity.Document;
import com.attijari.talentis.talentisbackend.entity.TypeDocument;
import com.attijari.talentis.talentisbackend.entity.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByUtilisateur(Utilisateur utilisateur);

    List<Document> findByCandidatureId(Long candidatureId);

    List<Document> findByUtilisateurAndType(Utilisateur utilisateur, TypeDocument type);

    boolean existsByUtilisateurIdAndType(Long utilisateurId, TypeDocument type);
}