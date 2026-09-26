# Forestville Family Adventure

A small, original cozy family adventure set around Forestville and Sydney.

**Playable family**
- Dan — bear 🐻
- Finn — goose 🪿
- Jessia — rabbit 🐰
- Jarency — cheetah 🐆

## V1 vertical slice

- Four switchable playable family characters
- Mobile-first virtual joystick and action button
- Keyboard controls: WASD / arrows + Space or E
- Hand-drawn vector-style characters generated in Phaser
- Forestville home, village shops, school, pond and bush track
- Sydney Harbour lookout zone reached by bus
- Five-feather collection quest
- NPC dialogue and interaction prompts
- Local save data with reset control
- Family-photo quest ending
- Responsive portrait/landscape layout
- Static GitHub Pages deployment — no build step required

## Run locally

Serve the repository folder with any local HTTP server, for example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## GitHub Pages

In GitHub: **Settings → Pages → Deploy from a branch → main → / (root)**.

Expected URL:

`https://debodin-alt.github.io/forestville-family-adventure/`

## Runtime dependency

The page loads Phaser 3.90.0 from jsDelivr. Phaser is open source under the MIT license.

## Design rules

- Original cozy Australian identity; no Nintendo assets, code, names or UI copies
- Mobile-first at 360–390 px
- Touch targets at least 44×44 px
- Warm eucalyptus / sandstone / harbour palette
- Local game state is versioned and saved in the browser
