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

## Étape 4 — Signatures HMAC

Rien de bloquant techniquement ; le point à ne pas rater était de signer le **corps brut**
exact envoyé sur le fil (`rawBody`, figé en chaîne une seule fois avant `fetch`), pas une
reconstruction JSON côté vérification — un `JSON.parse` puis `JSON.stringify` peut changer
l'ordre des clés et casser une comparaison naïve. Le récepteur de test vérifie maintenant
réellement la signature (activable via `?secret=` dans l'URL de l'Endpoint, cohérent avec
le pilotage par query params déjà en place). Vérifié avec des requêtes forgées à la main
(openssl) : signature valide acceptée, payload trafiqué après signature rejeté (401,
signature invalide), timestamp vieux de 400s rejeté (401, hors fenêtre des 5 min).

## Étape 5 — Dashboard

Le point le plus piégeux n'était pas Next.js 16 (breaking changes lues à l'avance dans
`node_modules/next/dist/docs/` : `middleware.ts` → `proxy.ts`, `cookies()`/`params` async)
mais la cohérence de session pendant la régénération de clé API : l'action régénère la clé
côté API (l'ancienne devient invalide immédiatement) puis doit reposer le cookie avec la
nouvelle **dans la même Server Action**, sinon l'utilisateur se déconnecte lui-même en
cliquant sur le bouton. Autre limite pratique : `curl` ne peut pas simuler les Server
Actions (protocole de sérialisation interne à Next, pas un simple POST de formulaire) —
tests réalisés via Playwright (navigateur réel) : connexion, détail d'événement, création
et désactivation d'un endpoint, régénération de clé avec vérification que la session reste
valide juste après.
