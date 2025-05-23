import { SkillImplementation, SkillImplementationFactory } from '../types';
import { SkillProjectile } from '../skillProjectile';
import { StaticMovementBehavior } from '../projectile/projectileMovement';
import { StandardDamageBehavior } from '../projectile/projectileBehaviors'; // 使用 StandardDamageBehavior
import { TimeDestructionCondition } from '../projectile/destructionConditions';
import { CollisionBoxType, SkillDamageType, SkillProjectileCategory } from '../types';
import { EntitySearchSystem, EntitySearchFilter, SearchAreaShape, EntityType } from '../../combat/entitySearchSystem';

/**
 * 斬擊技能實現
 * 在玩家前方的圓形區域內造成150%傷害
 */
class SlashImplementation implements SkillImplementation {
    private level: number;
    private game: Phaser.Game;
    private damageMultiplier: number = 1.5; // 150% 傷害
    private slashRange: number = 230; // 斬擊圓形範圍半徑
    private forwardOffset: number = 50; // 前方位移距離
    private effectDuration: number = 500; // 效果持續時間 (毫秒)

    /**
     * 建構子
     * @param level 技能等級
     * @param game Phaser遊戲實例
     */
    constructor(level: number, game: Phaser.Game) {
        this.level = level;
        this.game = game;
    }

    /**
     * 執行技能
     * @param params 技能參數，包含施法位置和方向
     */
    execute(params: { x: number, y: number, direction: number }): void {
        const { x, y, direction } = params;
        // Phaser 的角度: 東=0, 南=90, 西=180, 北=270 (或-90)
        // 假設傳入的 direction 已經是 Phaser 角度
        const directionRad = direction * Math.PI / 180; // 轉換為弧度
        const slashX = x + Math.cos(directionRad) * this.forwardOffset;
        const slashY = y + Math.sin(directionRad) * this.forwardOffset;
        
        console.log(`[Slash] 使用 Phaser 角度: ${direction}度`);

        console.log(`[Slash] 施放位置: (${x}, ${y}), 方向: ${direction}度, 斬擊位置: (${slashX}, ${slashY})`);

        // 創建技能投射物資料
        const projectileData = {
            id: `slash_${Date.now()}`,
            name: '斬擊',
            animationType: 'slash',
            category: SkillProjectileCategory.SLASH,
            damageType: SkillDamageType.PHYSICAL,
            spriteScale: 3.0,
            position: { x: slashX, y: slashY }, // 使用計算出的斬擊位置
            collisionType: CollisionBoxType.CIRCLE,
            radius: this.slashRange, // 使用範圍作為碰撞半徑
            attributes: {
                skillId: 'slash',
                skillLevel: this.level,
                direction: direction // 直接使用傳入的Phaser角度
            }
        };

        // 創建技能投射物實例
        const slashProjectile = new SkillProjectile(projectileData);        // 獲取玩家實體ID (通常由技能施放系統提供)
        const playerId = this.findPlayerId() || 'player';
        // 正確設置源實體ID，這樣StandardDamageBehavior可以使用getSourceEntityId()獲取
        slashProjectile.setSourceEntityId(playerId);
        console.log(`[Slash] 設置源實體ID: ${playerId}`);

        // 為了向後兼容，同時設置為屬性
        slashProjectile.setAttribute('sourceEntityId', playerId);        // 設置靜態行為 - 斬擊不移動，只在原地生成效果
        const staticMovement = new StaticMovementBehavior();        // 設置傷害行為 - 使用 StandardDamageBehavior
        const damageBehavior = new StandardDamageBehavior(
            this.damageMultiplier, // 傷害倍率
            1,                     // 單段傷害
            0,                     // 無間隔
            3,                     // 最多攻擊3個目標
            'hybrid'             // 傷害類型
        );
          // 設置搜索過濾器 - 圓形搜索區域
        // 使用 setSearchFilter 而不是 setAttribute('targetFilter', ...)
        // StandardDamageBehavior 將從 getSearchFilter 獲取此過濾器並合併到其默認過濾器中        
         const searchFilter: EntitySearchFilter = {
            entityTypes: [EntityType.MONSTER], // 明確指定搜索怪物
            area: {
                type: SearchAreaShape.CIRCLE,
                radius: this.slashRange
            }
        };
        
        console.log(`[Slash] 設置搜索過濾器:`, JSON.stringify(searchFilter));
        
        // 使用 setSearchFilter 方法，而不是將過濾器設置為投射物的屬性
        // StandardDamageBehavior 將使用 getSearchFilter 讀取這個過濾器
        slashProjectile.setSearchFilter(searchFilter);
          // 設置銷毀條件 - 效果結束後銷毀
        const destroyCondition = new TimeDestructionCondition(this.effectDuration);
        console.log(`[Slash] 設置投射物生命週期: ${this.effectDuration}ms`);

        // 添加行為
        slashProjectile.addBehavior(damageBehavior);
        slashProjectile.setMovementBehavior(staticMovement);
        slashProjectile.setDestructionCondition(destroyCondition);

        // 註冊投射物到管理系統
        if (this.game.registry.has('projectileManager')) {
            const projectileManager = this.game.registry.get('projectileManager');
            projectileManager.addProjectile(slashProjectile);
            console.log(`[Slash] 投射物已註冊到管理系統`);
        } else {
            console.error('[Slash] 無法找到投射物管理器');
        }
        
        console.log(`[Slash] 技能已施放 - 方向: ${direction}°, 範圍半徑: ${this.slashRange}, 傷害倍率: ${this.damageMultiplier}`);
    }
    /**
     * 尋找玩家ID
     * 這裡簡單實現，實際項目中應通過技能系統或玩家管理器獲取
     */
    private findPlayerId(): string | undefined {
        if (this.game.registry.has('playerId')) {
            return this.game.registry.get('playerId');
        }
        return undefined;
    }

    /**
     * 獲取技能等級
     */
    getLevel(): number {
        return this.level;
    }
}
/**
 * 斬擊技能工廠
 * 負責創建不同等級的斬擊技能實現
 */
export const slashFactory: SkillImplementationFactory = {
    /**
     * 創建技能實現實例
     * @param level 技能等級
     * @param game Phaser遊戲實例
     * @returns 對應等級的技能實現
     */
    createImplementation(level: number, game: Phaser.Game): SkillImplementation {
        return new SlashImplementation(level, game);
    }
};