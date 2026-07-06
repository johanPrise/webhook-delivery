# ADR-003 — Schéma de signature des livraisons

**Statut** : accepté — **Date** : juillet 2026

## Contexte

Un destinataire doit pouvoir vérifier qu'une requête reçue vient bien du service (et pas d'un tiers qui aurait deviné son URL de webhook), et qu'elle n'a pas été altérée en chemin. Il doit aussi pouvoir rejeter une requête légitime interceptée puis rejouée plus tard par un attaquant.

## Décision

**HMAC-SHA256 sur `timestamp.corps_brut`, secret propre à chaque Endpoint.**

- `X-Webhook-Timestamp` : timestamp Unix (secondes) au moment de l'envoi.
- `X-Webhook-Signature` : `HMAC-SHA256(secret, "<timestamp>.<corps_brut>")`, encodé en hexadécimal.
- Le secret est généré à la création de l'`Endpoint`, stocké en clair côté serveur (nécessaire : c'est lui qui signe), affiché une seule fois au client comme une clé API (cf. `Application.apiKeyHash`, même logique de non-réaffichage — mais ici le serveur en a besoin en continu pour signer, donc pas de hash possible côté `Endpoint.secret`).
- Vérification côté destinataire : recalculer le HMAC sur le corps **brut** (avant tout parsing JSON — un `JSON.parse` puis `JSON.stringify` peut changer l'ordre des clés ou l'espacement et casser la vérification), comparer avec `crypto.timingSafeEqual` (jamais `===`, pour ne pas fuiter la signature octet par octet via le temps de comparaison).
- Anti-rejeu : le destinataire doit rejeter toute requête dont `|now - timestamp| > 5 min`. Le timestamp fait partie du message signé — sans ça, un attaquant qui intercepte une requête valide pourrait la rejouer indéfiniment avec une signature toujours correcte.

## Alternatives considérées

- **Signer uniquement le payload (pas de timestamp)** : plus simple, mais aucune protection contre le rejeu. Rejeté — c'est justement le trou de sécurité que ce mécanisme doit combler.
- **Timestamp dans le corps du message plutôt qu'en en-tête séparé** : obligerait le destinataire à parser le JSON avant de pouvoir vérifier quoi que ce soit, et coupler le format de signature au schéma du payload. Rejeté — en-tête séparé, signature calculée sur le corps brut inchangé.
- **`===` pour la comparaison** : rejeté — vulnérable à une attaque par mesure de temps (timing attack) qui permettrait de deviner la signature octet par octet.
- **Un secret partagé par Application plutôt que par Endpoint** : plus simple à gérer, mais une fuite du secret d'un endpoint compromettrait tous les endpoints de l'application. Rejeté — le schéma a déjà `Endpoint.secret` individuel depuis l'étape 0.

## Conséquences

- Le destinataire doit conserver le secret de son côté (affiché une seule fois) — à documenter clairement dans l'intégration "5 minutes" (étape 8).
- Une dérive d'horloge significative entre le service et le destinataire peut faire rejeter des requêtes légitimes ; 5 minutes de marge est un compromis usuel (aligné sur Stripe/GitHub) entre sécurité et tolérance NTP.
- Le récepteur de test (`apps/test-receiver`) implémente cette vérification (activée via `?secret=` dans l'URL de l'Endpoint), en miroir du snippet documenté dans `apps/api/README.md` — à faire évoluer ensemble si le format change.
