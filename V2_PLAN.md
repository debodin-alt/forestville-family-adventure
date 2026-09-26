# Forestville Family Adventure: V2 plan

## Audit of V1

**Architecture.** Static site with no build step. `index.html` loads Phaser 3.90.0 from jsDelivr, then `src/main.js` as an ES module. That one file (~14 KB, minified style) holds everything:

- save data (`localStorage`, key `forestville-family-v1`)
- DOM HUD (joystick, action button, dialogue, character switcher)
- a single `ForestvilleScene`

The scene draws the world with one Phaser `Graphics` object, creates emoji-free vector textures for the four family members, and uses Arcade physics for movement and collisions. Sydney Harbour sits in the same map, to the right of Forestville.

**Deployment.** `.github/workflows/deploy-pages.yml` runs on every push to `main` and uploads the repo root as the Pages artifact. All paths are relative (`./styles`, `./src`), so the game works from the `/forestville-family-adventure/` subdirectory. The README's "Deploy from a branch" note is out of date: the site is deployed by the Actions workflow.

**Bugs and weak spots**

1. `store()` has no `try/catch`. Safari private mode or a full quota throws inside the update loop every 1.5 s.
2. You can walk from Forestville straight into Sydney Harbour and onto the water. The bus is decorative, and the harbour water has no collider.
3. Depth is fixed. The player always draws on top of tree canopies and buildings.
4. The prompt says "A" on desktop, where the key is E or Space.
5. Camera zoom is set only when switching characters, not on resize or rotation.
6. Emoji are used for the bus, camera, avatars and switcher, so they render differently on every platform.
7. Feathers are simple pickups with no interaction. The "Emergency!" intro repeats on every load until the first feather.
8. There is no audio and no mute.
9. The save has no migration path, and a malformed save silently resets.
10. One 50-line minified file means no data-driven dialogue or quests and is hard to extend.

## V2 approach

Keep: Phaser 3.90 from the CDN, a static site, no framework, no build step, and the same Pages workflow and relative paths.

```
src/
  main.js                boot + wiring
  config.js              constants
  data/                  characters, dialogue, quests, maps (pure data)
  art/                   procedural canvas painters (characters, props, ground)
  entities/Critter.js    animated character (idle/walk, 3 facings, squash, shadow)
  systems/               save, audio, input, interaction, ambient life, collision
  scenes/WorldScene.js   one scene class that runs any map (Forestville, Manly)
  ui/hud.js              DOM HUD, dialogue, prompts, titles, settings
```

- **Art.** Everything is painted procedurally to canvas at load: original and small, with no external assets. The ground is painted once and sliced into 1024 px textures. Props and characters are separate sprites, sorted by feet y for real layering.
- **Collision.** Light custom shape collision (rects, circles, ellipses) with axis sliding. Arcade physics is no longer needed.
- **Interaction.** A registry of interactables `{verb: talk|examine|collect|activate|travel, label, when(), run()}` drives the nearest-target prompt, the in-world marker and the action button label.
- **Quests and dialogue.** Data-driven. Dialogue lines depend on location, quest state and who you are playing.
- **Save.** Versioned (`version: 2`) under a new key. V1 saves are migrated read-only: the V1 key is never deleted. Malformed saves are backed up, not erased. Every write is wrapped in `try/catch`.
- **Audio.** Synthesised live with WebAudio (original, with no files): footsteps by surface, pickup, dialogue blips, fanfare, bus, and zone ambience (bush, village, beach). Audio starts on the first tap, and there is a mute toggle.

## Scope order

1. Characters and animation
2. Forestville environment
3. Interaction system
4. Feather quest (5 interactive steps)
5. Dialogue
6. Camera and game feel
7. Mobile controls
8. Save system
9. Ambient life and audio
10. Manly and Shelly Beach, with one polished location

## Release

Work happens on the `v2` branch. It is tested headless at iPhone sizes (portrait and landscape) from a subdirectory URL, then merged to `main` so the Pages workflow deploys it.
