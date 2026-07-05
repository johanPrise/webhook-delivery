# Plan complet — Service de livraison de webhooks

Stack : Bun (package manager + runtime si possible) · NestJS · Prisma · PostgreSQL · Redis/BullMQ · Next.js

---

## Étape 0 — Cadrage et fondations

### 0.1 Squelette du monorepo

```bash
mkdir webhook-delivery && cd webhook-delivery
git init
```

`package.json` racine :

```json
{
  "name": "webhook-delivery",
  "private": true,
  "workspaces": ["apps/*", "packages/*"]
}
```

### 0.2 API NestJS

```bash
mkdir apps
bunx @nestjs/cli new apps/api --skip-git --skip-install
# Question "package manager" → choisir npm (sans importance, --skip-install ne l'utilise pas)
cd apps/api && bun install && cd ../..
# Si un package-lock.json traîne dans apps/api, le supprimer (un seul lockfile Bun à la racine)
```

### 0.3 Dashboard Next.js

```bash
bunx create-next-app@latest apps/dashboard --typescript --app --tailwind --eslint --no-src-dir --import-alias "@/*" --use-bun
```

Dans `apps/dashboard/package.json`, mettre le port sur 3001 pour éviter le conflit avec l'API :
```json
"dev": "next dev -p 3001"
```

### 0.4 Package partagé (types + schémas Zod communs front/back)

```bash
mkdir -p packages/shared/src && cd packages/shared
bun init -y
bun add zod
cd ../..
```
Dans `packages/shared/package.json` : `"name": "@webhook/shared"`, `"main": "src/index.ts"`.
Créer `src/index.ts` vide pour l'instant (rempli à l'étape 1).

### 0.5 Docker Compose — Postgres + Redis

`docker-compose.yml` à la racine :

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: webhook
      POSTGRES_PASSWORD: webhook
      POSTGRES_DB: webhook
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
  redis:
    image: redis:7
    ports: ["6379:6379"]
volumes:
  pgdata:
```

```bash
docker compose up -d
docker compose ps   # vérifier que les deux services sont "running"
```

### 0.6 Prisma dans l'API

```bash
cd apps/api
bun add @prisma/client
bun add -d prisma
bunx prisma init
```

`apps/api/.env` :
```
DATABASE_URL="postgresql://webhook:webhook@localhost:5432/webhook"
```

Remplacer `apps/api/prisma/schema.prisma` par le schéma des 3 modèles (`Application`, `Endpoint`, `Event` — voir fichier `schema.prisma` séparé).

```bash
bunx prisma migrate dev --name init
# Si prompt "prisma dev vs Docker Postgres" → choisir "Docker Postgres + real migrations"
bunx prisma studio   # vérifier visuellement les 3 tables vides
```

### 0.7 Lancer les apps

```bash
# API — tester Bun runtime d'abord, fallback Node si BullMQ/ioredis pose souci (voir étape 2)
cd apps/api
bun --watch src/main.ts        # option A, à privilégier si ça marche
# ou : bun run start:dev       # option B, Node sous le capot, valeur sûre

# Dashboard
cd apps/dashboard
bun run dev                    # port 3001
```

### 0.8 Discipline et clôture

```bash
cd ../..
touch LATER.md JOURNAL.md
mkdir -p docs/adr
# Placer CADRAGE.md à la racine, ADR-001 dans docs/adr/
# .gitignore : node_modules, .env, .next, dist  (garder bun.lock versionné)
git add -A && git commit -m "chore: étape 0 — monorepo, docker, schéma prisma initial"
```

**Critère de fin** : `docker compose up -d` + `prisma migrate dev` passent sans erreur, les deux apps démarrent.

---

## Étape 1 — Ingestion (1 semaine)

- `POST /events` : authentification par clé API, validation du payload (Zod partagé via `@webhook/shared`), persistance en base, réponse `202 Accepted` immédiate.
- Idempotence : header `Idempotency-Key`, contrainte unique en base sur `(applicationId, idempotencyKey)` — déjà présente dans le schéma.
- Ordre impératif (ADR-001) : **persister → répondre 202 → enfiler**, jamais l'inverse.

**Critère de fin** : un événement envoyé deux fois avec la même clé n'est créé qu'une fois en base.

---

## Étape 2 — Livraison (1-2 semaines)

- Worker BullMQ : lit l'ID d'événement depuis le job, relit l'état en base, POST vers l'endpoint destinataire, timeout strict 5s.
- Nouveau modèle `DeliveryAttempt` (statut HTTP, latence, réponse tronquée, timestamp).
- Monter un petit récepteur de test (mini serveur contrôlable : lenteur, erreurs 500, timeout simulables) — réutilisé jusqu'à l'étape 8.

**Point de vigilance Bun** : ioredis (utilisé par BullMQ) est l'endroit le plus probable de friction avec le runtime Bun. Si le worker se comporte mal (connexions qui tombent, jobs manqués), lancer ce process précis sous Node (`node dist/worker.js`) sans toucher au reste. Noter le choix dans `JOURNAL.md`.

**Critère de fin** : un événement entré ressort livré côté récepteur de test, la tentative est tracée.

---

## Étape 3 — Résilience (1 semaine)

- Retry avec backoff exponentiel + jitter : 10s → 1min → 10min → 1h → 6h.
- Dead letter après 5 échecs : statut `FAILED`.
- Statuts d'événement : `PENDING`, `RETRYING`, `DELIVERED`, `FAILED` (déjà dans le schéma).
- Tests de chaos réels : couper le récepteur de test 10 min, redémarrer Redis en plein retry.
- Rédiger **ADR-002** : stratégie de retry et paramètres choisis.

**Critère de fin** : le système survit à un destinataire down sans perdre un événement (démo enregistrable).

---

## Étape 4 — Signatures HMAC (3-4 jours)

- Chaque livraison porte `X-Signature` = `HMAC-SHA256(secret, timestamp + "." + payload)`.
- Timestamp inclus dans le message signé → anti-rejeu (rejet si > 5 min d'écart côté vérification).
- Comparaison en vérification via `crypto.timingSafeEqual()`, jamais `===`.
- Fournir un snippet de vérification (~15 lignes) pour le destinataire, dans la doc.
- Rédiger **ADR-003** : schéma de signature choisi.

**Critère de fin** : le récepteur de test vérifie la signature et rejette un payload trafiqué ou une signature rejouée.

---

## Étape 5 — Dashboard, socle (1 semaine)

- Next.js : auth simple, liste des événements (filtres statut/endpoint/période, pagination), détail d'un événement avec timeline des tentatives, CRUD endpoints et clés API.
- Rester sobre : outil de dev, pas de landing page.

**Critère de fin** : tout ce qui existe côté back est visible côté front.

---

## Étape 6 — Dashboard temps réel (1-1,5 semaine)

- SSE (Server-Sent Events) : tentatives affichées en live dans la timeline, statuts mis à jour sans refresh.
- Bouton "rejouer" un événement `FAILED`, avec suivi en direct du nouveau essai.
- Rédiger **ADR-004** (optionnel) : SSE vs WebSocket, pourquoi ce choix.
- Démo clé : couper le récepteur, envoyer un événement, regarder les retries tomber en direct — à enregistrer en GIF pour le README.

**Critère de fin** : la démo de chaos est visible en temps réel dans le dashboard.

---

## Étape 7 — Dashboard métriques (1 semaine)

- Taux de succès par endpoint, latence p50/p95, volume par heure, top endpoints en échec.
- Recharts (ou visx) + requêtes d'agrégation SQL.
- UX développeur : payload JSON coloré, copie en un clic, empty states propres.

**Critère de fin** : une page "vue d'ensemble" qui donne l'impression d'un produit fini.

---

## Étape 8 — Preuve et vitrine (1 semaine)

- Test de charge (k6) : événements/s en ingestion, chiffres dans le README.
- Diagramme de séquence, ADRs mis au propre (3-4).
- Déploiement public (Railway ou Fly.io).
- README avec GIF de la démo de retry, doc "intégrer en 5 minutes" avec exemples curl.

**Critère de fin** : le lien à mettre sur le CV.

---

## Étape 9 (LATER, après le 8) — Companion mobile

- App React Native (déjà la stack de Plizzi) : notification push sur `FAILED`, vue rapide des derniers échecs, replay depuis le téléphone.
- À ne commencer qu'une fois l'étape 8 terminée — pas avant.

---

## Discipline transverse (dès l'étape 0)

- Toute idée hors périmètre courant → `LATER.md`, sans exception.
- Fin de chaque étape → 3 lignes dans `JOURNAL.md` sur le problème le plus dur rencontré.
- Un ADR par décision structurante, pas après coup.
