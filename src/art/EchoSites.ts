import Phaser from 'phaser';
import { echoes, echoTotal, type EchoDefinition, type EchoId, type EchoSetting } from '../data/echoes';

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
  // The seaside picnic: a sandy patch, a checked blanket, a taco, and a suspicious glint of foil.
  flat: {
    glow: 0xd8f0ff, ambience: 0xff9a5a, strength: 0.16,
    props(scene, x, y) {
      scene.add.ellipse(x, y + 8, 260, 130, 0xe6cf98, 0.75).setDepth(-80);
      for (let i = 0; i < 4; i++) scene.add.rectangle(x - 150 + i * 14, y - 30 + (i % 2) * 70, 30, 2, 0x7fb8d0, 0.8).setDepth(-79);
      const blanket = scene.add.container(x - 40, y + 26).setDepth(y + 20).setAngle(-6);
      for (let i = 0; i < 16; i++) blanket.add(scene.add.rectangle(-30 + (i % 4) * 20, -15 + Math.floor(i / 4) * 10, 20, 10, (i + Math.floor(i / 4)) % 2 ? 0xf4efe6 : 0x55cabb));
      scene.add.graphics().fillStyle(0xe8b44a).slice(x - 36, y + 28, 7, Math.PI, 0, false).fillPath().setDepth(y + 30);
      const foil = scene.add.rectangle(x + 50, y + 20, 26, 14, 0xdfe6ea).setStrokeStyle(1, 0x9aa3aa).setAngle(8).setDepth(y + 20);
      const shine = glow(scene, x + 50, y + 18, 0xffffff, 0.35, 0.8).setDepth(y + 21);
      twinkle(scene, shine, 0);
      scene.tweens.add({ targets: foil, angle: 12, duration: 1800, yoyo: true, repeat: -1 });
      for (let i = 0; i < 3; i++) {
        const gull = scene.add.text(x - 90 + i * 70, y - 90 - (i % 2) * 20, 'v', { fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#f4efe6' }).setDepth(3000);
        scene.tweens.add({ targets: gull, x: gull.x + 40, y: gull.y - 10, duration: 3000 + i * 400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
    },
  },
  // The frosted hollow: a patch of summer snow, a tiny snowman and flakes that never land.
  winter: {
    glow: 0xbfe8ff, ambience: 0x8fb8e8, strength: 0.26,
    props(scene, x, y) {
      scene.add.ellipse(x, y + 6, 280, 140, 0xf4f8fc, 0.85).setDepth(-80);
      scene.add.ellipse(x, y + 6, 200, 90, 0xe0ecf6, 0.9).setDepth(-79);
      const sx = x + 70, sy = y + 10;
      scene.add.circle(sx, sy, 13, 0xffffff).setStrokeStyle(1, 0xc8d8e8).setDepth(sy + 13);
      scene.add.circle(sx, sy - 18, 9, 0xffffff).setStrokeStyle(1, 0xc8d8e8).setDepth(sy + 14);
      scene.add.rectangle(sx + 7, sy - 18, 6, 2, 0xf2a33a).setDepth(sy + 15);
      scene.add.rectangle(sx, sy - 10, 18, 3, 0xc0392b).setDepth(sy + 15);
      for (let i = 0; i < 16; i++) {
        const fx = x - 150 + (i * 83) % 300, fy = y - 90 + (i * 47) % 120;
        const flake = scene.add.rectangle(fx, fy, 3, 3, 0xffffff, 0.9).setDepth(3000);
        scene.tweens.add({ targets: flake, y: fy + 40, x: fx + 10, alpha: 0.2, duration: 2400 + i * 110, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
    },
  },
  // Beside Sunmeadow Stable: a warm doorway glow, a doormat and a spare key catching the light.
  future: {
    glow: 0x77ffe0, ambience: 0xffc890, strength: 0.12,
    props(scene, x, y) {
      scene.add.ellipse(x, y + 10, 180, 84, 0xffd8a0, 0.24).setDepth(-80);
      scene.add.rectangle(x, y + 22, 40, 14, 0x8a5a3a).setStrokeStyle(1, 0x5a3a24).setDepth(y + 20);
      scene.add.rectangle(x, y + 22, 30, 3, 0x55cabb).setDepth(y + 21);
      const key = scene.add.container(x + 34, y - 30, [
        scene.add.circle(0, 0, 4).setStrokeStyle(2, 0xe8c14a), scene.add.rectangle(8, 0, 10, 2, 0xe8c14a), scene.add.rectangle(11, 3, 2, 3, 0xe8c14a),
        scene.add.rectangle(-5, -5, 6, 2, 0x55cabb),
      ]).setDepth(y + 40);
      scene.tweens.add({ targets: key, y: y - 38, angle: 8, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      for (let i = 0; i < 8; i++) {
        const mote = scene.add.rectangle(x - 70 + (i * 41) % 140, y - 50 + (i * 29) % 70, 3, 3, i % 2 ? 0x77ffe0 : 0xffd8a0).setBlendMode(ADD).setDepth(3000);
        twinkle(scene, mote, i);
      }
    },
  },
};

const OAK = { x: 1480, y: 262 };

/** World-side Echo sites: props, a glowing entry point and local lighting. */
export class EchoSites {
  private readonly overlay: Phaser.GameObjects.Rectangle;
  private readonly orbs = new Map<EchoId, Phaser.GameObjects.Container>();
  /** The final Echo's site stays hidden until its trail begins; these are its objects. */
  private readonly dormant = new Map<EchoId, Phaser.GameObjects.GameObject[]>();
  /** One light per Echo circling the old oak; restored Echoes light theirs, the last one flickers. */
  private readonly oakLights: Phaser.GameObjects.Arc[] = [];
  private restoredCount: number;

  constructor(private readonly scene: Phaser.Scene, restored: readonly EchoId[]) {
    for (const echo of echoes) this.renderSite(echo, restored.includes(echo.id));
    this.restoredCount = restored.length;
    const ring = scene.add.container(OAK.x, OAK.y).setDepth(OAK.y + 40);
    for (let i = 0; i < echoTotal; i++) {
      const angle = i / echoTotal * Math.PI * 2;
      const light = scene.add.circle(Math.cos(angle) * 58, Math.sin(angle) * 22 - 40, 4, 0xbff8ec).setBlendMode(ADD);
      ring.add(light);
      this.oakLights.push(light);
    }
    scene.tweens.add({ targets: ring, angle: { from: -3, to: 3 }, y: OAK.y - 6, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.updateOak();
    this.overlay = scene.add.rectangle(480, 270, 1600, 1000, 0x000000, 0).setScrollFactor(0).setDepth(99990);
  }

  update(x: number, y: number): void {
    let strongest = 0;
    let color = 0;
    for (const echo of echoes) {
      if (this.dormant.has(echo.id)) continue;
      const look = looks[echo.setting];
      const distance = Phaser.Math.Distance.Between(x, y, echo.site.x, echo.site.y);
      const weight = Phaser.Math.Clamp((FADES_BY - distance) / (FADES_BY - FULL_AT), 0, 1) * look.strength;
      if (weight > strongest) { strongest = weight; color = look.ambience; }
    }
    this.overlay.setFillStyle(color, strongest);
  }

  /** Reveals a dormant site; does nothing once it is visible. */
  wake(id: EchoId): void {
    const objects = this.dormant.get(id);
    if (!objects) return;
    this.dormant.delete(id);
    for (const object of objects) {
      const item = object as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible & Phaser.GameObjects.Components.Alpha;
      const alpha = item.alpha;
      item.setVisible(true).setAlpha(0);
      this.scene.tweens.add({ targets: item, alpha, duration: 900 });
    }
  }

  markRestored(id: EchoId): void {
    const orb = this.orbs.get(id);
    if (orb) this.scene.tweens.add({ targets: orb, alpha: 0.35, scale: 0.7, duration: 800 });
    this.restoredCount++;
    this.updateOak();
  }

  private updateOak(): void {
    this.oakLights.forEach((light, index) => {
      this.scene.tweens.killTweensOf(light);
      const lit = index < this.restoredCount;
      light.setAlpha(lit ? 0.95 : 0.15).setFillStyle(lit ? 0xbff8ec : 0xffe7a0);
      // The one Echo still waiting feels different: warm, and not quite steady.
      if (!lit && index === this.restoredCount && this.restoredCount === echoTotal - 1) {
        this.scene.tweens.add({ targets: light, alpha: { from: 0.2, to: 0.9 }, scale: 1.5, duration: 700, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [3] });
      }
    });
  }

  private renderSite(echo: EchoDefinition, restored: boolean): void {
    const { scene } = this;
    const { x, y } = echo.site;
    const look = looks[echo.setting];
    const first = scene.children.list.length;
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
    if (echo.finale && !restored) {
      const objects = scene.children.list.slice(first);
      objects.forEach(object => (object as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible).setVisible(false));
      this.dormant.set(echo.id, objects);
    }
  }
}
