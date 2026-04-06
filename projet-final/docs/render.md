# Render Free Deployment

## Architecture

- `corphack-horizon-frontend`: static site Render gratuit
- `corphack-horizon-api`: web service Render en plan gratuit
- aucune ressource payante n'est utilisee dans ce Blueprint
- les preview environments ne sont pas activees dans ce Blueprint

Le fichier `render.yaml` declare ces 2 services.

Note:
- le backend declare explicitement `plan: free`
- le frontend statique n'a pas de champ `plan` dans le Blueprint

## Variables importantes

- `DATA_ROOT=/tmp/corphack`
- `FRONTEND_HOST` recupere automatiquement le hostname public `onrender.com` du frontend
- `FRONTEND_PROTO=https`
- `VITE_API_HOST` recupere automatiquement l'URL publique `onrender.com` du backend

## Stockage et limites

Le backend stocke son etat dans un espace ephemere:
- base SQLite sous `/tmp/corphack/data/corphack.sqlite`
- runtime challenge sous `/tmp/corphack/runtime`

Cela inclut:
- mailbox preview
- uploads
- imports ZIP
- ressources de formation
- fichiers de flags et de cles

Important:
- cet etat peut etre perdu apres redemarrage, redeploy ou mise en veille/reveil du service free
- le challenge est pense pour rester jouable dans une session, pas comme environnement durable multi-jours
- le backend gratuit peut avoir des cold starts apres inactivite

## Comportement attendu

- si SQLite ou le runtime n'existent plus, le backend recree automatiquement la base et les seeds au boot
- le frontend resolve l'API via `VITE_API_HOST` en production
- en local, le fallback `localhost:3000` reste disponible
- la SSRF certificat utilise `http://127.0.0.1:${PORT}` pour rester exploitable sur Render free
- le flow `forgot-password` reste vulnerable au poisoning, tout en conservant un parcours nominal correct

## Reset du challenge

Sur Render free, le reset principal est simplement:
- redemarrer ou redeployer le backend si l'etat a deja disparu
- ou lancer manuellement `npm run reset:ctf` depuis le shell backend si le shell est disponible

Commande utile:

```bash
cd /opt/render/project/src/backend
npm run reset:ctf
```

Ce reset:
- supprime SQLite
- nettoie `runtime`
- recree les seeds initiaux

## Procedure de verification rapide

1. deployer le Blueprint Render
2. ouvrir le frontend public
3. verifier qu'un login normal fonctionne
4. verifier qu'une session de challenge permet d'exploiter les 10 failles
5. redemarrer ou redeployer le backend
6. verifier que l'etat peut etre perdu puis reseede automatiquement si necessaire
