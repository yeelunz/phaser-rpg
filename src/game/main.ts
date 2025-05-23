import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { UIScene } from './scenes/UIScene'; // 引入 UI 場景

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1080,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#028af8',

    // --- 這行是你添加的 ---
    resolution: window.devicePixelRatio || 1,
    // --- ---

    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 }, // 對於俯角RPG，我們不需要任何重力
            debug: false
        }
    },
    dom: {
        createContainer: true
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        MainGame,
        UIScene,
        GameOver
    ]
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
}

export default StartGame;