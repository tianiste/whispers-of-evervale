import Phaser from 'phaser';
import { HorseEntity } from '../entities/HorseEntity';
import { firstHorse } from '../data/horses';

const WORLD_WIDTH = 1800;
const WORLD_HEIGHT = 1100;
const PLAYER_RADIUS = 14;
const PLAYER_SPEED = 220;
const HORSE_RADIUS = 25;
const INTERACTION_RANGE = 70;

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Arc;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private horse!: HorseEntity;
  private horseBody!: Phaser.Physics.Arcade.Body;
  private mounted = false;
  private interactionKey!: Phaser.Input.Keyboard.Key;
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
    this.player = this.add.circle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, PLAYER_RADIUS, 0xf4e9cf);
    this.player.setStrokeStyle(3, 0x173b36);
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCircle(PLAYER_RADIUS).setCollideWorldBounds(true);

    this.horse = new HorseEntity(this, firstHorse, WORLD_WIDTH / 2 + 75, WORLD_HEIGHT / 2 + 100);
    this.physics.add.existing(this.horse.display);
    this.horseBody = this.horse.display.body as Phaser.Physics.Arcade.Body;
    this.horseBody.setCircle(HORSE_RADIUS).setCollideWorldBounds(true);

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
    this.input.keyboard!.addCapture('E');

    this.cameras.main
      .setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
      .startFollow(this.player, true, 0.12, 0.12);

    this.add
      .text(16, 16, 'Move: WASD / arrows   Mount or dismount: E', {
        color: '#f4e9cf',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        backgroundColor: '#173b36cc',
        padding: { x: 10, y: 8 },
      })
      .setScrollFactor(0);
  }

  update(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

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
    if (Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
      if (this.mounted) this.tryDismount();
      else if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.horse.display.x, this.horse.display.y) <= INTERACTION_RANGE) {
        this.mounted = true;
        this.playerBody.enable = false;
      }
    }

    const body = this.mounted ? this.horseBody : this.playerBody;
    body.setVelocity(x * PLAYER_SPEED, y * PLAYER_SPEED);
    if (this.mounted) this.player.setPosition(this.horse.display.x, this.horse.display.y - 35);
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
    this.player.setPosition(spot.x, spot.y);
    this.playerBody.reset(spot.x, spot.y);
    this.playerBody.setVelocity(0, 0);
    this.playerBody.enable = true;
    this.horseBody.setVelocity(0, 0);
  }
}
