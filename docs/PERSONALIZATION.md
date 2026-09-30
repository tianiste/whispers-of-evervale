# Personalization

The game is for Hana. Use “Hana” normally. “Banca” is an occasional affectionate easter egg and may be explicit in the birthday finale. “Baber” should be used even more sparingly. Keep the early game believable as a standalone cozy horse adventure; reveal intentional personal coincidences gradually.

**Shared Personality:**
- Hana gets annoyed first.
- Tian makes stupid jokes.
- There is affectionate teasing and no mean-spirited arguments.
- Shared interests for easter eggs include: Minecraft, Brawl Stars, Pokémon GO, Fortnite, Warframe, anime, McDonald's, cooking together. (Use generic references/jokes to avoid copyrighted assets directly).

**Character References:**
- **Tian:** Tall, broader/muscular build, short brown hair, green-brown/hazel eyes. Likes baggy clothes, makes stupid jokes, usually cooks.
- **Hana:** Long blonde hair, blue-green eyes, noticeable eyelashes, slim build. Likes baggy/oversized clothes, reaches approx. to Tian's shoulders.
- **Maj:** Hana's brother. Blonde, blue eyes, shoulder-length hair. Slightly taller than Hana, shorter than Tian. Goofy/playful.
- **Tilen:** Black hair to neck, approx. Hana's height, slimmer build, wears more fitted clothes.

**Echoes (Memories):**
The story revolves around restoring Echoes that gradually reveal themselves to be suspiciously personal memories of Hana and Tian.
*   **Echo I — A Spark in the Crowd:** Hana and Tian met at HardBeats / hard techno. Tian went with friends, Hana went as Maj's sister. Maj and Tilen were present. Hana accidentally touched a lit cigarette against Tian's left cheek. (Visuals: stylized pixel-art club, dark, teal/purple lighting, silhouettes).
*   **Echo II — Five Minutes Until Break:** Their first summer together. Hana started working at GEN-I, Tian worked at a warehouse. They called every day during breaks, unable to wait to go to the sea. (Visuals: split-memory office/warehouse side).
*   **Echo III — Half a Bed:** First sea holiday together in Banjole with Tian's parents in a camper van. Played Brawl Stars in bed, spilled water, and slept squeezed on the remaining dry half.
*   **Echo IV — Improvised Cuisine:** first holiday alone in a rented seaside flat. Reconstruct the memory, place daily walks, the creature game, cooking and tacos on a holiday map, catch three original creatures (Gullpuff, Sandbun, Fizzlet) with a teal catch-orb, then fold an aluminium-foil lasagne tray ("We want lasagne. We do not own the correct tray."; STRUCTURAL INTEGRITY: QUESTIONABLE / LASAGNE COMPATIBILITY: ACCEPTABLE). Dinner: tacos, the lasagne and the "special cookies" (wording kept as is). Keepsake: a framed foil tray for the stable.
*   **Echo V — Cards, Snow, and Orehi:** one Echo with three backdrops. Christmas Eve pack opening with original parody cards (Frostfox, Pudding Toad and a Banca rare holo whose ability cancels Tian's next joke), giving one to Tian and a binder of occasions; a snowball fight with goofy Maj (beanie, dances, pratfalls) ending with everyone flopping into the snow; then orehi with Nutella (mix, press into walnut moulds, bake, fill). Keepsake: a framed Banca holo card. No franchise names or card layouts; the Nutella jar is unbranded.
*   **Echo VI — Not Yet:** "MEMORY DATE: UNKNOWN / This memory has not happened yet." A believable future apartment on a normal evening: Tian cooking, Hana on the couch, a generic anime on the TV, all five cats and Bolt (toy, water bowl). Shared games are only hinted at (block plush, space-ninja figure, "#1 of 100" trophy, a Gullpuff on a creature game) and the burger bag is unbranded. The framed picture shows the player's in-game horse and its saved name, never an invented real horse; if it is named Sky, a line acknowledges it. Playful questions with no wrong answers end on "There isn't a correct answer yet. / We still have to make this one.", then the realization, the birthday card and the gifts. Keepsake: a spare key.

Realization arc: after Echo I Hana finds it oddly specific; after Echo II the Echo "knows her work schedule"; after Echo III she recognizes the memories as theirs and asks who has been collecting them. The Village Historian then says "These memories aren't in any Evervale records." After IV and V Hana notes whoever collects them knows them very well. The oak shows five of six lights; the last "feels different" and leads home to the stable, where Echo VI reveals the future memory and the birthday card. Hana's last line: "Did you make an entire game just to say happy birthday?" No venue branding in visuals; GEN-I appears only as plain text. Banca appears three times (Echo II bubble, Echo V card, the birthday card heading), Baber twice (Echo III, Tian's line in the future apartment). "Absolutely horrid, darling" is said once, by Madame Rosette about the parade scarecrow.

**Cats:**
Real cats should be introduced as recurring figures (establish consistently for later interactions):
*   **Nomi:** Black and white, longer fur, likes being nearby, does not like being annoyed.
*   **Miki:** Black, fluffy, somewhat larger, cuddly, loud.
*   **Maks:** Black and white, skinnier, runs away.
*   **Maco:** Mostly white, black spot, weird.
*   **Viski:** Black and white, short fur, affectionately stupid.

In game (`src/data/village.ts`, behaviors in `src/entities/CatEntity.ts`, all simple and scripted): Nomi lives at the stable, follows you around it, and after three quick pats says "hmph." and sulks a metre away; Miki walks up to you outside the bakery, meows loudly and shows hearts; Viski by the village hall turns around, bonks into nothing and chases his tail; Maks in the east meadow bolts up to three times in a puff of dust, then gives up ("…fine."); Maco reappears in odd poses and places (lily pad, stable roof, sideways on the paddock fence, upside down in flowers, bakery roof). Petting an animal adds its note to the journal. Sprites are generated at boot under `cat-<id>`; a PNG loaded under that key replaces them.

**Bolt:** a black Flat-Coated Retriever who appears at the pond after Echo V. He wags, carries a tennis ball, drops it when petted, and wades into the pond between visits. Nobody in the village owns him. Texture `bolt` (+ `bolt-tail`, `bolt-ball`) is generated in `src/art/BoltSprite.ts`; he returns in Echo VI.

Tone: playful, warm, cute, lightly romantic, and funny. Avoid heavy sentiment or dramatic romance. Known optional joke phrases include “absolutely horrid darling” and “this feels like a divorce”; use each sparingly and naturally, away from important emotional scenes. Cats, horses, countryside, teal tones, natural wood, fashion, and customization reflect her tastes without turning every detail into a reference.

Keep recipient-specific finale content in editable configuration, not game-system logic: `giftConfig` in `src/data/birthdayGift.ts` (recipient, nicknames, developer name, final message with a placeholder fallback) plus the card, reveal lines, gift list and return lines beside it. The final message and developer name remain editable; do not invent their values. Avoid placing private personal details outside this document and the configuration that needs them.
