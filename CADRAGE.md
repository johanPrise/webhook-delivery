# Cadrage V1 — Service de livraison de webhooks

## Vision en une phrase

Un service qui permet à une application d'externaliser la livraison fiable de ses webhooks sortants : elle envoie ses événements à une API unique, le service garantit la livraison aux destinataires (retries, signatures, traçabilité).

## Le problème

Une application qui doit notifier ses propres clients par webhooks (ex. un SaaS de facturation qui prévient ses e-commerçants qu'une facture est payée) doit gérer : destinataires indisponibles, réessais espacés, non-duplication des livraisons, authentification des messages, et visibilité sur ce qui a été livré ou non. Reconstruire cette machinerie n'est le métier de personne.

## Utilisateurs

- **Client du service** : un développeur / une application émettrice d'événements. C'est lui qui s'authentifie sur l'API et utilise le dashboard.
- **Destinataire final** : le serveur qui reçoit les webhooks. Il n'a pas de compte ; il reçoit des requêtes signées et peut les vérifier.

## Périmètre V1 — ce que ça FAIT

1. **Ingestion** : `POST /events` authentifié par clé API, avec idempotence via header `Idempotency-Key`. Réponse `202` immédiate, persistance avant mise en file.
2. **Livraison** : worker asynchrone (BullMQ/Redis), POST vers l'endpoint destinataire, timeout strict de 5 s, chaque tentative tracée.
3. **Résilience** : retry avec backoff exponentiel + jitter (10s → 1min → 10min → 1h → 6h), passage en `FAILED` (dead letter) après 5 échecs.
4. **Sécurité** : signature HMAC-SHA256 de chaque livraison (`X-Signature`), timestamp anti-rejeu, secret propre à chaque endpoint.
5. **Dashboard** : liste et détail des événements, timeline des tentatives en temps réel (SSE), replay manuel, métriques (taux de succès, latence p50/p95, volume), gestion des endpoints et clés API.

## Hors périmètre V1 — ce que ça ne FAIT PAS

- Transformation ou filtrage de payloads
- Multi-région, haute disponibilité, clustering
- Facturation / plans payants / multi-organisation
- Réception de webhooks entrants (c'est le problème inverse — Hookdeck)
- Rate limiting sortant par destinataire (noté dans `LATER.md`)
- SDK clients (la doc curl + snippets suffit en V1)

## Garanties visées (à démontrer, pas juste affirmer)

- **Aucun événement accepté n'est perdu**, même si Redis tombe (Postgres = source de vérité).
- **Au moins une livraison** (at-least-once) ; le destinataire déduplique via l'ID d'événement fourni.
- **Aucune double création** côté ingestion grâce à l'idempotency key.

## Stack

- **API** : NestJS + Prisma + PostgreSQL
- **File** : BullMQ + Redis
- **Front** : Next.js (App Router) + Recharts, temps réel en SSE
- **Monorepo** TypeScript, types partagés (validation Zod commune front/back)
- **Infra dev** : Docker Compose ; déploiement : Railway ou Fly.io

## Critères de succès du projet

1. La démo de chaos fonctionne : destinataire coupé 10 min → les retries se déroulent en direct dans le dashboard, zéro perte.
2. Test de charge documenté : X événements/s en ingestion, chiffres dans le README.
3. 3 ADRs rédigés, diagramme de séquence, doc "intégrer en 5 minutes".
4. Déployé publiquement, démo accessible.

## Discipline

- Toute idée hors périmètre va dans `LATER.md`, sans exception, jusqu'à la fin de l'étape 8.
- Fin de chaque étape : 3 lignes de journal (`JOURNAL.md`) sur le problème le plus dur rencontré.
