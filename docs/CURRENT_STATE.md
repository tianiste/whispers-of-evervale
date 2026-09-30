# Current state

## Milestone and runtime

Whispers of Evervale is a desktop birthday adventure built with Phaser 3.90, strict TypeScript and Vite. The October 1 birthday build is feature complete: the campaign runs from the first hello at Sunmeadow Stable through six Echoes and the birthday finale, then returns to free roam. Boot generates character/accessory textures and initializes the saved audio mix. The main menu offers Continue (only with a valid save), New Game (asks before replacing a save) and Settings (master/music/effects/ambience and mute). The creator only creates Hana (Blonde, matching her Echo figure, or Chestnut or Midnight; keyboard or mouse), then the 960×540 FIT canvas shows the original 1800×1100 Sunmeadow map. Overlay scenes (Echo, Race, Groom) fade in over the paused World, which hides its HUD while they run.

## Campaign

`src/data/story.ts` holds 14 chapters and 46 sequential objectives:

1. Welcome to Sunmeadow.
2. Meet Your Horse: in-world three-card choice, with "Sky" pre-filled and renameable. Care follows; brushing opens the grooming minigame.
3. Make It Yours · 4. The First Ride · 5. Village Day.
6. First Race: talk to the Race Steward and ride the Meadow Sprint.
7–9. Echo I–III.
10. Not in the Records: the Village Historian, then Madame Rosette's Style Parade.
11. Echo IV — Improvised Cuisine: grooming, the Forest Run, the foil glint, silver hoofprints east, the Echo, then hanging the foil tray.
12. Echo V — Cards, Snow, and Orehi.
13. More Echoes Are Stirring: Bolt at the pond, then the oak's ring of lights (5 / 6). The sixth light slips out of the ring toward the stable.
14. Echo VI — Not Yet: a teal light trail from the oak back home, then Echo VI beside Sunmeadow Stable (900, 548). Its site stays hidden until this chapter starts.

## Echo VI and the finale

Echo VI (`future` in `src/data/echoes.ts`) opens with a held canvas prelude: "MEMORY DATE: UNKNOWN", then "This memory has not happened yet." The date stays under the title. The steps are:
- a four-fragment reconstruction that lights the room
- `future-home`, a look-around game in a future apartment
- three questions where every answer moves on (`open` quiz steps)

The apartment (`future` stage in `EchoStages.ts`) has Tian cooking, Hana gaming, generic anime, all five cats, Bolt, unbranded shared-game hints and the player's horse photograph. Click areas/captions live in `echoGames.ts`; Maks flees first. Four discoveries offer “That's home”; all six animals advance automatically.

The last question has no answer. The canvas holds "There isn't a correct answer yet." and "We still have to make this one." Then comes a pause, the realization, the birthday card (confetti and a cake in the room), the gifts, and Return to Evervale. Hana reacts in Evervale, then a toast lists the gifts, with an extra line if the horse is named Sky.

Personal text lives in `src/data/birthdayGift.ts`: `giftConfig` (recipient, Banca, Baber, developer, final message with a placeholder fallback), the card, the realization lines, the gift list and the return lines.

## Rewards and postgame

Echo VI grants:
- the spare key keepsake (a decoration)
- `echo-tack`, which unlocks the birthday teal outfit, the teal & oak tack marker on the horse and the Echo lantern decoration
- the Cat bed for five decoration

Petting all five cats, at any point, unlocks the optional cat sweater accessory; existing saves get it on load.

After the finale, Sunmeadow shows bunting, lanterns and a "Happy birthday, Hana" banner. The HUD reads 6 / 6 and the journal can reopen the birthday card. The keeper has a birthday line. Every race, minigame, wardrobe, decoration and animal stays available.

## Other systems

- **Echo framework:** steps are `quiz` (optionally `open`), `match`, `reconstruct` or `play`. `EchoScene` orchestrates them. Minigames implement `Minigame.ts`; the context now also offers `cue` (a stage reaction) and `horseName`.
- **Races:** `race.ts` tracks (Meadow Sprint, Forest Run, Moonlight Derby after Echo V) are played by `RaceScene`.
- **Grooming:** `GroomScene`.
- **Trails:** `EchoTrail.ts`.
- **Fashion:** tag-based parade and accessories.
- **Decoration:** a slot picker.
- **Cats and Bolt:** scripted behaviours; petting adds journal notes.

## Audio

`src/systems/audio.ts` extends the previous tone helper on Phaser's existing Web Audio context. `src/data/audio.ts` defines original synthesized cues and regional/memory music beds. Menu/creator, world walking/riding, horse selection/care, shared panels, quests, race tracks, grooming, trails, all Echo minigames, animals and birthday reveal have audio hooks. Scene beds crossfade; the held final lines duck the background. One-shot cooldowns, a 16-voice cap, pitch/level variation and a compressor limit spam. Audio starts after a trusted gesture and stays silent when Web Audio is unavailable. No new dependencies or downloaded audio. See `docs/AUDIO.md` for the palette and deliberate limits.

## Controls, persistence and validation

- **Controls:** WASD/arrows move; E interacts, pets, mounts/dismounts. E near the Race Steward opens tracks (R also works). I/O/H/J/Escape open panels. Menu: ↑/↓, Enter, ←/→ adjust volume, Escape returns.
- **Persistence:** Adventure save remains version 1. Existing five-Echo saves resume after Echo V; finished saves stay complete. Audio preferences use the separate `whispers-of-evervale-settings` key: master (`volume`), music, effects, ambience, muted. Old master-only settings remain valid; New Game retains preferences.
- **Validation:** Typecheck, production build and content/settings tests pass. Audio-enabled Chrome completed all 46 objectives and postgame; final menu checks passed separately from that completed save after a test-only reload race was fixed. Dedicated audio checks passed (81 buffers, output silence/persistence, crossfades, cleanup, spam limits; full-volume burst peak 0.358). `scripts/verify-ui.mjs` covers all 46 objectives using real keyboard, click and drag input with accelerated travel, reloads, six Echoes/minigames, finale, postgame, Moonlight Derby and menus. It now checks trusted unlock, all channels at zero, mute, voice limits and category persistence, and records console/network failures. Use `CHROMIUM` if not on PATH. There is no lint script; Vite's existing bundle-size advisory remains.

## Deployment

`.github/workflows/pages.yml` checks types, runs content tests, builds with Node 22 and deploys only `dist` to GitHub Pages on pushes to main or manual dispatch. Pages uses the existing HTTPS custom domain `evervaleforhana.me`; Vite uses the domain root as its base. Do not publish the repository root: its entrypoint is uncompiled TypeScript.
