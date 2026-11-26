// Shortflix catalog. Every entry is a real short film (or series episode) that is
// free to watch on its official YouTube channel with embedding enabled.
// Runtimes are in minutes. Posters use YouTube's own thumbnails.

export const CATALOG = [
  {
    id: 'hair-love',
    type: 'film',
    title: 'Hair Love',
    year: 2019,
    runtime: 7,
    genres: ['Animation', 'Family'],
    award: 'Oscar Winner',
    synopsis:
      'A father has to do his daughter Zuri\'s hair for the first time, and what seems like a simple task becomes a heroic effort.',
    videoId: 'kNw8V_Fkw28',
    channel: 'Sony Pictures Animation',
    featured: true,
    trending: true,
  },
  {
    id: 'neighbors-window',
    type: 'film',
    title: "The Neighbors' Window",
    year: 2019,
    runtime: 20,
    genres: ['Drama'],
    award: 'Oscar Winner',
    synopsis:
      'A mother of three, stuck in the routine of raising young kids, becomes obsessed with the seemingly carefree young couple across the street.',
    videoId: 'k1vCrsZ80M4',
    channel: 'Marshall Curry Productions',
    trending: true,
  },
  {
    id: 'stutterer',
    type: 'film',
    title: 'Stutterer',
    year: 2015,
    runtime: 12,
    genres: ['Drama', 'Romance'],
    award: 'Oscar Winner',
    synopsis:
      'Greenwood, a lonely typographer with a severe stutter, must speak out loud for the first time when his online relationship moves offline.',
    videoId: '2m_VTZR5MU0',
    channel: 'The New Yorker',
    trending: true,
  },
  {
    id: 'in-a-heartbeat',
    type: 'film',
    title: 'In a Heartbeat',
    year: 2017,
    runtime: 4,
    genres: ['Animation', 'Romance'],
    award: null,
    synopsis:
      'A closeted boy runs the risk of being outed by his own heart after it pops out of his chest to chase down the boy of his dreams.',
    videoId: '2REkk9SCRn0',
    channel: 'In a Heartbeat Animated Short Film',
    trending: true,
  },
  {
    id: 'one-small-step',
    type: 'film',
    title: 'One Small Step',
    year: 2018,
    runtime: 8,
    genres: ['Animation', 'Family'],
    award: 'Oscar Nominee',
    synopsis:
      'Luna, a young Chinese American girl, dreams of becoming an astronaut, carried by her father\'s quiet support and one very special pair of shoes.',
    videoId: 'yWd4mzGqQYo',
    channel: 'TAIKO Studios',
  },
  {
    id: 'a-single-life',
    type: 'film',
    title: 'A Single Life',
    year: 2014,
    runtime: 2,
    genres: ['Animation', 'Comedy'],
    award: 'Oscar Nominee',
    synopsis:
      'Pia finds a mysterious vinyl record that lets her travel back and forth through her own life by skipping the needle.',
    videoId: 'pzAZnOyMTI4',
    channel: 'JOB, JORIS & MARIEKE',
  },
  {
    id: 'the-present',
    type: 'film',
    title: 'The Present',
    year: 2014,
    runtime: 4,
    genres: ['Animation', 'Family'],
    award: null,
    synopsis:
      'A boy glued to his video game gets a puppy as a present. The puppy has a missing leg, and the boy wants nothing to do with it. At first.',
    videoId: 'WjqiU5FgsYc',
    channel: 'The Present',
    trending: true,
  },
  {
    id: 'lights-out',
    type: 'film',
    title: 'Lights Out',
    year: 2013,
    runtime: 3,
    genres: ['Horror', 'Thriller'],
    award: null,
    synopsis:
      'A woman is about to go to bed when she notices something in the hallway that only moves when the lights are out. The short that launched the feature film.',
    videoId: 'FUQhNGEu2KA',
    channel: 'ponysmasher',
  },
  {
    id: 'a-date-in-2025',
    type: 'film',
    title: 'A Date in 2025',
    year: 2017,
    runtime: 14,
    genres: ['Sci-Fi', 'Comedy'],
    award: null,
    synopsis:
      "Daniel hasn't left his apartment in 42 days. His superintelligent AI Counselor decides it's time he went on a date, whether he likes it or not.",
    videoId: 'NZ8G3e3Cgl4',
    channel: 'DUST',
  },
  {
    id: 'the-leap',
    type: 'film',
    title: 'The Leap',
    year: 2015,
    runtime: 28,
    genres: ['Sci-Fi', 'Drama'],
    award: null,
    synopsis:
      'In 2069, New Earth is declared open for civilian migration. For one man in London, the leap to another world is the only way to matter.',
    videoId: 'GoJb30Une-A',
    channel: 'DUST',
  },
  {
    id: 'simons-cat',
    type: 'series',
    title: "Simon's Cat",
    year: 2008,
    genres: ['Animation', 'Comedy'],
    award: null,
    synopsis:
      'The classic hand-drawn series about a perpetually hungry cat and the long-suffering man who feeds him. Every episode is under 5 minutes.',
    channel: "Simon's Cat",
    posterId: 'w0ffwDYo00Q',
    episodes: [
      { id: 'sc1', title: 'Cat Man Do', videoId: 'w0ffwDYo00Q', runtime: 2 },
      { id: 'sc2', title: 'Let Me In!', videoId: '4rb8aOzy9t4', runtime: 2 },
      { id: 'sc3', title: 'TV Dinner', videoId: 's13dLaTIHSg', runtime: 3 },
      { id: 'sc4', title: 'Hot Spot', videoId: 'uOHvZjiDANg', runtime: 3 },
    ],
  },
]

export const thumb = (videoId) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

export const posterFor = (item) =>
  item.type === 'series' ? thumb(item.posterId || item.episodes[0].videoId) : thumb(item.videoId)
