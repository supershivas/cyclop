// Les pictogrammes du temps (le dessin d'un jour : sec, pluie, brouillard, gel), au trait, en 24 × 24. Le labo les montre sur la barre du temps.
export const ICONES_METEO = {
  sec: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  pluie: '<path d="M7 15a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.3 3.3 0 0 1 17 15z"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2"/>',
  brouillard: '<path d="M4 9h16M3 13h14M6 17h14"/>',
  gel: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/>',
};
