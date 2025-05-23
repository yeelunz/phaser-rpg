// 戰鬥系統相關類型定義
import { CombatSystem } from './combatSystem';

// 為 Window 接口擴展
declare global {
    interface Window {
        combatSystem?: CombatSystem;
        gameEvents: Phaser.Events.EventEmitter;
        game: Phaser.Game;
    }
}
