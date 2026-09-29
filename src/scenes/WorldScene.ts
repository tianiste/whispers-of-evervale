import Phaser from 'phaser';
import { EchoSites } from '../art/EchoSites';
import { renderEnvironment, addTree } from '../art/Environment';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';
import { CatEntity } from '../entities/CatEntity';
import { HorseEntity } from '../entities/HorseEntity';
import { getHorse, horses, type HorseId } from '../data/horses';
import { getRiderAppearance, riderAppearances, type RiderAppearanceId } from '../data/riderAppearances';
import { echoClues, stableKeeperGreeting } from '../data/dialogue';
import { GameUI, button, color, escapeHTML, type MenuPage } from '../ui/GameUI';
import { showHorseChoice } from '../ui/HorseChoice';
import { activityIds, storyChapters, storyObjectives, echoStartIndex, type StoryObjective } from '../data/story';
import { echoes, getEcho, plannedEchoes, echoTotal, type EchoDefinition, type EchoId } from '../data/echoes';
import { birthdayFinale } from '../data/birthdayGift';
import { items, type ItemId } from '../data/items';
import { outfits, type OutfitId } from '../data/outfits';
import { clearingRace } from '../data/race';
import { decorations, stableDecorationSlots, type StableDecorationSlotId, type DecorationId } from '../data/decorations';
import { villageCats, villagers } from '../data/village';
import { SAVE_VERSION, STORY_COMPLETE, storeGameSave, type GameSave, type SavedDialogueId } from '../data/save';
import type { EchoSession } from './EchoScene';

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

export class WorldScene extends Phaser.Scene {
  private ui!: GameUI;
  private countdownMs = 0;
  private countdownNumber = 0;
  private checkpointMarkers: Phaser.GameObjects.Container[] = [];
  private cameraTarget!: Phaser.GameObjects.Zone;
  private playerArt!: Phaser.GameObjects.Image;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private riderDirection = 0;
  private nextDustAt = 0;
  private wardrobeCategory: 'outfits' | 'rider' = 'outfits';
  private horseCategory: 'horse' | 'tack' | 'stable' = 'horse';
  private questSummary = '';
  private appearanceId: RiderAppearanceId = 'cream';
  private horseId: HorseId = 'brown-quarter-horse';
  private horseName: string | null = null;
  private outfitId: OutfitId = outfits[0].id;
  private player!: Phaser.GameObjects.Arc;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private horse!: HorseEntity;
  private horseBody!: Phaser.Physics.Arcade.Body;
  private mounted = false;
  private storyIndex = 0;
  private activityProgress: string[] = [];
  private activityMarkers!: Phaser.GameObjects.Container;
  private dialogueTarget: string | null = null;
  private cats: CatEntity[] = [];
  private paddock = new Map<HorseId, Phaser.GameObjects.Image>();
  private echoSites!: EchoSites;
  private restoredEchoes: EchoId[] = [];
  private echoProgress: GameSave['echoProgress'] = null;
  private echoActive = false;
  private storyLights!: Phaser.GameObjects.Container;
  private storyMarker!: Phaser.GameObjects.Container;
  private inventory = new Map<ItemId, number>();
  private decorationSelections = new Map<StableDecorationSlotId, DecorationId>(stableDecorationSlots.map(({ id, defaultDecorationId }) => [id, defaultDecorationId]));
  private decorationDisplays = new Map<StableDecorationSlotId, { marker: Phaser.GameObjects.Text; label: Phaser.GameObjects.Text }>();
  private interactionKey!: Phaser.Input.Keyboard.Key;
  private raceKey!: Phaser.Input.Keyboard.Key;
  private raceCheckpointIndex: number | null = null;
  private raceStartedAt = 0;
  private raceElapsedMs = 0;
  private raceLastDisplay = -1;
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
    this.countdownMs = 0;
    this.countdownNumber = 0;
    this.checkpointMarkers = [];
    this.cats = [];
    this.paddock = new Map();
    this.echoActive = false;
    this.nextDustAt = 0;
    const save = data.save;
    this.restoreSave = save ?? null;
    this.appearanceId = getRiderAppearance(save?.appearanceId ?? data.appearanceId).id;
    this.horseId = getHorse(save?.horseId).id;
    this.horseName = save?.horseName ?? null;
    this.outfitId = save?.outfitId ?? outfits[0].id;
    this.storyIndex = save?.storyIndex ?? 0;
    this.activityProgress = [...(save?.activityProgress ?? [])];
    this.dialogueTarget = save?.dialogueTarget ?? null;
    this.restoredEchoes = [...(save?.restoredEchoes ?? [])];
    this.echoProgress = save?.echoProgress ? { id: save.echoProgress.id, steps: [...save.echoProgress.steps] } : null;
    // Explicit Echo state wins: never replay a restored Echo, and never skip past one unrecorded.
    while (storyObjectives[this.storyIndex]?.type === 'echo' && this.restoredEchoes.some(id => id === storyObjectives[this.storyIndex]!.target)) {
      this.storyIndex++;
      this.activityProgress = [];
    }
    for (const objective of storyObjectives.slice(0, this.storyIndex)) {
      if (objective.type === 'echo' && !this.restoredEchoes.includes(getEcho(objective.target).id)) this.restoredEchoes.push(getEcho(objective.target).id);
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
    this.raceCheckpointIndex = save?.race.checkpointIndex ?? null;
    this.raceStartedAt = 0;
    this.raceElapsedMs = save?.race.elapsedMs ?? 0;
    this.raceResultText = save?.race.resultText ?? '';
    this.activeDialogueId = save?.dialogue ?? null;
    this.raceLastDisplay = -1;
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

    this.horse = new HorseEntity(this, getHorse(this.horseId), save?.horse.x ?? 975, save?.horse.y ?? 650);
    this.physics.add.existing(this.horse.display);
    this.horse.setEchoTack(this.inventory.has('echo-tack'));
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
    this.add.circle(clearingRace.start.x, clearingRace.start.y, clearingRace.start.radius, 0xc8b77b, 0.18)
      .setStrokeStyle(3, 0xf4e9cf);
    this.add.text(clearingRace.start.x, clearingRace.start.y - clearingRace.start.radius - 18, 'Clearing Canter', {
      color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '14px',
      backgroundColor: '#173b36cc', padding: { x: 5, y: 3 },
    }).setOrigin(0.5).setDepth(100000);
    clearingRace.checkpoints.forEach((checkpoint, index) => {
      const ring = this.add.circle(0, 0, checkpoint.radius, 0x8cd4bf, 0.16).setStrokeStyle(3, 0x8cd4bf);
      const label = this.add.text(0, 0, String(index + 1), {
        color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '24px',
      }).setOrigin(0.5).setDepth(100000);
      this.checkpointMarkers.push(this.add.container(checkpoint.x, checkpoint.y, [ring, label]).setVisible(false));
    });
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
      } else if (objective.target !== 'oak-stirring') {
        prop.add(this.add.rectangle(0, 0, 24, 18, 0xe9d7ac).setStrokeStyle(2, 0x765b40));
        prop.add(this.add.rectangle(0, 0, 14, 3, 0x508f83));
      }
    }
    this.activityMarkers = this.add.container(0, 0).setDepth(99998);
    this.tweens.add({ targets: this.activityMarkers, alpha: 0.55, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
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
    if (this.raceCheckpointIndex !== null) {
      this.raceStartedAt = this.time.now - this.raceElapsedMs;
      this.ui.setRace(`${clearingRace.name}: Checkpoint ${this.raceCheckpointIndex + 1}/${clearingRace.checkpoints.length} · ${(this.raceElapsedMs / 1000).toFixed(1)}s`);
    }
    if (this.activeDialogueId) this.showDialogue(this.activeDialogueId, this.getDialogue(this.activeDialogueId));
    this.updateCheckpointMarkers();
    this.nextAutosaveAt = this.time.now + 1000;
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
    if (!keyboard || this.echoActive) return;
    this.echoSites.update(this.player.x, this.player.y);

    if (this.ui.isOpen) {
      this.playerBody.setVelocity(0, 0);
      this.horseBody.setVelocity(0, 0);
      if (this.raceCheckpointIndex !== null) this.raceStartedAt = this.time.now - this.raceElapsedMs;
      return;
    }
    if (this.countdownMs > 0) {
      this.interactionKey.reset();
      this.raceKey.reset();
      this.playerBody.setVelocity(0, 0);
      this.horseBody.setVelocity(0, 0);
      this.countdownMs = Math.max(0, this.countdownMs - delta);
      const number = Math.ceil(this.countdownMs / 1000);
      if (number !== this.countdownNumber) {
        this.countdownNumber = number;
        this.ui.setCountdown(number ? String(number) : 'GO!');
        this.feedbackTone(number ? 440 : 660);
      }
      if (!this.countdownMs) this.beginRace();
      return;
    }
    for (const cat of this.cats) cat.update(this.time.now, this.player);
    this.updatePrompt();
    if (Phaser.Input.Keyboard.JustDown(this.raceKey)) this.tryStartRace();
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
      if (this.mounted) {
        this.tryDismount();

      }
      else if (this.interactEcho() || this.interactHorseChoice() || this.inspectStoryObject() || this.interactStoryActor()) {}
      else if (horseReady && this.isNear(this.player.x, this.player.y, this.horse.display.x, this.horse.display.y, 35)) this.mountHorse();
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
    this.playerShadow.setPosition(this.player.x, this.player.y + 12).setDepth(this.player.y - 1).setVisible(!this.mounted);
    this.horse.animate(this.time.now, this.horseBody.speed);
    const target = this.mounted ? this.horse.display : this.player;
    this.cameraTarget.setPosition(target.x + body.velocity.x * 0.18, target.y + body.velocity.y * 0.12);
    const cameraBlend = 1 - Math.exp(-6 * Math.min(delta, 50) / 1000);
    this.cameras.main.setLerp(cameraBlend, cameraBlend);
    this.cameras.main.setZoom(Phaser.Math.Linear(this.cameras.main.zoom, this.mounted ? 0.94 : 1, cameraBlend));
    this.updateRace();
    if (this.time.now >= this.nextAutosaveAt) {
      this.persistGame();
      this.nextAutosaveAt = this.time.now + 1000;
    }
  }

  private openMenu(page: MenuPage): void {
    if (this.activeDialogueId || this.echoActive) return;
    this.playerBody.setVelocity(0, 0);
    this.horseBody.setVelocity(0, 0);
    const back = button('back-menu', '← Menu');
    if (page === 'pause') {
      this.ui.show('A moment in Sunmeadow', `<div class="menu-grid">${button('inventory', 'Satchel · I')}${button('wardrobe', 'Wardrobe · O')}${button('horse', 'Horse & stable · H')}${button('journal', 'Quest journal · J')}</div><p class="muted">WASD / arrows to move · E to interact · R at the race gate</p><label class="settings">Sound <input id="volume" type="range" min="0" max="100" value="${Math.round(this.sound.volume * 100)}"></label>${button('resume', 'Return to the meadow')}`);
      for (const name of ['inventory', 'wardrobe', 'horse', 'journal'] as const) this.ui.bind(name, () => this.openMenu(name));
      this.ui.bind('resume', () => this.ui.close());
      this.ui.dialog.querySelector<HTMLInputElement>('#volume')!.oninput = (event) => {
        this.sound.volume = Number((event.target as HTMLInputElement).value) / 100;
      };
    } else if (page === 'inventory') {
      const owned = items.filter(({ id }) => (this.inventory.get(id) ?? 0) > 0);
      this.ui.show('Your satchel', `${owned.length ? owned.map(({ id, name }) => `<div class="item-row"><span class="item-icon" aria-hidden="true">${id === 'wildflower' ? '✿' : '●'}</span>${name}<strong>×${this.inventory.get(id)}</strong></div>`).join('') : '<p>Your satchel is empty.</p><p class="muted">Flowers and gifts from your adventures will appear here.</p>'}<p class="muted">Keepsakes and treats collected along the way.</p>${back}`);
    } else if (page === 'wardrobe') {
      const outfit = outfits.find(({ id }) => id === this.outfitId)!;
      const appearance = getRiderAppearance(this.appearanceId);
      const choices = this.wardrobeCategory === 'outfits' ? outfits.filter(item => (item.id !== 'berry' || this.inventory.has('berry-gift') || this.outfitId === 'berry') && (item.id !== 'birthday-teal' || this.inventory.has('echo-tack'))) : riderAppearances;
      const selected = this.wardrobeCategory === 'outfits' ? this.outfitId : this.appearanceId;
      this.ui.show('Your wardrobe', `<div class="tabs">${button('outfits-tab', 'Outfits', this.wardrobeCategory === 'outfits')}${button('rider-tab', 'Rider', this.wardrobeCategory === 'rider')}</div><div class="split"><div class="preview"><img class="rider-preview" style="${this.outfitId === 'birthday-teal' ? 'filter:hue-rotate(-25deg)' : ''}" src="/assets/art/rider-${appearance.id}-${outfit.preview}.png" alt="${appearance.name} rider in ${outfit.name} outfit"><div>${outfit.name}<br><small>YOUR CURRENT LOOK</small></div></div><div class="choices">${choices.map((item) => `<button class="item-choice" id="equip-${item.id}" aria-pressed="${selected === item.id}"><span class="swatch" style="--outfit:${color(this.wardrobeCategory === 'outfits' ? item.color : outfit.color)};--rider:${color(this.wardrobeCategory === 'rider' ? item.color : appearance.color)}"></span><span>${item.name}<br><small>${selected === item.id ? 'Equipped ✓' : 'Wear this look'}</small></span></button>`).join('')}</div></div><p class="muted">Meadow and Sky are yours. Visit the bakery for Berry.</p>${back}`);
      this.ui.bind('outfits-tab', () => { this.wardrobeCategory = 'outfits'; this.openMenu('wardrobe'); });
      this.ui.bind('rider-tab', () => { this.wardrobeCategory = 'rider'; this.openMenu('wardrobe'); });
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
        ? '<h2>No horse yet</h2><p>Three horses are waiting at the paddock northeast of the stable. Go and say hello.</p>'
        : `<div class="split"><div class="preview"><img class="horse-art" src="/assets/art/horse-${horse.id}.png" alt="${name} with teal saddle blanket and leather tack"><small>ACTIVE HORSE ✓</small></div><div><h2>${name}</h2><p>${horse.breed} · ${horse.coat}</p><p class="muted">Your companion in Sunmeadow.<br>${this.mounted ? 'You are riding together.' : 'Approach your horse and press E to ride.'}</p><p>Owned horses · 1</p></div></div>`;
      if (this.horseCategory === 'horse' && this.horseName !== null) {
        const caring = storyObjectives[this.storyIndex]?.type === 'care';
        content += `<p>A brush, fresh water and a little treat. No supplies needed.</p><div class="tabs">${['brush', 'water', 'treat'].map(action => button(`care-${action}`, action[0]!.toUpperCase() + action.slice(1) + (caring && this.activityProgress.includes(action) ? ' ✓' : ''))).join('')}</div>`;
        if (this.storyIndex === storyObjectives.length || storyObjectives[this.storyIndex]?.type === 'race') content += button('return-home', this.storyIndex === storyObjectives.length ? 'Return to Sunmeadow' : 'Return to the race gate');
      }
      if (this.horseCategory === 'tack') content = this.inventory.has('echo-tack') ? '<h2>Birthday bridle ribbon · Fitted ✓</h2><p>A little teal light to take on every ride. Your birthday ribbon is fitted beside the bridle.</p>' : '<h2>A simple ride</h2><p>A leather saddle and teal blanket are fitted for your ride.</p>';
      if (this.horseCategory === 'stable') content = stableDecorationSlots.map((slot) => `<div class="item-row"><span>${slot.name}</span>${button(`decorate-${slot.id}`, decorations.find(({ id }) => id === this.decorationSelections.get(slot.id))!.name + ' · Change')}</div>`).join('');
      this.ui.show('Horse & stable', `<div class="tabs">${button('horse-tab', 'Your horse', this.horseCategory === 'horse')}${button('tack-tab', 'Tack', this.horseCategory === 'tack')}${button('stable-tab', 'Stable', this.horseCategory === 'stable')}</div>${content}<br>${back}`);
      for (const category of ['horse', 'tack', 'stable'] as const) this.ui.bind(`${category}-tab`, () => { this.horseCategory = category; this.openMenu('horse'); });
      for (const action of ['brush', 'water', 'treat']) this.ui.bind(`care-${action}`, () => {
        if (this.mounted || !this.isNear(this.player.x, this.player.y, this.horse.display.x, this.horse.display.y, 100)) {
          this.ui.notify('Dismount beside your horse to take care of them.');
          return;
        }
        if (storyObjectives[this.storyIndex]?.type === 'care') this.completeActivityPoint(action);
        this.openMenu('horse');
        this.ui.notify({ brush: 'A glossy coat and a satisfied ear flick.', water: 'Fresh water. Your horse takes a long, happy drink.', treat: 'The treat disappears. The hopeful look remains.' }[action]!);
      });
      this.ui.bind('return-home', () => {
        if (this.raceCheckpointIndex !== null) { this.ui.notify('Finish or leave the race first.'); return; }
        this.horseBody.reset(975, 650);
        this.playerBody.reset(this.mounted ? 975 : 925, this.mounted ? 623 : 650);
        this.cameras.main.centerOn(975, 650);
        this.persistGame();
        this.ui.close();
      });
      for (const slot of stableDecorationSlots) this.ui.bind(`decorate-${slot.id}`, () => { this.cycleDecoration(slot.id); this.openMenu('horse'); this.ui.notify(`${slot.name} decoration changed`); });
    } else {
      let offset = 0;
      const chapters = storyChapters.map(quest => {
        const start = offset;
        offset += quest.objectives.length;
        if (start > this.storyIndex) return '';
        return `<h2>${escapeHTML(quest.name)}${offset <= this.storyIndex ? ' · Complete ✓' : ''}</h2><ol class="quest-list">${quest.objectives.map((objective, i) => `<li class="${start + i === this.storyIndex ? 'current' : ''}">${start + i < this.storyIndex ? '✓ ' : ''}${escapeHTML(objective.description)}${start + i < this.storyIndex && objective.payoff ? `<p class="muted">${escapeHTML(objective.payoff)}</p>` : ''}</li>`).join('')}</ol>`;
      }).join('');
      this.ui.show('Your journal', `${this.echoJournal()}${chapters}${this.raceResultText ? `<p>${escapeHTML(this.raceResultText)}</p>` : ''}${back}`);
    }
    this.ui.bind('back-menu', () => this.openMenu('pause'));
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
    if (this.mounted) text = this.isNear(this.horse.display.x, this.horse.display.y, clearingRace.start.x, clearingRace.start.y, clearingRace.start.radius) && this.raceCheckpointIndex === null ? 'R · Enter Clearing Canter    E · Dismount' : `Riding ${this.horseLabel} · E to dismount`;
    else if (horseReady && this.isNear(x, y, this.horse.display.x, this.horse.display.y, 35)) text = `E · Ride ${this.horseLabel}`;
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
    this.advanceStory('cat', cat.definition.id);
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

  private talkToNearbyVillager(): boolean {
    const villager = villagers.find(({ x, y }) => this.isNear(this.player.x, this.player.y, x, y, INTERACTION_RANGE));
    if (!villager) return false;
    this.advanceStory('talk', villager.id);
    this.showDialogue(villager.id, this.getDialogue(villager.id));
    return true;
  }

  private showDialogue(id: SavedDialogueId, dialogue: { speaker: string; message: string }): void {
    this.activeDialogueId = id;
    this.dialogueTarget ??= storyObjectives[this.storyIndex - 1]?.id ?? null;
    this.playerBody.setVelocity(0, 0);
    this.horseBody.setVelocity(0, 0);
    this.ui.show(dialogue.speaker, `<p class="dialogue-copy">${escapeHTML(dialogue.message)}</p>${button('continue-dialogue', 'Continue')}${id === 'village-baker' ? button('browse-shop', 'Visit the counter') : ''}`, () => {
      this.activeDialogueId = null;
      this.dialogueTarget = null;
      this.persistGame();
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
    if (id === 'echo-keeper-clue') return echoClues['stable-keeper'];
    if (id === 'echo-guide-clue') return echoClues['trail-guide'];
    if (id === 'birthday-finale') return birthdayFinale;
    if (id === 'story-inspect') return { speaker: 'A little discovery', message: previous?.payoff ?? 'The trail continues.' };
    if (id === 'echo-reflection' && previous?.type === 'echo') return { speaker: 'Hana', message: getEcho(previous.target).reflection };
    const villager = villagers.find(({ id: villagerId }) => villagerId === id);
    return villager?.dialogue ?? stableKeeperGreeting;
  }

  private renderVillage(): void {
    for (const villager of villagers) {
      this.add.image(villager.x, villager.y + 16, 'riders', villager.id === 'village-baker' ? 4 : 12).setOrigin(0.5, 1).setScale(1.25).setDepth(villager.y + 16);
      this.add.text(villager.x, villager.y - 51, villager.name, {
        color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '12px',
        backgroundColor: '#173b36cc', padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(100000);
    }

    this.cats = villageCats.map(cat => new CatEntity(this, cat));
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

  private enterEcho(echo: EchoDefinition): void {
    if (this.echoProgress?.id !== echo.id) this.echoProgress = { id: echo.id, steps: [] };
    const progress = this.echoProgress;
    this.echoActive = true;
    this.playerBody.setVelocity(0, 0);
    this.horseBody.setVelocity(0, 0);
    this.ui.setPrompt('');
    this.persistGame();
    this.feedbackTone(720);
    this.cameras.main.flash(260, 190, 255, 240);
    this.cameras.main.fadeOut(600, ECHO_FADE.r, ECHO_FADE.g, ECHO_FADE.b);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const session: EchoSession = {
        echo,
        ui: this.ui,
        solvedSteps: [...progress.steps],
        restoredBefore: this.restoredEchoes.length,
        onStep: (stepId) => { if (!progress.steps.includes(stepId)) progress.steps.push(stepId); this.persistGame(); },
        onFinish: (restored) => this.leaveEcho(echo, restored),
      };
      this.scene.launch('Echo', session);
      this.scene.pause();
    });
  }

  private leaveEcho(echo: EchoDefinition, restored: boolean): void {
    this.scene.resume();
    this.echoActive = false;
    this.input.keyboard?.resetKeys();
    this.cameras.main.fadeIn(700, ECHO_FADE.r, ECHO_FADE.g, ECHO_FADE.b);
    if (!restored) {
      this.ui.notify('The Echo waits. It remembers where you left off.');
      this.persistGame();
      return;
    }
    this.echoProgress = null;
    if (!this.restoredEchoes.includes(echo.id)) this.restoredEchoes.push(echo.id);
    this.echoSites.markRestored(echo.id);
    this.addItem(echo.reward);
    this.advanceStory('echo', echo.id);
    this.showDialogue('echo-reflection', { speaker: 'Hana', message: echo.reflection });
  }

  private echoJournal(): string {
    const restored = echoes.filter(echo => this.restoredEchoes.includes(echo.id));
    const entries = [
      ...echoes.map(echo => restored.includes(echo)
        ? `<li><strong>Echo ${echo.numeral} · ${escapeHTML(echo.title)} ✓</strong><p class="muted">${escapeHTML(echo.completion.join(' '))}</p></li>`
        : `<li>Echo ${echo.numeral} · ???</li>`),
      ...plannedEchoes.map(echo => `<li>Echo ${echo.numeral} · ???</li>`),
    ];
    return `<h2>Echoes · ${restored.length} of ${echoTotal} restored</h2><ol class="quest-list echo-list">${entries.join('')}</ol>`;
  }

  private checkStoryObjective(): void {
    const objective = storyObjectives[this.storyIndex];
    if (objective?.type === 'trail' && this.mounted && this.raceCheckpointIndex === null) {
      const point = objective.points?.[this.activityProgress.length];
      if (point && this.isNear(this.horse.display.x, this.horse.display.y, point.x, point.y, 100)) this.completeActivityPoint(point.id);
    }
    if (objective?.type === 'ride' && this.mounted && this.raceCheckpointIndex === null &&
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

  /** Drifting lights along the current trail, from the next waymark onward. */
  private renderActivityMarkers(): void {
    if (!this.activityMarkers) return;
    this.activityMarkers.removeAll(true);
    const objective = storyObjectives[this.storyIndex];
    if (objective?.type !== 'trail' || !objective.points) return;
    const tint = objective.glow ?? 0x8ffff0;
    const remaining = objective.points.slice(this.activityProgress.length);
    remaining.forEach((point, index) => {
      this.activityMarkers.add(this.add.image(point.x, point.y, 'environment-glow').setTint(tint).setScale(0.6).setBlendMode(Phaser.BlendModes.ADD));
      const next = remaining[index + 1];
      if (!next) return;
      const steps = Math.floor(Phaser.Math.Distance.Between(point.x, point.y, next.x, next.y) / 38);
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        this.activityMarkers.add(this.add.circle(point.x + (next.x - point.x) * t, point.y + (next.y - point.y) * t, 3, tint).setBlendMode(Phaser.BlendModes.ADD));
      }
    });
  }

  private completeActivityPoint(id: string): void {
    const objective = storyObjectives[this.storyIndex];
    if (!objective || this.activityProgress.includes(id)) return;
    this.activityProgress.push(id);
    this.feedbackTone(520 + this.activityProgress.length * 40);
    const total = activityIds(objective).length;
    if (this.activityProgress.length === total) {
      this.advanceStory(objective.type, objective.target);
    } else {
      this.renderActivityMarkers();
      this.ui.notify(`${objective.type === 'trail' ? 'Waymark' : 'Horse care'} ${this.activityProgress.length}/${total}`);
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
    this.ui.notify(objective.payoff || 'A little further along…');
    if (objective.chapterEnd) {
      this.ui.notify(`${chapter.name} complete · ${chapter.payoff}`);
      if (chapter.reward) this.addItem(chapter.reward);
    }
    this.horse.setEchoTack(this.inventory.has('echo-tack'));
    this.updateQuestText();
    this.persistGame();
  }

  private addItem(id: ItemId): void {
    this.inventory.set(id, (this.inventory.get(id) ?? 0) + 1);
    this.feedbackTone(550);
    this.ui.notify(`Collected · ${items.find((item) => item.id === id)?.name} ×1`);
    this.persistGame();
  }

  private cycleDecoration(slotId: StableDecorationSlotId): void {
    const selectedId = this.decorationSelections.get(slotId);
    const available = decorations.filter(d => !('unlockItem' in d) || this.inventory.has(d.unlockItem));
    const index = available.findIndex(({ id }) => id === selectedId);
    const decoration = available[(index + 1) % available.length] ?? decorations[0];
    this.decorationSelections.set(slotId, decoration.id);
    const display = this.decorationDisplays.get(slotId);
    display?.marker.setText(decoration.symbol).setColor(decoration.color);
    display?.label.setText(decoration.name);
    this.advanceStory('decorate', 'any-slot');
    this.persistGame();
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

  private tryStartRace(): void {
    if (!this.mounted || this.raceCheckpointIndex !== null ||
      !this.isNear(this.horse.display.x, this.horse.display.y, clearingRace.start.x, clearingRace.start.y, clearingRace.start.radius)) return;

    this.playerBody.setVelocity(0, 0);
    this.horseBody.setVelocity(0, 0);
    this.ui.show(clearingRace.name, `<p>A gentle canter around Sunmeadow.</p><p>Ride through ${clearingRace.checkpoints.length} glowing gates in order. Follow the direction in your race HUD. There is no time limit.</p><p class="muted">Reward · Horse Apple ×1<br>Dismount with E to leave the race.</p>${button('ready-race', 'Ready to ride')} ${button('cancel-race', 'Maybe later')}`);
    this.ui.bind('cancel-race', () => this.ui.close());
    this.ui.bind('ready-race', () => {
      this.ui.close();
      this.countdownMs = 3000;
      this.countdownNumber = 3;
      this.ui.setCountdown('3');
      this.ui.setPrompt('');
      this.ui.setRace(clearingRace.name + '\nGet ready…');
      this.feedbackTone(440);
    });
  }

  private beginRace(): void {
    this.raceCheckpointIndex = 0;
    this.raceStartedAt = this.time.now;
    this.raceElapsedMs = 0;
    this.raceLastDisplay = -1;
    this.updateCheckpointMarkers();
    this.time.delayedCall(650, () => this.ui.setCountdown(''));
    this.persistGame();
  }

  private updateCheckpointMarkers(): void {
    this.checkpointMarkers.forEach((marker, index) => {
      marker.setVisible(this.raceCheckpointIndex !== null && index >= this.raceCheckpointIndex);
      marker.setAlpha(index === this.raceCheckpointIndex ? 1 : 0.25);
    });
  }

  private feedbackTone(frequency: number): void {
    if (!(this.sound instanceof Phaser.Sound.WebAudioSoundManager) || this.sound.mute) return;
    const context = this.sound.context;
    if (context.state !== 'running') return;
    const tone = context.createOscillator();
    const gain = context.createGain();
    tone.type = 'sine';
    tone.frequency.value = frequency;
    gain.gain.setValueAtTime(0.025 * this.sound.volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12);
    tone.connect(gain);
    gain.connect(context.destination);
    tone.start();
    tone.stop(context.currentTime + 0.13);
    tone.onended = () => { tone.disconnect(); gain.disconnect(); };
  }

  private updateRace(): void {
    if (this.raceCheckpointIndex === null) return;

    if (!this.mounted) {
      this.raceCheckpointIndex = null;
      this.raceResultText = `${clearingRace.name}: Cancelled — mount up and return to the start`;
      this.ui.setRace('');
      this.persistGame();
      return;
    }

    const checkpoint = clearingRace.checkpoints[this.raceCheckpointIndex];
    if (checkpoint && this.isNear(this.horse.display.x, this.horse.display.y, checkpoint.x, checkpoint.y, checkpoint.radius)) {
      this.raceCheckpointIndex += 1;
      this.updateCheckpointMarkers();
      this.feedbackTone(660);
      this.raceElapsedMs = this.time.now - this.raceStartedAt;
      if (this.raceCheckpointIndex === clearingRace.checkpoints.length) {
        const seconds = (this.time.now - this.raceStartedAt) / 1000;
        this.raceElapsedMs = this.time.now - this.raceStartedAt;
        this.raceCheckpointIndex = null;
        this.raceResultText = `${clearingRace.name}: Finished in ${seconds.toFixed(1)}s! Horse Apple earned.`;
        this.ui.setRace('');
        this.addItem(clearingRace.reward);
        this.advanceStory('race', 'clearing-canter');
        this.horseBody.setVelocity(0, 0);
        this.ui.show('A lovely ride!', `<p>${clearingRace.name} · All checkpoints reached</p><div class="result-time">${seconds.toFixed(1)}<small> seconds</small></div><p>Reward collected · Horse Apple ×1</p>${button('finish-race', 'Back to Sunmeadow')}`);
        this.ui.bind('finish-race', () => this.ui.close());
        return;
      }
      this.ui.notify(`Checkpoint ${this.raceCheckpointIndex}/${clearingRace.checkpoints.length} · Lovely going!`);
      this.persistGame();
    }

    const tenths = Math.floor((this.time.now - this.raceStartedAt) / 100);
    if (tenths !== this.raceLastDisplay) {
      this.raceLastDisplay = tenths;
      this.raceElapsedMs = this.time.now - this.raceStartedAt;
      const next = clearingRace.checkpoints[this.raceCheckpointIndex]!;
      const dx = next.x - this.horse.display.x;
      const dy = next.y - this.horse.display.y;
      const direction = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8];
      this.ui.setRace(`${clearingRace.name} · ${(tenths / 10).toFixed(1)}s\nGate ${this.raceCheckpointIndex + 1}/${clearingRace.checkpoints.length} · ${next.name} ${direction}`);
    }
  }

  private updateOutfitText(): void {
    const outfit = outfits.find(({ id }) => id === this.outfitId) ?? outfits[0];
    this.playerArt.setFrame((riderAppearances.findIndex(({ id }) => id === this.appearanceId) * 3 + outfit.frame) * 4 + this.riderDirection);
  }

  private updateQuestText(): void {
    const objective = storyObjectives[this.storyIndex];
    const findingHorse = !this.mounted && this.horseName !== null && objective && ['mount', 'ride', 'trail', 'care'].includes(objective.type);
    const storyCat = objective?.type === 'cat' ? this.cats.find(cat => cat.definition.id === objective.target) : undefined;
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
    this.questSummary = objective
      ? `${objective.chapter}\n${objective.description}${direction}${detail}`
      : `More Echoes are stirring…\nEchoes restored ${this.restoredEchoes.length} of ${echoTotal}. Ride, dress up, race, or visit the cats.`;
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
    const elapsedMs = this.raceCheckpointIndex === null
      ? this.raceElapsedMs
      : Math.max(0, this.time.now - this.raceStartedAt);
    storeGameSave({
      version: SAVE_VERSION,
      appearanceId: this.appearanceId,
      horseId: this.horseId,
      horseName: this.horseName,
      player: { x: this.player.x, y: this.player.y },
      horse: { x: this.horse.display.x, y: this.horse.display.y },
      mounted: this.mounted,
      outfitId: this.outfitId,
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
      race: { checkpointIndex: this.raceCheckpointIndex, elapsedMs, resultText: this.raceResultText },
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
    if (this.raceCheckpointIndex !== null) {
      this.raceCheckpointIndex = null;
      this.raceResultText = `${clearingRace.name}: Cancelled — mount up and return to the start`;
      this.ui.setRace('');
      this.updateCheckpointMarkers();
      this.ui.notify('Race left · H → Your horse → Return to the race gate.');
    }
    this.player.setPosition(spot.x, spot.y);
    this.playerBody.reset(spot.x, spot.y);
    this.playerBody.setVelocity(0, 0);
    this.playerBody.enable = true;
    this.horseBody.setVelocity(0, 0);
  }
}
