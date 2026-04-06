# Render Deployment

## Architecture

- `corphack-horizon-frontend`: static site Render
- `corphack-horizon-api`: web service Render
- persistance backend sur disque monte dans `/var/data/corphack`
- les preview environments ne sont pas activees dans ce Blueprint

Le fichier `render.yaml` declare ces 2 services.

## Variables importantes

- `DATA_ROOT=/var/data/corphack`
- `FRONTEND_HOST` recupere automatiquement le host public du frontend
- `FRONTEND_PROTO=https`
- `VITE_API_HOST` recupere automatiquement le host public du backend

## Etat persistant

Le backend stocke:
- la base SQLite dans `/var/data/corphack/data/corphack.sqlite`
- le runtime challenge dans `/var/data/corphack/runtime`

Cela inclut:
- mailbox preview
- uploads
- imports ZIP
- ressources de formation
- fichiers de flags et de cles

## Reset manuel du challenge

Depuis le shell du service backend Render:

```bash
cd /opt/render/project/src/backend
npm run reset:ctf
```

Ensuite:
- redemarrer le service backend depuis le dashboard Render
- ou relancer un redeploy du backend

Le reset:
- supprime la base SQLite persistante
- nettoie `runtime`
- recree les seeds initiaux
- remet le challenge dans un etat propre

## Notes d'exploitation

- le frontend resolve l'API via `VITE_API_HOST` en production
- en local, le fallback `localhost:3000` est conserve
- la SSRF certificat utilise `http://127.0.0.1:${PORT}` pour rester exploitable sur Render
- le flow `forgot-password` reste vulnerable au poisoning, mais utilise le host canonique du frontend pour le trafic normal

## Procedure de verification rapide

1. deployer le Blueprint Render
2. ouvrir le frontend public
3. verifier qu'un login normal fonctionne
4. verifier qu'un commentaire ou upload persiste apres redemarrage backend
5. lancer `npm run reset:ctf`
6. redemarrer le backend
7. verifier le retour a l'etat seed
