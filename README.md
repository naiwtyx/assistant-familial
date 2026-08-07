# Assistant Familial

Application web (PWA) pour organiser la vie d'une famille : corvées avec
gamification, agenda partagé, liste de courses, inventaire, recettes, budget,
et un assistant IA pour piloter tout ça en langage naturel.

Stack : [Next.js 15](https://nextjs.org) (App Router) + React 19 +
[Supabase](https://supabase.com) (base de données, auth, RLS) +
[Groq](https://console.groq.com) (inférence Llama 3.3 70B pour l'assistant et
le scanner de tickets) + notifications push web (VAPID).

## Démarrer en local

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

Node 20+ recommandé.

## Variables d'environnement

Copie `.env.example` vers `.env.local` et renseigne :

| Variable                        | Où l'obtenir                                                      | Notes                                                 |
| -------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`       | Supabase → Project Settings → API → Project URL                     | Public                                                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Supabase → Project Settings → API → anon public                     | Public (protégé par les RLS)                            |
| `GROQ_API_KEY`                   | [console.groq.com/keys](https://console.groq.com/keys) (gratuit)    | Serveur uniquement, jamais de préfixe `NEXT_PUBLIC_`    |
| `GROQ_MODEL`                     | —                                                                    | Optionnel, défaut `llama-3.3-70b-versatile`             |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`   | `node -e "console.log(require('web-push').generateVAPIDKeys())"`    | Notifications push                                      |
| `VAPID_PRIVATE_KEY`              | idem                                                                 | Secret, serveur uniquement                              |
| `VAPID_SUBJECT`                  | —                                                                    | `mailto:ton@email.com`                                  |
| `SUPABASE_SERVICE_ROLE_KEY`      | Supabase → Project Settings → API → service_role                    | Requis pour le cron de rappels (client admin)            |
| `CRON_SECRET`                    | À définir toi-même                                                   | Protège `/api/cron/shopping-reminder` (Bearer token)     |

**Ne jamais commiter `.env.local`** — il est déjà exclu par `.gitignore`
(`.env*`). Si une clé fuit, régénère-la côté Supabase/Groq immédiatement.

## Base de données

Le schéma vit dans `supabase/migrations/` (SQL numéroté séquentiellement).
Applique-les dans l'ordre sur ton projet Supabase (SQL editor ou CLI
Supabase). Les policies RLS gèrent les permissions par famille et par rôle
(parent vs membre).

## Scripts

```bash
npm run dev      # serveur de dev (Turbopack)
npm run build    # build de production
npm run start    # sert le build de production
npm run lint     # ESLint
npm run test     # tests unitaires (Vitest)
```

## Architecture

Le code applicatif est organisé par feature sous `src/features/<nom>/` :

```
components/   composants React (UI)
hooks/        hooks React Query (data fetching/mutations)
services/     appels Supabase / API — logique métier, sans JSX
lib/          fonctions pures (calculs, formatage) — testées directement
schemas/      validation Zod des entrées utilisateur
```

Features actuelles : `activity`, `assistant`, `auth`, `budget`, `chores`,
`events`, `family`, `ideas`, `inventory`, `meals`, `recipes`, `scanner`,
`settings`, `shopping`.

Les routes API (`src/app/api/`) exposent uniquement ce qui doit tourner
côté serveur : l'assistant IA, le scan de ticket (vision), les notifications
push, et le cron de rappels quotidien.

## Déploiement

Déployé sur [Vercel](https://vercel.com). `vercel.json` définit la région
(`fra1`) et deux crons quotidiens :

- `/api/cron/daily-digest` (7h) — résumé proactif par famille (corvées en
  retard/du jour, agenda du jour, budget proche/dépassé, produits qui
  périment), rédigé par l'IA avec repli déterministe, envoyé en push.
  N'envoie rien s'il n'y a rien de notable à signaler.
- `/api/cron/shopping-reminder` (8h) — rappel liste de courses + agenda du
  jour.

Pense à configurer les variables d'environnement ci-dessus dans les réglages
du projet Vercel, et à protéger les deux routes cron avec `CRON_SECRET`.

## Notifications push / PWA

Le service worker (`public/sw.js`) gère le cache hors ligne et la réception
des push. L'abonnement se fait via
`src/features/settings/components/notification-settings.tsx`, qui appelle
`/api/push/subscribe` avec la clé VAPID publique.
