# TikTok Video Analytics (Prototype)

Ce projet constitue un prototype d'application Next.js destiné à analyser des vidéos TikTok.  
Il fournit une base prête à déployer sur Vercel sans configuration locale.  

## Fonctionnalités principales

* Interface simple (page d'accueil) permettant à l'utilisateur de coller l'URL d'une vidéo TikTok et de lancer son analyse.
* Route API (`/api/analyze`) recevant l'URL et interrogeant l'API OpenAI pour générer des conseils personnalisés en fonction de l'URL.  
  Vous devrez enrichir cette fonction pour intégrer le scraping des statistiques réelles (vues, likes, commentaires, partages) et calculer les taux d'engagement.
* Gestion de la clé OpenAI via les variables d'environnement (à définir sur Vercel).

## Structure du dépôt

```
tiktok-video-analytics/
├── lib/
│   └── scrape.js          # fonctions de scraping (à compléter)
├── pages/
│   ├── api/
│   │   └── analyze.js     # route API qui interroge OpenAI
│   └── index.js           # page d'accueil avec formulaire
├── public/
├── README.md
└── package.json
```

## Déploiement sur Vercel

1. **Créer un dépôt GitHub** et y copier le contenu de ce dossier.  
2. **Définir la variable d'environnement** `OPENAI_API_KEY` dans le tableau **Environment Variables** de Vercel (section Settings → Environment Variables).  
3. **Importer le dépôt sur Vercel** et sélectionner le preset **Next.js**. Vercel détectera automatiquement `next build` et générera le site.

Après déploiement, toute modification poussée sur la branche principale déclenchera une nouvelle construction et mise à jour du site.