import { EntityManager } from './entityManager';
import { CombatEventHandler } from './combatEventHandler';
import { EntitySearchSystem } from './entitySearchSystem';
import { DamageSystem, DamageType, AttackDefinition, DamageResult } from './damageSystem';
import { MonsterCollisionHandler } from './monsterCollisionHandler';
import { SkillCaster } from '../skills/skillCaster';
import { SkillEventManager } from '../skills/skillEventManager';
import { SkillEventType } from '../skills/types';

/**
 * 戰鬥系統
 * 負責初始化和管理所有與戰鬥相關的子系統
 */
export class CombatSystem {
    private entityManager: EntityManager;
    private combatEventHandler: CombatEventHandler;
    private entitySearchSystem: EntitySearchSystem;
    private skillEventManager: SkillEventManager;
    private monsterCollisionHandler: MonsterCollisionHandler;
    
    private scene: Phaser.Scene | null = null;
    private isInitialized: boolean = false;

    // 玩家技能相關
    private skillCaster: SkillCaster | null = null;    // 怪物相關
    private monsterSprites: { sprite: Phaser.GameObjects.Sprite, monster: any, isTriggerOnly?: boolean, collisionBoxSprite?: Phaser.Physics.Arcade.Sprite }[] = [];

    constructor() {
        this.entityManager = EntityManager.getInstance();
        this.combatEventHandler = new CombatEventHandler();
        this.entitySearchSystem = EntitySearchSystem.getInstance();
        this.skillEventManager = SkillEventManager.getInstance();
    }

    /**
     * 初始化戰鬥系統
     * @param scene Phaser遊戲場景
     */
    public initialize(scene: Phaser.Scene): void {
        if (this.isInitialized) {
            console.warn('戰鬥系統已經初始化，請勿重複調用');
            return;
        }

        this.scene = scene;

        // 初始化各子系統
        console.log('初始化戰鬥系統...');
        
        // 1. 初始化實體管理器
        this.entityManager.initialize(scene);
        
        // 2. 初始化實體搜索系統
        this.entitySearchSystem.initialize(scene);
        
        // 3. 初始化戰鬥事件處理器
        this.combatEventHandler.initialize(scene);
        
        // 4. 初始化怪物碰撞處理器
        this.monsterCollisionHandler = new MonsterCollisionHandler(scene);

        this.isInitialized = true;
        console.log('戰鬥系統初始化完成');
    }

    /**
     * 註冊實體到系統中
     * @param entity 實體對象
     */
    public registerEntity(entity: any): void {
        if (!this.isInitialized) {
            console.warn('戰鬥系統尚未初始化，無法註冊實體');
            return;
        }

        this.entityManager.registerEntity(entity);
    }
    
    /**
     * 註銷實體
     * @param entityId 實體ID
     */
    public unregisterEntity(entityId: string): void {
        if (!this.isInitialized) {
            console.warn('戰鬥系統尚未初始化，無法註銷實體');
            return;
        }
        
        this.entityManager.unregisterEntity(entityId);
    }
    
    /**
     * 根據ID獲取實體
     * @param entityId 實體ID
     * @returns 實體對象或undefined
     */
    public getEntityById(entityId: string): any | undefined {
        return this.entityManager.getEntityById(entityId);
    }
    
    /**
     * 獲取玩家實體
     * @returns 玩家實體或null
     */
    public getPlayer(): any | null {
        return this.entityManager.getPlayer();
    }
      /**
     * 設置要監控的怪物列表
     * @param monsters 怪物精靈與實體的陣列
     */
    public setMonsters(monsters: { sprite: Phaser.GameObjects.Sprite, monster: any, isTriggerOnly?: boolean, collisionBoxSprite?: Phaser.Physics.Arcade.Sprite }[]): void {
        if (!this.isInitialized || !this.scene) {
            console.warn('戰鬥系統尚未初始化，無法設置怪物');
            return;
        }
        
        this.monsterSprites = monsters;
        
        // 註冊所有怪物到實體管理器
        monsters.forEach(monsterObj => {
            if (monsterObj.monster) {
                this.registerEntity(monsterObj.monster);
            }
        });
        
        console.log(`已設置 ${monsters.length} 個怪物到戰鬥系統中`);
    }
    
    /**
     * 設置碰撞檢測
     */
    public setupCollisions(): void {
        if (!this.isInitialized || !this.scene) {
            console.warn('戰鬥系統尚未初始化，無法設置碰撞檢測');
            return;
        }
        
        const player = this.entityManager.getPlayer();
        if (!player || !player.sprite) {
            console.warn('找不到有效的玩家實體或玩家精靈，無法設置碰撞檢測');
            return;
        }
        
        // 使用怪物碰撞處理器設置碰撞
        this.monsterCollisionHandler.setupCollisions(player.sprite, this.monsterSprites);
        
        console.log('戰鬥系統已設置碰撞檢測');
    }
    
    /**
     * 設置技能施放器
     * @param skillCaster 技能施放器實例
     */
    public setSkillCaster(skillCaster: SkillCaster): void {
        this.skillCaster = skillCaster;
    }
    
    /**
     * 處理玩家對怪物的攻擊
     * @param player 玩家實體
     * @param monster 怪物實體
     */
    public playerAttackMonster(player: any, monster: any): void {
        if (!player || !monster) {
            console.warn('無效的玩家或怪物實體');
            return;
        }
        
        // 使用戰鬥事件系統處理玩家攻擊
        this.skillEventManager.dispatchEvent({
            type: SkillEventType.DAMAGE_DEALT,
            skillId: 'basic_attack',
            skillLevel: 1,
            casterId: player.getId(),
            timestamp: Date.now(),
            data: {
                targetId: monster.getId(),
                damageType: 'physical',
                damageMultiplier: 1.0,
                hitIndex: 0,
                totalHits: 1
            }
        });
    }
      /**
     * 更新戰鬥系統
     * @param time 當前時間
     * @param delta 時間增量
     */
    public update(_time: number, _delta: number): void {
        // 這裡可以添加需要每幀更新的戰鬥相關邏輯
        // 例如時間軸效果、持續傷害計算等
    }
    
    /**
     * 清理戰鬥系統資源
     */
    public destroy(): void {
        if (!this.isInitialized) {
            return;
        }
        
        this.combatEventHandler.destroy();
        // 實體管理器清理
        this.entityManager.destroy();
        
        // 清空怪物列表
        this.monsterSprites = [];
        
        this.isInitialized = false;
        console.log('戰鬥系統已銷毀');
    }
}
