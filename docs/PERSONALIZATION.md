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
*   **Echo IV (planned):** first holiday alone; Pokémon GO, tacos, the aluminium-foil lasagne tray.
*   **Echo V (planned):** cards, snow, orehi with Nutella.
*   **Echo VI (planned):** the future memory; future apartment, cats, Bolt, then the birthday reveal.

Realization arc: after Echo I Hana finds it oddly specific; after Echo II the Echo "knows her work schedule"; after Echo III she recognizes the memories as theirs and asks who has been collecting them. Nobody explains yet. No venue branding in visuals; GEN-I appears only as plain text. Banca and Baber each appear once so far.

**Cats:**
Real cats should be introduced as recurring figures (establish consistently for later interactions):
*   **Nomi:** Black and white, longer fur, likes being nearby, does not like being annoyed.
*   **Miki:** Black, fluffy, somewhat larger, cuddly, loud.
*   **Maks:** Black and white, skinnier, runs away.
*   **Maco:** Mostly white, black spot, weird.
*   **Viski:** Black and white, short fur, affectionately stupid.

In game (`src/data/village.ts`, behaviors in `src/entities/CatEntity.ts`): Nomi lives at the stable, follows you around it and relocates after three quick pats; Miki is outside the bakery and meows; Viski is by the village hall and turns around at random; Maks lives in the east meadow and runs off twice before allowing a pat; Maco sits in odd places (a lily pad first) and moves after each pat. Sprites are generated at boot under `cat-<id>`; a PNG loaded under that key replaces them.

Tone: playful, warm, cute, lightly romantic, and funny. Avoid heavy sentiment or dramatic romance. Known optional joke phrases include “absolutely horrid darling” and “this feels like a divorce”; use each sparingly and naturally, away from important emotional scenes. Cats, horses, countryside, teal tones, natural wood, fashion, and customization reflect her tastes without turning every detail into a reference.

Keep recipient-specific finale content in editable configuration, not game-system logic. The final message and developer name remain editable; do not invent their values. Avoid placing private personal details outside this document and the configuration that needs them.
