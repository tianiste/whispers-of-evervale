import Phaser from 'phaser';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';
import { HorseEntity } from '../entities/HorseEntity';
import { getHorse, type HorseId } from '../data/horses';
import { getRiderAppearance, riderAppearances, type RiderAppearanceId } from '../data/riderAppearances';
import { echoClues, stableKeeperGreeting } from '../data/dialogue';
import { GameUI, button, color, escapeHTML, type MenuPage } from '../ui/GameUI';
import { echoQuest, firstRideQuest, type QuestObjective } from '../data/quests';
import { birthdayFinale } from '../data/birthdayGift';
import { items, type ItemId } from '../data/items';
import { outfits, type OutfitId } from '../data/outfits';
import { clearingRace } from '../data/race';
import { decorations, stableDecorationSlots, type StableDecorationSlotId } from '../data/decorations';
import { villageBuildings, villageCats, villageRoute, villagers } from '../data/village';
import { SAVE_VERSION, storeGameSave, type GameSave, type SavedDialogueId } from '../data/save';

const PLAYER_RADIUS = 14;
const PLAYER_SPEED = 205;
const HORSE_SPEED = 330;
const HORSE_RADIUS = 25;
const INTERACTION_RANGE = 70;
const KEEPER_POSITION = { x: WORLD_WIDTH / 2 - 100, y: WORLD_HEIGHT / 2 };
const QUEST_INTERACTION_RANGE = 42;

export class WorldScene extends Phaser.Scene {
  private ui!: GameUI;
  private countdownMs = 0;
  private countdownNumber = 0;
  private checkpointMarkers: Phaser.GameObjects.Container[] = [];
  private cameraTarget!: Phaser.GameObjects.Zone;
  private facingDot!: Phaser.GameObjects.Arc;
  private nextDustAt = 0;
  private wardrobeCategory: 'outfits' | 'rider' = 'outfits';
  private horseCategory: 'horse' | 'tack' | 'stable' = 'horse';
  private questSummary = '';
  private appearanceId: RiderAppearanceId = 'cream';
  private horseId: HorseId = 'brown-quarter-horse';
  private outfitId: OutfitId = outfits[0].id;
  private player!: Phaser.GameObjects.Arc;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private horse!: HorseEntity;
  private horseBody!: Phaser.Physics.Arcade.Body;
  private mounted = false;
  private questIndex = 0;
  private echoQuestIndex = 0;
  private inventory = new Map<ItemId, number>();
  private decorationSelections = new Map(stableDecorationSlots.map(({ id, defaultDecorationId }) => [id, defaultDecorationId]));
  private decorationDisplays = new Map<StableDecorationSlotId, { marker: Phaser.GameObjects.Text; label: Phaser.GameObjects.Text }>();
  private wildflower!: Phaser.GameObjects.Arc;
  private wildflowerLabel!: Phaser.GameObjects.Text;
  private echoMarker!: Phaser.GameObjects.Container;
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

  init(data: { appearanceId?: RiderAppearanceId; horseId?: HorseId; save?: GameSave }): void {
    this.countdownMs = 0;
    this.countdownNumber = 0;
    this.checkpointMarkers = [];
    this.nextDustAt = 0;
    const save = data.save;
    this.restoreSave = save ?? null;
    this.appearanceId = getRiderAppearance(save?.appearanceId ?? data.appearanceId).id;
    this.horseId = getHorse(save?.horseId ?? data.horseId).id;
    this.outfitId = save?.outfitId ?? outfits[0].id;
    this.questIndex = save?.firstRideIndex ?? 0;
    this.echoQuestIndex = save?.echoQuestIndex ?? 0;
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
    const ground = this.add.graphics();
    ground.fillStyle(0x31594a);
    ground.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    ground.lineStyle(4, 0xc8b77b, 1);
    ground.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.renderVillage();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    const save = this.restoreSave;
    const playerX = save?.player.x ?? WORLD_WIDTH / 2;
    const playerY = save?.player.y ?? WORLD_HEIGHT / 2;
    this.player = this.add.circle(playerX, playerY, PLAYER_RADIUS, getRiderAppearance(this.appearanceId).color);
    this.player.setStrokeStyle(3, 0x173b36);
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCircle(PLAYER_RADIUS).setCollideWorldBounds(true);
    this.playerBody.enable = !this.mounted;
    this.facingDot = this.add.circle(playerX + 7, playerY, 3, 0x173b36).setDepth(5);

    this.horse = new HorseEntity(this, getHorse(this.horseId), save?.horse.x ?? WORLD_WIDTH / 2 + 75, save?.horse.y ?? WORLD_HEIGHT / 2 + 100);
    this.physics.add.existing(this.horse.display);
    this.horseBody = this.horse.display.body as Phaser.Physics.Arcade.Body;
    this.horseBody.setCircle(HORSE_RADIUS, -HORSE_RADIUS, -HORSE_RADIUS).setCollideWorldBounds(true);
    if (this.mounted) this.player.setPosition(this.horse.display.x, Math.max(PLAYER_RADIUS, this.horse.display.y - 27));

    for (const [x, y] of [[WORLD_WIDTH / 2 - 130, WORLD_HEIGHT / 2 - 75], [WORLD_WIDTH / 2 + 115, WORLD_HEIGHT / 2 - 40], [WORLD_WIDTH / 2 + 165, WORLD_HEIGHT / 2 + 90]] as const) {
      const firefly = this.add.circle(x, y, 2, 0xf4e9cf, 0.35).setDepth(3);
      this.tweens.add({
        targets: firefly, alpha: 0.9, scale: 1.5, y: y - 9,
        duration: Phaser.Math.Between(1500, 2400), ease: 'Sine.InOut', yoyo: true, repeat: -1,
        delay: Phaser.Math.Between(0, 900),
      });
    }

    this.add.circle(KEEPER_POSITION.x, KEEPER_POSITION.y, 18, 0x8baf82).setStrokeStyle(3, 0xc8b77b);
    this.add.text(KEEPER_POSITION.x, KEEPER_POSITION.y - 32, 'Stable Keeper', {
      color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '14px',
      backgroundColor: '#173b36cc', padding: { x: 5, y: 3 },
    }).setOrigin(0.5);
    this.add.rectangle(KEEPER_POSITION.x, KEEPER_POSITION.y + 90, 230, 64, 0x725137)
      .setStrokeStyle(4, 0xc8b77b);
    this.renderStableDecorations();
    this.add.circle(clearingRace.start.x, clearingRace.start.y, clearingRace.start.radius, 0xc8b77b, 0.18)
      .setStrokeStyle(3, 0xf4e9cf);
    this.add.text(clearingRace.start.x, clearingRace.start.y - clearingRace.start.radius - 18, 'Clearing Canter', {
      color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '14px',
      backgroundColor: '#173b36cc', padding: { x: 5, y: 3 },
    }).setOrigin(0.5);
    clearingRace.checkpoints.forEach((checkpoint, index) => {
      const ring = this.add.circle(0, 0, checkpoint.radius, 0x8cd4bf, 0.16).setStrokeStyle(3, 0x8cd4bf);
      const label = this.add.text(0, 0, String(index + 1), {
        color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '24px',
      }).setOrigin(0.5);
      this.checkpointMarkers.push(this.add.container(checkpoint.x, checkpoint.y, [ring, label]).setVisible(false));
    });
    const marker = firstRideQuest.objectives[1];
    if (marker?.type === 'reach') {
      this.add.circle(marker.x, marker.y, 24, 0xc8b77b, 0.35).setStrokeStyle(3, 0xf4e9cf);
      this.add.circle(marker.x, marker.y, 6, 0xf4e9cf);
    }
    const flower = firstRideQuest.objectives[2];
    if (flower?.type === 'collect') {
      this.wildflower = this.add.circle(flower.x, flower.y, 11, 0xd78fa8).setStrokeStyle(3, 0xf4e9cf);
      this.wildflowerLabel = this.add.text(flower.x, flower.y - 22, 'Wildflower', {
        color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '14px',
        backgroundColor: '#173b36cc', padding: { x: 5, y: 3 },
      }).setOrigin(0.5);
      if ((this.inventory.get('wildflower') ?? 0) > 0) {
        this.wildflower.destroy();
        this.wildflowerLabel.destroy();
      }
    }
    const echoMarker = echoQuest.objectives[2];
    if (echoMarker?.type === 'reach') {
      this.echoMarker = this.add.container(echoMarker.x, echoMarker.y);
      this.echoMarker.add(this.add.circle(0, 0, 26, 0x8baf82, 0.3).setStrokeStyle(3, 0xc8b77b));
      this.echoMarker.add(this.add.text(0, -38, 'Old Oak', {
        color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '14px',
        backgroundColor: '#173b36cc', padding: { x: 5, y: 3 },
      }).setOrigin(0.5));
      this.echoMarker.setVisible(false);
    }
    this.obstacles = [
      { x: 650, y: 380, radius: 38 },
      { x: 1050, y: 550, radius: 48 },
      { x: 1250, y: 760, radius: 42 },
      { x: 560, y: 780, radius: 46 },
    ];
    for (const { x, y, radius } of this.obstacles) {
      const obstacle = this.add.circle(x, y, radius, 0x66744d).setStrokeStyle(4, 0xc8b77b);
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
    if (!keyboard) return;

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
    this.checkReachObjective();
    if (this.ui.isOpen) return;
    if (Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
      if (this.mounted) {
        this.tryDismount();
        if (!this.mounted) this.advanceQuest('interact', 'chosen-horse');
      }
      else if (Phaser.Math.Distance.Between(this.player.x, this.player.y, KEEPER_POSITION.x, KEEPER_POSITION.y) <= INTERACTION_RANGE) {
        if (this.echoQuestAvailable('stable-keeper')) {
          this.showDialogue('echo-keeper-clue', echoClues['stable-keeper']);
          this.advanceQuest('talk', 'stable-keeper');
        } else {
          this.advanceQuest('talk', 'stable-keeper');
          this.showDialogue('stable-keeper-greeting', stableKeeperGreeting);
        }
      }
      else if (this.talkToNearbyVillager()) {}
      else if (this.wildflower?.active && this.isNear(this.player.x, this.player.y, this.wildflower.x, this.wildflower.y, QUEST_INTERACTION_RANGE)) {
        this.wildflower.destroy();
        this.wildflowerLabel.destroy();
        this.addItem('wildflower');
        this.advanceQuest('collect', 'wildflower');
      }
      else if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.horse.display.x, this.horse.display.y) <= INTERACTION_RANGE) {
        this.mounted = true;
        this.playerBody.setVelocity(0, 0);
        this.playerBody.enable = false;
        this.ui.notify(`Saddle up · ${getHorse(this.horseId).name}`);
        this.feedbackTone(440);
        this.advanceQuest('interact', 'chosen-horse');
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
    if (length) this.facingDot.setData('direction', { x, y });
    const facing = this.facingDot.getData('direction') as { x: number; y: number } | undefined;
    this.facingDot.setPosition(this.player.x + (facing?.x ?? 1) * 8, this.player.y + (facing?.y ?? 0) * 8);
    this.player.setDepth(4);
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
    if (this.activeDialogueId) return;
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
      const choices = this.wardrobeCategory === 'outfits' ? outfits : riderAppearances;
      const selected = this.wardrobeCategory === 'outfits' ? this.outfitId : this.appearanceId;
      this.ui.show('Your wardrobe', `<div class="tabs">${button('outfits-tab', 'Outfits', this.wardrobeCategory === 'outfits')}${button('rider-tab', 'Rider', this.wardrobeCategory === 'rider')}</div><div class="split"><div class="preview"><div class="rider-preview" style="--rider:${color(appearance.color)};--outfit:${color(outfit.color)}"></div><div>${outfit.name}<br><small>YOUR CURRENT LOOK</small></div></div><div class="choices">${choices.map((item) => `<button class="item-choice" id="equip-${item.id}" aria-pressed="${selected === item.id}"><span class="swatch" style="--outfit:${color(this.wardrobeCategory === 'outfits' ? item.color : outfit.color)};--rider:${color(this.wardrobeCategory === 'rider' ? item.color : appearance.color)}"></span><span>${item.name}<br><small>${selected === item.id ? 'Equipped ✓' : 'Wear this look'}</small></span></button>`).join('')}</div></div><p class="muted">All three looks are yours. Choose whatever feels like you.</p>${back}`);
      this.ui.bind('outfits-tab', () => { this.wardrobeCategory = 'outfits'; this.openMenu('wardrobe'); });
      this.ui.bind('rider-tab', () => { this.wardrobeCategory = 'rider'; this.openMenu('wardrobe'); });
      for (const item of choices) this.ui.bind(`equip-${item.id}`, () => {
        if (this.wardrobeCategory === 'outfits') this.outfitId = (outfits.find(({ id }) => id === item.id) ?? outfits[0]).id;
        else this.appearanceId = (riderAppearances.find(({ id }) => id === item.id) ?? riderAppearances[0]).id;
        this.player.setFillStyle(getRiderAppearance(this.appearanceId).color);
        this.updateOutfitText();
        this.persistGame();
        this.openMenu('wardrobe');
        this.ui.notify(`${item.name} equipped`);
      });
    } else if (page === 'horse') {
      const horse = getHorse(this.horseId);
      let content = `<div class="split"><div class="preview"><svg viewBox="-45 -60 100 110" width="150" height="150" role="img" aria-label="${horse.name}"><g fill="${color(horse.coatColor)}"><ellipse rx="31" ry="17"/><path d="M12 -9 L30 -37 L39 -7 Z M-22 8 H-15 V36 H-22 Z M9 9 H16 V36 H9 Z"/><ellipse cx="36" cy="-32" rx="12" ry="8"/><path d="M37 -41 L40 -52 L44 -40 Z"/></g></svg><small>ACTIVE HORSE ✓</small></div><div><h2>${horse.name}</h2><p>${horse.breed}</p><p class="muted">Your companion in Sunmeadow.<br>${this.mounted ? 'You are riding together.' : 'Approach your horse and press E to ride.'}</p><p>Owned horses · 1</p></div></div>`;
      if (this.horseCategory === 'tack') content = '<h2>A simple ride</h2><p>Your horse currently rides without tack.</p><p class="muted">There are no tack items in your collection.</p>';
      if (this.horseCategory === 'stable') content = stableDecorationSlots.map((slot) => `<div class="item-row"><span>${slot.name}</span>${button(`decorate-${slot.id}`, decorations.find(({ id }) => id === this.decorationSelections.get(slot.id))!.name + ' · Change')}</div>`).join('');
      this.ui.show('Horse & stable', `<div class="tabs">${button('horse-tab', 'Your horse', this.horseCategory === 'horse')}${button('tack-tab', 'Tack', this.horseCategory === 'tack')}${button('stable-tab', 'Stable', this.horseCategory === 'stable')}</div>${content}<br>${back}`);
      for (const category of ['horse', 'tack', 'stable'] as const) this.ui.bind(`${category}-tab`, () => { this.horseCategory = category; this.openMenu('horse'); });
      for (const slot of stableDecorationSlots) this.ui.bind(`decorate-${slot.id}`, () => { this.cycleDecoration(slot.id); this.openMenu('horse'); this.ui.notify(`${slot.name} decoration changed`); });
    } else {
      this.ui.show('Your journal', `${[firstRideQuest, echoQuest].map((quest, index) => {
        const progress = index === 0 ? this.questIndex : this.echoQuestIndex;
        if (index === 1 && this.questIndex < firstRideQuest.objectives.length) return '';
        return `<h2>${quest.name}${progress === quest.objectives.length ? ' · Complete ✓' : ''}</h2><ol class="quest-list">${quest.objectives.map((objective, i) => `<li class="${i === progress ? 'current' : ''}">${i < progress ? '✓ ' : ''}${objective.description}</li>`).join('')}</ol>`;
      }).join('')}${this.raceResultText ? `<p>${escapeHTML(this.raceResultText)}</p>` : ''}${back}`);
    }
    this.ui.bind('back-menu', () => this.openMenu('pause'));
  }

  private showShop(): void {
    this.ui.show('The village counter', '<p>The bakery is a friendly place to stop and chat.</p><p class="muted">There are no goods for sale today. Enjoy a wander through the village.</p>' + button('leave-shop', 'Back to the village'));
    this.ui.bind('leave-shop', () => this.ui.close());
  }

  private updatePrompt(): void {
    const { x, y } = this.player;
    let text = '';
    if (this.mounted) text = this.isNear(this.horse.display.x, this.horse.display.y, clearingRace.start.x, clearingRace.start.y, clearingRace.start.radius) && this.raceCheckpointIndex === null ? 'R · Enter Clearing Canter    E · Dismount' : `Riding ${getHorse(this.horseId).name} · E to dismount`;
    else if (this.isNear(x, y, KEEPER_POSITION.x, KEEPER_POSITION.y, INTERACTION_RANGE)) text = 'E · Talk to the Stable Keeper';
    else {
      const villager = villagers.find((npc) => this.isNear(x, y, npc.x, npc.y, INTERACTION_RANGE));
      if (villager) text = `E · Talk to ${villager.name}`;
      else if (this.wildflower?.active && this.isNear(x, y, this.wildflower.x, this.wildflower.y, QUEST_INTERACTION_RANGE)) text = 'E · Pick wildflower';
      else if (this.isNear(x, y, this.horse.display.x, this.horse.display.y, INTERACTION_RANGE)) text = `E · Ride ${getHorse(this.horseId).name}`;
    }
    this.ui.setPrompt(text);
  }

  private isNear(x: number, y: number, targetX: number, targetY: number, range: number): boolean {
    return Phaser.Math.Distance.Between(x, y, targetX, targetY) <= range;
  }

  private talkToNearbyVillager(): boolean {
    const villager = villagers.find(({ x, y }) => this.isNear(this.player.x, this.player.y, x, y, INTERACTION_RANGE));
    if (!villager) return false;
    if (villager.id === 'trail-guide' && this.echoQuestAvailable('trail-guide')) {
      this.showDialogue('echo-guide-clue', echoClues['trail-guide']);
      this.advanceQuest('talk', 'trail-guide');
      return true;
    }
    this.showDialogue(villager.id === 'village-baker' ? 'village-baker' : 'trail-guide', villager.dialogue);
    return true;
  }

  private showDialogue(id: SavedDialogueId, dialogue: { speaker: string; message: string }): void {
    this.activeDialogueId = id;
    this.playerBody.setVelocity(0, 0);
    this.horseBody.setVelocity(0, 0);
    this.ui.show(dialogue.speaker, `<p class="dialogue-copy">${escapeHTML(dialogue.message)}</p>${button('continue-dialogue', 'Continue')}${id === 'village-baker' ? button('browse-shop', 'Visit the counter') : ''}`, () => {
      this.activeDialogueId = null;
      this.persistGame();
    }, 'dialogue');
    this.ui.bind('continue-dialogue', () => this.ui.close());
    this.ui.bind('browse-shop', () => { this.ui.close(); this.showShop(); });
    this.ui.dialog.querySelector<HTMLButtonElement>('#continue-dialogue')?.focus();
    this.persistGame();
  }

  private getDialogue(id: SavedDialogueId): { speaker: string; message: string } {
    if (id === 'stable-keeper-greeting') return stableKeeperGreeting;
    if (id === 'echo-keeper-clue') return echoClues['stable-keeper'];
    if (id === 'echo-guide-clue') return echoClues['trail-guide'];
    if (id === 'birthday-finale') return birthdayFinale;
    const villager = villagers.find(({ id: villagerId }) => villagerId === id);
    return villager?.dialogue ?? stableKeeperGreeting;
  }

  private echoQuestAvailable(target: 'stable-keeper' | 'trail-guide'): boolean {
    if (this.questIndex < firstRideQuest.objectives.length) return false;
    const objective = echoQuest.objectives[this.echoQuestIndex];
    return objective?.type === 'talk' && objective.target === target;
  }

  private renderVillage(): void {
    const path = this.add.graphics();
    path.lineStyle(24, 0xb59a68, 0.8);
    for (let index = 1; index < villageRoute.length; index += 1) {
      const from = villageRoute[index - 1]!;
      const to = villageRoute[index]!;
      path.lineBetween(from.x, from.y, to.x, to.y);
    }

    for (const building of villageBuildings) {
      this.add.rectangle(building.x, building.y, building.width, building.height, building.wallColor)
        .setStrokeStyle(3, 0x493f33);
      this.add.triangle(
        building.x,
        building.y - building.height / 2 - 17,
        -building.width / 2 - 8, 17,
        0, -17,
        building.width / 2 + 8, 17,
        building.roofColor,
      );
      this.add.text(building.x, building.y + building.height / 2 + 8, building.name, {
        color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '12px',
        backgroundColor: '#173b36cc', padding: { x: 5, y: 3 },
      }).setOrigin(0.5);
    }

    for (const villager of villagers) {
      this.add.circle(villager.x, villager.y, 15, villager.color).setStrokeStyle(3, 0xc8b77b);
      this.add.text(villager.x, villager.y - 26, villager.name, {
        color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '12px',
        backgroundColor: '#173b36cc', padding: { x: 4, y: 2 },
      }).setOrigin(0.5);
    }

    for (const cat of villageCats) {
      this.add.circle(cat.x, cat.y, 10, cat.color).setStrokeStyle(2, 0x493f33);
      this.add.circle(cat.x + 9, cat.y - 5, 7, cat.color).setStrokeStyle(2, 0x493f33);
      this.add.text(cat.x, cat.y - 23, cat.name, {
        color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '11px',
        backgroundColor: '#173b36cc', padding: { x: 4, y: 2 },
      }).setOrigin(0.5);
    }
  }

  private checkReachObjective(): void {
    const objective = this.questIndex < firstRideQuest.objectives.length
      ? firstRideQuest.objectives[this.questIndex]
      : echoQuest.objectives[this.echoQuestIndex];
    if (objective?.type === 'reach' && this.isNear(this.player.x, this.player.y, objective.x, objective.y, QUEST_INTERACTION_RANGE)) {
      this.advanceQuest(objective.type, objective.target);
      if (objective.target === 'echo-marker') this.showDialogue('birthday-finale', birthdayFinale);
    }
  }

  private advanceQuest(type: QuestObjective['type'], target: string): void {
    const firstRideActive = this.questIndex < firstRideQuest.objectives.length;
    const objective = firstRideActive
      ? firstRideQuest.objectives[this.questIndex]
      : echoQuest.objectives[this.echoQuestIndex];
    if (!objective || objective.type !== type || objective.target !== target) return;
    if (firstRideActive) {
      this.questIndex += 1;
      if (this.questIndex === firstRideQuest.objectives.length) {
        this.addItem(firstRideQuest.reward);
        this.ui.notify(`${firstRideQuest.name} complete!\n+1 Horse Apple · A Familiar Echo unlocked`);
      } else this.ui.notify(type === 'collect' ? 'Wildflower collected · Objective complete' : 'Objective complete');
    } else {
      this.echoQuestIndex += 1;
      if (this.echoQuestIndex === echoQuest.objectives.length) {
        this.addItem(echoQuest.reward);
        this.ui.notify(`${echoQuest.name} complete!\n+1 Horse Apple`);
      } else this.ui.notify('Clue discovered');
    }
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
    const index = decorations.findIndex(({ id }) => id === selectedId);
    const decoration = decorations[(index + 1) % decorations.length] ?? decorations[0];
    this.decorationSelections.set(slotId, decoration.id);
    const display = this.decorationDisplays.get(slotId);
    display?.marker.setText(decoration.symbol).setColor(decoration.color);
    display?.label.setText(decoration.name);
    this.persistGame();
  }

  private renderStableDecorations(): void {
    for (const slot of stableDecorationSlots) {
      const x = KEEPER_POSITION.x + slot.x;
      const y = KEEPER_POSITION.y + slot.y;
      const decorationId = this.decorationSelections.get(slot.id) ?? slot.defaultDecorationId;
      const decoration = decorations.find(({ id }) => id === decorationId) ?? decorations[0];
      const marker = this.add.text(x, y, decoration.symbol, {
        color: decoration.color, fontFamily: 'Arial, sans-serif', fontSize: '24px',
      }).setOrigin(0.5);
      const label = this.add.text(x, y + 22, decoration.name, {
        color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '11px',
      }).setOrigin(0.5);
      this.add.text(x, y - 21, slot.name, {
        color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '11px',
      }).setOrigin(0.5);
      this.decorationDisplays.set(slot.id, { marker, label });
    }
  }

  private tryStartRace(): void {
    if (!this.mounted || this.raceCheckpointIndex !== null ||
      !this.isNear(this.horse.display.x, this.horse.display.y, clearingRace.start.x, clearingRace.start.y, clearingRace.start.radius)) return;

    this.playerBody.setVelocity(0, 0);
    this.horseBody.setVelocity(0, 0);
    this.ui.show(clearingRace.name, `<p>A gentle canter around Sunmeadow.</p><p>Ride through three glowing gates in order. Follow the direction in your race HUD. There is no time limit.</p><p class="muted">Reward · Horse Apple ×1<br>Dismount with E to leave the race.</p>${button('ready-race', 'Ready to ride')} ${button('cancel-race', 'Maybe later')}`);
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
    this.player.setStrokeStyle(5, outfit.color);
  }

  private updateQuestText(): void {
    if (this.questIndex < firstRideQuest.objectives.length) {
      const objective = firstRideQuest.objectives[this.questIndex];
      this.questSummary = objective ? `${firstRideQuest.name}\n${objective.description}` : `${firstRideQuest.name}: Complete!`;
      this.ui.setQuest(this.questSummary);
      return;
    }
    const objective = echoQuest.objectives[this.echoQuestIndex];
    this.echoMarker?.setVisible(objective?.type === 'reach' && objective.target === 'echo-marker');
    this.questSummary = objective ? `${echoQuest.name}\n${objective.description}` : 'Sunmeadow\nA little time to wander.';
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
      player: { x: this.player.x, y: this.player.y },
      horse: { x: this.horse.display.x, y: this.horse.display.y },
      mounted: this.mounted,
      outfitId: this.outfitId,
      firstRideIndex: this.questIndex,
      echoQuestIndex: this.echoQuestIndex,
      inventory,
      decorations,
      race: { checkpointIndex: this.raceCheckpointIndex, elapsedMs, resultText: this.raceResultText },
      dialogue: this.activeDialogueId,
    });
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
      this.ui.notify('Race left · Return to the gate whenever you like.');
    }
    this.player.setPosition(spot.x, spot.y);
    this.playerBody.reset(spot.x, spot.y);
    this.playerBody.setVelocity(0, 0);
    this.playerBody.enable = true;
    this.horseBody.setVelocity(0, 0);
  }
}
