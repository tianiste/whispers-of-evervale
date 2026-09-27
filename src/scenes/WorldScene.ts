import Phaser from 'phaser';
import { HorseEntity } from '../entities/HorseEntity';
import { getHorse, type HorseId } from '../data/horses';
import { getRiderAppearance, type RiderAppearanceId } from '../data/riderAppearances';
import { stableKeeperGreeting } from '../data/dialogue';
import { DialogueBox } from '../ui/DialogueBox';
import { firstRideQuest, type QuestObjective } from '../data/quests';
import { items, type ItemId } from '../data/items';
import { outfits, type OutfitId } from '../data/outfits';
import { clearingRace } from '../data/race';
import { decorations, stableDecorationSlots, type StableDecorationSlotId } from '../data/decorations';

const WORLD_WIDTH = 1800;
const WORLD_HEIGHT = 1100;
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
  private questText!: Phaser.GameObjects.Text;
  private inventory = new Map<ItemId, number>();
  private decorationSelections = new Map(stableDecorationSlots.map(({ id, defaultDecorationId }) => [id, defaultDecorationId]));
  private decorationDisplays = new Map<StableDecorationSlotId, { marker: Phaser.GameObjects.Text; label: Phaser.GameObjects.Text }>();
  private inventoryText!: Phaser.GameObjects.Text;
  private outfitText!: Phaser.GameObjects.Text;
  private raceText!: Phaser.GameObjects.Text;
  private wildflower!: Phaser.GameObjects.Arc;
  private wildflowerLabel!: Phaser.GameObjects.Text;
  private dialogueBox!: DialogueBox;
  private dialogueContinueKeys!: { enter: Phaser.Input.Keyboard.Key; space: Phaser.Input.Keyboard.Key };
  private interactionKey!: Phaser.Input.Keyboard.Key;
  private outfitKey!: Phaser.Input.Keyboard.Key;
  private raceKey!: Phaser.Input.Keyboard.Key;
  private decorationKeys!: Record<StableDecorationSlotId, Phaser.Input.Keyboard.Key>;
  private raceCheckpointIndex: number | null = null;
  private raceStartedAt = 0;
  private raceLastDisplay = -1;
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

  init(data: { appearanceId?: RiderAppearanceId; horseId?: HorseId }): void {
    this.appearanceId = getRiderAppearance(data.appearanceId).id;
    this.horseId = getHorse(data.horseId).id;
    this.outfitId = outfits[0].id;
    this.questIndex = 0;
    this.raceCheckpointIndex = null;
    this.raceLastDisplay = -1;
    this.inventory.clear();
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

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.player = this.add.circle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, PLAYER_RADIUS, getRiderAppearance(this.appearanceId).color);
    this.player.setStrokeStyle(3, 0x173b36);
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCircle(PLAYER_RADIUS).setCollideWorldBounds(true);

    this.horse = new HorseEntity(this, getHorse(this.horseId), WORLD_WIDTH / 2 + 75, WORLD_HEIGHT / 2 + 100);
    this.physics.add.existing(this.horse.display);
    this.horseBody = this.horse.display.body as Phaser.Physics.Arcade.Body;
    this.horseBody.setCircle(HORSE_RADIUS).setCollideWorldBounds(true);

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
  }

  update(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    if (this.dialogueBox.isOpen) {
      this.playerBody.setVelocity(0, 0);
      this.horseBody.setVelocity(0, 0);
      if (Phaser.Input.Keyboard.JustDown(this.dialogueContinueKeys.enter) || Phaser.Input.Keyboard.JustDown(this.dialogueContinueKeys.space)) {
        this.dialogueBox.hide();
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
        this.advanceQuest('talk', 'stable-keeper');
        this.dialogueBox.show(stableKeeperGreeting);
      }
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
    }

    const body = this.mounted ? this.horseBody : this.playerBody;
    body.setVelocity(x * PLAYER_SPEED, y * PLAYER_SPEED);
    if (this.mounted) this.player.setPosition(this.horse.display.x, this.horse.display.y - 35);
    this.updateRace();
  }

  private isNear(x: number, y: number, targetX: number, targetY: number, range: number): boolean {
    return Phaser.Math.Distance.Between(x, y, targetX, targetY) <= range;
  }

  private checkReachObjective(): void {
    const objective = firstRideQuest.objectives[this.questIndex];
    if (objective?.type === 'reach' && this.isNear(this.player.x, this.player.y, objective.x, objective.y, QUEST_INTERACTION_RANGE)) {
      this.advanceQuest(objective.type, objective.target);
    }
  }

  private advanceQuest(type: QuestObjective['type'], target: string): void {
    const objective = firstRideQuest.objectives[this.questIndex];
    if (!objective || objective.type !== type || objective.target !== target) return;
    this.questIndex += 1;
    if (this.questIndex === firstRideQuest.objectives.length) this.addItem(firstRideQuest.reward);
    this.updateQuestText();
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
  }

  private cycleOutfit(): void {
    const index = outfits.findIndex(({ id }) => id === this.outfitId);
    const outfit = outfits[(index + 1) % outfits.length] ?? outfits[0];
    this.outfitId = outfit.id;
    this.updateOutfitText();
  }

  private cycleDecoration(slotId: StableDecorationSlotId): void {
    const selectedId = this.decorationSelections.get(slotId);
    const index = decorations.findIndex(({ id }) => id === selectedId);
    const decoration = decorations[(index + 1) % decorations.length] ?? decorations[0];
    this.decorationSelections.set(slotId, decoration.id);
    const display = this.decorationDisplays.get(slotId);
    display?.marker.setText(decoration.symbol).setColor(decoration.color);
    display?.label.setText(decoration.name);
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
    this.raceLastDisplay = -1;
    this.raceText.setText(`${clearingRace.name}: Checkpoint 1/${clearingRace.checkpoints.length}`);
  }

  private updateRace(): void {
    if (this.raceCheckpointIndex === null) return;

    if (!this.mounted) {
      this.raceCheckpointIndex = null;
      this.raceText.setText(`${clearingRace.name}: Cancelled — mount up and return to the start`);
      return;
    }

    const checkpoint = clearingRace.checkpoints[this.raceCheckpointIndex];
    if (checkpoint && this.isNear(this.horse.display.x, this.horse.display.y, checkpoint.x, checkpoint.y, checkpoint.radius)) {
      this.raceCheckpointIndex += 1;
      if (this.raceCheckpointIndex === clearingRace.checkpoints.length) {
        const seconds = (this.time.now - this.raceStartedAt) / 1000;
        this.raceCheckpointIndex = null;
        this.raceText.setText(`${clearingRace.name}: Finished in ${seconds.toFixed(1)}s! Horse Apple earned.`);
        this.addItem(clearingRace.reward);
        return;
      }
    }

    const tenths = Math.floor((this.time.now - this.raceStartedAt) / 100);
    if (tenths !== this.raceLastDisplay) {
      this.raceLastDisplay = tenths;
      this.raceText.setText(`${clearingRace.name}: Checkpoint ${this.raceCheckpointIndex + 1}/${clearingRace.checkpoints.length} · ${(tenths / 10).toFixed(1)}s`);
    }
  }

  private updateOutfitText(): void {
    const outfit = outfits.find(({ id }) => id === this.outfitId) ?? outfits[0];
    this.outfitText.setText(`Outfit: ${outfit.name} (O)`);
    this.player.setStrokeStyle(5, outfit.color);
  }

  private updateQuestText(): void {
    const objective = firstRideQuest.objectives[this.questIndex];
    this.questText.setText(objective ? `${firstRideQuest.name}: ${objective.description}` : `${firstRideQuest.name}: Complete!`);
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
      this.raceText.setText(`${clearingRace.name}: Cancelled — mount up and return to the start`);
    }
    this.player.setPosition(spot.x, spot.y);
    this.playerBody.reset(spot.x, spot.y);
    this.playerBody.setVelocity(0, 0);
    this.playerBody.enable = true;
    this.horseBody.setVelocity(0, 0);
  }
}
