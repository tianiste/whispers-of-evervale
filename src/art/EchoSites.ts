import Phaser from 'phaser';
import { echoes, type EchoDefinition, type EchoId, type EchoSetting } from '../data/echoes';

interface SiteLook {
  glow: number;
  /** Screen tint while riding near the site, so each area reads as its own place. */
  ambience: number;
  strength: number;
  props(scene: Phaser.Scene, x: number, y: number): void;
}

const ADD = Phaser.BlendModes.ADD;
const FULL_AT = 150;
const FADES_BY = 430;

function glow(scene: Phaser.Scene, x: number, y: number, tint: number, scale: number, alpha: number): Phaser.GameObjects.Image {
  return scene.add.image(x, y, 'environment-glow').setTint(tint).setScale(scale).setAlpha(alpha).setBlendMode(ADD);
}

function twinkle(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject, index: number): void {
  scene.tweens.add({ targets: target, alpha: 0.2, duration: 1100 + (index % 4) * 350, yoyo: true, repeat: -1, delay: index * 140 });
}

const looks: Record<EchoSetting, SiteLook> = {
  // Dusk stones: a violet hollow that hums like a distant bass line.
  club: {
    glow: 0xc07bff, ambience: 0x241040, strength: 0.34,
    props(scene, x, y) {
      scene.add.ellipse(x, y, 340, 180, 0x2a1d44, 0.45).setDepth(-80);
      for (let i = 0; i < 7; i++) {
        const angle = i / 7 * Math.PI * 2 + 0.3;
        const sx = x + Math.cos(angle) * 125, sy = y + Math.sin(angle) * 62;
        scene.add.rectangle(sx, sy, 14, 38, 0x4a4658).setOrigin(0.5, 1).setStrokeStyle(2, 0x2b2838).setDepth(sy);
        const cap = glow(scene, sx, sy - 38, i % 2 ? 0x3ff6e0 : 0xc07bff, 0.3, 0.7).setDepth(sy + 1);
        twinkle(scene, cap, i);
      }
      for (let i = 0; i < 12; i++) {
        const mx = x - 160 + (i * 97) % 320, my = y - 70 + (i * 53) % 140;
        const cap = scene.add.circle(mx, my, 3, i % 3 ? 0xb46cff : 0x3ff6e0).setBlendMode(ADD).setDepth(my);
        twinkle(scene, cap, i);
      }
    },
  },
  // The string telephone: two posts, two tin cans and warm afternoon light by the reeds.
  split: {
    glow: 0xffc861, ambience: 0xffb04a, strength: 0.14,
    props(scene, x, y) {
      scene.add.ellipse(x, y + 10, 300, 150, 0xe9c77a, 0.18).setDepth(-80);
      for (const px of [x - 72, x + 72]) {
        scene.add.rectangle(px, y + 8, 8, 46, 0x7a5a3a).setOrigin(0.5, 1).setDepth(y + 8);
        scene.add.rectangle(px, y - 42, 11, 13, 0xaab4b8).setStrokeStyle(1, 0x5f6a70).setDepth(y + 9);
      }
      scene.add.graphics().lineStyle(1, 0xf4e9cf, 0.9).setDepth(y + 9)
        .strokePoints(new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(x - 68, y - 42), new Phaser.Math.Vector2(x, y - 22), new Phaser.Math.Vector2(x + 68, y - 42)).getPoints(16));
      for (let i = 0; i < 9; i++) {
        const rx = x - 90 + (i * 71) % 180, ry = y + 30 + (i * 37) % 50;
        for (let j = -1; j <= 1; j++) scene.add.rectangle(rx + j * 4, ry, 2, 16 + (j + 1) * 4, 0x5d7a45).setOrigin(0.5, 1).setDepth(ry);
      }
      for (let i = 0; i < 3; i++) {
        const fly = scene.add.rectangle(x - 60 + i * 55, y - 60, 4, 3, i % 2 ? 0xffe39a : 0xf4f0d8).setDepth(y + 60);
        scene.tweens.add({ targets: fly, x: fly.x + 40, y: fly.y - 18, duration: 2200 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
    },
  },
  // The starlit knoll: sand, a blanket, a lantern, a toy camper van and fireflies.
  camper: {
    glow: 0x7fb8ff, ambience: 0x0a1638, strength: 0.42,
    props(scene, x, y) {
      scene.add.ellipse(x, y + 6, 220, 110, 0xd8c49a, 0.7).setDepth(-80);
      scene.add.rectangle(x - 48, y + 16, 60, 36, 0x4fb3a3).setAngle(-8).setDepth(y + 10);
      scene.add.rectangle(x + 52, y - 6, 8, 12, 0xf2c66d).setDepth(y);
      glow(scene, x + 52, y - 6, 0xffc48a, 0.6, 0.6).setDepth(y + 1);
      scene.add.rectangle(x - 70, y + 52, 34, 18, 0xe8dcc0).setStrokeStyle(1, 0x2e2740).setDepth(y + 52);
      scene.add.rectangle(x - 70, y + 55, 34, 3, 0x4fb3a3).setDepth(y + 53);
      for (let i = 0; i < 6; i++) scene.add.ellipse(x - 85 + i * 32, y + 40 + (i % 2) * 12, 7, 5, 0xf3e6cf).setDepth(y + 40);
      for (let i = 0; i < 14; i++) {
        const fx = x - 170 + (i * 89) % 340, fy = y - 70 + (i * 41) % 150;
        const fly = scene.add.circle(fx, fy, 2, 0xd8ff9a).setBlendMode(ADD).setDepth(3000);
        twinkle(scene, fly, i);
        scene.tweens.add({ targets: fly, x: fx + 12, y: fy - 10, duration: 2600 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
    },
  },
};

/** World-side Echo sites: props, a glowing entry point and local lighting. */
export class EchoSites {
  private readonly overlay: Phaser.GameObjects.Rectangle;
  private readonly orbs = new Map<EchoId, Phaser.GameObjects.Container>();

  constructor(private readonly scene: Phaser.Scene, restored: readonly EchoId[]) {
    for (const echo of echoes) this.renderSite(echo, restored.includes(echo.id));
    this.overlay = scene.add.rectangle(480, 270, 1600, 1000, 0x000000, 0).setScrollFactor(0).setDepth(99990);
  }

  update(x: number, y: number): void {
    let strongest = 0;
    let color = 0;
    for (const echo of echoes) {
      const look = looks[echo.setting];
      const distance = Phaser.Math.Distance.Between(x, y, echo.site.x, echo.site.y);
      const weight = Phaser.Math.Clamp((FADES_BY - distance) / (FADES_BY - FULL_AT), 0, 1) * look.strength;
      if (weight > strongest) { strongest = weight; color = look.ambience; }
    }
    this.overlay.setFillStyle(color, strongest);
  }

  markRestored(id: EchoId): void {
    const orb = this.orbs.get(id);
    if (orb) this.scene.tweens.add({ targets: orb, alpha: 0.35, scale: 0.7, duration: 800 });
  }

  private renderSite(echo: EchoDefinition, restored: boolean): void {
    const { scene } = this;
    const { x, y } = echo.site;
    const look = looks[echo.setting];
    look.props(scene, x, y);
    const halo = glow(scene, 0, 0, look.glow, 1.3, 0.7);
    const orb = scene.add.container(x, y - 18, [halo, scene.add.circle(0, 0, 7, 0xffffff, 0.9), scene.add.circle(0, 0, 4, look.glow)]).setDepth(y + 30);
    scene.tweens.add({ targets: halo, scale: 1.7, alpha: 0.35, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    for (let i = 0; i < 5; i++) {
      const mote = scene.add.rectangle((i - 2) * 8, 6, 3, 3, look.glow).setBlendMode(ADD);
      orb.add(mote);
      scene.tweens.add({ targets: mote, y: -34, alpha: 0.1, duration: 1300 + i * 170, yoyo: true, repeat: -1 });
    }
    if (restored) orb.setAlpha(0.35).setScale(0.7);
    this.orbs.set(echo.id, orb);
  }
}
