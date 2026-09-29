# Handoff

## Release audit: birthday build

A final audit of the October 1 build, done at the user's request. There are no new features, and the user approved the fix plan. The user subsequently authorized committing and pushing the updated birthday build, including the previous batch (Echo VI, the finale and the menus). No release tag was requested. The authoritative working directory is `whispers-of-evervale/whispers-of-evervale`; its contents were also copied to `hana-horse`, with the previous directory backed up.

**Audit result**
- Two headless-Chrome fresh-save playthroughs passed, covering all 46 objectives with reloads at every stage.
- There were no console errors and no failed or 4xx/5xx asset requests, at 60 FPS.
- Typecheck, build and `npm test` pass.
- The personal content was checked: memory order I–VI, the foil tray, Echo V as one Echo, the future Echo and its held final line, Banca and Baber used sparingly, the cats and Bolt in character.
- There are no fail states, and wrong answers retry immediately.
- Estimated casual playtime is 65–80 minutes. That is not measured by a person; it comes from travel distances, about 3,800 words of text and 13 minigames.

**Fixes**
- **Hana is blonde in the world.**
  - The default rider look's hair pixels (frames 0–11 and 36–41 of `riders.png`, plus `rider-cream-*.png`) were recolored from brown to Echo Hana's blonde.
  - The look is now labelled "Blonde". Its id is still `cream`, so saves are unchanged.
  - The Village Baker moved to frame 28 (Midnight · Berry), so she no longer looks like Hana.
- **Creator:** Begin and the ‹ › arrows are clickable, not only Enter and ←/→.
- **Toasts:**
  - Talk and inspect payoffs no longer repeat as a toast behind their dialogue.
  - At a chapter end, the payoff, the chapter line and any reward share one toast instead of replacing each other.
  - Long toasts stay up longer.
- **UI fixes:**
  - The Race Steward's track descriptions and the "seconds" label in the race results are readable, and locked tracks are less faded.
  - Buttons that sat next to each other in the shop and the decoration picker are spaced apart.
  - The wardrobe hint has a gap above it, and the outfit buttons no longer stretch.
- **Text:** the horse window now says the paddock is south of the stable.
- **Test:** the harness's final New Game step clicks the creator's Begin button.

## Next

Nothing is required. Edit `giftConfig.finalMessage` if needed.

## Known limits

- Minor visual nits: overlapping name tags (Nomi and the Stable Keeper), flat grooming hay bales, an empty Echo IV cabinet, and Miki's birthday "MRRRAOW" briefly covering the horse plaque.
- The pause menu has no way back to the title screen; saving is automatic.
- Minigames need a mouse, except grooming (Space auto-brushes).
- The browser harness needs local port binding (outside the Claude sandbox) and `CHROMIUM`. Do not edit source while it runs, because Vite reloads the page.
