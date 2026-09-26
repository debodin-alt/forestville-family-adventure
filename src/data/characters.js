// Character definitions. Art is painted in src/art/critters.js from these specs.

export const FAMILY = ['dan', 'finn', 'jessia', 'jarency'];

export const CHARACTERS = {
  dan: {
    name: 'Dan', species: 'bear', speed: 150, voice: 150,
    fur: '#8a5a3c', furLight: '#d8b48d', outfit: '#2f8a86', outfit2: '#246b68',
    blurb: 'Relaxed dad. Coffee first.',
  },
  finn: {
    name: 'Finn', species: 'goose', speed: 170, voice: 420,
    fur: '#f7f4ec', furLight: '#ffffff', outfit: '#d64533', outfit2: '#a8321f',
    blurb: 'Goose. Curious. Slightly chaotic.',
  },
  jessia: {
    name: 'Jessia', species: 'rabbit', speed: 160, voice: 300,
    fur: '#d9cfc5', furLight: '#f4eee8', outfit: '#6f54a8', outfit2: '#553f85',
    blurb: 'Teenager. Guitar. Deadpan.',
  },
  jarency: {
    name: 'Jarency', species: 'cheetah', speed: 165, voice: 240,
    fur: '#e3ae50', furLight: '#fbecd0', outfit: '#f3e7d3', outfit2: '#c4552d',
    blurb: 'Stylish. Warm. Has a plan.',
  },

  // Neighbours and locals
  bev: {
    name: 'Bev', species: 'wombat', speed: 40, voice: 190,
    fur: '#8b7b6c', furLight: '#b9a894', outfit: '#6f8f4e', outfit2: '#e2c27a',
  },
  mo: {
    name: 'Mo', species: 'koala', speed: 40, voice: 170,
    fur: '#a3a7ab', furLight: '#eceae6', outfit: '#6b4a33', outfit2: '#4d3424',
  },
  aroha: {
    name: 'Ms Aroha', species: 'possum', speed: 40, voice: 260,
    fur: '#8f8984', furLight: '#d9d3cc', outfit: '#d9a441', outfit2: '#2f6fa3',
  },
  kez: {
    name: 'Kez', species: 'kangaroo', speed: 40, voice: 210,
    fur: '#c98e57', furLight: '#efd3b0', outfit: '#f2c230', outfit2: '#d8352a',
  },
};

// Speakers that are not walking characters (birds etc.) for dialogue headers.
export const SPEAKERS = {
  kooka: { name: 'Kookaburra', species: 'kookaburra', voice: 520 },
  duck: { name: 'Duck', species: 'duck', voice: 600 },
  ibis: { name: 'Ibis', species: 'ibis', voice: 380 },
  sign: { name: '', species: 'sign', voice: 0 },
};

export function speakerInfo(id) {
  return CHARACTERS[id] || SPEAKERS[id] || { name: '', species: 'sign', voice: 0 };
}
