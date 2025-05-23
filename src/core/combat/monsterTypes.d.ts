// 怪物相關類型定義
import { Monster } from '../monsters/monster';

/**
 * 怪物對象接口，包含三種不同的碰撞箱體:
 * 1. sprite: 怪物的物理實體 (phybox)，用於阻止玩家穿過
 * 2. collisionBoxSprite: 檢測是否與玩家碰撞並造成接觸傷害的區域 (collisionbox)
 * 3. hitboxSprite: 檢測是否被玩家技能命中的區域 (hitbox) - 暫未實現
 */
export interface MonsterObject {
    sprite: Phaser.GameObjects.Sprite;
    monster: Monster;
    isTriggerOnly?: boolean;
    collisionBoxSprite?: Phaser.Physics.Arcade.Sprite;
    hitboxSprite?: Phaser.Physics.Arcade.Sprite;
}

// 聲明在 CombatSystem 中使用的怪物對象
declare module './combatSystem' {
    interface CombatSystem {
        private monsterSprites: MonsterObject[];
    }
}
