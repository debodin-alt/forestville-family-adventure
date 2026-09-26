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

## Controls

| | Touch | Keyboard |
|---|---|---|
| Walk | Drag anywhere on the lower left | WASD / arrows |
| Interact | Big round button | E / Space / Enter |
| Swap family member | Tap a portrait | 1–4 |
| Mute | Speaker button | M |
| Menu | ☰ | Esc |

## Run locally

Serve the repository folder with any static server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

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
src/systems/          save, audio, input, collision, interaction/quests, ambient life
src/data/             characters, dialogue, maps (Forestville, Manly)
src/art/              procedural painters for characters, props and ground
src/ui/hud.js         dialogue, prompts, titles, menu, endings
```

## Assets and licences

- All art is painted with canvas code in `src/art/`. All sound is synthesised live in `src/systems/audio.js`. There are no image or audio files and no third-party assets.
- Runtime dependency: Phaser 3.90.0 (MIT) from jsDelivr.
- The project is original. It uses no Nintendo (or other commercial) artwork, sounds, UI, code or names.

## Save data

- Stored in `localStorage` under `forestville-family-v2`.
- The V1 key (`forestville-family-v1`) is read once for migration and never deleted.
- A save that can’t be read is copied to `forestville-family-v2-backup-<timestamp>` before a new game starts.
