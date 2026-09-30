import Phaser from 'phaser';
import { accessoryKey } from '../art/Accessories';
import { EchoSites } from '../art/EchoSites';
import { EchoTrail } from '../art/EchoTrail';
import { renderEnvironment, addTree } from '../art/Environment';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';
import { BoltEntity } from '../entities/BoltEntity';
import { CatEntity } from '../entities/CatEntity';
import { HorseEntity } from '../entities/HorseEntity';
import { getHorse, horses, type HorseId } from '../data/horses';
import { getRiderAppearance, riderAppearances, type RiderAppearanceId } from '../data/riderAppearances';
import { echoClues, stableKeeperGreeting } from '../data/dialogue';
import { GameUI, button, color, escapeHTML, type MenuPage } from '../ui/GameUI';
import { showStyleParade } from '../ui/FashionChallenge';
import { showHorseChoice } from '../ui/HorseChoice';
import { activityIds, storyChapters, storyObjectives, echoStartIndex, type StoryObjective } from '../data/story';
import { echoes, getEcho, echoTotal, type EchoDefinition, type EchoId } from '../data/echoes';
import { birthdayFinale, birthdayReturn, giftConfig } from '../data/birthdayGift';
import { storeVolume } from '../data/settings';
import { birthdayCardHTML } from '../ui/BirthdayCard';
import { items, type ItemId } from '../data/items';
import { outfits, type OutfitId } from '../data/outfits';
import { raceGate, raceTracks, type RaceTrack, type RaceTrackId } from '../data/race';
import { accessories, styleParade, type AccessoryId } from '../data/fashion';
import { decorations, stableDecorationSlots, type StableDecorationSlotId, type DecorationId } from '../data/decorations';
import { bolt, catCompletion, scarecrow, villageCats, villagers, type AnimalId } from '../data/village';
import { SAVE_VERSION, STORY_COMPLETE, storeGameSave, type GameSave, type SavedDialogueId } from '../data/save';
import { tone } from '../systems/tones';
import type { EchoSession } from './EchoScene';
import type { GroomSession } from './GroomScene';
import type { RaceRecord, RaceResult, RaceSession } from './RaceScene';

const PLAYER_RADIUS = 14;
const PLAYER_SPEED = 205;
const HORSE_SPEED = 330;
const HORSE_RADIUS = 25;
const INTERACTION_RANGE = 70;
const KEEPER_POSITION = { x: 800, y: 550 };
const QUEST_INTERACTION_RANGE = 42;
const CAT_RANGE = 45;
const PADDOCK_HORSES: readonly { id: HorseId; x: number; y: number; flip: boolean }[] = [
  { id: 'brown-quarter-horse', x: 705, y: 655, flip: false },
  { id: 'gray-mustang', x: 775, y: 662, flip: true },
  { id: 'dark-bay-friesian', x: 845, y: 655, flip: true },
];
const ECHO_FADE = { r: 10, g: 12, b: 24 };
const MEADOW_FADE = { r: 16, g: 44, b: 43 };
const STEWARD = villagers.find(({ id }) => id === 'race-steward')!;
const JUDGE = villagers.find(({ id }) => id === 'parade-judge')!;
const FINALE = echoes.find(echo => echo.finale)!;
/** First objective of the finale's chapter: its trail wakes the hidden site beside the stable. */
const FINALE_START = storyObjectives.findIndex(o => o.chapter === storyObjectives.find(e => e.type === 'echo' && e.target === FINALE.id)!.chapter);

export class WorldScene extends Phaser.Scene {
  private ui!: GameUI;
  private cameraTarget!: Phaser.GameObjects.Zone;
  private playerArt!: Phaser.GameObjects.Image;
  private accessoryArt!: Phaser.GameObjects.Image;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private riderDirection = 0;
  private nextDustAt = 0;
  private wardrobeCategory: 'outfits' | 'accessories' | 'rider' = 'outfits';
  private horseCategory: 'horse' | 'tack' | 'stable' = 'horse';
  /** Stable tab: the slot whose decoration picker is open. */
  private pickingSlot: StableDecorationSlotId | null = null;
  private questSummary = '';
  private appearanceId: RiderAppearanceId = 'cream';
  private horseId: HorseId = 'brown-quarter-horse';
  private horseName: string | null = null;
  private outfitId: OutfitId = outfits[0].id;
  private accessoryId: AccessoryId = 'none';
  private player!: Phaser.GameObjects.Arc;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private horse!: HorseEntity;
  private horseBody!: Phaser.Physics.Arcade.Body;
  private mounted = false;
  private storyIndex = 0;
  private activityProgress: string[] = [];
  private trail!: EchoTrail;
  private dialogueTarget: string | null = null;
  private cats: CatEntity[] = [];
  private bolt!: BoltEntity;
  private animals = new Set<AnimalId>();
  private paddock = new Map<HorseId, Phaser.GameObjects.Image>();
  private echoSites!: EchoSites;
  private restoredEchoes: EchoId[] = [];
  private echoProgress: GameSave['echoProgress'] = null;
  /** An Echo, race or grooming scene is running over the paused world. */
  private overlayActive = false;
  private storyLights!: Phaser.GameObjects.Container;
  private storyMarker!: Phaser.GameObjects.Container;
  /** Bunting, lanterns and a banner at Sunmeadow once the birthday finale has played. Kept loose, not in a container, so each keeps its depth. */
  private birthday: (Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible)[] = [];
  private inventory = new Map<ItemId, number>();
  private decorationSelections = new Map<StableDecorationSlotId, DecorationId>(stableDecorationSlots.map(({ id, defaultDecorationId }) => [id, defaultDecorationId]));
  private decorationDisplays = new Map<StableDecorationSlotId, { marker: Phaser.GameObjects.Text; label: Phaser.GameObjects.Text }>();
  private interactionKey!: Phaser.Input.Keyboard.Key;
  private raceKey!: Phaser.Input.Keyboard.Key;
  private raceBest = new Map<RaceTrackId, number>();
  private raceElapsedMs = 0;
  private raceResultText = '';
  private activeDialogueId: SavedDialogueId | null = null;
  private restoreSave: GameSave | null = null;
  private ambience!: Phaser.Sound.BaseSound;
  private nextAutosaveAt = 0;
  private obstacles: { x: number; y: number; radius: number }[] = [];
  private movementKeys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    upArrow: Phaser.Input.Keyboard.Key;
    downArrow: Phaser.Input.Keyboard.Key;
    leftArrow: Phaser.Input.Keyboard.Key;
    rightArrow: Phaser.Input.Keyboard.Key;
  };

  constructor() {
    super('World');
  }

  init(data: { appearanceId?: RiderAppearanceId; save?: GameSave }): void {
    this.cats = [];
    this.paddock = new Map();
    this.overlayActive = false;
    this.pickingSlot = null;
    this.nextDustAt = 0;
    const save = data.save;
    this.restoreSave = save ?? null;
    this.appearanceId = getRiderAppearance(save?.appearanceId ?? data.appearanceId).id;
    this.horseId = getHorse(save?.horseId).id;
    this.horseName = save?.horseName ?? null;
    this.outfitId = save?.outfitId ?? outfits[0].id;
    this.accessoryId = save?.accessoryId ?? 'none';
    this.animals = new Set(save?.animals ?? []);
    this.raceBest = new Map(Object.entries(save?.raceBest ?? {}) as [RaceTrackId, number][]);
    this.storyIndex = save?.storyIndex ?? 0;
    this.activityProgress = [...(save?.activityProgress ?? [])];
    this.dialogueTarget = save?.dialogueTarget ?? null;
    this.restoredEchoes = [...(save?.restoredEchoes ?? [])];
    this.echoProgress = save?.echoProgress ? { id: save.echoProgress.id, steps: [...save.echoProgress.steps] } : null;
    // Explicit Echo state wins: never replay a restored Echo (the save parser never skips an unrestored one).
    while (storyObjectives[this.storyIndex]?.type === 'echo' && this.restoredEchoes.some(id => id === storyObjectives[this.storyIndex]!.target)) {
      this.storyIndex++;
      this.activityProgress = [];
    }
    this.mounted = save?.mounted ?? false;
    this.inventory.clear();
    for (const item of items) {
      const count = save?.inventory[item.id];
      if (count !== undefined) this.inventory.set(item.id, count);
    }
    this.decorationSelections = new Map(stableDecorationSlots.map(({ id, defaultDecorationId }) => [
      id,
      save?.decorations[id] ?? defaultDecorationId,
    ]));
    this.raceElapsedMs = save?.race.elapsedMs ?? 0;
    this.raceResultText = save?.race.resultText ?? '';
    this.activeDialogueId = save?.dialogue ?? null;
  }

  create(): void {
    renderEnvironment(this);
    this.renderVillage();
    this.echoSites = new EchoSites(this, this.restoredEchoes);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    const save = this.restoreSave;
    const playerX = save?.player.x ?? 900;
    const playerY = save?.player.y ?? 550;
    this.player = this.add.circle(playerX, playerY, PLAYER_RADIUS, getRiderAppearance(this.appearanceId).color);
    this.player.setVisible(false);
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCircle(PLAYER_RADIUS).setCollideWorldBounds(true);
    this.playerBody.enable = !this.mounted;
    this.playerShadow = this.add.ellipse(playerX, playerY + 12, 27, 10, 0x203b32, 0.3);
    this.playerArt = this.add.image(playerX, playerY + 16, 'riders').setOrigin(0.5, 1).setScale(1.25);
    this.accessoryArt = this.add.image(playerX, playerY + 16, 'riders').setOrigin(0.5, 1).setScale(1.25).setVisible(false);

    this.horse = new HorseEntity(this, getHorse(this.horseId), save?.horse.x ?? 975, save?.horse.y ?? 650);
    this.physics.add.existing(this.horse.display);
    this.updateTack();
    this.horseBody = this.horse.display.body as Phaser.Physics.Arcade.Body;
    this.horseBody.setCircle(HORSE_RADIUS, -HORSE_RADIUS, -HORSE_RADIUS).setCollideWorldBounds(true);
    // Until Meet Your Horse, the horses wait in the paddock instead.
    this.horse.display.setVisible(this.horseName !== null);
    this.horseBody.enable = this.horseName !== null;
    this.renderPaddock();
    if (this.mounted) this.player.setPosition(this.horse.display.x, Math.max(PLAYER_RADIUS, this.horse.display.y - 27));

    for (const [x, y] of [[770, 475], [1015, 510], [1065, 640]] as const) {
      const firefly = this.add.circle(x, y, 2, 0xf4e9cf, 0.35).setDepth(3);
      this.tweens.add({
        targets: firefly, alpha: 0.9, scale: 1.5, y: y - 9,
        duration: Phaser.Math.Between(1500, 2400), ease: 'Sine.InOut', yoyo: true, repeat: -1,
        delay: Phaser.Math.Between(0, 900),
      });
    }

    this.add.image(KEEPER_POSITION.x, KEEPER_POSITION.y + 16, 'riders', 24).setOrigin(0.5, 1).setScale(1.25).setDepth(KEEPER_POSITION.y + 16);
    this.add.text(KEEPER_POSITION.x, KEEPER_POSITION.y - 51, 'Stable Keeper', {
      color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '14px',
      backgroundColor: '#173b36cc', padding: { x: 5, y: 3 },
    }).setOrigin(0.5).setDepth(100000);
    this.renderStableDecorations();
    this.renderBirthdayDecorations();
    this.add.circle(raceGate.x, raceGate.y, raceGate.radius, 0xc8b77b, 0.18).setStrokeStyle(3, 0xf4e9cf);
    for (const dx of [-raceGate.radius, raceGate.radius]) this.add.rectangle(raceGate.x + dx, raceGate.y - 20, 6, 44, 0xf4efe6).setDepth(raceGate.y);
    this.add.rectangle(raceGate.x, raceGate.y - 44, raceGate.radius * 2 + 6, 14, 0x55cabb).setStrokeStyle(2, 0xf4efe6).setDepth(raceGate.y);
    this.add.text(raceGate.x, raceGate.y - 44, 'RACE GATE', {
      color: '#f4efe6', fontFamily: 'Arial, sans-serif', fontSize: '10px', fontStyle: 'bold', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(raceGate.y + 1);
    this.renderScarecrow();
    const glow = this.add.image(0, 0, 'environment-glow').setTint(0x8ffff0).setScale(2).setBlendMode(Phaser.BlendModes.ADD);
    const ring = this.add.circle(0, 0, 28, 0x8cd4bf, 0.18).setStrokeStyle(3, 0xf4e9cf);
    this.storyLights = this.add.container(0, 0, [glow]);
    this.storyMarker = this.add.container(0, 0, [this.storyLights, ring]).setDepth(99999);
    this.tweens.add({ targets: glow, alpha: 0.35, scale: 2.5, duration: 1800, yoyo: true, repeat: -1 });
    for (let i = 0; i < 7; i++) {
      const mote = this.add.rectangle((i - 3) * 10, 10, 3, 3, 0xb8ffe3);
      this.storyLights.add(mote);
      this.tweens.add({ targets: mote, y: -35, alpha: 0.1, duration: 1500 + i * 180, yoyo: true, repeat: -1 });
    }
    for (const objective of storyObjectives.filter(o => o.type === 'inspect')) {
      const x = objective.x!, y = objective.y!;
      // Small physical props keep discoveries legible beyond their objective ring.
      const prop = this.add.container(x, y).setDepth(y);
      if (objective.target === 'roadside-posy') {
        for (let i = 0; i < 5; i++) prop.add(this.add.circle(Math.cos(i * 1.26) * 7, Math.sin(i * 1.26) * 7, 4, 0x68baac));
        prop.add(this.add.circle(0, 0, 3, 0xffefb3));
      } else if (objective.target === 'glowing-hoofprint') {
        prop.add(this.add.image(0, 0, 'environment-glow').setTint(0xc07bff).setScale(0.5).setBlendMode(Phaser.BlendModes.ADD));
        for (const dx of [-6, 6]) prop.add(this.add.ellipse(dx, 0, 8, 12, 0xd9b8ff, 0.9));
      } else if (objective.target === 'pond-seashell') {
        prop.add(this.add.ellipse(0, 0, 12, 9, 0xf3e6cf).setStrokeStyle(1, 0xb8a48a));
        prop.add(this.add.image(0, 0, 'environment-glow').setTint(0x7fb8ff).setScale(0.35).setBlendMode(Phaser.BlendModes.ADD));
      } else if (objective.target === 'finish-ribbon') {
        prop.add(this.add.rectangle(0, 0, 24, 5, 0x55cabb));
        prop.add(this.add.rectangle(-6, 6, 4, 10, 0x55cabb).setAngle(20));
        prop.add(this.add.rectangle(6, 6, 4, 10, 0x55cabb).setAngle(-20));
      } else if (objective.target === 'foil-glint') {
        prop.add(this.add.image(0, 0, 'environment-glow').setTint(0xd8f0ff).setScale(0.45).setBlendMode(Phaser.BlendModes.ADD));
        prop.add(this.add.polygon(0, 0, [0, 6, 8, 0, 18, 2, 22, 8, 12, 12, 2, 10], 0xdfe6ea).setStrokeStyle(1, 0x9aa3aa));
      } else if (objective.target === 'summer-snowflake') {
        prop.add(this.add.image(0, 0, 'environment-glow').setTint(0xbfe8ff).setScale(0.45).setBlendMode(Phaser.BlendModes.ADD));
        prop.add(this.add.text(0, 0, '❄', { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#ffffff' }).setOrigin(0.5));
      } else if (objective.target !== 'oak-stirring') {
        prop.add(this.add.rectangle(0, 0, 24, 18, 0xe9d7ac).setStrokeStyle(2, 0x765b40));
        prop.add(this.add.rectangle(0, 0, 14, 3, 0x508f83));
      }
    }
    this.trail = new EchoTrail(this);
    this.renderActivityMarkers();
    this.obstacles = [
      { x: 650, y: 380, radius: 38 },
      { x: 1050, y: 550, radius: 48 },
      { x: 1250, y: 760, radius: 42 },
      { x: 560, y: 780, radius: 46 },
    ];
    for (const { x, y, radius } of this.obstacles) {
      const obstacle = this.add.circle(x, y, radius, 0x66744d, 0);
      addTree(this, x, y, radius);
      this.physics.add.existing(obstacle, true);
      (obstacle.body as Phaser.Physics.Arcade.StaticBody).setCircle(radius);
      this.physics.add.collider(this.player, obstacle);
      this.physics.add.collider(this.horse.display, obstacle);
    }

    this.movementKeys = this.input.keyboard!.addKeys({
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D',
      upArrow: 'UP',
      downArrow: 'DOWN',
      leftArrow: 'LEFT',
      rightArrow: 'RIGHT',
    }) as typeof this.movementKeys;
    this.input.keyboard!.addCapture('W,A,S,D,UP,DOWN,LEFT,RIGHT');
    this.interactionKey = this.input.keyboard!.addKey('E');
    this.raceKey = this.input.keyboard!.addKey('R');
    this.input.keyboard!.addCapture('E');

    this.cameraTarget = this.add.zone(this.player.x, this.player.y, 1, 1);
    this.cameras.main
      .setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
      .startFollow(this.cameraTarget, false, 0.1, 0.1);
    this.cameras.main.fadeIn(250, 16, 44, 43);

    this.ui = new GameUI((page) => this.openMenu(page), () => this.input.keyboard?.resetKeys());
    this.updateOutfitText();
    this.updateQuestText();
    this.ambience = this.sound.add('sunmeadow-ambience', { loop: true, volume: 0.12 });
    this.ambience.play();
    if (this.activeDialogueId) this.showDialogue(this.activeDialogueId, this.getDialogue(this.activeDialogueId));
    this.nextAutosaveAt = this.time.now + 1000;
    this.syncFinaleSite();
    this.checkCatCompletion();
    window.addEventListener('pagehide', this.handlePageHide);
    this.game.events.on(Phaser.Core.Events.BLUR, this.handleBlur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('pagehide', this.handlePageHide);
      this.game.events.off(Phaser.Core.Events.BLUR, this.handleBlur);
      this.ambience.stop();
      this.ambience.destroy();
      this.ui.destroy();
    });
    this.persistGame();
  }

  update(_time: number, delta: number): void {
    const keyboard = this.input.keyboard;
    if (!keyboard || this.overlayActive) return;
    this.echoSites.update(this.player.x, this.player.y);

    if (this.ui.isOpen) {
      this.playerBody.setVelocity(0, 0);
      this.horseBody.setVelocity(0, 0);
      return;
    }
    for (const cat of this.cats) cat.update(this.time.now, this.player);
    this.bolt.update(this.time.now, this.player);
    this.trail.update(this.time.now, this.mounted ? this.horse.display : this.player);
    this.updatePrompt();
    if (Phaser.Input.Keyboard.JustDown(this.raceKey) && this.nearRaceGate()) this.openRaceMenu();
    if (this.ui.isOpen) return;

    const up = this.movementKeys.up.isDown || this.movementKeys.upArrow.isDown;
    const down = this.movementKeys.down.isDown || this.movementKeys.downArrow.isDown;
    const left = this.movementKeys.left.isDown || this.movementKeys.leftArrow.isDown;
    const right = this.movementKeys.right.isDown || this.movementKeys.rightArrow.isDown;
    let x = Number(right) - Number(left);
    let y = Number(down) - Number(up);
    const length = Math.hypot(x, y);
    if (length > 0) {
      x /= length;
      y /= length;
    }
    this.checkStoryObjective();
    if (this.ui.isOpen) return;
    if (Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
      const cat = this.nearbyCat();
      const horseReady = this.horseName !== null;
      if (this.nearRaceGate()) this.openRaceMenu();
      else if (this.mounted) this.tryDismount();
      else if (this.interactEcho() || this.interactHorseChoice() || this.inspectStoryObject() || this.interactStoryActor() || this.interactJudge()) {}
      else if (horseReady && this.isNear(this.player.x, this.player.y, this.horse.display.x, this.horse.display.y, 35)) this.mountHorse();
      else if (this.nearBolt()) this.petBolt();
      else if (cat) this.petCat(cat);
      else if (this.isNear(this.player.x, this.player.y, KEEPER_POSITION.x, KEEPER_POSITION.y, INTERACTION_RANGE)) {
        const clue = this.storyIndex >= echoStartIndex;
        this.advanceStory('talk', 'stable-keeper');
        const id = clue ? 'echo-keeper-clue' : 'stable-keeper-greeting';
        this.showDialogue(id, this.getDialogue(id));
      }
      else if (this.talkToNearbyVillager()) {}
      else if (horseReady && this.isNear(this.player.x, this.player.y, this.horse.display.x, this.horse.display.y, INTERACTION_RANGE)) {
        this.mountHorse();
      }
      this.persistGame();
    }

    if (this.ui.isOpen) return;
    const body = this.mounted ? this.horseBody : this.playerBody;
    const speed = this.mounted ? HORSE_SPEED : PLAYER_SPEED;
    // Exponential easing keeps steering consistent across frame rates; release brakes sooner.
    const response = this.mounted ? (length ? 7 : 11) : 24;
    const blend = 1 - Math.exp(-response * Math.min(delta, 50) / 1000);
    body.setVelocity(Phaser.Math.Linear(body.velocity.x, x * speed, blend), Phaser.Math.Linear(body.velocity.y, y * speed, blend));
    if (!length && body.speed < 4) body.setVelocity(0, 0);
    if (this.mounted) {
      this.horse.setFacing(x);
      const bob = body.speed > 40 ? Math.sin(this.time.now / 85) * 1.5 : 0;
      this.player.setPosition(this.horse.display.x, Math.max(PLAYER_RADIUS, this.horse.display.y - 27 + bob));
      if (body.speed > 140 && this.time.now > this.nextDustAt) {
        const dust = this.add.circle(this.horse.display.x - body.velocity.x * 0.05, this.horse.display.y + 14, 4, 0xc8b77b, 0.25);
        this.tweens.add({ targets: dust, alpha: 0, scale: 2, duration: 420, onComplete: () => dust.destroy() });
        this.nextDustAt = this.time.now + 140;
      }
    }
    if (length) this.riderDirection = Math.abs(x) > Math.abs(y) ? (x > 0 ? 2 : 3) : (y < 0 ? 1 : 0);
    if (this.mounted) this.riderDirection = this.horse.facing < 0 ? 3 : 2;
    const riderFrame = (riderAppearances.findIndex(({ id }) => id === this.appearanceId) * 3 + (outfits.find(({ id }) => id === this.outfitId)?.frame ?? 0)) * 4 + this.riderDirection;
    const mountedFrame = 36 + Math.floor(riderFrame / 4) * 2 + (this.horse.facing < 0 ? 1 : 0);
    this.playerArt.setFrame(this.mounted ? mountedFrame : riderFrame).setPosition(this.player.x, this.player.y + (this.mounted ? 28 : 16) + (!this.mounted && body.speed > 30 ? Math.round(Math.sin(this.time.now / 100)) : 0));
    this.playerArt.setTint(this.outfitId === 'birthday-teal' ? 0x9dffe2 : 0xffffff);
    this.playerArt.setDepth((this.mounted ? this.horse.display.y + 29 : this.player.y + 16));
    this.accessoryArt.setVisible(this.accessoryId !== 'none');
    if (this.accessoryId !== 'none') {
      // Frames facing left are pre-flipped in the rider sheet, so the overlay flips to match.
      this.accessoryArt.setTexture(accessoryKey(this.accessoryId)).setPosition(this.playerArt.x, this.playerArt.y)
        .setFlipX(this.mounted ? this.horse.facing < 0 : this.riderDirection === 3).setDepth(this.playerArt.depth + 0.5);
    }
    this.playerShadow.setPosition(this.player.x, this.player.y + 12).setDepth(this.player.y - 1).setVisible(!this.mounted);
    this.horse.animate(this.time.now, this.horseBody.speed);
    const target = this.mounted ? this.horse.display : this.player;
    this.cameraTarget.setPosition(target.x + body.velocity.x * 0.18, target.y + body.velocity.y * 0.12);
    const cameraBlend = 1 - Math.exp(-6 * Math.min(delta, 50) / 1000);
    this.cameras.main.setLerp(cameraBlend, cameraBlend);
    this.cameras.main.setZoom(Phaser.Math.Linear(this.cameras.main.zoom, this.mounted ? 0.94 : 1, cameraBlend));
    if (this.time.now >= this.nextAutosaveAt) {
      this.persistGame();
      this.nextAutosaveAt = this.time.now + 1000;
    }
  }

  private openMenu(page: MenuPage): void {
    if (this.activeDialogueId || this.overlayActive) return;
    this.playerBody.setVelocity(0, 0);
    this.horseBody.setVelocity(0, 0);
    const back = button('back-menu', '← Menu');
    if (page === 'pause') {
      this.ui.show('A moment in Sunmeadow', `<div class="menu-grid">${button('inventory', 'Satchel · I')}${button('wardrobe', 'Wardrobe · O')}${button('horse', 'Horse & stable · H')}${button('journal', 'Quest journal · J')}</div><p class="muted">WASD / arrows to move · E to talk, look, pet and ride</p><label class="settings">Sound <input id="volume" type="range" min="0" max="100" value="${Math.round(this.sound.volume * 100)}"></label>${button('resume', 'Return to the meadow')}`);
      for (const name of ['inventory', 'wardrobe', 'horse', 'journal'] as const) this.ui.bind(name, () => this.openMenu(name));
      this.ui.bind('resume', () => this.ui.close());
      this.ui.dialog.querySelector<HTMLInputElement>('#volume')!.oninput = (event) => {
        this.sound.volume = Number((event.target as HTMLInputElement).value) / 100;
        storeVolume(this.sound.volume);
      };
    } else if (page === 'inventory') {
      const owned = items.filter(({ id }) => (this.inventory.get(id) ?? 0) > 0);
      this.ui.show('Your satchel', `${owned.length ? owned.map(({ id, name }) => `<div class="item-row"><span class="item-icon" aria-hidden="true">${id === 'wildflower' ? '✿' : '●'}</span>${name}<strong>×${this.inventory.get(id)}</strong></div>`).join('') : '<p>Your satchel is empty.</p><p class="muted">Flowers and gifts from your adventures will appear here.</p>'}<p class="muted">Keepsakes and treats collected along the way.</p>${back}`);
    } else if (page === 'wardrobe') {
      const outfit = outfits.find(({ id }) => id === this.outfitId)!;
      const appearance = getRiderAppearance(this.appearanceId);
      const choices = this.wardrobeCategory === 'outfits' ? outfits.filter(item => this.ownedOutfits().includes(item.id)) : this.wardrobeCategory === 'rider' ? riderAppearances : [];
      const selected = this.wardrobeCategory === 'outfits' ? this.outfitId : this.appearanceId;
      const accessoryChoices = this.wardrobeCategory === 'accessories' ? this.ownedAccessories().map(id => {
        const item = accessories.find(accessory => accessory.id === id)!;
        return `<button class="item-choice" id="wear-${id}" aria-pressed="${this.accessoryId === id}"><span class="accessory-swatch">${this.riderPreview(id)}</span><span>${item.name}<br><small>${this.accessoryId === id ? 'Wearing ✓' : 'Wear this'}</small></span></button>`;
      }).join('') : '';
      const tabs = [['outfits', 'Outfits'], ['accessories', 'Accessories'], ['rider', 'Rider']] as const;
      this.ui.show('Your wardrobe', `<div class="tabs">${tabs.map(([id, label]) => button(`${id}-tab`, label, this.wardrobeCategory === id)).join('')}</div><div class="split"><div class="preview">${this.riderPreview()}<div>${outfit.name}<br><small>YOUR CURRENT LOOK</small></div></div><div class="choices">${accessoryChoices}${choices.map((item) => `<button class="item-choice" id="equip-${item.id}" aria-pressed="${selected === item.id}"><span class="swatch" style="--outfit:${color(this.wardrobeCategory === 'outfits' ? item.color : outfit.color)};--rider:${color(this.wardrobeCategory === 'rider' ? item.color : appearance.color)}"></span><span>${item.name}<br><small>${selected === item.id ? 'Equipped ✓' : 'Wear this look'}</small></span></button>`).join('')}</div></div><p class="muted">${this.wardrobeCategory === 'accessories' ? 'Hats and scarves mix with any outfit. Madame Rosette approves of most of them.' : 'Meadow and Sky are yours. Visit the bakery for Berry.'}</p>${back}`);
      for (const [id] of tabs) this.ui.bind(`${id}-tab`, () => { this.wardrobeCategory = id; this.openMenu('wardrobe'); });
      for (const id of this.ownedAccessories()) this.ui.bind(`wear-${id}`, () => {
        this.accessoryId = id;
        this.persistGame();
        this.openMenu('wardrobe');
        this.ui.notify(id === 'none' ? 'Accessory off' : `${accessories.find(accessory => accessory.id === id)?.name} on`);
      });
      for (const item of choices) this.ui.bind(`equip-${item.id}`, () => {
        if (this.wardrobeCategory === 'outfits') this.outfitId = (outfits.find(({ id }) => id === item.id) ?? outfits[0]).id;
        else this.appearanceId = (riderAppearances.find(({ id }) => id === item.id) ?? riderAppearances[0]).id;

        if (this.wardrobeCategory === 'outfits') this.advanceStory('equip', 'any-outfit');
        this.updateOutfitText();
        this.persistGame();
        this.openMenu('wardrobe');
        this.ui.notify(`${item.name} equipped`);
      });
    } else if (page === 'horse') {
      const horse = getHorse(this.horseId);
      const name = escapeHTML(this.horseLabel);
      let content = this.horseName === null
        ? '<h2>No horse yet</h2><p>Three horses are waiting by the paddock fence south of the stable. Go and say hello.</p>'
        : `<div class="split"><div class="preview"><img class="horse-art" src="/assets/art/horse-${horse.id}.png" alt="${name} with teal saddle blanket and leather tack"><small>ACTIVE HORSE ✓</small></div><div><h2>${name}</h2><p>${horse.breed} · ${horse.coat}</p><p class="muted">Your companion in Sunmeadow.<br>${this.mounted ? 'You are riding together.' : 'Approach your horse and press E to ride.'}</p><p>Owned horses · 1</p></div></div>`;
      if (this.horseCategory === 'horse' && this.horseName !== null) {
        const caring = storyObjectives[this.storyIndex]?.type === 'care';
        const labels: Record<string, string> = { brush: 'Brush · groom', water: 'Water', treat: 'Treat' };
        content += `<p>A good brush, fresh water and a little treat. No supplies needed.</p><div class="tabs">${['brush', 'water', 'treat'].map(action => button(`care-${action}`, labels[action]! + (caring && this.activityProgress.includes(action) ? ' ✓' : ''))).join('')}</div>`;
        if (this.storyIndex === storyObjectives.length || storyObjectives[this.storyIndex]?.type === 'race') content += button('return-home', this.storyIndex === storyObjectives.length ? 'Return to Sunmeadow' : 'Return to the race gate');
      }
      if (this.horseCategory === 'tack') {
        content = '<div class="item-row"><span class="item-icon" aria-hidden="true">●</span>Leather saddle and teal blanket<strong>Fitted ✓</strong></div>';
        if (this.inventory.has('forest-rosette')) content += '<div class="item-row"><span class="item-icon" aria-hidden="true">✿</span>Forest Run rosette, pinned to the bridle<strong>Fitted ✓</strong></div>';
        if (this.inventory.has('echo-tack')) content += '<div class="item-row"><span class="item-icon" aria-hidden="true" style="color:#55cabb">◆</span>Teal &amp; oak birthday tack: ribbon bridle, teal saddle pad, oak-bead breastplate<strong>Fitted ✓</strong></div>';
        content += '<p class="muted">Race rewards and keepsakes are fitted automatically.</p>';
      }
      if (this.horseCategory === 'stable') {
        const slot = stableDecorationSlots.find(({ id }) => id === this.pickingSlot);
        content = slot
          ? `<h2>${slot.name} · choose a decoration</h2><div class="choices decor-choices">${this.availableDecorations().map(({ id, name, symbol, color: tint }) => `<button class="item-choice" id="place-${slot.id}-${id}" aria-pressed="${this.decorationSelections.get(slot.id) === id}"><span class="item-icon" style="color:${tint}" aria-hidden="true">${symbol}</span><span>${escapeHTML(name)}</span></button>`).join('')}</div>${button('picker-back', '← All slots')}`
          : stableDecorationSlots.map((candidate) => `<div class="item-row"><span>${candidate.name}</span><span class="muted">${decorations.find(({ id }) => id === this.decorationSelections.get(candidate.id))!.name}</span>${button(`decorate-${candidate.id}`, 'Change')}</div>`).join('');
      }
      this.ui.show('Horse & stable', `<div class="tabs">${button('horse-tab', 'Your horse', this.horseCategory === 'horse')}${button('tack-tab', 'Tack', this.horseCategory === 'tack')}${button('stable-tab', 'Stable', this.horseCategory === 'stable')}</div>${content}<br>${back}`);
      for (const category of ['horse', 'tack', 'stable'] as const) this.ui.bind(`${category}-tab`, () => { this.horseCategory = category; this.pickingSlot = null; this.openMenu('horse'); });
      for (const action of ['brush', 'water', 'treat']) this.ui.bind(`care-${action}`, () => {
        if (this.mounted || !this.isNear(this.player.x, this.player.y, this.horse.display.x, this.horse.display.y, 100)) {
          this.ui.notify('Dismount beside your horse to take care of them.');
          return;
        }
        if (action === 'brush') { this.ui.close(); this.startGrooming(); return; }
        if (storyObjectives[this.storyIndex]?.type === 'care') this.completeActivityPoint(action);
        this.openMenu('horse');
        this.ui.notify({ brush: 'A glossy coat and a satisfied ear flick.', water: 'Fresh water. Your horse takes a long, happy drink.', treat: 'The treat disappears. The hopeful look remains.' }[action]!);
      });
      this.ui.bind('return-home', () => {
        this.horseBody.reset(975, 650);
        this.playerBody.reset(this.mounted ? 975 : 925, this.mounted ? 623 : 650);
        this.cameras.main.centerOn(975, 650);
        this.persistGame();
        this.ui.close();
      });
      for (const slot of stableDecorationSlots) {
        this.ui.bind(`decorate-${slot.id}`, () => { this.pickingSlot = slot.id; this.openMenu('horse'); });
        for (const decoration of this.availableDecorations()) this.ui.bind(`place-${slot.id}-${decoration.id}`, () => {
          this.placeDecoration(slot.id, decoration.id);
          this.pickingSlot = null;
          this.openMenu('horse');
          this.ui.notify(`${decoration.name} · ${slot.name}`);
        });
      }
      this.ui.bind('picker-back', () => { this.pickingSlot = null; this.openMenu('horse'); });
    } else {
      let offset = 0;
      const chapters = storyChapters.map(quest => {
        const start = offset;
        offset += quest.objectives.length;
        if (start > this.storyIndex) return '';
        return `<h2>${escapeHTML(quest.name)}${offset <= this.storyIndex ? ' · Complete ✓' : ''}</h2><ol class="quest-list">${quest.objectives.map((objective, i) => `<li class="${start + i === this.storyIndex ? 'current' : ''}">${start + i < this.storyIndex ? '✓ ' : ''}${escapeHTML(objective.description)}${start + i < this.storyIndex && objective.payoff ? `<p class="muted">${escapeHTML(objective.payoff)}</p>` : ''}</li>`).join('')}</ol>`;
      }).join('');
      const bests = raceTracks.filter(({ id }) => this.raceBest.has(id)).map(({ id, name }) => `${name} ${(this.raceBest.get(id)! / 1000).toFixed(1)}s`).join(' · ');
      const card = this.restoredEchoes.includes(FINALE.id) ? button('birthday-card', 'Read your birthday card') : '';
      this.ui.show('Your journal', `${card}${this.echoJournal()}${chapters}${this.animalJournal()}${bests ? `<h2>Best times</h2><p>${escapeHTML(bests)}</p>` : ''}${this.raceResultText ? `<p class="muted">Last race · ${escapeHTML(this.raceResultText)}</p>` : ''}${back}`);
    }
    this.ui.bind('back-menu', () => this.openMenu('pause'));
    this.ui.bind('birthday-card', () => {
      this.ui.show(birthdayFinale.speaker, `${birthdayCardHTML()}${button('card-back', '← Journal')}`, undefined, 'birthday');
      this.ui.bind('card-back', () => this.openMenu('journal'));
    });
  }

  private showShop(): void {
    this.ui.show('The village counter', '<p>A welcome gift: a Berry riding outfit. No coins needed.</p><p class="muted">The cat has inspected the stitching. Payment in compliments is accepted.</p>' + button('claim-outfit', 'Collect your welcome outfit') + button('leave-shop', 'Back to the village'));
    this.ui.bind('claim-outfit', () => {
      if (!this.inventory.has('berry-gift')) this.addItem('berry-gift');
      this.advanceStory('shop', 'bakery-gift');
      this.ui.notify('Berry outfit is yours · O to try it on');
    });
    this.ui.bind('leave-shop', () => this.ui.close());
  }

  private updatePrompt(): void {
    const { x, y } = this.player;
    const cat = this.nearbyCat();
    const horseReady = this.horseName !== null;
    let text = '';
    if (this.nearRaceGate()) text = 'E · Talk to the Race Steward';
    else if (this.mounted) text = `Riding ${this.horseLabel} · E to dismount`;
    else if (horseReady && this.isNear(x, y, this.horse.display.x, this.horse.display.y, 35)) text = `E · Ride ${this.horseLabel}`;
    else if (this.nearBolt()) text = `E · Pet ${bolt.name}`;
    else if (cat) text = `E · Pet ${cat.definition.name}`;
    else if (this.isNear(x, y, KEEPER_POSITION.x, KEEPER_POSITION.y, INTERACTION_RANGE)) text = 'E · Talk to the Stable Keeper';
    else {
      const villager = villagers.find((npc) => this.isNear(x, y, npc.x, npc.y, INTERACTION_RANGE));
      if (villager) text = `E · Talk to ${villager.name}`;

      else if (horseReady && this.isNear(x, y, this.horse.display.x, this.horse.display.y, INTERACTION_RANGE)) text = `E · Ride ${this.horseLabel}`;
    }
    const objective = storyObjectives[this.storyIndex];
    const atObjective = (range: number) => !this.mounted && objective?.x !== undefined && objective.y !== undefined && this.isNear(x, y, objective.x, objective.y, range);
    if (objective?.type === 'inspect' && atObjective(QUEST_INTERACTION_RANGE)) text = 'E · Take a closer look';
    if (objective?.type === 'echo' && atObjective(QUEST_INTERACTION_RANGE + 18)) text = 'E · Step into the Echo';
    if (objective?.type === 'choose-horse' && atObjective(INTERACTION_RANGE + 30)) text = 'E · Meet the horses';
    if (objective?.type === 'talk' && atObjective(INTERACTION_RANGE)) text = 'E · Talk';
    if (objective?.type === 'fashion' && atObjective(INTERACTION_RANGE)) text = 'E · Enter the Style Parade';
    const storyCat = objective?.type === 'cat' ? this.cats.find(c => c.definition.id === objective.target) : undefined;
    if (!this.mounted && storyCat && this.isNear(x, y, storyCat.x, storyCat.y, CAT_RANGE)) text = `E · Pet ${storyCat.definition.name}`;
    this.ui.setPrompt(text);
    this.updateQuestText();
  }

  private get horseLabel(): string {
    return this.horseName ?? getHorse(this.horseId).name;
  }

  private nearbyCat(): CatEntity | undefined {
    return this.cats.find(cat => this.isNear(this.player.x, this.player.y, cat.x, cat.y, CAT_RANGE));
  }

  private petCat(cat: CatEntity): void {
    this.ui.notify(cat.pet(this.time.now, this.player));
    this.feedbackTone(330);
    this.discover(cat.definition.id);
    this.advanceStory('cat', cat.definition.id);
  }

  private nearBolt(): boolean {
    return this.bolt.display.visible && this.isNear(this.player.x, this.player.y, this.bolt.x, this.bolt.y, CAT_RANGE + 10);
  }

  private petBolt(): void {
    this.ui.notify(this.bolt.pet(this.time.now, this.player));
    this.feedbackTone(392);
    this.discover(bolt.id);
    this.advanceStory('pet', bolt.id);
  }

  private discover(id: AnimalId): void {
    if (this.animals.has(id)) return;
    this.animals.add(id);
    this.checkCatCompletion();
    this.persistGame();
  }

  /** The optional all-cats reward; also grants it to saves that met every cat before it existed. */
  private checkCatCompletion(): void {
    if (this.inventory.has(catCompletion.reward) || !villageCats.every(({ id }) => this.animals.has(id))) return;
    this.addItem(catCompletion.reward);
    this.ui.notify(catCompletion.line);
  }

  private animalJournal(): string {
    const known = [...villageCats, bolt].filter(({ id }) => this.animals.has(id));
    const unknown = villageCats.length - villageCats.filter(({ id }) => this.animals.has(id)).length;
    if (!known.length) return '';
    return `<h2>Animal friends</h2><ul class="quest-list animal-list">${known.map(({ name, note }) => `<li><strong>${name}</strong> · ${escapeHTML(note)}</li>`).join('')}${unknown ? `<li class="muted">${unknown} more cat${unknown === 1 ? '' : 's'} to meet</li>` : `<li><strong>${catCompletion.note}</strong></li>`}</ul>`;
  }

  private isNear(x: number, y: number, targetX: number, targetY: number, range: number): boolean {
    return Phaser.Math.Distance.Between(x, y, targetX, targetY) <= range;
  }

  private interactStoryActor(): boolean {
    const objective = storyObjectives[this.storyIndex];
    if (objective?.type === 'cat') {
      const cat = this.cats.find(cat => cat.definition.id === objective.target && this.isNear(this.player.x, this.player.y, cat.x, cat.y, CAT_RANGE));
      if (!cat) return false;
      this.petCat(cat);
      return true;
    }
    if (objective?.type !== 'talk' || objective.x === undefined || objective.y === undefined ||
      !this.isNear(this.player.x, this.player.y, objective.x, objective.y, INTERACTION_RANGE)) return false;
    const id = objective.target === 'stable-keeper' ? 'stable-keeper-greeting' : villagers.find(npc => npc.id === objective.target)?.id;
    if (!id) return false;
    this.advanceStory('talk', objective.target);
    this.showDialogue(id, this.getDialogue(id));
    return true;
  }

  /** Madame Rosette: the Style Parade while it is the current objective, otherwise a word of fashion advice. */
  private interactJudge(): boolean {
    if (!this.isNear(this.player.x, this.player.y, JUDGE.x, JUDGE.y, INTERACTION_RANGE)) return false;
    if (storyObjectives[this.storyIndex]?.type === 'fashion') this.openStyleParade();
    else this.showDialogue(JUDGE.id, this.getDialogue(JUDGE.id));
    return true;
  }

  private talkToNearbyVillager(): boolean {
    const villager = villagers.find(({ x, y }) => this.isNear(this.player.x, this.player.y, x, y, INTERACTION_RANGE));
    if (!villager) return false;
    this.advanceStory('talk', villager.id);
    this.showDialogue(villager.id, this.getDialogue(villager.id));
    return true;
  }

  private showDialogue(id: SavedDialogueId, dialogue: { speaker: string; message: string }, afterClose?: () => void): void {
    this.activeDialogueId = id;
    this.dialogueTarget ??= storyObjectives[this.storyIndex - 1]?.id ?? null;
    this.playerBody.setVelocity(0, 0);
    this.horseBody.setVelocity(0, 0);
    this.ui.show(dialogue.speaker, `<p class="dialogue-copy">${escapeHTML(dialogue.message)}</p>${button('continue-dialogue', 'Continue')}${id === 'village-baker' ? button('browse-shop', 'Visit the counter') : ''}`, () => {
      this.activeDialogueId = null;
      this.dialogueTarget = null;
      this.persistGame();
      afterClose?.();
    }, 'dialogue');
    this.ui.bind('continue-dialogue', () => this.ui.close());
    this.ui.bind('browse-shop', () => { this.ui.close(); this.showShop(); });
    this.ui.dialog.querySelector<HTMLButtonElement>('#continue-dialogue')?.focus();
    this.persistGame();
  }

  private getDialogue(id: SavedDialogueId): { speaker: string; message: string } {
    const previous = this.dialogueTarget ? storyObjectives.find(o => o.id === this.dialogueTarget) : storyObjectives[this.storyIndex - 1];
    const target = id === 'stable-keeper-greeting' ? 'stable-keeper' : id;
    if (previous?.type === 'talk' && previous.target === target && previous.payoff) {
      const speaker = target === 'stable-keeper' ? stableKeeperGreeting.speaker : villagers.find(npc => npc.id === target)!.name;
      return { speaker, message: previous.payoff };
    }
    if (id === 'stable-keeper-greeting') return stableKeeperGreeting;
    if (id === 'echo-keeper-clue') return this.restoredEchoes.includes(FINALE.id) ? { speaker: stableKeeperGreeting.speaker, message: birthdayReturn.keeper } : echoClues['stable-keeper'];
    if (id === 'echo-guide-clue') return echoClues['trail-guide'];
    if (id === 'birthday-finale') return birthdayFinale;
    if (id === 'story-inspect') return { speaker: 'A little discovery', message: previous?.payoff ?? 'The trail continues.' };
    if (id === 'echo-reflection' && previous?.type === 'echo') return { speaker: 'Hana', message: getEcho(previous.target).reflection };
    const villager = villagers.find(({ id: villagerId }) => villagerId === id);
    return villager?.dialogue ?? stableKeeperGreeting;
  }

  private renderVillage(): void {
    for (const villager of villagers) {
      this.add.image(villager.x, villager.y + 16, 'riders', villager.frame).setOrigin(0.5, 1).setScale(1.25).setDepth(villager.y + 16);
      this.add.text(villager.x, villager.y - 51, villager.name, {
        color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '12px',
        backgroundColor: '#173b36cc', padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(100000);
    }

    this.cats = villageCats.map(cat => new CatEntity(this, cat));
    this.bolt = new BoltEntity(this);
    this.bolt.setVisible(this.restoredEchoes.includes('first-winter'));
  }

  /** The parade scarecrow, dressed badly on purpose: mismatched patches and a hat that has given up. */
  private renderScarecrow(): void {
    const { x, y } = scarecrow;
    const figure = this.add.container(x, y).setDepth(y + 20);
    figure.add([
      this.add.rectangle(0, 0, 4, 46, 0x6e4a2e), this.add.rectangle(0, -26, 40, 4, 0x6e4a2e),
      this.add.rectangle(0, -18, 22, 22, 0xd0654d), this.add.rectangle(-5, -14, 8, 8, 0x8fbf3a), this.add.rectangle(6, -22, 6, 6, 0xc07bff),
      this.add.circle(0, -36, 8, 0xe8d6a0), this.add.rectangle(0, -45, 22, 4, 0x3a8f3a).setAngle(-14), this.add.rectangle(-3, -50, 10, 8, 0xffd86a).setAngle(-14),
      this.add.rectangle(-18, -24, 6, 3, 0xd8b04a), this.add.rectangle(18, -24, 6, 3, 0xd8b04a),
    ]);
    this.tweens.add({ targets: figure, angle: { from: -2, to: 2 }, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.add.text(x, y - 70, 'Style Parade', {
      color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '12px', backgroundColor: '#173b36cc', padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(100000);
  }

  private renderPaddock(): void {
    if (!this.paddock.size) {
      for (const { id, x, y, flip } of PADDOCK_HORSES) {
        const index = horses.findIndex(horse => horse.id === id);
        this.paddock.set(id, this.add.image(x, y - 12, 'horses', index * 4).setScale(1.25).setFlipX(flip).setDepth(y + 28));
      }
    }
    for (const [id, image] of this.paddock) image.setVisible(this.horseName === null || id !== this.horseId);
  }

  private interactHorseChoice(): boolean {
    const objective = storyObjectives[this.storyIndex];
    if (objective?.type !== 'choose-horse' || objective.x === undefined || objective.y === undefined ||
      !this.isNear(this.player.x, this.player.y, objective.x, objective.y, INTERACTION_RANGE + 30)) return false;
    this.playerBody.setVelocity(0, 0);
    showHorseChoice(this.ui, (id, name) => this.chooseHorse(id, name));
    return true;
  }

  private chooseHorse(id: HorseId, name: string): void {
    this.horseId = id;
    this.horseName = name;
    this.horse.setDefinition(getHorse(id));
    const x = Phaser.Math.Clamp(this.player.x + 60, HORSE_RADIUS, WORLD_WIDTH - HORSE_RADIUS);
    const y = Phaser.Math.Clamp(this.player.y + 20, HORSE_RADIUS, WORLD_HEIGHT - HORSE_RADIUS);
    this.horseBody.enable = true;
    this.horseBody.reset(x, y);
    this.horse.display.setVisible(true);
    this.renderPaddock();
    this.ui.close();
    this.feedbackTone(600);
    this.advanceStory('choose-horse', 'paddock');
    this.ui.notify(`${name} trots over to you. Walk beside ${name} and press E to mount.`);
  }

  private interactEcho(): boolean {
    const objective = storyObjectives[this.storyIndex];
    if (objective?.type !== 'echo' || objective.x === undefined || objective.y === undefined ||
      !this.isNear(this.player.x, this.player.y, objective.x, objective.y, QUEST_INTERACTION_RANGE + 18)) return false;
    this.enterEcho(getEcho(objective.target));
    return true;
  }

  /** Fades out and runs an Echo, race or grooming scene over the paused world. */
  private launchOverlay(key: 'Echo' | 'Race' | 'Groom', data: EchoSession | RaceSession | GroomSession, fade = MEADOW_FADE): void {
    this.overlayActive = true;
    this.playerBody.setVelocity(0, 0);
    this.horseBody.setVelocity(0, 0);
    this.ui.setPrompt('');
    this.ui.setHudHidden(true);
    this.persistGame();
    this.cameras.main.fadeOut(key === 'Echo' ? 600 : 450, fade.r, fade.g, fade.b);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.launch(key, data);
      this.scene.pause();
    });
  }

  private returnFromOverlay(fade = MEADOW_FADE): void {
    this.scene.resume();
    this.overlayActive = false;
    this.input.keyboard?.resetKeys();
    this.ui.setHudHidden(false);
    this.cameras.main.fadeIn(600, fade.r, fade.g, fade.b);
  }

  private enterEcho(echo: EchoDefinition): void {
    if (this.echoProgress?.id !== echo.id) this.echoProgress = { id: echo.id, steps: [] };
    const progress = this.echoProgress;
    this.feedbackTone(720);
    this.cameras.main.flash(260, 190, 255, 240);
    this.launchOverlay('Echo', {
      echo,
      ui: this.ui,
      solvedSteps: [...progress.steps],
      restoredBefore: this.restoredEchoes.length,
      horse: { horseFrame: horses.findIndex(({ id }) => id === this.horseId) * 4, horseName: this.horseLabel },
      onStep: (stepId) => { if (!progress.steps.includes(stepId)) progress.steps.push(stepId); this.persistGame(); },
      onFinish: (restored) => this.leaveEcho(echo, restored),
    }, ECHO_FADE);
  }

  private leaveEcho(echo: EchoDefinition, restored: boolean): void {
    this.returnFromOverlay(ECHO_FADE);
    if (!restored) {
      this.ui.notify('The Echo waits. It remembers where you left off.');
      this.persistGame();
      return;
    }
    this.echoProgress = null;
    if (!this.restoredEchoes.includes(echo.id)) this.restoredEchoes.push(echo.id);
    this.echoSites.markRestored(echo.id);
    this.addItem(echo.reward);
    for (const gift of echo.gifts ?? []) this.addItem(gift);
    if (echo.id === 'first-winter') this.bolt.setVisible(true);
    if (echo.finale) this.celebrateBirthday();
    this.advanceStory('echo', echo.id);
    this.showDialogue('echo-reflection', { speaker: 'Hana', message: echo.reflection }, echo.finale ? () => {
      this.ui.notify(this.horseName === 'Sky' ? `${birthdayReturn.toast}\n${birthdayReturn.sky}` : birthdayReturn.toast);
    } : undefined);
  }

  /** Wakes the finale's hidden site once its chapter begins. */
  private syncFinaleSite(): void {
    if (this.storyIndex >= FINALE_START || this.restoredEchoes.includes(FINALE.id)) this.echoSites.wake(FINALE.id);
  }

  private renderBirthdayDecorations(): void {
    const { x, y } = KEEPER_POSITION;
    this.birthday = [];
    const colors = [0x55cabb, 0xf4efe6, 0xe8c14a];
    const bunting = this.add.graphics().setDepth(497);
    const points = Array.from({ length: 12 }, (_, i) => ({ x: x - 132 + i * 24, y: y - 152 + Math.sin(i / 11 * Math.PI) * 14 }));
    bunting.lineStyle(1, 0x5a3a24).strokePoints(points);
    points.slice(0, -1).forEach((point, i) => bunting.fillStyle(colors[i % 3]!).fillTriangle(point.x + 4, point.y, point.x + 20, point.y + 1, point.x + 12, point.y + 14));
    this.birthday.push(bunting);
    for (const [lx, ly] of [[x - 148, y - 80], [x + 148, y - 120]] as const) {
      const light = this.add.image(lx, ly, 'environment-glow').setTint(0xffd8a0).setScale(0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(ly + 1);
      this.tweens.add({ targets: light, alpha: 0.5, duration: 1400, yoyo: true, repeat: -1 });
      this.birthday.push(this.add.rectangle(lx, ly - 12, 2, 10, 0x5a3a24).setDepth(ly), this.add.ellipse(lx, ly, 14, 16, 0x55cabb).setStrokeStyle(1, 0xf4efe6).setDepth(ly), light);
    }
    // A cloth banner over the stable door, under the bunting.
    const banner = this.add.container(x, y - 124).setDepth(498);
    banner.add([
      this.add.rectangle(0, 0, 136, 18, 0xf4efe6).setStrokeStyle(2, 0x3f9a8c),
      this.add.text(0, 0, `Happy birthday, ${giftConfig.recipientName}`, { color: '#255b4c', fontFamily: 'Georgia, serif', fontSize: '11px' }).setOrigin(0.5),
    ]);
    this.birthday.push(banner);
    for (let i = 0; i < 10; i++) {
      const mote = this.add.rectangle(x - 140 + (i * 67) % 280, y - 150 + (i * 43) % 150, 3, 3, colors[i % 3]!).setDepth(2000);
      this.tweens.add({ targets: mote, y: mote.y + 16, alpha: 0.3, duration: 1800 + i * 150, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.birthday.push(mote);
    }
    const shown = this.restoredEchoes.includes(FINALE.id);
    for (const item of this.birthday) item.setVisible(shown);
  }

  private celebrateBirthday(): void {
    for (const item of this.birthday) item.setVisible(true);
    this.feedbackTone(660);
    this.time.delayedCall(160, () => this.feedbackTone(880));
  }

  private echoJournal(): string {
    const restored = echoes.filter(echo => this.restoredEchoes.includes(echo.id));
    const entries = [
      ...echoes.map(echo => restored.includes(echo)
        ? `<li><strong>Echo ${echo.numeral} · ${escapeHTML(echo.title)} ✓</strong><p class="muted">${escapeHTML(echo.completion.join(' '))}</p></li>`
        : `<li>Echo ${echo.numeral} · ???</li>`),
    ];
    return `<h2>Echoes · ${restored.length} of ${echoTotal} restored</h2><ol class="quest-list echo-list">${entries.join('')}</ol>`;
  }

  private checkStoryObjective(): void {
    const objective = storyObjectives[this.storyIndex];
    if (objective?.type === 'trail' && this.mounted) {
      const point = objective.points?.[this.activityProgress.length];
      if (point && this.isNear(this.horse.display.x, this.horse.display.y, point.x, point.y, 100)) this.completeActivityPoint(point.id);
    }
    if (objective?.type === 'ride' && this.mounted &&
      objective.x !== undefined && objective.y !== undefined &&
      this.isNear(this.horse.display.x, this.horse.display.y, objective.x, objective.y, 65)) {
      this.advanceStory('ride', objective.target);
    }
  }


  private inspectStoryObject(): boolean {
    const objective = storyObjectives[this.storyIndex];
    if (objective?.type !== 'inspect' || objective.x === undefined || objective.y === undefined ||
      !this.isNear(this.player.x, this.player.y, objective.x, objective.y, QUEST_INTERACTION_RANGE)) return false;
    this.advanceStory('inspect', objective.target);
    if (objective.target === 'birthday-finale') this.showDialogue('birthday-finale', birthdayFinale);
    else this.showDialogue('story-inspect', this.getDialogue('story-inspect'));
    return true;
  }

  /** Glowing hoofprints from the rider to the next waymark of the current trail. */
  private renderActivityMarkers(): void {
    if (!this.trail) return;
    const objective = storyObjectives[this.storyIndex];
    if (objective?.type !== 'trail' || !objective.points) { this.trail.show(null); return; }
    this.trail.show(objective.points.slice(this.activityProgress.length), objective.glow);
  }

  private completeActivityPoint(id: string): void {
    const objective = storyObjectives[this.storyIndex];
    if (!objective || this.activityProgress.includes(id)) return;
    this.activityProgress.push(id);
    this.feedbackTone(520 + this.activityProgress.length * 40);
    if (objective.type === 'trail') {
      const point = objective.points?.find(candidate => candidate.id === id);
      if (point) this.trail.celebrate(point);
      this.horse.react(['!', '♪', '!!'][this.activityProgress.length % 3]!);
    }
    const total = activityIds(objective).length;
    if (this.activityProgress.length === total) {
      this.advanceStory(objective.type, objective.target);
    } else {
      this.renderActivityMarkers();
      const label = { trail: 'Waymark', care: 'Horse care', fashion: 'Parade round' }[objective.type as 'trail' | 'care' | 'fashion'] ?? 'Step';
      this.ui.notify(`${label} ${this.activityProgress.length}/${total}`);
      this.updateQuestText();
      this.persistGame();
    }
  }

  private advanceStory(type: StoryObjective['type'], target: string): void {
    const objective = storyObjectives[this.storyIndex];
    if (!objective || objective.type !== type || objective.target !== target) return;
    this.storyIndex++;
    this.activityProgress = [];
    this.renderActivityMarkers();
    if (objective.reward) this.addItem(objective.reward);
    const chapter = storyChapters.find(chapter => chapter.name === objective.chapter)!;
    // Talk and inspect payoffs open as dialogue, so the toast would only repeat them.
    const inDialogue = objective.type === 'talk' || objective.type === 'inspect';
    const payoff = inDialogue ? '' : objective.payoff || 'A little further along…';
    if (objective.chapterEnd) {
      // One toast, so the chapter line does not instantly replace the payoff or the reward.
      if (chapter.reward) this.addItem(chapter.reward);
      const reward = chapter.reward ? `Collected · ${items.find(({ id }) => id === chapter.reward)?.name} ×1` : '';
      this.ui.notify([objective.payoff && payoff, `${chapter.name} complete · ${chapter.payoff}`, reward].filter(Boolean).join('\n\n'));
    } else if (payoff) {
      this.ui.notify(payoff);
    }
    this.updateTack();
    this.syncFinaleSite();
    this.updateQuestText();
    this.persistGame();
  }

  private updateTack(): void {
    this.horse.setTack({ echo: this.inventory.has('echo-tack'), rosette: this.inventory.has('forest-rosette') });
  }

  private addItem(id: ItemId): void {
    this.inventory.set(id, (this.inventory.get(id) ?? 0) + 1);
    this.feedbackTone(550);
    this.ui.notify(`Collected · ${items.find((item) => item.id === id)?.name} ×1`);
    this.persistGame();
  }

  private availableDecorations(): readonly (typeof decorations)[number][] {
    return decorations.filter(d => !('unlockItem' in d) || this.inventory.has(d.unlockItem));
  }

  private placeDecoration(slotId: StableDecorationSlotId, decorationId: DecorationId): void {
    const decoration = decorations.find(({ id }) => id === decorationId) ?? decorations[0];
    this.decorationSelections.set(slotId, decoration.id);
    const display = this.decorationDisplays.get(slotId);
    display?.marker.setText(decoration.symbol).setColor(decoration.color);
    display?.label.setText(decoration.name);
    if (display) this.tweens.add({ targets: display.marker, scale: { from: 1.6, to: 1 }, duration: 300, ease: 'Back.Out' });
    this.advanceStory('decorate', 'any-slot');
    this.advanceStory('decorate', decoration.id);
    this.persistGame();
  }

  private ownedOutfits(): readonly OutfitId[] {
    return outfits.filter(item => (item.id !== 'berry' || this.inventory.has('berry-gift') || this.outfitId === 'berry') && (item.id !== 'birthday-teal' || this.inventory.has('echo-tack'))).map(({ id }) => id);
  }

  private ownedAccessories(): readonly AccessoryId[] {
    return accessories.filter(item => !item.unlockItem || this.inventory.has(item.unlockItem)).map(({ id }) => id);
  }

  /** The current rider as HTML, optionally trying on another accessory. */
  private riderPreview(accessoryId = this.accessoryId): string {
    const outfit = outfits.find(({ id }) => id === this.outfitId) ?? outfits[0];
    const appearance = getRiderAppearance(this.appearanceId);
    const accessory = accessoryId === 'none' ? '' : `<img class="rider-preview accessory-preview" src="${this.textures.getBase64(accessoryKey(accessoryId))}" alt="">`;
    return `<div class="rider-stack"><img class="rider-preview" style="${this.outfitId === 'birthday-teal' ? 'filter:hue-rotate(-25deg)' : ''}" src="/assets/art/rider-${appearance.id}-${outfit.preview}.png" alt="${appearance.name} rider in ${outfit.name} outfit">${accessory}</div>`;
  }

  private openStyleParade(): void {
    const parade = storyObjectives.find(o => o.type === 'fashion');
    showStyleParade(this.ui, {
      roundsDone: () => storyObjectives[this.storyIndex]?.type === 'fashion' ? this.activityProgress
        : parade && storyObjectives.indexOf(parade) < this.storyIndex ? styleParade.rounds.map(({ id }) => id) : [],
      look: () => ({ outfitId: this.outfitId, accessoryId: this.accessoryId }),
      owned: () => ({ outfits: this.ownedOutfits(), accessories: this.ownedAccessories() }),
      preview: () => this.riderPreview(),
      equip: (piece) => {
        if ('outfitId' in piece) this.outfitId = piece.outfitId; else this.accessoryId = piece.accessoryId;
        this.updateOutfitText();
        this.persistGame();
      },
      pass: (roundId) => this.completeActivityPoint(roundId),
    });
  }

  private startGrooming(): void {
    this.launchOverlay('Groom', {
      horseFrame: horses.findIndex(({ id }) => id === this.horseId) * 4,
      horseName: this.horseLabel,
      onFinish: (groomed) => {
        this.returnFromOverlay();
        if (!groomed) return;
        this.feedbackTone(660);
        const caring = storyObjectives[this.storyIndex]?.type === 'care';
        if (caring) this.completeActivityPoint('brush');
        this.advanceStory('groom', 'race-ready');
        this.ui.notify(`${this.horseLabel} is gleaming. A glossy coat and a very satisfied ear flick.`);
        if (caring && storyObjectives[this.storyIndex]?.type === 'care') this.openMenu('horse');
      },
    });
  }

  private nearRaceGate(): boolean {
    const rider = this.mounted ? this.horse.display : this.player;
    return this.isNear(rider.x, rider.y, STEWARD.x, STEWARD.y, INTERACTION_RANGE + (this.mounted ? 30 : 0)) ||
      (this.mounted && this.isNear(rider.x, rider.y, raceGate.x, raceGate.y, raceGate.radius));
  }

  private isTrackOpen(track: RaceTrack): boolean {
    const objective = storyObjectives[this.storyIndex];
    if (!track.unlock || (objective?.type === 'race' && objective.target === track.id)) return true;
    const { afterTrack, afterEcho } = track.unlock;
    return Boolean((afterTrack && (this.raceBest.has(afterTrack) || storyObjectives.findIndex(o => o.type === 'race' && o.target === afterTrack) < this.storyIndex))
      || (afterEcho && this.restoredEchoes.includes(afterEcho)));
  }

  private openRaceMenu(): void {
    this.playerBody.setVelocity(0, 0);
    this.horseBody.setVelocity(0, 0);
    if (this.horseName === null) {
      this.ui.notify('Race Steward: every race needs a horse. The paddock is just south of the stable.');
      return;
    }
    const cards = raceTracks.map(track => {
      const open = this.isTrackOpen(track);
      const best = this.raceBest.get(track.id);
      return `<div class="track-card${open ? '' : ' locked'}"><div><strong>${track.name}</strong><small>${escapeHTML(open ? track.tagline : track.unlock?.hint ?? '')}</small><small class="best">${best ? `Best ${(best / 1000).toFixed(1)}s` : open ? 'No time yet' : 'Locked'}</small></div>${open ? button(`race-${track.id}`, 'Ride') : ''}</div>`;
    }).join('');
    this.ui.show('Race Steward', `<p>Your horse runs on its own. Jump with Space, W, ↑ or a click. Bumps only slow you down, and every finish counts.</p><div class="track-list">${cards}</div>${button('race-cancel', 'Maybe later')}`);
    this.ui.bind('race-cancel', () => this.ui.close());
    for (const track of raceTracks) this.ui.bind(`race-${track.id}`, () => { this.ui.close(); this.startRace(track); });
    this.ui.dialog.querySelector<HTMLButtonElement>('.track-card button')?.focus();
  }

  private startRace(track: RaceTrack): void {
    const look = (riderAppearances.findIndex(({ id }) => id === this.appearanceId) * 3 + (outfits.find(({ id }) => id === this.outfitId)?.frame ?? 0));
    this.launchOverlay('Race', {
      track,
      ui: this.ui,
      horseFrame: horses.findIndex(({ id }) => id === this.horseId) * 4,
      riderFrame: 36 + look * 2,
      accessoryKey: this.accessoryId === 'none' ? null : accessoryKey(this.accessoryId),
      best: this.raceBest.get(track.id) ?? null,
      record: (result) => this.recordRace(track, result),
      onExit: () => this.returnFromOverlay(),
    });
  }

  private recordRace(track: RaceTrack, result: RaceResult): RaceRecord {
    const previous = this.raceBest.get(track.id);
    const newBest = previous === undefined || result.timeMs < previous;
    if (newBest) this.raceBest.set(track.id, result.timeMs);
    const reward = previous === undefined ? track.reward : 'horse-apple';
    this.addItem(reward);
    this.raceElapsedMs = result.timeMs;
    this.raceResultText = `${track.name}: ${(result.timeMs / 1000).toFixed(1)}s, ${result.mistakes} bump${result.mistakes === 1 ? '' : 's'}`;
    this.advanceStory('race', track.id);
    this.persistGame();
    return { best: this.raceBest.get(track.id) ?? result.timeMs, newBest, reward: items.find(item => item.id === reward)?.name ?? reward };
  }

  private renderStableDecorations(): void {
    for (const slot of stableDecorationSlots) {
      const x = KEEPER_POSITION.x + slot.x;
      const y = KEEPER_POSITION.y - 100;
      const decorationId = this.decorationSelections.get(slot.id) ?? slot.defaultDecorationId;
      const decoration = decorations.find(({ id }) => id === decorationId) ?? decorations[0];
      const marker = this.add.text(x, y, decoration.symbol, {
        color: decoration.color, fontFamily: 'Arial, sans-serif', fontSize: '24px',
      }).setOrigin(0.5).setDepth(100000);
      const label = this.add.text(x, y + 22, decoration.name, {
        color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '11px',
      }).setOrigin(0.5).setVisible(false);
      this.decorationDisplays.set(slot.id, { marker, label });
    }
  }

  private feedbackTone(frequency: number): void {
    tone(this, frequency);
  }

  private updateOutfitText(): void {
    const outfit = outfits.find(({ id }) => id === this.outfitId) ?? outfits[0];
    this.playerArt.setFrame((riderAppearances.findIndex(({ id }) => id === this.appearanceId) * 3 + outfit.frame) * 4 + this.riderDirection);
  }

  private updateQuestText(): void {
    const objective = storyObjectives[this.storyIndex];
    const findingHorse = !this.mounted && this.horseName !== null && objective && ['mount', 'ride', 'trail', 'care'].includes(objective.type);
    const storyCat = objective?.type === 'cat' ? this.cats.find(cat => cat.definition.id === objective.target) : objective?.type === 'pet' ? this.bolt : undefined;
    const next = findingHorse ? { x: this.horse.display.x, y: this.horse.display.y } : storyCat ?? (objective?.type === 'trail' ? objective.points?.[this.activityProgress.length] : objective);
    const located = next?.x !== undefined && next?.y !== undefined;
    this.storyLights?.setVisible(this.storyIndex >= echoStartIndex);
    this.storyMarker?.setVisible(located);
    let direction = '';
    if (located) {
      this.storyMarker.setPosition(next.x!, next.y!);
      const dx = next.x! - this.player.x, dy = next.y! - this.player.y;
      direction = ' ' + ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8];
      this.storyMarker.setScale(objective?.type === 'echo' ? 1.4 : 1);
    }
    let detail = findingHorse ? `\n${this.horseLabel} is here. E to mount, or H to care while dismounted.` : '';
    if (!findingHorse && objective?.type === 'trail' && objective.points) {
      detail = `\n${this.activityProgress.length}/${objective.points.length} · ${objective.points[this.activityProgress.length]?.name ?? ''}`;
    } else if (objective?.type === 'care') detail = `\n${this.activityProgress.length}/3 · H → Your horse · Brush, water, treat`;
    else if (objective?.type === 'fashion') detail = `\nRound ${this.activityProgress.length + 1}/${styleParade.rounds.length} · ${styleParade.rounds[this.activityProgress.length]?.theme ?? ''}`;
    const remaining = echoTotal - this.restoredEchoes.length;
    this.questSummary = objective
      ? `${objective.chapter}\n${objective.description}${direction}${detail}`
      : remaining === 0
        ? `Happy birthday, ${giftConfig.recipientName}!\nEchoes restored ${echoTotal} / ${echoTotal}. Evervale is yours: ride, race, dress up, decorate or visit the animals.`
        : `${remaining === 1 ? 'One Echo remains…' : 'More Echoes are stirring…'}\nEchoes restored ${this.restoredEchoes.length} / ${echoTotal}.${remaining === 1 ? ' Something about the last one feels different.' : ''} Ride, race, dress up, or visit the animals.`;
    this.ui.setQuest(this.questSummary);
  }

  private handleBlur = (): void => {
    if (!this.ui.isOpen) this.openMenu('pause');
  };

  private handlePageHide = (): void => this.persistGame();

  private persistGame(): void {
    if (!this.ui) return;
    const decorations = {} as GameSave['decorations'];
    for (const slot of stableDecorationSlots) {
      decorations[slot.id] = this.decorationSelections.get(slot.id) ?? slot.defaultDecorationId;
    }
    const inventory: GameSave['inventory'] = {};
    for (const [id, count] of this.inventory) inventory[id] = count;
    storeGameSave({
      version: SAVE_VERSION,
      appearanceId: this.appearanceId,
      horseId: this.horseId,
      horseName: this.horseName,
      player: { x: this.player.x, y: this.player.y },
      horse: { x: this.horse.display.x, y: this.horse.display.y },
      mounted: this.mounted,
      outfitId: this.outfitId,
      accessoryId: this.accessoryId,
      firstRideIndex: 0,
      echoQuestIndex: 0,
      storyIndex: this.storyIndex,
      storyTarget: storyObjectives[this.storyIndex]?.id ?? STORY_COMPLETE,
      activityProgress: this.activityProgress,
      dialogueTarget: this.dialogueTarget,
      restoredEchoes: this.restoredEchoes,
      echoProgress: this.echoProgress,
      inventory,
      decorations,
      race: { checkpointIndex: null, elapsedMs: this.raceElapsedMs, resultText: this.raceResultText },
      raceBest: Object.fromEntries(this.raceBest),
      animals: [...this.animals],
      dialogue: this.activeDialogueId,
    });
  }

  private mountHorse(): void {
    this.mounted = true;
    this.playerBody.setVelocity(0, 0);
    this.playerBody.enable = false;
    this.ui.notify(`Saddle up · ${this.horseLabel}`);
    this.feedbackTone(440);
    this.advanceStory('mount', 'chosen-horse');
  }

  private tryDismount(): void {
    const { x, y } = this.horse.display;
    const spots = [
      { x: x - 50, y },
      { x: x + 50, y },
      { x, y: y + 50 },
      { x, y: y - 50 },
    ];
    const spot = spots.find((candidate) =>
      candidate.x >= PLAYER_RADIUS && candidate.x <= WORLD_WIDTH - PLAYER_RADIUS &&
      candidate.y >= PLAYER_RADIUS && candidate.y <= WORLD_HEIGHT - PLAYER_RADIUS &&
      this.obstacles.every((obstacle) =>
        Phaser.Math.Distance.Between(candidate.x, candidate.y, obstacle.x, obstacle.y) >= PLAYER_RADIUS + obstacle.radius,
      ),
    );
    if (!spot) { this.ui.notify('Move into a little more space to dismount.'); return; }

    this.mounted = false;
    this.ui.notify('Back on your feet');
    this.player.setPosition(spot.x, spot.y);
    this.playerBody.reset(spot.x, spot.y);
    this.playerBody.setVelocity(0, 0);
    this.playerBody.enable = true;
    this.horseBody.setVelocity(0, 0);
  }
}
