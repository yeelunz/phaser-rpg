import { EntityManager } from './entityManager';
import { DamageSystem, AttackDefinition, DamageType, DamageResult } from './damageSystem';
import { SkillEventType, SkillEvent } from '../skills/types';
import { SkillEventManager } from '../skills/skillEventManager';

/**
 * 戰鬥事件處理器
 * 負責監聽和處理與戰鬥相關的事件，特別是傷害事件
 */
export class CombatEventHandler {
    private entityManager: EntityManager;
    private skillEventManager: SkillEventManager;
    private damageSystem: DamageSystem;
    private scene: Phaser.Scene | null = null;

    constructor() {
        this.entityManager = EntityManager.getInstance();
        this.skillEventManager = SkillEventManager.getInstance();
        this.damageSystem = new DamageSystem(); // 假設這是可實例化的，否則使用靜態方法
    }

    /**
     * 初始化戰鬥事件處理器
     * @param scene Phaser遊戲場景
     */
    public initialize(scene: Phaser.Scene): void {
        this.scene = scene;
        
        // 監聽傷害事件
        this.skillEventManager.addEventListener(
            SkillEventType.DAMAGE_DEALT,
            this.handleDamageEvent.bind(this)
        );
        
        console.log('CombatEventHandler初始化完成，開始監聽戰鬥事件');
    }    /**
     * 處理傷害事件
     * @param event 技能事件
     */    private handleDamageEvent(event: SkillEvent): void {
        if (!event.data) {
            console.warn('無效的傷害事件: 缺少數據');
            return;
        }

        // 從事件中獲取攻擊者和防禦者
        const attackerId = event.casterId;
        const defenderId = event.data.targetId;

        if (!attackerId || !defenderId) {
            console.warn('無法處理傷害: 缺少攻擊者或防禦者ID');
            return;
        }

        console.log(`處理傷害事件: 攻擊者=${attackerId}, 防禦者=${defenderId}`);

        // 嘗試通過不同方式獲取實體
        let attacker = this.entityManager.getEntityById(attackerId);
        let defender = this.entityManager.getEntityById(defenderId);
        
        // 如果找不到攻擊者，嘗試獲取所有怪物並查看它們的實例ID
        if (!attacker) {
            console.log(`嘗試查找替代攻擊者: ${attackerId}`);
            // 獲取所有實體
            const allEntities = this.entityManager.getAllEntities();
            
            // 嘗試通過實例ID或包含關係查找
            for (const entity of allEntities) {
                if (entity.getInstanceId && typeof entity.getInstanceId === 'function') {
                    const instanceId = entity.getInstanceId();
                    if (instanceId && (instanceId === attackerId || instanceId.includes(attackerId))) {
                        console.log(`找到替代攻擊者: ${instanceId}`);
                        attacker = entity;
                        break;
                    }
                }
            }
        }
        
        // 如果找不到防禦者，且防禦者ID為'player'，則嘗試直接獲取玩家
        if (!defender && defenderId === 'player') {
            console.log('嘗試直接獲取玩家實體');
            defender = this.entityManager.getPlayer();
        }

        if (!attacker || !defender) {
            console.warn(`無法找到攻擊者或防禦者: ${attackerId}, ${defenderId}`);
            console.log('當前註冊的實體:', this.entityManager.getAllEntities().map(e => e.getId ? e.getId() : 'unknown').join(', '));
            return;
        }

        // 獲取攻擊者和防禦者的能力值統計
        const attackerStats = this.getEntityStats(attacker);
        const defenderStats = this.getEntityStats(defender);

        if (!attackerStats || !defenderStats) {
            console.warn('無法獲取攻擊者或防禦者的屬性統計');
            return;
        }

        // 構建攻擊定義
        const attackDefinition = this.createAttackDefinition(event);
        
        // 計算傷害
        const damageResult = DamageSystem.calculateDamage(
            attackerStats,
            defenderStats,
            attackDefinition
        );

        // 處理多段傷害
        const hitIndex = event.data.hitIndex || 0;
        const totalHits = event.data.totalHits || 1;
        
        // 記錄段數信息
        if (totalHits > 1) {
            console.log(`處理第 ${hitIndex + 1}/${totalHits} 段傷害`);
            // 可以在這裡修改傷害效果，如基於段數的特殊效果
        }
          // 應用傷害
        const killed = DamageSystem.applyDamage(defenderStats, damageResult);
        
        // 顯示傷害效果 - 傳遞傷害類型
        const damageType = this.convertDamageType(event.data.damageType || 'physical');
        this.showDamageEffect(defender, damageResult, damageType);
        
        // 傳播後續事件
        this.emitDamageResultEvent(event, attacker, defender, damageResult, killed);
        
        // 處理擊殺
        if (killed) {
            this.handleEntityKilled(attacker, defender);
        }
    }

    /**
     * 根據事件創建攻擊定義
     */
    private createAttackDefinition(event: SkillEvent): AttackDefinition {
        // 從事件中獲取相關數據
        const damageMultiplier = event.data.damageMultiplier || 1.0;
        const damageType = this.convertDamageType(event.data.damageType);
        
        // 創建攻擊定義
        const attackDefinition: AttackDefinition = {
            damageType: damageType,
            damageMultiplier: damageMultiplier,
            skillName: event.skillId // 使用技能ID作為技能名稱
        };
        
        // 添加其他可能的攻擊特性
        if (event.data.additionalEffects) {
            attackDefinition.additionalEffects = event.data.additionalEffects;
        }
        
        return attackDefinition;
    }

    /**
     * 將技能傷害類型轉換為戰鬥系統的傷害類型
     */
    private convertDamageType(skillDamageType: string): DamageType {
        switch (skillDamageType) {
            case 'physical':
                return DamageType.PHYSICAL;
            case 'magical':
                return DamageType.MAGICAL;
            case 'hybrid':
                return DamageType.MIXED;
            default:
                console.warn(`未知的技能傷害類型: ${skillDamageType}，使用物理傷害作為默認值`);
                return DamageType.PHYSICAL;
        }
    }

    /**
     * 獲取實體的能力值統計
     */
    private getEntityStats(entity: any): any {
        // 檢查不同可能的獲取統計方法
        if (entity.getStats && typeof entity.getStats === 'function') {
            return entity.getStats();
        }
        
        if (entity.stats) {
            return entity.stats;
        }
        
        console.warn(`無法獲取實體的能力值統計: ${entity.id || entity.name || '未知實體'}`);
        return null;
    }    /**
     * 顯示傷害效果
     * 會根據傷害類型和是否暴擊設置不同顏色的浮動傷害數字
     * - 魔法傷害為藍字，魔法傷害爆擊時為紫色
     * - 物理傷害為黃橘字，物理傷害爆擊時為紅色
     * @param defender 被攻擊的實體
     * @param damageResult 傷害結果
     * @param damageType 傷害類型 (可選)
     */    private showDamageEffect(defender: any, damageResult: DamageResult, damageType: DamageType = DamageType.PHYSICAL): void {
        if (!this.scene) return;
        
        // 確定顯示位置
        const x = defender.x || (defender.position ? defender.position.x : 0);
        const y = defender.y || (defender.position ? defender.position.y : 0);

        // 基礎文字樣式
        const getStyle = (isPhysical: boolean, isCritical: boolean) => ({
            fontSize: `${isCritical ? 24 : 20}px`,
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            color: isPhysical ? 
                (isCritical ? '#FF0000' : '#FFAA00') :  // 物理：紅色(暴擊) 黃橘色(普通)
                (isCritical ? '#CC33FF' : '#3399FF'),   // 魔法：紫色(暴擊) 藍色(普通)
            stroke: '#000000',
            strokeThickness: isCritical ? 3 : 2,
            align: 'center' as const
        });

        const createDamageText = (damageValue: number, offsetX: number, isPhysical: boolean) => {
            if (damageValue <= 0) return;

            const style = getStyle(isPhysical, damageResult.isCritical || false);
            const damageText = (damageResult.isCritical ? `${Math.round(damageValue)}!` : Math.round(damageValue).toString());
            const text = this.scene!.add.text(x + offsetX, y - 20, damageText, style);
            text.setOrigin(0.5);
            text.setDepth(999);

            if (damageResult.isCritical) {
                this.scene!.tweens.add({
                    targets: text,
                    scaleX: 1.5,
                    scaleY: 1.5,
                    duration: 200,
                    ease: 'Bounce.easeOut',
                    yoyo: true
                });
            }

            // 文字上浮並淡出的動畫
            this.scene!.tweens.add({
                targets: text,
                y: y - 60,
                alpha: 0,
                scale: damageResult.isCritical ? 1.2 : 1.1,
                duration: 1200,
                ease: 'Power1',
                onComplete: () => {
                    text.destroy();
                }
            });
        };

        if (damageResult.isMiss) {
            // 顯示MISS
            const text = this.scene.add.text(x, y - 20, 'MISS', {
                ...getStyle(true, false),
                color: '#FFFFFF'
            });
            text.setOrigin(0.5);
            text.setDepth(999);

            this.scene.tweens.add({
                targets: text,
                y: y - 60,
                alpha: 0,
                duration: 1200,
                ease: 'Power1',
                onComplete: () => {
                    text.destroy();
                }
            });
        } else if (damageType === DamageType.MIXED) {
            // 混合傷害：分別顯示物理和魔法傷害
            if (damageResult.physicalDamage > 0) {
                createDamageText(damageResult.physicalDamage, -20, true);
            }
            if (damageResult.magicalDamage > 0) {
                createDamageText(damageResult.magicalDamage, 20, false);
            }
        } else {
            // 單一類型傷害
            createDamageText(damageResult.totalDamage, 0, damageType !== DamageType.MAGICAL);
        }
    }
    
    /**
     * 發送傷害結果事件
     */    private emitDamageResultEvent(
        originalEvent: SkillEvent, 
        _attacker: any, // 使用下劃線前綴表示此參數可能未使用
        defender: any, 
        damageResult: DamageResult,
        killed: boolean
    ): void {
        // 發送受到傷害事件
        this.skillEventManager.dispatchEvent({
            type: SkillEventType.DAMAGE_RECEIVED,
            skillId: originalEvent.skillId,
            skillLevel: originalEvent.skillLevel,
            casterId: originalEvent.casterId,
            timestamp: Date.now(),
            data: {
                targetId: defender.getId ? defender.getId() : defender.id,
                damage: damageResult.totalDamage,
                isCritical: damageResult.isCritical,
                isMiss: damageResult.isMiss,
                killed: killed
            }
        });
        
        // 如果是暴擊，發送暴擊事件
        if (damageResult.isCritical) {
            this.skillEventManager.dispatchEvent({
                type: SkillEventType.CRITICAL_HIT,
                skillId: originalEvent.skillId,
                skillLevel: originalEvent.skillLevel,
                casterId: originalEvent.casterId,
                timestamp: Date.now(),
                data: {
                    targetId: defender.getId ? defender.getId() : defender.id,
                    damage: damageResult.totalDamage
                }
            });
        }
    }
    
    /**
     * 處理實體被擊殺
     */
    private handleEntityKilled(attacker: any, defender: any): void {
        // 發送擊殺事件
        this.skillEventManager.dispatchEvent({
            type: SkillEventType.PLAYER_KILL,
            skillId: 'unknown',
            skillLevel: 1,
            casterId: attacker.getId ? attacker.getId() : attacker.id,
            timestamp: Date.now(),
            data: {
                targetId: defender.getId ? defender.getId() : defender.id
            }
        });
        
        // 調用被擊殺實體的死亡方法（如果存在）
        if (defender.die && typeof defender.die === 'function') {
            defender.die();
        }
        
        console.log(`實體 ${defender.getId ? defender.getId() : defender.id} 被擊殺!`);
    }
    
    /**
     * 清理事件監聽器
     */
    public destroy(): void {
        this.skillEventManager.removeEventListener(
            SkillEventType.DAMAGE_DEALT,
            this.handleDamageEvent
        );
        
        console.log('CombatEventHandler已清理');
    }
}
