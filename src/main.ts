import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { CharacterCreatorScene } from './scenes/CharacterCreatorScene';
import { WorldScene } from './scenes/WorldScene';
import { EchoScene } from './scenes/EchoScene';
import { GroomScene } from './scenes/GroomScene';
import { RaceScene } from './scenes/RaceScene';
import './style.css';

new Phaser.Game({
  ...gameConfig,
  parent: 'app',
  scene: [BootScene, MainMenuScene, CharacterCreatorScene, WorldScene, EchoScene, RaceScene, GroomScene],
});
