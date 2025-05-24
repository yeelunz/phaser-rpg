import { SkillImplementation, SkillImplementationFactory, SkillEventType } from '../types';
import { SkillProjectile } from '../skillProjectile';
import { StaticMovementBehavior } from '../projectile/projectileMovement';
import { StandardDamageBehavior } from '../projectile/projectileBehaviors';
import { TimeDestructionCondition } from '../projectile/destructionConditions';
import { CollisionBoxType, SkillDamageType, SkillProjectileCategory } from '../types';
import { EntitySearchFilter, SearchAreaShape, EntityType } from '../../combat/entitySearchSystem';
import { SkillEventManager } from '../skillEventManager';

/**
 * 瞬擊技能實現
 * 向前方位移一段距離，對衝刺距離上的所有敵人造成100%傷害
 */
class SuddenStrikeImplementation implements SkillImplementation {
    private level: number;
    private game: Phaser.Game;
    private damageMultiplier: number = 1.0; // 100% 傷害
    private dashDistance: number = 200; // 衝刺距離
    private dashWidth: number = 15; // 衝刺路徑寬度（線條厚度）
    private effectDuration: number = 200; // 效果持續時間 (毫秒)
    private dashSpeed: number = 800; // 衝刺速度 (像素/秒)

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
        const { x, y, direction } = params;        // 計算衝刺終點
        const directionRad = direction * Math.PI / 180; // 轉換為弧度
        const endX = x + Math.cos(directionRad) * this.dashDistance;
        const endY = y + Math.sin(directionRad) * this.dashDistance;
        
        // 計算矩形搜索區域的中心點（起點和終點的中點）
        const centerX = (x + endX) / 2;
        const centerY = (y + endY) / 2;
        
        console.log(`[SuddenStrike] 施放位置: (${x}, ${y}), 方向: ${direction}度`);
        console.log(`[SuddenStrike] 衝刺終點: (${endX}, ${endY}), 搜索中心: (${centerX}, ${centerY})`);

        // 觸發玩家位移動畫（如果有玩家引用的話）
        this.triggerPlayerDash(x, y, endX, endY);

        // 創建技能投射物資料
        // 注意：投射物位置設置在中點是為了讓debug渲染器顯示在正確位置
        // 但矩形搜索範圍會從中心點延伸，覆蓋整個衝刺路徑
        const projectileData = {
            id: `sudden_strike_${Date.now()}`,
            name: '瞬擊',
            animationType: 'sudden_strike',
            category: SkillProjectileCategory.DASH,
            damageType: SkillDamageType.MIXED,
            spriteScale: 1,
            position: { x: centerX, y: centerY }, // 投射物位置在中點，便於debug顯示
            collisionType: CollisionBoxType.CIRCLE, // 保持圓形碰撞框（用於debug渲染）
            radius: this.dashWidth / 2, // 使用衝刺寬度的一半作為顯示半徑
            attributes: {
                skillId: 'sudden_strike',
                skillLevel: this.level,
                direction: direction,
                startPos: { x, y },
                endPos: { x: endX, y: endY },
                searchCenter: { x: centerX, y: centerY }, // 保存搜索中心點
                dashDistance: this.dashDistance,
                dashWidth: this.dashWidth
            }
        };

        // 創建技能投射物實例
        const strikeProjectile = new SkillProjectile(projectileData);
        
        // 獲取玩家實體ID
        const playerId = this.findPlayerId() || 'player';
        strikeProjectile.setSourceEntityId(playerId);
        console.log(`[SuddenStrike] 設置源實體ID: ${playerId}`);

        // 為了向後兼容，同時設置為屬性
        strikeProjectile.setAttribute('sourceEntityId', playerId);

        // 設置靜態行為 - 瞬擊效果不移動，只在計算位置生成效果
        const staticMovement = new StaticMovementBehavior();

        // 設置傷害行為 - 使用 StandardDamageBehavior
        const damageBehavior = new StandardDamageBehavior(
            this.damageMultiplier, // 傷害倍率
            1,                     // 單段傷害
            0,                     // 無間隔
            99,                    // 最多攻擊99個目標（路徑上所有敵人）
            'magical'             // 傷害類型
        );        // 設置搜索過濾器 - 使用矩形搜索區域替代線形搜索，提高穩定性
        // 矩形搜索比線段搜索更穩定可預測
        const searchFilter: EntitySearchFilter = {
            entityTypes: [EntityType.MONSTER],
            area: {
                type: SearchAreaShape.RECTANGLE,
                width: this.dashDistance,  // 矩形長度為衝刺距離
                height: this.dashWidth,    // 矩形寬度為衝刺寬度
                angle: direction // 使用度數，以便與debug renderer一致
            }
        };
        
        console.log(`[SuddenStrike] 設置搜索過濾器 - 矩形範圍長度: ${this.dashDistance}, 寬度: ${this.dashWidth}, 角度: ${direction}°`);
        
        // 使用 setSearchFilter 方法
        strikeProjectile.setSearchFilter(searchFilter);

        // 設置銷毀條件 - 效果結束後銷毀
        const destroyCondition = new TimeDestructionCondition(this.effectDuration);
        console.log(`[SuddenStrike] 設置投射物生命週期: ${this.effectDuration}ms`);

        // 添加行為
        strikeProjectile.addBehavior(damageBehavior);
        strikeProjectile.setMovementBehavior(staticMovement);
        strikeProjectile.setDestructionCondition(destroyCondition);

        // 註冊投射物到管理系統
        if (this.game.registry.has('projectileManager')) {
            const projectileManager = this.game.registry.get('projectileManager');
            projectileManager.addProjectile(strikeProjectile);
            console.log(`[SuddenStrike] 投射物已註冊到管理系統`);
        } else {
            console.error('[SuddenStrike] 無法找到投射物管理器');
        }
        
        console.log(`[SuddenStrike] 技能已施放 - 方向: ${direction}°, 衝刺距離: ${this.dashDistance}, 傷害倍率: ${this.damageMultiplier}`);
    }    /**
     * 觸發玩家衝刺動畫/位移事件
     * @param startX 起始X座標
     * @param startY 起始Y座標
     * @param endX 結束X座標
     * @param endY 結束Y座標
     */
    private triggerPlayerDash(startX: number, startY: number, endX: number, endY: number): void {
        try {
            // 計算衝刺持續時間 (距離 / 速度 * 1000 轉換為毫秒)
            const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            const dashDuration = (distance / this.dashSpeed) * 1000;
            
            console.log(`[SuddenStrike] 發送玩家衝刺事件 - 距離: ${distance.toFixed(1)}px, 持續時間: ${dashDuration.toFixed(1)}ms`);
            
            // 獲取玩家實體ID
            const playerId = this.findPlayerId() || 'player';
            
            // 通過事件系統觸發玩家衝刺
            const eventManager = SkillEventManager.getInstance();
            eventManager.dispatchEvent({
                type: SkillEventType.PLAYER_DASH,
                skillId: 'sudden_strike',
                skillLevel: this.level,
                casterId: playerId,
                timestamp: Date.now(),
                position: { x: startX, y: startY },
                direction: undefined, // 方向由 data 中的 endPosition 計算
                data: {
                    startPosition: { x: startX, y: startY },
                    endPosition: { x: endX, y: endY },
                    duration: dashDuration,
                    distance: distance,
                    dashSpeed: this.dashSpeed,
                    easing: 'Power2.easeOut'
                }
            });
            
            console.log(`[SuddenStrike] 已發送玩家衝刺事件到事件管理器`);
            
        } catch (error) {
            console.warn('[SuddenStrike] 觸發玩家位移事件時發生錯誤:', error);
        }
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
 * 瞬擊技能工廠
 * 負責創建不同等級的瞬擊技能實現
 */
export const sudden_strikeFactory: SkillImplementationFactory = {
    /**
     * 創建技能實現實例
     * @param level 技能等級
     * @param game Phaser遊戲實例
     * @returns 對應等級的技能實現
     */
    createImplementation(level: number, game: Phaser.Game): SkillImplementation {
        return new SuddenStrikeImplementation(level, game);
    }
};
