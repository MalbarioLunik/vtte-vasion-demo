/* Données de base partagées par le site, le calendrier et l'espace gérant.
   Les minimums par sortie et le nombre de vélos sont des valeurs de départ :
   le gérant peut les modifier dans ses réglages. */
window.VE_DATA = {
  contact: {
    sortiesTel: '+262693620014',
    sortiesTelLabel: '06 93 62 00 14',
    locationTel: '+262693498337',
    locationTelLabel: '06 93 49 83 37',
    email: 'lucashussonpirnay@gmail.com',
    instagram: 'https://www.instagram.com/vtte_vasion/'
  },
  activities: {
    maido: {
      name: 'Sortie Maïdo', short: 'Maïdo', price: 95, min: 4, max: 7,
      slot: 'matin', timing: 'Matinée · départ 8h30', level: 'Intermédiaire',
      img: 'maido-mafate', page: 'sortie-maido.html', color: '#4caf5a'
    },
    volcan: {
      name: 'Sortie Volcan', short: 'Volcan', price: 110, min: 4, max: 7,
      slot: 'journee', timing: 'Journée complète', level: 'Intermédiaire à sportif',
      img: 'volcan-groupe-piste', page: 'sortie-volcan.html', color: '#ff6a3d'
    },
    plages: {
      name: 'Route des plages', short: 'Route des plages', price: 39, min: 2, max: 7,
      slot: 'demi', timing: 'Demi-journée', level: 'Facile – Famille',
      img: 'route-des-plages', page: 'sortie-route-des-plages.html', color: '#38b6d8'
    },
    repas: {
      name: 'Repas Peï à la ferme', short: 'Repas Peï', price: 100, min: 4, max: 7,
      slot: 'journee', timing: 'Journée complète', level: 'Intermédiaire',
      img: 'repas-pei-assiette', page: 'sortie-repas-pei.html', color: '#f0b429'
    }
  },
  location: { demi: 59, journee: 79, groupeJournee: 69, groupeMin: 3 },
  fleet: 8,
  slots: { matin: 'Matin', 'apres-midi': 'Après-midi', journee: 'Journée' }
};
