import Phaser from 'phaser';

const textures = ['ground', 'stable', 'bakery', 'hall', 'oak', 'glow'] as const;

export function preloadEnvironment(scene: Phaser.Scene): void {
  for (const name of textures) scene.load.image(`environment-${name}`, `assets/art/environment-${name}.png`);
  scene.load.spritesheet('environment-props', 'assets/art/environment-props.png', { frameWidth: 80, frameHeight: 88 });
}

/** The texture's roots meet the obstacle center; collision stays owned by World. */
export function addTree(scene: Phaser.Scene, x: number, y: number, radius = 38): Phaser.GameObjects.Image {
  return scene.add.image(x, y + 10, 'environment-oak').setOrigin(0.5, 1).setScale(radius / 38).setDepth(y);
}

export function renderEnvironment(scene: Phaser.Scene): void {
  scene.add.image(0, 0, 'environment-ground').setOrigin(0).setDepth(-100);
  for (const [name, x, y] of [['stable', 800, 512], ['bakery', 365, 296], ['hall', 220, 249]] as const) {
    scene.add.image(x, y, `environment-${name}`).setOrigin(0.5, 1).setDepth(y - 16);
    const glow = scene.add.image(x, y - 59, 'environment-glow').setScale(1.1).setBlendMode(Phaser.BlendModes.ADD).setDepth(y - 15);
    scene.tweens.add({ targets: glow, alpha: 0.6, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
  // Border groves frame existing destinations and leave the race corridor open.
  for (const [x, y, r] of [[70, 190, 36], [520, 135, 36], [620, 110, 44], [1010, 170, 40],
    [1240, 150, 34], [1640, 275, 40], [1740, 440, 43], [1690, 680, 39], [1570, 915, 44],
    [1420, 1060, 37], [1120, 1080, 44], [690, 1020, 41], [350, 1000, 44], [115, 1000, 44],
    [85, 560, 32], [450, 620, 34]] as const) addTree(scene, x, y, r);
  addTree(scene, 1480, 238, 52);
  const oakGlow = scene.add.image(1480, 269, 'environment-glow').setTint(0x93e4d0)
    .setScale(1.6).setBlendMode(Phaser.BlendModes.ADD).setDepth(239);
  scene.tweens.add({ targets: oakGlow, alpha: 0.4, duration: 3200, repeat: -1, yoyo: true });
  for (const [x, y, frame] of [[688, 599, 0], [732, 515, 1], [890, 515, 2], [401, 302, 1],
    [295, 281, 2], [1270, 454, 0], [1435, 293, 2]] as const) {
    scene.add.image(x, y, 'environment-props', frame).setOrigin(0.5, 1).setDepth(y);
  }
  // A fixed, small set of drifting pollen has no emitter or per-frame update work.
  for (let i = 0; i < 18; i++) {
    const x = 180 + (i * 193) % 1450;
    const y = 180 + (i * 137) % 760;
    const pollen = scene.add.rectangle(x, y, 2, 2, i % 3 ? 0xf0dfad : 0xaed8bf, 0.35).setDepth(2000);
    scene.tweens.add({ targets: pollen, x: x + 24, y: y - 32, alpha: 0.75, duration: 3600 + i * 120,
      delay: i * 210, repeat: -1, yoyo: true, ease: 'Sine.InOut' });
  }
  for (const [x, y] of [[159, 677], [224, 722], [266, 694]] as const) {
    const shimmer = scene.add.rectangle(x, y, 16, 2, 0xc2e6cb, 0.25).setDepth(-90);
    scene.tweens.add({ targets: shimmer, alpha: 0.65, x: x + 6, duration: 2100, yoyo: true, repeat: -1 });
  }
}
