# Vulnerabilities Overview

## 1. Password Reset Poisoning
- Surface: `POST /api/auth/forgot-password`
- Explication: l'application construit le lien de reset a partir de headers comme `Host` ou `X-Forwarded-Host`, ce qui permet de faire generer un lien de recuperation pointant vers une destination controlee par l'attaquant.

## 2. HTTP Parameter Pollution
- Surface: `POST /api/auth/forgot-password`
- Explication: plusieurs parametres `email` peuvent etre interpretes differemment dans le meme flux, ce qui permet de preparer le reset pour une victime tout en faisant livrer ou journaliser le message dans une autre mailbox.

## 3. BOLA / IDOR sur les demandes de formation
- Surface: `GET /api/trainings/requests/:requestId`
- Explication: le detail d'une demande de formation peut etre consulte via un identifiant direct sans verification stricte de propriete, ce qui expose des objets metier a d'autres utilisateurs authentifies.

## 4. Race Condition sur la confirmation de formation
- Surface: `POST /api/trainings/:id/confirm`
- Explication: des requetes paralleles sur la confirmation peuvent forcer l'ouverture d'un acces avant la validation manager attendue.

## 5. SSRF / Server-Side XSS dans l'aperçu de certificat
- Surface: `POST /api/trainings/:id/certificate-preview`
- Explication: le moteur d'aperçu accepte une URL de badge ou du HTML additionnel controle par l'utilisateur, ce qui peut pousser le serveur a aller chercher une ressource interne ou a rendre du contenu non fiable.

## 6. JWT `kid` Key Confusion
- Surface: verification des JWT dans le middleware d'authentification
- Explication: la cle de verification est choisie a partir du header `kid` du token sans validation suffisante, ce qui permet de forger un jeton admin avec un materiel de cle detourne.

## 7. Command Injection dans les diagnostics admin
- Surface: `POST /api/admin/diagnostics/ping`
- Explication: la cible du ping est concatenee dans une commande systeme, ce qui permet l'injection de commandes shell supplementaires.

## 8. Server-Side Prototype Pollution
- Surface: `PATCH /api/preferences`
- Explication: la fusion profonde du JSON de preferences accepte des cles speciales et peut polluer `Object.prototype`, influencant ensuite le comportement global de l'application.

## 9. Zip Slip sur l'import d'archives
- Surface: `POST /api/trainings/import`
- Explication: l'extraction d'archives ZIP autorise des chemins avec traversal, ce qui permet d'ecrire des fichiers en dehors du repertoire prevu.

## 10. Stored XSS dans les commentaires riches
- Surface: `POST /api/blog/comments`
- Explication: les commentaires HTML sont stockes puis rendus tels quels dans le frontend, ce qui permet l'execution de contenu actif lors de la consultation des annonces.
