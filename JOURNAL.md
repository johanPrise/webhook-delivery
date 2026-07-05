# Journal

Trois lignes par étape terminée : le problème le plus dur rencontré, comment il a été
résolu, ce qu'il faut retenir. Voir `CADRAGE.md` (discipline).

## Étape 0 — Setup infra (Prisma + Postgres + Redis)

Le `prisma dev` local (serveur Postgres embarqué de Prisma) est incompatible avec le
schema engine de Prisma 7.8 : `migrate dev` échoue en `P1017` pendant le reset de la
shadow database (protocole PostgreSQL non respecté par le serveur expérimental). Bascule
sur un vrai Postgres via Docker Compose, ce que `CADRAGE.md` prévoyait déjà ("Infra dev :
Docker Compose"). Le port hôte 5432 était pris par un Postgres local existant + un tunnel
SSH, d'où le mapping sur 5433.
