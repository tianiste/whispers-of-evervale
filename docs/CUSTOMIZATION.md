# Customization

Customization is a core reward loop. Ship a small coherent set of finished options before expanding catalogs.

## Rider

Long-term layered rendering: body, hair back, bottoms, shoes, top, outerwear, face detail, hair front, head accessory, and small accessories. Categories can include skin and eye color, hair style/color, brows, freckles, optional makeup, clothing, boots, and accessories. Birthday creator should feel meaningful with a few attractive choices.

## Horses and fashion

Offer at least one attractive brown Quarter Horse-style first horse. Eventually support multiple owned/named horses, coat and markings, mane/tail/eyes, tack, bond, and light personality/stat variation. Fashion categories can grow from countryside, cozy, elegant, casual, teal/green, dark, fantasy, and competition looks. Keep preference above optimization. Saved outfits are lower priority than equipping and changing items.

In game: outfits (the birthday teal outfit arrives with Echo VI) plus one accessory slot (straw hat, teal scarf, riding helmet; flower crown from the Style Parade; cat sweater for meeting all five cats), drawn as a 32×48 overlay aligned with the rider frame (`src/art/Accessories.ts`). Outfits and accessories carry broad style tags in `src/data/fashion.ts`; the parade accepts any equipped piece with the round's tag, so every theme has several valid looks. Tack rewards (Forest Run rosette, the teal & oak birthday tack from Echo VI) are fitted automatically and listed under H → Tack.

## Stable decoration

Use a few swappable slots (such as wall, sign, plant, rug, shelf, lantern, furniture) in a small personal area. Slot-based placement is enough for the birthday build; defer free placement.
