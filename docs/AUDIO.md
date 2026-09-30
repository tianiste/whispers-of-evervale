# Audio direction and integration

The palette is original procedural audio: soft plucked notes, low countryside air, restrained magical intervals and short material textures. No downloaded recordings, copyrighted tracks, voice acting or added dependencies. `src/data/audio.ts` owns cue definitions, levels, cooldowns and soundscape profiles. `src/systems/audio.ts` extends the previous tone helper using Phaser's existing Web Audio context and master destination. `tones.ts` retains existing melodic feedback through the effects bus.

## Mix

Master, Music, Ambience, Effects and Mute are available in title Settings and the pause menu. UI and animal cues share Effects. Defaults are master 100%, music/ambience 65%, effects 80%. Changes apply to playing audio; settings are separate from adventure saves. The graph includes short gain ramps, a compressor, a 16-voice one-shot ceiling, per-cue cooldowns, and slight pitch/level variation. Scene beds crossfade over roughly 1.3 seconds. The same profile continues without restarting. Blur silences the graph; Phaser owns context suspension/resumption.

The mixer waits for a trusted pointer or keyboard gesture before starting beds. Denied resume attempts are caught and retried on a later gesture. Without Web Audio the game stays playable silently. All current audio is generated in memory, so no audio asset requests can fail; unknown named cues warn in development and are skipped. Future file-backed cues should retain this silent fallback.

## Coverage

- Menu and creator: hover, selection, confirmation and cancel. Horse selection uses the existing in-world cards; this build has no separate mane/coat editor or randomizer.
- World: village, stable, fields, forest edge and pond profiles; walking footsteps, speed-dependent riding hooves, saddle rustle, landing on dismount, sparse nearby snorts/neighs. The map has no surface tags; village versus soft-ground volume is approximate.
- Shared panels: inventory, wardrobe, horse/tack/stable tabs, shop gift, decoration picker, dialogue advances and choices. Quest progress, chapter completion and item rewards have restrained cues. The shop is a free gift counter; there is no currency failure path.
- Grooming: textured strokes, clean-patch sparkle, completion and contented horse. Race tracks have separate musical pace/root and atmosphere, countdown, grounded hoof rhythm, jump/landing, solid/water collisions, finish, results and retry.
- Echo trails: a slow shimmer becoming more frequent near a waymark, discovery and the horse's hop. Reconstruction and all minigames have pickup/selection, material actions and completion feedback.
- Memories: club pulse and the cheek joke; office/warehouse bed and phones; camper sea air and spill/squish; holiday walk/catch/cooking and foil tear/fold/pinch/spring/stamp; cards/holo/binder, snow actions and orehi preparation. Echo V changes profile between its three settings.
- Animals: distinct soft synthesized calls for Nomi, Miki, Viski, Maco and Maks; Nomi's grump, Viski's bonk, Maks's retreat; Bolt's pant, occasional bark, toy and splash. Automatic world sounds are proximity-gated.
- Future and finale: room bed and object/animal reactions, warm responses, reduced beds for the two held final lines, a slower finale theme, reveal/card/gift cues and normal regional ambience on return. No looping birthday jingle.

## Deliberate limits

Animal voices, foil and water are stylized synthesized approximations, not field recordings. Music reuses an original motif with regional pitch/pacing; these are compact musical beds, not individually composed long songs. There is no terrain material map, spatial occlusion, narration or ongoing TV dialogue. Speaker/headphone listening remains useful for subjective balance; automated tests establish routing, silence, lifecycle and bounded playback, not perceived realism.
