# Parcours Red Team

## Kill chain principale

1. Recuperation de compte via `forgot-password` avec poisoning
2. Lecture de demandes de formation via BOLA
3. Contournement de validation sur la confirmation de formation
4. Lecture / SSRF via apercu de certificat
5. Forge JWT admin via `kid`
6. Pivot serveur via diagnostics admin

## Quetes laterales

- HPP sur le flow de reset
- Prototype pollution via `PATCH /api/preferences`
- Zip Slip via import d'archive
- Stored XSS via commentaires riches

## Intention UX

- les surfaces ci-dessus restent exploitables
- elles ne doivent pas etre evidentes pour un utilisateur lambda
- la home et le workspace doivent rester credibles comme produit RH / formation
