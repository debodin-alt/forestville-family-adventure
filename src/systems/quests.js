// Quest logic: objectives, map interactables and story beats.
// Text lives in data/dialogue.js; this file decides when it plays.

import { LINES, EXAMINE, FAMILY_TALK, NPC_TALK, INTRO, TIP } from '../data/dialogue.js';
import { SPOTS, G } from '../data/maps/forestville.js';
import { MSPOTS } from '../data/maps/manly.js';
import { FEATHER_IDS } from './save.js';

export function objective(s) {
  const c1 = s.quests.ch1, c2 = s.quests.ch2;
  if (!c1.done) {
    const n = c1.feathers.length;
    const hint = !c1.feathers.includes('pond') ? 'The ducks at the pond look suspicious.'
      : c1.kooka === 0 && !c1.feathers.includes('kooka') ? 'The kookaburra on the Garigal track sees everything.'
      : c1.kooka === 1 && !c1.feathers.includes('kooka') ? 'Find the ibis by the bins near the bakery.'
      : c1.bev === 1 ? 'Find Bev’s secateurs by the big grass tree on the track.'
      : c1.bev === 2 ? 'Take the secateurs back to Bev on Starkey Street.'
      : !c1.feathers.includes('bev') ? 'Bev next door might need a hand.'
      : !c1.feathers.includes('school') ? 'Ms Aroha is at the school playground.'
      : 'Follow the Garigal track to the waterfall.';
    return { chapter: 'Ch 1 · Finn’s Feathers', objective: n === 0 ? 'Find Finn’s five lucky feathers' : hint, feathers: n };
  }
  if (!c2.done) {
    if (!c2.arrived) return { chapter: 'Ch 2 · Family Day Out', objective: 'Catch the B-Line to Manly from the stop by the shops', feathers: null };
    const todo = [];
    if (!c2.duck) todo.push('find Finn’s beach duck');
    if (!c2.lookout) todo.push('race to the Shelly Beach lookout');
    return { chapter: 'Ch 2 · Family Day Out', objective: todo.length ? todo.join(' · ').replace(/^./, m => m.toUpperCase()) : 'Take the family photo at the lookout', feathers: null };
  }
  return { chapter: 'Adventure complete', objective: 'Explore Forestville and Manly at your own pace', feathers: null };
}

// Called when a map starts.
export function onEnterMap(S) {
  const q = S.save.quests;
  if (S.mapId === 'forestville' && !q.intro) {
    S.delay(700, () => S.say([...INTRO[S.who](S.ctx()), ...TIP], () => { q.intro = true; S.persist(); S.refresh(); }));
  }
  if (S.mapId === 'manly' && !q.ch2.arrived) {
    S.delay(900, () => S.say(LINES.manlyArrive, () => { q.ch2.arrived = true; S.persist(); S.refresh(); S.chime(); }));
  }
}

export function onFeatherCollected(S, id) {
  const c1 = S.save.quests.ch1;
  if (!c1.feathers.includes(id)) c1.feathers.push(id);
  S.persist(); S.refresh();
  const n = c1.feathers.length;
  if (n >= FEATHER_IDS.length && !c1.done) {
    c1.done = true; S.save.quests.ch2.unlocked = true; S.persist();
    S.celebrate();
    S.delay(500, () => S.say(LINES.allFeathers, () => { S.refresh(); S.showTitle('CHAPTER 2', 'Family Day Out'); }));
  } else {
    S.toast(`Lucky feather ${n} of 5!`);
  }
}

// Build the interactables for the current map.
export function buildInteractables(S) {
  const q = S.save.quests, c1 = q.ch1, c2 = q.ch2;
  const list = [];
  // keep getters live (no spread): some targets move around
  const add = d => { if (d.r == null) d.r = 64; if (d.markerH == null) d.markerH = 70; list.push(d); };
  const ex = (id, x, y, label, key, extra = {}) => add(Object.assign({ id, x, y, verb: 'examine', label, run: () => S.say(EXAMINE[key](S.ctx())) }, extra));

  if (S.mapId === 'forestville') {
    // --- Feather 1: duck on the nest at the pond
    const nest = S.animal('nestDuck');
    add({
      id: 'nestDuck', verb: 'talk', label: 'Duck', get x() { return nest.x; }, get y() { return nest.y; }, markerH: 40,
      when: () => !c1.duckMoved,
      run: () => S.say(LINES.duckNest(S.ctx()), () => {
        c1.duckMoved = true; S.persist(); S.quack();
        S.walkAnimal('nestDuck', G.pond.x + 120, G.pond.y - 60);
        S.spawnFeather('pond', SPOTS.duckNest[0], SPOTS.duckNest[1] + 4);
      }),
    });

    // --- Feather 2: kookaburra -> ibis
    add({
      id: 'kooka', verb: 'talk', label: 'Kookaburra', x: SPOTS.kookaTree[0], y: SPOTS.kookaTree[1] + 6, markerH: 150,
      run: () => {
        S.laugh();
        if (c1.feathers.includes('kooka')) return S.say(LINES.kookaDone);
        if (c1.kooka === 1) return S.say(LINES.kookaAgain);
        S.say(LINES.kookaFirst(S.ctx()), () => { c1.kooka = 1; S.persist(); S.refresh(); S.emphasize(SPOTS.ibis[0], SPOTS.ibis[1]); });
      },
    });
    const ibis = S.animal('ibis');
    add({
      id: 'ibis', verb: 'talk', label: 'Ibis', get x() { return ibis.x; }, get y() { return ibis.y; }, markerH: 64,
      run: () => {
        if (c1.feathers.includes('kooka') || S.hasPickup('kooka')) return S.say(LINES.ibisAfter);
        if (c1.kooka === 0) return S.say(LINES.ibisBefore);
        S.say(LINES.ibisGive(S.ctx()), () => { S.spawnFeather('kooka', ibis.x + 30, ibis.y + 6); S.wanderAnimal('ibis'); });
      },
    });

    // --- Feather 3: school sandpit (Ms Aroha gives the hint)
    add({
      id: 'sandpit', verb: 'examine', label: 'Sandpit', x: SPOTS.sandpit[0], y: SPOTS.sandpit[1], r: 80, markerH: 30,
      run: () => {
        if (c1.sandDug) return S.say(LINES.sandpitEmpty);
        S.say(LINES.sandpit(S.ctx()), () => { c1.sandDug = true; S.persist(); S.dig(SPOTS.sandpit[0], SPOTS.sandpit[1]); S.spawnFeather('school', SPOTS.sandpit[0] + 20, SPOTS.sandpit[1] + 10); });
      },
    });

    // --- Feather 4: Bev's secateurs
    add({
      id: 'grassTree', verb: 'examine', label: 'Grass tree', x: SPOTS.grassTree[0], y: SPOTS.grassTree[1] + 10, markerH: 120,
      run: () => {
        if (c1.bev === 1) S.say(LINES.grassTreeFind, () => { c1.bev = 2; S.persist(); S.refresh(); S.itemGet('Bev’s secateurs'); });
        else S.say(LINES.grassTree);
      },
    });

    // --- Feather 5: the ledge above the waterfall
    add({
      id: 'ledge', verb: 'examine', label: 'Sandstone ledge', x: SPOTS.ledge[0], y: SPOTS.ledge[1] + 40, r: 90, markerH: 90,
      when: () => !c1.ledge,
      run: () => S.say(LINES.ledge(S.ctx()), () => { c1.ledge = true; S.persist(); S.spawnFeather('bush', S.player.x + 24, S.player.y + 8, true); }),
    });

    // --- travel
    add({
      id: 'bus', get verb() { return c1.done ? 'travel' : 'examine'; }, get label() { return c1.done ? 'Bus to Manly' : 'Bus stop'; }, x: SPOTS.busStop[0], y: SPOTS.busStop[1] + 10, r: 80, markerH: 110,
      run: () => { if (!c1.done) S.say(LINES.busLocked(S.ctx())); else S.travel('manly'); },
    });

    // --- flavour
    ex('mailbox', 690, 2160, 'Letterbox', 'mailbox', { markerH: 60 });
    ex('hoist', 330, 1615, 'Clothesline', 'hoist', { markerH: 110 });
    ex('guitar', 720, 1775, 'Guitar', 'guitar', { markerH: 36, r: 50 });
    ex('car', 820, 2095, 'Family car', 'car', { markerH: 60 });
    ex('bench', 1320, 846, 'Bench', 'bench', { markerH: 50 });
    ex('trackSign', SPOTS.signTrack[0], SPOTS.signTrack[1] + 6, 'Track sign', 'trackSign', { markerH: 80 });
    ex('cafe', 1790, 975, 'The Bush Bean', 'cafe', { markerH: 120 });
    ex('schoolSign', 2560, 1780, 'School', 'school', { markerH: 150, r: 90 });
  }

  if (S.mapId === 'manly') {
    const duck = S.animal('rockDuck');
    add({
      id: 'rockDuck', verb: 'talk', label: 'Duck', get x() { return duck.x; }, get y() { return duck.y; }, markerH: 40, r: 80,
      run: () => {
        S.quack();
        if (c2.duck) return S.say(LINES.rockDuckAgain);
        S.say(LINES.rockDuck(S.ctx()), () => { c2.duck = true; S.persist(); S.refresh(); S.celebrate(true); S.toast('Found Finn’s beach duck!'); });
      },
    });
    add({
      id: 'tripod', verb: 'activate', label: 'Family photo', x: MSPOTS.tripod[0], y: MSPOTS.tripod[1] + 30, r: 80, markerH: 80,
      run: () => {
        if (!c2.duck || !c2.lookout) return S.say(LINES.photoLocked(S.ctx()));
        S.say(LINES.photo, () => S.photo());
      },
    });
    add({ id: 'busBack', verb: 'travel', label: 'Bus to Forestville', x: MSPOTS.busStop[0], y: MSPOTS.busStop[1] + 8, r: 80, markerH: 110, run: () => S.travel('forestville') });
    ex('kiosk', 420, 345, 'Kiosk', 'kiosk', { markerH: 120 });
    ex('kiosk2', 2480, 575, 'Kiosk', 'kiosk', { markerH: 120 });
    ex('flags', 730, 1010, 'Surf flags', 'surfFlags', { markerH: 90, r: 120 });
    const pel = S.animal('pelican');
    if (pel) add({ id: 'pelican', verb: 'examine', label: 'Pelican', get x() { return pel.x; }, get y() { return pel.y; }, markerH: 60, run: () => S.say(EXAMINE.pelican(S.ctx())) });
  }
  return list;
}

// Conversation with a walking character (family or neighbour).
export function talkTo(S, id) {
  const c = S.ctx(id);
  const q = S.save.quests;
  if (id === 'bev' && q.ch1.bev === 2) {
    return S.say(LINES.bevReturn, () => { q.ch1.bev = 3; S.persist(); S.spawnFeather('bev', S.npcPos('bev').x + 34, S.npcPos('bev').y + 10); });
  }
  if (id === 'bev' && q.ch1.bev === 0) return S.say(NPC_TALK.bev(c), () => { q.ch1.bev = 1; S.persist(); S.refresh(); });
  const fn = FAMILY_TALK[id] || NPC_TALK[id];
  S.say(fn(c));
}

// Position-based beats (checked every frame, cheap).
export function onMove(S, x, y) {
  const q = S.save.quests;
  if (S.mapId === 'manly' && q.ch2.arrived && !q.ch2.lookout && Math.hypot(x - MSPOTS.lookout[0], y - MSPOTS.lookout[1]) < 90) {
    q.ch2.lookout = true; S.persist(); S.refresh();
    S.say(LINES.lookout(S.ctx()), () => S.celebrate(true));
  }
}
