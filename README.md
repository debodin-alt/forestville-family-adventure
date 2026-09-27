# Forestville Family Adventure

A small, original, cozy family adventure set in Forestville and Manly on Sydney’s Northern Beaches.

**Playable family**
- Dan: bear. Relaxed dad, keep cup, guitar on his back.
- Finn: goose. Backwards red cap, maximum curiosity.
- Jessia: rabbit. Hoodie, headphones, one floppy ear, deadpan.
- Jarency: cheetah. Sunglasses up, scarf, tote bag, has a plan.

## V2

- Hand-painted, code-drawn characters with idle, walk, blink, three facings, squash and stretch, and shadows.
- A Forestville that feels like a real place:
  - home with a Hills Hoist, veggie patch and brick letterbox
  - Bev’s place next door
  - the village shops, zebra crossing and live traffic
  - Forestville Primary, with its playground, sandpit and oval
  - the duck pond with jetty and ducks
  - the Garigal track, with gums, grass trees, sandstone, ferns, a creek and a waterfall
- Manly and Shelly Beach:
  - the Corso shops and a promenade lined with Norfolk pines
  - surf flags, swimmers, gulls and rolling waves
  - rock pools
  - the headland lookout
- **Chapter 1: Finn’s Feathers.** Five feathers, each earned through a small interaction: a duck, a kookaburra tip, an ibis standoff, a sandpit dig, a favour for Bev and a waterfall ledge.
- **Chapter 2: Family Day Out.** Take the B-Line to Manly, find a duck where ducks should not be, race to the lookout, and take the family photo.
- A reusable interaction system with Talk, Look, Take, Use and Travel, context prompts, an in-world marker and an action button that shows the verb.
- Contextual dialogue that changes with location, quest progress and who you are playing.
- Camera ease and look-ahead, focus moments on discoveries, and area titles.
- Mobile-first controls: floating joystick, a big action button, safe areas, `dvh` sizing, portrait and landscape layouts, and haptics on supported browsers.
- Original WebAudio sound made in code: footsteps that change with the surface, pickups, dialogue blips, a fanfare, and ambience for the bush, village and beach. There is a mute button.
- A versioned save system (V2) that migrates V1 saves, backs up damaged saves instead of wiping them, and keeps a reset option in the menu.

## V3

- **Water:** wade into the pond, creek and surf. Legs disappear under the waterline, and you get ripples and splashes. With snorkels you can swim properly.
- **Fishing:** get the rod from the garden shed at home. Face any water and cast, wait out the nibbles, then press when the float plunges. There are 15 catches: pond and creek species, Manly surf species and harbour species, plus junk like a gumboot and a lost thong. It's all catch and release, and there's no fishing in the Cabbage Tree Bay reserve.
- **Chapter 3, Under the Bay:** Kez hands out snorkels. Swim out from Shelly Beach and spot the groper, wobbegong, cuttlefish, Port Jackson shark and turtle.
- **Chapter 4, Harbour Day:** take the Manly ferry to a fictionalised Circular Quay, with the bridge across the water, the sail-roofed arts house, the Botanic Garden figs and city ibis. Hear Jess busk, catch a fish off a wharf, then take the family photo on the big steps.
- **Music:** original looping themes for Forestville, Manly and the harbour, plus a calm underwater pad. They're sequenced live, and there's a separate Music toggle in the menu.
- **More sound:** splashes, casting, reeling, bites, catch jingles, the ferry horn, shed creaks and menu whooshes.
- **Photo album:** take photos any time with the camera button (or P). Family photos are saved automatically. The album also shows a fish log and sea life seen.
- **Day cycle:** the light moves from morning to golden hour, sunset, dusk and dawn, about 16 minutes per day, and street lamps glow at dusk.
- Family and neighbours are solid, so you bump into them instead of walking through them.
- **Offline play:** a service worker caches the game after the first visit, and Phaser is bundled in `vendor/`.
- **Faster start:** all art is pre-baked to `assets/baked/` (WebP). If a bake is missing or out of date, the game quietly paints everything in code instead.

## Kart racing: Level 5 Karting, Moore Park

This is a fictionalised version of the indoor electric-kart track on the top level of the Moore Park car park.

- Catch the kart bus from the sign next to the B-Line stop in Forestville, or from the city street at the Quay.
- The track has an F1-style layout, tyre walls, red-and-white kerbs, concrete pillars and LED ceiling strips.
- The race starts with five red lights, and you race three laps against the family.
- Touch: point the joystick where you want to drive. Keyboard: arrows or WASD. Space honks.
- Camera button (or V) switches between the overhead view and a first-person driver's seat, with a pseudo-3D floor, tyre walls, pillars, LED ceiling and a steering wheel.
- Best lap, wins and a podium photo are saved.

## Sound on iPhone

The game asks iOS for "playback" audio and keeps a silent media element running, so music and effects play even when the ring/silent switch is on. Check the volume buttons and the in-game speaker button if it's still quiet.

## Controls

| | Touch | Keyboard |
|---|---|---|
| Walk | Drag anywhere on the lower left | WASD / arrows |
| Interact | Big round button | E / Space / Enter |
| Swap family member | Tap a portrait | 1–4 |
| Mute | Speaker button | M |
| Photo | Camera button | P |
| Menu | ☰ | Esc |

## Run locally

Serve the repository folder with any static server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Re-baking art

After changing anything in `src/art/`, a map's `paintGround` or `buildProps`, bump `ART_VERSION` in `src/art/assets.js`, then:

```bash
npm i -D playwright            # once
python3 -m http.server 8080    # in the repo root
node tools/bake.mjs http://localhost:8080
```

This regenerates `assets/baked/` and the app icons. If you skip it, nothing breaks. The game just paints the art itself, which makes the start a little slower.

## Deployment

`.github/workflows/deploy-pages.yml` publishes the repo root to GitHub Pages on every push to `main`. There is no build step, and all paths are relative, so the site works from `https://debodin-alt.github.io/forestville-family-adventure/`.

## Project layout

```
index.html            page shell + HUD markup
styles/game.css       HUD, panels, touch controls
src/main.js           boot, Phaser config, HUD wiring
src/state.js          shared runtime state
src/scenes/           WorldScene (runs any map)
src/entities/         Critter (animated character)
src/systems/          save, audio, music, input, collision, quests, fishing, photos, daylight, ambient life
src/data/             characters, dialogue, fish, maps (Forestville, Manly, Harbour)
src/art/              procedural painters (characters, props, ground, fish) + bake helpers
assets/baked/         pre-rendered art (generated by tools/bake.mjs)
vendor/               Phaser 3.90.0
sw.js                 offline cache
src/ui/hud.js         dialogue, prompts, titles, menu, endings
```

## Assets and licences

- All art is painted with canvas code in `src/art/`. All sound is synthesised live in `src/systems/audio.js`. There are no image or audio files and no third-party assets.
- Runtime dependency: Phaser 3.90.0 (MIT), bundled in `vendor/` (licence in `vendor/PHASER-LICENSE.md`).
- The project is original. It uses no Nintendo (or other commercial) artwork, sounds, UI, code or names.

## Save data

- Stored in `localStorage` under `forestville-family-v2`.
- The V1 key (`forestville-family-v1`) is read once for migration and never deleted.
- A save that can’t be read is copied to `forestville-family-v2-backup-<timestamp>` before a new game starts.
- Album photos live separately under `forestville-family-v2-photos`, up to 30 of them, so a full album can never block saving.
