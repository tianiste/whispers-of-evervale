# Current state

## Milestone and runtime

Whispers of Evervale is a desktop birthday adventure built with Phaser 3.90, strict TypeScript and Vite. The October 1 birthday build is feature complete: the campaign runs from the first hello at Sunmeadow Stable through six Echoes and the birthday finale, then returns to free roam. Boot generates cat, Bolt, accessory and Echo character textures and applies the saved sound volume. The main menu offers Continue (only with a valid save), New Game (asks before replacing a save) and Settings (sound volume). The creator only creates Hana (Blonde, matching her Echo figure, or Chestnut or Midnight; keyboard or mouse), then the 960×540 FIT canvas shows the original 1800×1100 Sunmeadow map. Overlay scenes (Echo, Race, Groom) fade in over the paused World, which hides its HUD while they run.

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

The apartment (`future` stage in `EchoStages.ts`) has Tian cooking, Hana on the couch with a controller, and a TV playing a generic anime. Around them:
- the shared games, only hinted at: a block plush, a space-ninja figure, a "#1 of 100" trophy and a Gullpuff on the creature-game phone
- an unbranded burger bag
- a framed picture of the player's own horse, with its saved name on the plaque
- all five cats and Bolt

Click areas and captions live in `futureHome` (`echoGames.ts`); Maks runs off on the first click. Finding four things offers "That's home"; finding all six animals moves on by itself.

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

## Controls, persistence and validation

- **Controls:** WASD/arrows move. E interacts, pets and mounts/dismounts. Near the Race Steward, E opens the tracks (R works too). I/O/H/J/Escape open windows. In the menu: ↑/↓, Enter, ←/→ for volume, Escape back.
- **Save:** still version 1 with no new fields; the new items and Echo ids fit the existing validation. Finished saves stay at `complete`. Saves that finished the previous batch (five Echoes) resume after Echo V. Volume is stored separately (`src/data/settings.ts`), so New Game keeps it.
- **Validation:** `npm run typecheck`, `npm run build` and `npm test` pass. `scripts/verify-ui.mjs` plays a fresh save through the whole campaign in headless Chrome with real key, click and mouse-drag input:
  - every minigame, the future apartment, the open questions, the held lines, the card and the gifts
  - reloads after Echo I and IV, mid-Echo, after races, before and after Echo VI, and in postgame
  - the journal card, the cat sweater, the Moonlight Derby after the ending
  - Continue, Settings persistence, the New Game confirmation and clicking Begin in the creator

  Run it against the dev server with `CHROMIUM` set; it needs local port binding. The Vite large-bundle advisory remains and no lint script exists.
