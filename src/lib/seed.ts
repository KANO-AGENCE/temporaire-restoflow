import type {
  Establishment,
  MediaFile,
  PlatformAccount,
  Post,
  ValidationEntry,
} from '@/types';
import { uid, nowIso } from './utils';

const JOE_CARPA_PLAYBOOK = `JOE CARPA — DOCTRINE ÉDITORIALE (à respecter strictement)

Positionnement : brasserie tendance du centre-ville d'Angers, spécialiste des viandes d'exception (ardoise du chef avec races sélectionnées) et reconnue comme paradis du carpaccio et du tartare. Haut de gamme et accessible. "Maison du beef à Angers". Déco Konper Group, ambiance chic et chaleureuse, lumière tamisée. On vient bien manger sans se prendre au sérieux.

HIÉRARCHIE DES ANGLES (priorité descendante) :
1. Talent du chef + qualité des plats (cœur du sujet)
2. Ardoise des viandes / races à viande (différenciant n°1)
3. Carpaccios et tartares (signature historique, "infinies variations")
4. Carte de brasserie large (midi et soir)
5. Ambiance et déco (chic, chaleureuse, tamisée)
6. Événements (JaykeBox, soirées)
7. Terrasse — angle SECONDAIRE, mention ponctuelle par beau temps uniquement, JAMAIS thème principal (terrasse petite)

ARDOISE — RACES À NOMMER (jamais "côte de bœuf" tout court) :
- Noir de Baltique (race nordique, viande dense, persillage marqué)
- Wagyu japonais (persillage extrême, exception absolue)
- Normande (race française historique, équilibrée, terroir)
- Galice / Buey Gallego (race espagnole d'exception, vieillie, mature)
- Rouge des Prés (AOP Maine-et-Loire, ancrage local fort)
À chaque post viande : nommer la race + 1 phrase d'explication + suggérer accord vin (rouge structuré, bourgogne ou bordeaux).

PLATS PHARES À POUSSER : Carpaccios (bœuf, daurade, St-Jacques selon saison), Tartares, Tre Cento Venti (signature maison), Pluma de cochon (pépite ibérique), Poissons de la criée, Produits de saison.

TON — MIX PERMANENT convivial + punchy, jamais l'un sans l'autre :
- Convivial : complicité, "on", clins d'œil, vouvoiement en post / tutoiement OK en story
- Punchy : phrases courtes, verbes d'action, urgence douce
- LinkedIn : conserver le mix mais registre plus posé, storytelling chef/maison, jamais corporate
- INTERDIT : "expérience culinaire", "voyage gustatif", superlatifs creux, emojis aléatoires, descriptions à rallonge

STRATÉGIE PAR SUPPORT (à respecter chaque semaine) :
- Instagram + Facebook : 3-5 posts/semaine + stories quotidiennes + 1 reel/sem. IG = 5-12 hashtags, FB = 0-3 hashtags max
- LinkedIn : 1-2 posts/semaine, ton convivial-pro, storytelling (300-500 mots), 3-5 hashtags pro. Angles : talent chef, sélection races, coulisses, ancrage local, repas d'affaires, événements privatisables
- Google Business : 1-2 publications/semaine, 100-200 mots max, 0 hashtag, CTA direct. Angles : carte/ardoise, événement, offre midi, arrivage, infos pratiques

CTA ZENCHEF (toujours actif quand réservation pertinente) :
- IG : "Réservez via le lien en bio"
- FB : "Bouton Réserver sur notre page"
- Google : "Réservez directement depuis Google"
- LinkedIn : "Réservez sur joecarpa.fr ou contactez-nous"
- Toujours en alternative : 02.41.34.29.39
Variantes acceptées : "Réservez au 02.41.34.29.39" / "Réservation : joecarpa.fr" / "On vous garde une table ?" / "Lien en bio pour réserver" / "Une côte de Galice vous tend les bras"

ÉVÉNEMENTS — communication d'anticipation OBLIGATOIRE, jamais une seule touche :
- 5+ jours avant : annonce dès que possible + relance J-2/J-1 + story jour J
- 2-4 jours avant : annonce le jour de l'info + relance la veille + story jour J
- Dernière minute : story urgence + post "ce soir" CTA fort
JaykeBox : artiste qui joue certains jeudis, univers variété/pop/chanson française, style "Modern fun music event" (couleurs vives, typo bold, vinyle/micro stylisé), JAMAIS vintage / sépia / art déco.

VENTE ADDITIONNELLE (à glisser quand pertinent) :
- ardoise viande → vin rouge structuré, dessert chocolat
- carpaccio/tartare → cocktail signature, vin blanc ou rouge léger
- poisson criée → blanc, dessert léger
- midi → formule complète, café gourmand
- soirée → cocktail avant, digestif après

INTERDITS ABSOLUS : superlatifs creux ("incroyable", "fantastique", "magique"), descriptions à rallonge, copier les concurrents parisiens, terrasse comme thème principal, ton 100 % corporate (LinkedIn inclus), promesses irréalistes, post sans CTA (sauf LinkedIn storytelling pur).`;

export function seedData(userId: string): {
  establishments: Establishment[];
  posts: Post[];
  media: MediaFile[];
  validations: ValidationEntry[];
  platformAccounts: PlatformAccount[];
} {
  const e1: Establishment = {
    id: uid('est'),
    userId,
    name: 'Joe Carpa',
    city: 'Angers',
    address: '16bis boulevard Foch, 49100 Angers',
    phone: '02.41.34.29.39',
    website: 'https://joecarpa.fr',
    reservationUrl: 'https://joecarpa.fr',
    cuisineType: 'Brasserie tendance — viandes d\'exception, carpaccios & tartares',
    positioning: 'brasserie',
    tone: 'accessible',
    targetAudience: 'Angevins centre-ville, amateurs de bonne table, couples, équipes pro, 25-65 ans. Audience LinkedIn : décideurs, RH, organisateurs B2B.',
    openingDays: ['mar', 'mer', 'jeu', 'ven', 'sam'],
    hours: 'Mardi-samedi midi & soir',
    specialties: 'Ardoise des viandes (Noir de Baltique, Wagyu, Normande, Galice / Buey Gallego, Rouge des Prés AOP). Carpaccios déclinés (bœuf, daurade, St-Jacques selon saison). Tartares. Tre Cento Venti (signature maison). Pluma de cochon ibérique. Poissons de la criée.',
    recurringOffers: 'Formule midi en semaine. Suggestions ardoise du jour à pousser en story chaque midi.',
    recurringEvents: 'JaykeBox certains jeudis (variété / pop / chanson française, style "Modern fun music event"). Cycle anticipation : annonce J-5/7 + relance J-1 + story jour J.',
    menuItems: [
      // Entrées
      'Œufs mayonnaise',
      'Mozzarella burrata, compotée tomates au xérès, pesto de roquette',
      'Velouté de butternut',
      'Nems de poulet, sauce cacahuète',
      'Foie gras de canard maison, pain d\'épices et chutney d\'ananas',
      'Tartare de saumon, guacamole',
      'Filet de cochon braisé aux 5 baies façon vitello',
      'Saint-Marcellin rôti, miel, noix et salade verte',
      // Salades
      'Salade La Cochon à l\'érable',
      'Salade La Caesar',
      'Salade de poulpe, agrumes et fleur de sel',
      // Tartares
      'Tartare Le Boucher',
      'Tartare Le Marocain',
      'Tartare L\'Italien',
      'Tartare Le Napolitain',
      // Carpaccios (servis avec frites)
      'Carpaccio 3 poivres',
      'Carpaccio aristote',
      'Carpaccio basilic',
      'Carpaccio des marais',
      'Carpaccio grec',
      'Carpaccio indien',
      'Carpaccio italien',
      'Carpaccio japonais',
      'Carpaccio mozzarella',
      'Carpaccio M. Seguin (chèvre, noix)',
      'Carpaccio nantais (curé nantais, pignons, mâche)',
      'Carpaccio niçois',
      'Carpaccio oriental',
      'Carpaccio parmesan',
      'Carpaccio provençal',
      'Carpaccio roquefort',
      'Carpaccio thaï',
      'Carpaccio normand',
      'Carpaccio tapenade',
      // Poissons
      'Tataki de thon, wok de légumes croquants, miel et soja',
      'Dos de cabillaud vapeur, crumble de sarrasin torréfié',
      // Pâtes & Risotto
      'Coquillettes à la truffe, jambon rostello aux herbes',
      'Risotto d\'épeautre aux pleurotes',
      // Ardoise / Viandes
      'Tre Cento Venti — Filet de bœuf 180 g',
      'Tre Cento Venti — Bavette Simmental 240 g',
      'Cochon fondant, purée de pommes de terre, jus corsé',
      'Poulet Kuala Lumpur, lait de coco et riz basmati',
      'Andouillette ficelle « Maison Guery »',
      'Suprême de volaille fermière d\'Ancenis label rouge',
      'Paleron de bœuf « Black Pearl », purée à la truffe',
      // Menu enfant
      'Menu Loupiot (enfant)',
      // Desserts
      'Mousse au chocolat maison',
      'Tiramisu maison',
      'Crème brûlée (vanille, rhum ou cointreau)',
      'Crème flambée',
      'Salade d\'agrumes, sirop aux épices',
      'Coulant chocolat',
      'Café gourmand',
      'Crémet d\'Anjou aux fruits rouges',
      // Coupes glacées
      'Dame blanche',
      'Colonel',
      'So Good',
      'After Eight',
      'Affogato',
    ],
    socialLinks: {
      facebook: 'https://facebook.com/joecarpaangers',
      instagram: 'https://instagram.com/joe_carpa_angers',
      linkedin: 'https://linkedin.com/company/joe-carpa-angers',
      googleBusiness: 'https://g.page/joecarpa-angers',
    },
    brandGuidelines: JOE_CARPA_PLAYBOOK,
    brandHashtags: {
      core: ['#cesttoujoursunebonneidee', '#homeofthebeef', '#gastronomie', '#brasserie', '#cocktail'],
      local: ['#angers', '#angersmaville', '#angersfood', '#anjou', '#sortirangers', '#restaurantangers', '#brasserieangers'],
      product: ['#viande', '#cotedeboeuf', '#wagyu', '#noirdebaltique', '#galice', '#bueygallego', '#normande', '#rougedespres', '#tartare', '#carpaccio', '#poissonfrais', '#produitsdesaison', '#chefdetalent', '#ardoisedujour'],
      linkedin: ['#restauration', '#gastronomie', '#anjou', '#angers', '#repasaffaires', '#artisanat', '#chefdetalent'],
    },
    ctaLibrary: [
      'Réservez au 02.41.34.29.39',
      'Réservation : joecarpa.fr',
      'On vous garde une table ?',
      'Lien en bio pour réserver',
      'On vous attend ce soir dès 19h',
      'Passez ce midi avant 14h pour la formule',
      'Une côte de Galice vous tend les bras',
    ],
    signaturePlatforms: ['instagram', 'facebook', 'linkedin', 'google'],
    createdAt: nowIso(),
  };

  const mediaItems: MediaFile[] = [
    {
      id: uid('med'),
      establishmentId: e1.id,
      url: 'https://images.unsplash.com/photo-1558030006-450675393462?w=1200&q=80',
      source: 'upload',
      uploadedAt: nowIso(),
      alt: 'Côte de bœuf maturée — ardoise du jour',
    },
    {
      id: uid('med'),
      establishmentId: e1.id,
      url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80',
      source: 'upload',
      uploadedAt: nowIso(),
      alt: 'Carpaccio de bœuf, copeaux parmesan',
    },
    {
      id: uid('med'),
      establishmentId: e1.id,
      url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80',
      source: 'upload',
      uploadedAt: nowIso(),
      alt: 'Salle Joe Carpa — ambiance tamisée Konper Group',
    },
    {
      id: uid('med'),
      establishmentId: e1.id,
      url: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=1200&q=80',
      source: 'upload',
      uploadedAt: nowIso(),
      alt: 'Tartare de bœuf au couteau',
    },
  ];

  const posts: Post[] = [];
  const validations: ValidationEntry[] = [];

  const platformAccounts: PlatformAccount[] = [
    { id: uid('pa'), establishmentId: e1.id, platform: 'facebook', connected: false, handle: 'Joe Carpa Angers' },
    { id: uid('pa'), establishmentId: e1.id, platform: 'instagram', connected: false, handle: '@joe_carpa_angers' },
    { id: uid('pa'), establishmentId: e1.id, platform: 'linkedin', connected: false, handle: 'Joe Carpa Angers' },
    { id: uid('pa'), establishmentId: e1.id, platform: 'google', connected: false, handle: 'Joe Carpa Angers' },
  ];

  return {
    establishments: [e1],
    posts,
    media: mediaItems,
    validations,
    platformAccounts,
  };
}
