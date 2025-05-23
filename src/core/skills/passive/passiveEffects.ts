import { SkillEvent } from '../types';
import { PassiveSkillEffect } from './passiveSkill';
import { SkillProjectileData, SkillEventType, SkillDamageType, SkillProjectileCategory, CollisionBoxType, SkillFadeType } from '../types';
import { SkillProjectile } from '../skillProjectile';
import { SkillEventManager } from '../skillEventManager';

/**
 * 創建投射物效果
 * 被動技能觸發時創建一個投射物
 */
export class CreateProjectileEffect implements PassiveSkillEffect {
    private projectileData: SkillProjectileData;
    private eventManager: SkillEventManager;
    
    constructor(projectileData: SkillProjectileData) {
        this.projectileData = projectileData;
        this.eventManager = SkillEventManager.getInstance();
    }
    
    applyEffect(event: SkillEvent): void {
        // 創建投射物
        // 這裡需要獲取玩家位置或事件位置
        const position = event.position || { x: 0, y: 0 };
        const direction = event.direction || 0;
        
        // 使用玩家的ID作為傷害來源
        const sourceId = event.casterId;
        
        // 創建投射物數據
        const data: SkillProjectileData = {
            ...this.projectileData,
            id: `${this.projectileData.id}_${Date.now()}`,
            sourceEntityId: sourceId,
            attributes: {
                ...this.projectileData.attributes,
                isPassiveProjectile: true,
                parentSkillId: event.skillId,
                parentSkillLevel: event.skillLevel,
                triggeringEventType: event.type
            }
        };
        
        // 創建投射物實例
        const projectile = new SkillProjectile(data);
        
        // 發送投射物創建事件
        this.eventManager.dispatchEvent({
            type: SkillEventType.CAST_EFFECT,
            skillId: event.skillId,
            skillLevel: event.skillLevel,
            casterId: event.casterId,
            timestamp: Date.now(),
            position,
            direction,
            data: {
                isPassive: true,
                projectileId: projectile.getId(),
                projectileData: data
            }
        });
        
        console.log(`被動技能 ${event.skillId} 創建投射物: ${projectile.getId()}`);
    }
    
    setProjectileData(data: Partial<SkillProjectileData>): void {
        this.projectileData = { ...this.projectileData, ...data };
    }
}

/**
 * 傷害增強效果
 * 增加造成的傷害
 */
export class DamageBoostEffect implements PassiveSkillEffect {
    private boostPercentage: number;
    
    constructor(boostPercentage: number) {
        this.boostPercentage = boostPercentage;
    }
    
    applyEffect(event: SkillEvent): void {
        if (event.type === SkillEventType.DAMAGE_DEALT && event.data) {
            // 獲取原始傷害
            const originalDamage = event.data.damage || 0;
            
            // 計算增強後的傷害
            const boostedDamage = originalDamage * (1 + this.boostPercentage / 100);
            
            // 更新事件中的傷害值
            event.data.damage = boostedDamage;
            event.data.damageBoost = {
                original: originalDamage,
                boosted: boostedDamage,
                boostPercentage: this.boostPercentage
            };
            
            console.log(`被動技能增強傷害: ${originalDamage} -> ${boostedDamage} (增加 ${this.boostPercentage}%)`);
        }
    }
    
    setBoostPercentage(percentage: number): void {
        this.boostPercentage = percentage;
    }
}

/**
 * 冷卻時間縮減效果
 * 縮短技能冷卻時間
 */
export class CooldownReductionEffect implements PassiveSkillEffect {
    private reductionPercentage: number;
    private targetSkillIds: string[] = [];
    
    constructor(reductionPercentage: number, ...targetSkillIds: string[]) {
        this.reductionPercentage = reductionPercentage;
        this.targetSkillIds = targetSkillIds;
    }
    
    applyEffect(event: SkillEvent): void {
        // 這裡需要獲取玩家的技能管理器，假設我們有一個全局技能管理器
        // 或者在事件數據中提供了技能管理器
        if (event.data && event.data.skillManager) {
            const skillManager = event.data.skillManager;
            
            // 決定要處理的技能
            const skillIds = this.targetSkillIds.length > 0 
                ? this.targetSkillIds 
                : [event.skillId]; // 默認使用觸發事件的技能
            
            for (const skillId of skillIds) {
                const skill = skillManager.getSkill(skillId);
                if (skill && skill.isOnCooldown()) {
                    // 獲取當前冷卻時間
                    const currentCooldown = skill.getCooldownRemaining();
                    
                    // 計算縮減後的冷卻時間
                    const reducedCooldown = currentCooldown * (1 - this.reductionPercentage / 100);
                    
                    // 更新技能冷卻時間
                    skill.reduceCooldown(currentCooldown - reducedCooldown);
                    
                    console.log(`被動技能縮減 ${skillId} 冷卻時間: ${currentCooldown.toFixed(1)}s -> ${reducedCooldown.toFixed(1)}s (減少 ${this.reductionPercentage}%)`);
                }
            }
        }
    }
    
    setReductionPercentage(percentage: number): void {
        this.reductionPercentage = percentage;
    }
    
    setTargetSkillIds(skillIds: string[]): void {
        this.targetSkillIds = skillIds;
    }
}

/**
 * 資源恢復效果
 * 恢復血量或能量
 */
export class ResourceRecoveryEffect implements PassiveSkillEffect {
    private resourceType: 'health' | 'energy';
    private amount: number;
    private isPct: boolean;
    
    constructor(resourceType: 'health' | 'energy', amount: number, isPct: boolean = false) {
        this.resourceType = resourceType;
        this.amount = amount;
        this.isPct = isPct;
    }
    
    applyEffect(event: SkillEvent): void {
        // 需要獲取玩家的資源管理器，假設在事件數據中提供
        if (event.data && event.data.player) {
            const player = event.data.player;
            
            if (this.resourceType === 'health') {
                // 處理血量恢復
                if (player.getStats) {
                    const stats = player.getStats();
                    const maxHP = stats.getMaxHP();
                    const currentHP = stats.getCurrentHP();
                    
                    // 計算恢復量
                    let healAmount = this.isPct ? maxHP * (this.amount / 100) : this.amount;
                    
                    // 恢復血量
                    stats.setCurrentHP(Math.min(currentHP + healAmount, maxHP));
                    
                    console.log(`被動技能恢復血量: ${healAmount.toFixed(1)} (${currentHP} -> ${stats.getCurrentHP()})`);
                }
            } else if (this.resourceType === 'energy') {
                // 處理能量恢復
                if (player.getStats) {
                    const stats = player.getStats();
                    const maxEnergy = stats.getMaxEnergy();
                    const currentEnergy = stats.getCurrentEnergy();
                    
                    // 計算恢復量
                    let energyAmount = this.isPct ? maxEnergy * (this.amount / 100) : this.amount;
                    
                    // 恢復能量
                    stats.setCurrentEnergy(Math.min(currentEnergy + energyAmount, maxEnergy));
                    
                    console.log(`被動技能恢復能量: ${energyAmount.toFixed(1)} (${currentEnergy} -> ${stats.getCurrentEnergy()})`);
                }
            }
        }
    }
    
    setAmount(amount: number, isPct: boolean = false): void {
        this.amount = amount;
        this.isPct = isPct;
    }
}

/**
 * 複合效果
 * 同時應用多個效果
 */
export class CompositeEffect implements PassiveSkillEffect {
    private effects: PassiveSkillEffect[];
    
    constructor(...effects: PassiveSkillEffect[]) {
        this.effects = effects;
    }
    
    applyEffect(event: SkillEvent): void {
        // 應用所有效果
        for (const effect of this.effects) {
            effect.applyEffect(event);
        }
    }
    
    addEffect(effect: PassiveSkillEffect): void {
        this.effects.push(effect);
    }
    
    removeEffect(effect: PassiveSkillEffect): boolean {
        const index = this.effects.indexOf(effect);
        if (index >= 0) {
            this.effects.splice(index, 1);
            return true;
        }
        return false;
    }
}
