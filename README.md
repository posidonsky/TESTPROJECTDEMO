# Ironwood Penitentiary

An original pixel-art prison-escape game that runs in the browser. You have a
bunk, a job folding laundry, three meals a day and twenty-two years to serve.
You also have a bent spoon and a plan.

**This is not a copy of The Escapists or The Escapists 2.** It is an original
game in the same genre: all code, level design, art, sound and text in this
repository were created for this project. No assets, maps, code or text from any
commercial title are included or reproduced.

## Play

```bash
npm start          # serves the game at http://localhost:8000
```

No build step, no runtime dependencies — the server is a ~50 line Node static
file server, and the game itself is plain ES modules and Canvas 2D.

Open the preview URL (or `http://localhost:8000`) and press **START A NEW
SENTENCE**. Sound is synthesised with WebAudio; `M` mutes it.

## Controls

| Key | Action |
| --- | --- |
| `WASD` / arrows | Move |
| `E` / `Space` | Interact; hold to dig, work, pry, pick a lock or cut a fence |
| `I` | Inventory (use, stash in your desk, drop) |
| `C` | Crafting bench |
| `H` | Prison regulations: routine, controls, escape planning |
| `V` | Toggle guard vision cones |
| `Tab` | Toggle the map |
| `M` | Mute / unmute |
| `Esc` | Pause, save, restart |

## The routine

The clock runs a full day in about five real minutes. The rolling schedule is
roll call (07:00), breakfast, work period (09:00–12:00), lunch, free time,
dinner, free time, then lockdown at 21:00 and lights out at 21:30.

* **Roll call** — be inside your cell at 07:15 or the count is marked missing.
* **Meals** — collect food at the canteen hatch during the three sittings.
* **Work** — hold `E` at a station during the work period for $10 a shift.
* **Sleep** — your bunk at night runs the clock to 06:30 and restores energy.
* **Needs** — energy, hunger and health. Empty hunger or energy drains health.
* **Heat** — guards who see you breaking rules raise it. At 100 you are sent to
  solitary, searched, and the day is partly gone.

## Escape routes

You need a tool, and you need to stay unseen while you use it.

1. **Tunnel** — dig under the toilet in your own cell. A spoon works but is
   slow; a spoon lashed to scrap metal is three times faster. Digging is noisy:
   guards come to investigate the scraping. Once the tunnel breaks through,
   press `E` again to squeeze out.
2. **Fence** — cut the yard chain-link after lights out. Needs **bolt cutters**
   (scrap metal + duct tape).
3. **Vent** — pry the workshop vent cover with a **crowbar**, then climb down
   using **rope** (two bed sheets). Only possible at night, in a patrolled room.

The evidence locker in the security office holds a crowbar if you can pick the
lock (comb + scrap metal). The commissary sells supplies, and cell searches at
10:00 (and 15:00 on shakedown days) will seize contraband left in your desk.

## Systems

* **Guards** patrol A\*-routed waypoints, with day and night routes, vision
  cones, line-of-sight checks, suspicion, pursuit and arrest. They only react to
  what they can see — walls block sight, fences do not.
* **Inmates** follow their own version of the routine and populate the block,
  canteen, workshops and yard.
* **Crafting** combines two items (four recipes), and most tools count as
  contraband.
* **Regimes** change each morning: fog shortens guard sight, overtime doubles
  pay, shakedowns add a second cell search, heatwaves drain hunger faster.
* **Persistence** auto-saves to `localStorage` at day start, every 30 seconds and
  when the tab is hidden. A finished run clears the save.

## Project layout

```
index.html            HUD, overlays, panel mount points
css/style.css         HUD, menus, overlays
src/main.js           boot, frame loop, input routing, save/audio glue
src/game.js           simulation: clock, routine, needs, heat, AI, escapes
src/world.js          hand-authored prison layout, tiles, objects, patrols
src/entities.js       actor movement, collision, path following
src/path.js           A* pathfinding
src/items.js          item table, recipes, shop stock
src/render.js         procedural tile atlas, sprites, lighting, camera
src/ui.js             HUD panels, inventory, crafting, shop, minimap, win screen
src/audio.js          WebAudio sound synthesis
scripts/serve.mjs     zero-dependency static server
tests/                headless simulation + UI smoke tests, screenshot helper
```

Everything visual is generated at runtime: tile atlases, furniture, characters
and lighting are drawn with Canvas 2D primitives, and dialogue/HUD text uses a
system monospace stack. There are no image, font or audio files.

## Tests

```bash
npm install        # dev-only: jsdom + @napi-rs/canvas
npm test           # 300+ headless checks: world integrity, AI, escapes, save/load
npm run test:ui    # boots the real UI in jsdom with a stub canvas
npm run shots      # renders PNG frames to shots/ for art review
```

The simulation test verifies, among other things, that every interactive object
can be reached, every patrol waypoint is walkable and connected, the calendar
rolls over correctly, escapes are reachable through each route, and a random
9000-tick fuzz run never clips the player into geometry or corrupts state.

## Save data

Stored under the key `ironwood.save.v1` in `localStorage`. Clearing site data
(or starting a new sentence) resets the game.

## License

Original work, provided as a demo project. All game code and procedural art are
original to this repository.
