import Phaser from 'phaser';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';
import { HorseEntity } from '../entities/HorseEntity';
import { getHorse, type HorseId } from '../data/horses';
import { getRiderAppearance, type RiderAppearanceId } from '../data/riderAppearances';
import { echoClues, stableKeeperGreeting } from '../data/dialogue';
import { DialogueBox } from '../ui/DialogueBox';
import { echoQuest, firstRideQuest, type QuestObjective } from '../data/quests';
import { birthdayFinale } from '../data/birthdayGift';
import { items, type ItemId } from '../data/items';
import { outfits, type OutfitId } from '../data/outfits';
import { clearingRace } from '../data/race';
import { decorations, stableDecorationSlots, type StableDecorationSlotId } from '../data/decorations';
import { villageBuildings, villageCats, villageRoute, villagers } from '../data/village';
import { SAVE_VERSION, storeGameSave, type GameSave, type SavedDialogueId } from '../data/save';

const PLAYER_RADIUS = 14;
const PLAYER_SPEED = 220;
const HORSE_RADIUS = 25;
const INTERACTION_RANGE = 70;
const KEEPER_POSITION = { x: WORLD_WIDTH / 2 - 100, y: WORLD_HEIGHT / 2 };
const QUEST_INTERACTION_RANGE = 42;

export class WorldScene extends Phaser.Scene {
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
  private questText!: Phaser.GameObjects.Text;
  private inventory = new Map<ItemId, number>();
  private decorationSelections = new Map(stableDecorationSlots.map(({ id, defaultDecorationId }) => [id, defaultDecorationId]));
  private decorationDisplays = new Map<StableDecorationSlotId, { marker: Phaser.GameObjects.Text; label: Phaser.GameObjects.Text }>();
  private inventoryText!: Phaser.GameObjects.Text;
  private outfitText!: Phaser.GameObjects.Text;
  private raceText!: Phaser.GameObjects.Text;
  private wildflower!: Phaser.GameObjects.Arc;
  private wildflowerLabel!: Phaser.GameObjects.Text;
  private echoMarker!: Phaser.GameObjects.Container;
  private dialogueBox!: DialogueBox;
  private dialogueContinueKeys!: { enter: Phaser.Input.Keyboard.Key; space: Phaser.Input.Keyboard.Key };
  private interactionKey!: Phaser.Input.Keyboard.Key;
  private outfitKey!: Phaser.Input.Keyboard.Key;
  private raceKey!: Phaser.Input.Keyboard.Key;
  private decorationKeys!: Record<StableDecorationSlotId, Phaser.Input.Keyboard.Key>;
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
    ground.lineStyle(1, 0x436b59, 0.65);

    for (let x = 0; x <= WORLD_WIDTH; x += 100) {
      ground.lineBetween(x, 0, x, WORLD_HEIGHT);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += 100) {
      ground.lineBetween(0, y, WORLD_WIDTH, y);
    }

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

    this.horse = new HorseEntity(this, getHorse(this.horseId), save?.horse.x ?? WORLD_WIDTH / 2 + 75, save?.horse.y ?? WORLD_HEIGHT / 2 + 100);
    this.physics.add.existing(this.horse.display);
    this.horseBody = this.horse.display.body as Phaser.Physics.Arcade.Body;
    this.horseBody.setCircle(HORSE_RADIUS).setCollideWorldBounds(true);
    if (this.mounted) this.player.setPosition(this.horse.display.x, this.horse.display.y - 35);

    this.tweens.add({ targets: this.horse.display, scaleY: 1.035, duration: 1100, ease: 'Sine.InOut', yoyo: true, repeat: -1 });
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
    this.add.text(clearingRace.start.x, clearingRace.start.y - clearingRace.start.radius - 18, 'Race Start · R', {
      color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '14px',
      backgroundColor: '#173b36cc', padding: { x: 5, y: 3 },
    }).setOrigin(0.5);
    clearingRace.checkpoints.forEach((checkpoint, index) => {
      this.add.circle(checkpoint.x, checkpoint.y, checkpoint.radius, 0x8baf82, 0.2)
        .setStrokeStyle(3, 0xf4e9cf);
      this.add.text(checkpoint.x, checkpoint.y, String(index + 1), {
        color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '18px',
      }).setOrigin(0.5);
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
    this.outfitKey = this.input.keyboard!.addKey('O');
    this.raceKey = this.input.keyboard!.addKey('R');
    this.decorationKeys = this.input.keyboard!.addKeys({ window: 'ONE', door: 'TWO', sign: 'THREE' }) as typeof this.decorationKeys;
    this.dialogueContinueKeys = this.input.keyboard!.addKeys({ enter: 'ENTER', space: 'SPACE' }) as typeof this.dialogueContinueKeys;
    this.input.keyboard!.addCapture('E');

    this.cameras.main
      .setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
      .startFollow(this.player, true, 0.12, 0.12);

    this.add
      .text(16, 16, 'Move: WASD / arrows   Talk / mount / dismount: E   Outfit: O   Race: R at gate', {
        color: '#f4e9cf',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        backgroundColor: '#173b36cc',
        padding: { x: 10, y: 8 },
      })
      .setScrollFactor(0);
    this.questText = this.add.text(16, 54, '', {
      color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '15px',
      backgroundColor: '#173b36cc', padding: { x: 10, y: 7 },
    }).setScrollFactor(0);
    this.inventoryText = this.add.text(16, 91, '', {
      color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '14px',
      backgroundColor: '#173b36cc', padding: { x: 10, y: 6 },
    }).setScrollFactor(0);
    this.outfitText = this.add.text(16, 127, '', {
      color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '14px',
      backgroundColor: '#173b36cc', padding: { x: 10, y: 6 },
    }).setScrollFactor(0);
    this.raceText = this.add.text(16, 163, `${clearingRace.name}: Mount up and press R at the start`, {
      color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '14px',
      backgroundColor: '#173b36cc', padding: { x: 10, y: 6 },
    }).setScrollFactor(0);
    this.add.text(16, 199, 'Stable decorations: 1 Window   2 Door   3 Sign', {
      color: '#f4e9cf', fontFamily: 'Arial, sans-serif', fontSize: '14px',
      backgroundColor: '#173b36cc', padding: { x: 10, y: 6 },
    }).setScrollFactor(0);
    this.updateOutfitText();
    this.updateQuestText();
    this.updateInventoryText();
    this.dialogueBox = new DialogueBox(this);
    this.ambience = this.sound.add('sunmeadow-ambience', { loop: true, volume: 0.12 });
    this.ambience.play();
    if (this.raceCheckpointIndex !== null) {
      this.raceStartedAt = this.time.now - this.raceElapsedMs;
      this.raceText.setText(`${clearingRace.name}: Checkpoint ${this.raceCheckpointIndex + 1}/${clearingRace.checkpoints.length} · ${(this.raceElapsedMs / 1000).toFixed(1)}s`);
    } else if (this.raceResultText) {
      this.raceText.setText(this.raceResultText);
    }
    if (this.activeDialogueId) this.dialogueBox.show(this.getDialogue(this.activeDialogueId));
    this.nextAutosaveAt = this.time.now + 1000;
    window.addEventListener('pagehide', this.handlePageHide);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('pagehide', this.handlePageHide);
      this.ambience.stop();
    });
    this.persistGame();
  }

  update(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    if (this.dialogueBox.isOpen) {
      this.playerBody.setVelocity(0, 0);
      this.horseBody.setVelocity(0, 0);
      if (Phaser.Input.Keyboard.JustDown(this.dialogueContinueKeys.enter) || Phaser.Input.Keyboard.JustDown(this.dialogueContinueKeys.space)) {
        this.dialogueBox.hide();
        this.activeDialogueId = null;
        this.persistGame();
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.outfitKey)) this.cycleOutfit();
    if (Phaser.Input.Keyboard.JustDown(this.raceKey)) this.tryStartRace();
    for (const slot of stableDecorationSlots) {
      if (Phaser.Input.Keyboard.JustDown(this.decorationKeys[slot.id])) this.cycleDecoration(slot.id);
    }

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
    if (Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
      if (this.mounted) {
        this.tryDismount();
        this.advanceQuest('interact', 'chosen-horse');
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
        this.playerBody.enable = false;
        this.advanceQuest('interact', 'chosen-horse');
      }
      this.persistGame();
    }

    const body = this.mounted ? this.horseBody : this.playerBody;
    body.setVelocity(x * PLAYER_SPEED, y * PLAYER_SPEED);
    if (this.mounted) this.player.setPosition(this.horse.display.x, this.horse.display.y - 35);
    this.updateRace();
    if (this.time.now >= this.nextAutosaveAt) {
      this.persistGame();
      this.nextAutosaveAt = this.time.now + 1000;
    }
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
    this.dialogueBox.show(dialogue);
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
      if (this.questIndex === firstRideQuest.objectives.length) this.addItem(firstRideQuest.reward);
    } else {
      this.echoQuestIndex += 1;
      if (this.echoQuestIndex === echoQuest.objectives.length) this.addItem(echoQuest.reward);
    }
    this.updateQuestText();
    this.persistGame();
  }

  private addItem(id: ItemId): void {
    this.inventory.set(id, (this.inventory.get(id) ?? 0) + 1);
    this.updateInventoryText();
  }

  private updateInventoryText(): void {
    const contents = items
      .filter(({ id }) => (this.inventory.get(id) ?? 0) > 0)
      .map(({ id, name }) => `${name} ×${this.inventory.get(id)}`);
    this.inventoryText.setText(contents.length ? `Inventory: ${contents.join(' · ')}` : 'Inventory: empty');
    this.persistGame();
  }

  private cycleOutfit(): void {
    const index = outfits.findIndex(({ id }) => id === this.outfitId);
    const outfit = outfits[(index + 1) % outfits.length] ?? outfits[0];
    this.outfitId = outfit.id;
    this.updateOutfitText();
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

    this.raceCheckpointIndex = 0;
    this.raceStartedAt = this.time.now;
    this.raceElapsedMs = 0;
    this.raceLastDisplay = -1;
    this.raceText.setText(`${clearingRace.name}: Checkpoint 1/${clearingRace.checkpoints.length}`);
    this.persistGame();
  }

  private updateRace(): void {
    if (this.raceCheckpointIndex === null) return;

    if (!this.mounted) {
      this.raceCheckpointIndex = null;
      this.raceResultText = `${clearingRace.name}: Cancelled — mount up and return to the start`;
      this.raceText.setText(this.raceResultText);
      this.persistGame();
      return;
    }

    const checkpoint = clearingRace.checkpoints[this.raceCheckpointIndex];
    if (checkpoint && this.isNear(this.horse.display.x, this.horse.display.y, checkpoint.x, checkpoint.y, checkpoint.radius)) {
      this.raceCheckpointIndex += 1;
      this.raceElapsedMs = this.time.now - this.raceStartedAt;
      if (this.raceCheckpointIndex === clearingRace.checkpoints.length) {
        const seconds = (this.time.now - this.raceStartedAt) / 1000;
        this.raceElapsedMs = this.time.now - this.raceStartedAt;
        this.raceCheckpointIndex = null;
        this.raceResultText = `${clearingRace.name}: Finished in ${seconds.toFixed(1)}s! Horse Apple earned.`;
        this.raceText.setText(this.raceResultText);
        this.addItem(clearingRace.reward);
        return;
      }
      this.persistGame();
    }

    const tenths = Math.floor((this.time.now - this.raceStartedAt) / 100);
    if (tenths !== this.raceLastDisplay) {
      this.raceLastDisplay = tenths;
      this.raceElapsedMs = this.time.now - this.raceStartedAt;
      this.raceText.setText(`${clearingRace.name}: Checkpoint ${this.raceCheckpointIndex + 1}/${clearingRace.checkpoints.length} · ${(tenths / 10).toFixed(1)}s`);
    }
  }

  private updateOutfitText(): void {
    const outfit = outfits.find(({ id }) => id === this.outfitId) ?? outfits[0];
    this.outfitText.setText(`Outfit: ${outfit.name} (O)`);
    this.player.setStrokeStyle(5, outfit.color);
  }

  private updateQuestText(): void {
    if (this.questIndex < firstRideQuest.objectives.length) {
      const objective = firstRideQuest.objectives[this.questIndex];
      this.questText.setText(objective ? `${firstRideQuest.name}: ${objective.description}` : `${firstRideQuest.name}: Complete!`);
      return;
    }
    const objective = echoQuest.objectives[this.echoQuestIndex];
    this.echoMarker?.setVisible(objective?.type === 'reach' && objective.target === 'echo-marker');
    this.questText.setText(objective ? `${echoQuest.name}: ${objective.description}` : `${echoQuest.name}: Complete!`);
  }

  private handlePageHide = (): void => this.persistGame();

  private persistGame(): void {
    if (!this.dialogueBox) return;
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
    if (!spot) return;

    this.mounted = false;
    if (this.raceCheckpointIndex !== null) {
      this.raceCheckpointIndex = null;
      this.raceResultText = `${clearingRace.name}: Cancelled — mount up and return to the start`;
      this.raceText.setText(this.raceResultText);
    }
    this.player.setPosition(spot.x, spot.y);
    this.playerBody.reset(spot.x, spot.y);
    this.playerBody.setVelocity(0, 0);
    this.playerBody.enable = true;
    this.horseBody.setVelocity(0, 0);
  }
}
