export function inferNiche(description, hashtags = []) {
  const text = `${description || ''} ${hashtags.join(' ')}`.toLowerCase();

  const catalog = [
    { name: 'Fitness/Sport', keys: ['fitness', 'workout', 'musculation', 'gym', 'sport'] },
    { name: 'Humour',       keys: ['humour', 'funny', 'drôle', 'drole', 'comédie', 'blague', 'sketch'] },
    { name: 'Éducation',    keys: ['éducation', 'education', 'tuto', 'tutoriel', 'astuce', 'cours', 'formation', 'learn'] },
    { name: 'Cuisine',      keys: ['cuisine', 'recette', 'cooking', 'food', 'chef'] },
    { name: 'Beauté/Mode',  keys: ['beauté', 'beaute', 'makeup', 'maquillage', 'mode', 'fashion'] },
    { name: 'Tech',         keys: ['tech', 'technologie', 'hardware', 'logiciel', 'informatique', 'gadget'] },
    { name: 'Musique',      keys: ['musique', 'music', 'cover', 'guitare', 'piano', 'rap', 'beat'] }
  ];

  for (const cat of catalog) {
    if (cat.keys.some(k => text.includes(k))) return cat.name;
  }
  return null;
}
