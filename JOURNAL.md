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

## Étape 3 — Résilience (retry, backoff, dead letter)

Le point le plus délicat n'était pas technique mais de spécification : "dead letter après 5
échecs" (CADRAGE.md) est ambigu sur le total de tentatives (5 au total, ou 5 réessais en
plus de l'essai initial ?). Choix documenté dans ADR-002 : 5 paliers de backoff = 5
réessais programmés, dead letter à la 6e tentative. Vérifié en simulant un événement déjà
à `attemptCount=5` (sans attendre les paliers longs de 1h/6h) pour confirmer la
transition vers `FAILED` sans reprogrammer de job.

## Étape 3 — Tests de chaos réels

**Récepteur coupé** : événement envoyé avec le destinataire injoignable dès la 1ère
tentative. 3 échecs `ECONNREFUSED` consécutifs tracés (statut `RETRYING` à chaque fois,
`Event` jamais perdu en base), puis succès automatique à la tentative 4 dès que le
récepteur a été relancé — aucune intervention manuelle, juste le job différé BullMQ qui
s'est redéclenché seul à l'heure prévue.

**Redémarrage Redis en plein retry** : `docker restart` sur le conteneur Redis pendant
qu'un job différé attendait (palier ~1h). Résultat empirique : le job a survécu au
redémarrage — Redis sauvegarde un snapshot RDB sur `SIGTERM` grâce aux points de sauvegarde
par défaut (`save 3600 1 300 100 60 10000`), même si aucun seuil de temps/volume n'était
atteint. Le worker (ioredis) s'est reconnecté seul, sans crash ni intervention, confirmé en
observant qu'un nouvel événement soumis juste après a été livré normalement.

Point de vigilance : ce comportement dépend de `SIGTERM` propre + snapshot RDB à jour. Un
`docker kill -9` ou un crash brutal entre deux snapshots perdrait le job — d'où le job de
réconciliation construit dans la foulée (`ReconciliationService`, cycle toutes les 30s dans
le worker) : il rattrape les événements `PENDING`/`RETRYING` dont le job a disparu sans que
Postgres soit prévenu. Vérifié en simulant deux événements orphelins (aucun job Redis
correspondant) : repris et livrés dès le premier cycle. La marge de 30s avant de considérer
un événement "bloqué" accepte un risque résiduel de double traitement si un job en retard
et un cycle de réconciliation se croisent — pas de verrou distribué en V1, jugé
suffisant au vu du volume visé.
