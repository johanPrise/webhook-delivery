# ADR-002 — Stratégie de retry, backoff et dead letter

**Statut** : accepté — **Date** : juillet 2026

## Contexte

Un échec de livraison (destinataire down, 5xx, timeout) ne doit pas condamner l'événement : le worker doit réessayer, mais sans marteler un destinataire déjà en difficulté, et sans réessayer indéfiniment.

## Décision

**Backoff exponentiel avec jitter, 5 paliers, dead letter au 6e échec.**

| Tentative qui vient d'échouer | Délai avant la suivante |
|---|---|
| 1 | 10 s |
| 2 | 1 min |
| 3 | 10 min |
| 4 | 1 h |
| 5 | 6 h |
| 6 | — (dead letter, `FAILED`) |

- **Jitter** : ±20 % appliqué à chaque délai (`apps/api/src/delivery/backoff.ts`), pour éviter qu'un lot d'événements échoués en même temps ne resynchronise ses réessais sur le même destinataire.
- **Programmation** : le retry est un job BullMQ différé (`queue.add(..., { delay })`), sur la même file `events`. Le worker n'a pas de scheduler séparé.
- **Dead letter** : au-delà de 5 paliers épuisés (6 tentatives au total), l'événement passe en `FAILED` et `nextAttemptAt` est vidé. Aucune reprise automatique ensuite — un replay manuel (dashboard, étape 6) sera le seul chemin de sortie.
- **Cohérence avec ADR-001** : la mise à jour de `Event` (statut, `attemptCount`, `nextAttemptAt`) et la création du `DeliveryAttempt` sont en transaction Postgres ; l'enfilement du job de retry est un effet de bord externe déclenché *après* cette transaction, jamais avant — un échec d'enfilement ne doit jamais faire mentir l'état en base.

## Alternatives considérées

- **Backoff fixe** (ex. toutes les 5 min) : plus simple, mais soit trop agressif pour un destinataire durablement down, soit trop lent pour un incident bref. Rejeté.
- **Nombre de paliers plus élevé (ex. 10)** : repousse la dead letter à plusieurs jours. Rejeté pour la V1 — 6 tentatives sur ~7h30 couvre déjà la plupart des incidents transitoires réalistes (déploiement, redémarrage, pic de charge) sans transformer la file en stockage de long terme.
- **Jitter absent** : rejeté — avec plusieurs événements en échec vers le même destinataire (panne groupée), des délais identiques créeraient des pics de charge synchronisés à chaque palier.

## Conséquences

- Le statu `RETRYING` avec `nextAttemptAt` renseigné permet au dashboard (étape 5/6) d'afficher un compte à rebours fiable sans interroger Redis.
- Un `FAILED` est terminal tant qu'aucun replay manuel n'est déclenché.
- À tester en conditions de chaos (ce que couvre aussi cette étape) : couper le récepteur de test pendant plusieurs paliers, vérifier que les retries s'enchaînent dans le dashboard puis en base, sans perte.
