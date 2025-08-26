# TikTok Video Analytics

Ce projet est une application Next.js déployée sur Vercel qui permet d'analyser les statistiques d'une vidéo TikTok sans utiliser l'API officielle. Vous collez l'URL d'une vidéo, l'application extrait les vues, likes, commentaires, partages et enregistrements via un parseur du HTML, calcule les taux d'engagement et sollicite ChatGPT pour générer des recommandations.

## Structure

- **package.json** : définit les dépendances (Next.js, React, OpenAI) et les scripts de build.
- **next.config.js** : configuration Next.js minimale.
- **lib/scrape.js** : contient la fonction de scraping pour extraire les statistiques de la page TikTok.
- **pages/api/analyze.js** : API route qui scrape, calcule les métriques et appelle OpenAI pour obtenir des conseils.
- **pages/index.js** : interface utilisateur simple en React/Next.js, avec modes clair et sombre.

## Déploiement

1. Configurez la variable d'environnement `OPENAI_API_KEY` dans Vercel (Production et Preview).
2. Déployez le projet sur Vercel : Vercel détecte automatiquement Next.js et construit l'app.
3. Copiez l'URL d'une vidéo TikTok publique et collez-la dans l'interface pour lancer l'analyse.

## Notes

- Ce projet se base sur les données publiques intégrées dans les pages TikTok. Les vidéos privées ou restreintes peuvent ne pas fonctionner.
- Pour des besoins de scraping intensif, envisagez de déporter la logique Playwright/Puppeteer vers un worker dédié.
