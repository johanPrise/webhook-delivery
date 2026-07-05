# ADR-001 — PostgreSQL comme source de vérité, Redis comme file uniquement

**Statut** : accepté — **Date** : juillet 2026

## Contexte

Le système doit garantir qu'aucun événement accepté (réponse `202`) n'est jamais perdu. Deux briques stockent de la donnée : PostgreSQL et Redis (via BullMQ). Il faut décider laquelle fait foi.

## Options considérées

**Option A — Redis comme pivot** : l'événement entre directement dans la file, la base est mise à jour après coup.
- Avantage : ingestion très rapide, moins d'écritures synchrones.
- Inconvénient : Redis est un stockage en mémoire ; en cas de crash ou de redémarrage mal configuré, les jobs en file peuvent disparaître. Un événement accepté mais perdu casse la promesse centrale du produit.

**Option B — Postgres comme source de vérité** : l'événement est d'abord persisté en base (transactionnel, durable), puis mis en file. La file ne contient que des références (ID d'événement), jamais la donnée elle-même.
- Avantage : si Redis tombe, on peut reconstruire la file en relisant les événements non livrés en base. La durabilité repose sur un système conçu pour ça.
- Inconvénient : une écriture disque synchrone sur le chemin d'ingestion (latence légèrement supérieure).

## Décision

Option B. La promesse du produit est la fiabilité, pas la latence minimale ; quelques millisecondes d'écriture Postgres sont un prix acceptable. Corollaires :

1. L'ordre est toujours : **persister → répondre 202 → enfiler**. Jamais l'inverse.
2. Les jobs BullMQ ne transportent que l'ID de l'événement ; le worker relit l'état en base avant chaque tentative.
3. Un job de réconciliation (cron) rattrape les événements `PENDING` anciens sans job en file (cas : crash entre la persistance et l'enfilement).

## Conséquences

- La perte de Redis est un incident de disponibilité (livraisons retardées), pas un incident de perte de données.
- Le statut affiché au client vient toujours de Postgres, jamais de l'état de la file.
- À tester en étape 3 (chaos) : redémarrage de Redis en plein retry → vérifier la reprise via la réconciliation.
