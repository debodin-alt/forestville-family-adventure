// Catchable species by water type. Sizes in cm. Weight = relative chance.
// All catches are released (the game says so): this is catch-and-release fishing.

export const FISH = {
  // freshwater (pond, creek)
  bass: { name: 'Australian bass', size: [18, 45], w: 5, col: '#8f8a5a', belly: '#d9d2a8', shape: 'perch', blurb: 'A native freshwater fighter. Released with a thank-you.' },
  eel: { name: 'Short-finned eel', size: [40, 90], w: 3, col: '#5d5a3d', belly: '#a8a27a', shape: 'eel', blurb: 'Slippery. Very slippery. It slid back in by itself.' },
  yabby: { name: 'Yabby', size: [8, 16], w: 4, col: '#5b6f8a', belly: '#9fb2c9', shape: 'yabby', blurb: 'A freshwater crayfish. Waved its claws like it meant it.' },
  gudgeon: { name: 'Firetail gudgeon', size: [3, 6], w: 3, col: '#b86a3a', belly: '#f0c08a', shape: 'minnow', blurb: 'Tiny, bright and extremely offended.' },
  boot: { name: 'Old gumboot', size: [30, 30], w: 1, col: '#2f5a3a', belly: '#244a2f', shape: 'boot', junk: true, blurb: 'Size 9. No sign of the other one.' },
  // surf (Manly beach)
  whiting: { name: 'Sand whiting', size: [18, 40], w: 5, col: '#d9cfa8', belly: '#f4efe0', shape: 'slim', blurb: 'Classic beach catch. Back it goes.' },
  bream: { name: 'Yellowfin bream', size: [20, 40], w: 4, col: '#b9b8a8', belly: '#e8e2c8', fin: '#e8b83a', shape: 'perch', blurb: 'Silver with yellow fins. Very handsome.' },
  salmon: { name: 'Australian salmon', size: [35, 70], w: 2, col: '#5f7f8a', belly: '#dfe6e2', shape: 'slim', blurb: 'Not actually a salmon. Pulls like a train.' },
  flathead: { name: 'Dusky flathead', size: [30, 80], w: 2, col: '#8a7355', belly: '#e0d3b8', shape: 'flat', blurb: 'Lies in the sand pretending to be sand.' },
  thong: { name: 'Lost thong', size: [26, 26], w: 1, col: '#2f6fa3', belly: '#f2c230', shape: 'thong', junk: true, blurb: 'Left foot. Someone at Manly is hopping.' },
  // harbour (Circular Quay)
  luderick: { name: 'Luderick', size: [25, 45], w: 4, col: '#4f5a55', belly: '#a9b1a8', shape: 'perch', blurb: 'Loves weed and wharves. Locals call it a blackfish.' },
  leatherjacket: { name: 'Leatherjacket', size: [15, 30], w: 4, col: '#a79a6a', belly: '#e0d6a8', shape: 'jacket', blurb: 'Tough skin, tiny mouth, big attitude.' },
  squid: { name: 'Southern calamari', size: [20, 40], w: 2, col: '#e9c7c0', belly: '#f7ebe6', shape: 'squid', blurb: 'Inked the wharf. Worth it.' },
  kingfish: { name: 'Yellowtail kingfish', size: [60, 110], w: 1, col: '#5d7f9a', belly: '#e6ecee', fin: '#f2c230', shape: 'slim', rare: true, blurb: 'A rare harbour giant! Everyone on the ferry clapped.' },
  crisp: { name: 'Chip packet', size: [20, 20], w: 1, col: '#e0453b', belly: '#f2c230', shape: 'packet', junk: true, blurb: 'Salt & vinegar. The gulls are furious you found it first.' },
};

export const WATERS = {
  pond: ['bass', 'bass', 'yabby', 'gudgeon', 'eel', 'boot'],
  creek: ['yabby', 'gudgeon', 'eel', 'bass'],
  surf: ['whiting', 'bream', 'salmon', 'flathead', 'thong'],
  harbour: ['luderick', 'leatherjacket', 'bream', 'squid', 'kingfish', 'crisp'],
};

export function rollCatch(water) {
  const ids = WATERS[water] || [];
  const pool = [...new Set(ids)];
  const total = pool.reduce((a, id) => a + FISH[id].w * ids.filter(i => i === id).length, 0);
  let r = Math.random() * total;
  for (const id of pool) { r -= FISH[id].w * ids.filter(i => i === id).length; if (r <= 0) return id; }
  return pool[0];
}

// Snorkel spotting list for Cabbage Tree Bay (no-take reserve, look don't touch).
export const SEA_LIFE = {
  groper: { name: 'Eastern blue groper', col: '#2f6fb5', belly: '#6fa3d8', shape: 'groper', blurb: 'NSW’s state fish. Big, blue and curious about your mask.' },
  wobbegong: { name: 'Wobbegong', col: '#8a7a55', belly: '#c9b78a', shape: 'wobbe', blurb: 'A carpet shark having a lie-down. Do not disturb.' },
  cuttlefish: { name: 'Giant cuttlefish', col: '#c98f6a', belly: '#f0d0b8', shape: 'cuttle', blurb: 'Changed colour three times while you watched.' },
  pjshark: { name: 'Port Jackson shark', col: '#b8a68a', belly: '#e6dccb', shape: 'pj', blurb: 'Harness-pattern markings and a very chill attitude.' },
  turtle: { name: 'Green turtle', col: '#6f8f4a', belly: '#c9b98a', shape: 'turtle', blurb: 'A rare visitor. Everyone went quiet and just watched.' },
};
