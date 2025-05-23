import { SkillEvent, SkillEventType } from '../types';
import { PassiveSkillTriggerCondition } from './passiveSkill';

/**
 * 傷害觸發條件
 * 在造成傷害時觸發
 */
export class DamageDealtCondition implements PassiveSkillTriggerCondition {
    private minDamage?: number;
    private maxDamage?: number;
    private chancePct: number;
    
    constructor(chancePct: number = 100, minDamage?: number, maxDamage?: number) {
        this.chancePct = chancePct;
        this.minDamage = minDamage;
        this.maxDamage = maxDamage;
    }
    
    checkTrigger(event: SkillEvent): boolean {
        if (event.type !== SkillEventType.DAMAGE_DEALT) {
            return false;
        }
        
        // 檢查傷害值是否在範圍內
        if (event.data && typeof event.data.damage === 'number') {
            const damage = event.data.damage;
            
            if (this.minDamage !== undefined && damage < this.minDamage) {
                return false;
            }
            
            if (this.maxDamage !== undefined && damage > this.maxDamage) {
                return false;
            }
        }
        
        // 檢查機率
        if (this.chancePct < 100) {
            return Math.random() * 100 < this.chancePct;
        }
        
        return true;
    }
}

/**
 * 技能命中敵人觸發條件
 */
export class SkillHitEnemyCondition implements PassiveSkillTriggerCondition {
    private targetSkillIds: string[] = [];
    private chancePct: number;
    
    constructor(chancePct: number = 100, ...targetSkillIds: string[]) {
        this.chancePct = chancePct;
        this.targetSkillIds = targetSkillIds;
    }
    
    checkTrigger(event: SkillEvent): boolean {
        if (event.type !== SkillEventType.SKILL_HIT_ENEMY) {
            return false;
        }
        
        // 如果指定了特定技能，則檢查是否匹配
        if (this.targetSkillIds.length > 0 && !this.targetSkillIds.includes(event.skillId)) {
            return false;
        }
        
        // 檢查機率
        if (this.chancePct < 100) {
            return Math.random() * 100 < this.chancePct;
        }
        
        return true;
    }
}

/**
 * 暴擊觸發條件
 */
export class CriticalHitCondition implements PassiveSkillTriggerCondition {
    private chancePct: number;
    
    constructor(chancePct: number = 100) {
        this.chancePct = chancePct;
    }
    
    checkTrigger(event: SkillEvent): boolean {
        if (event.type !== SkillEventType.CRITICAL_HIT) {
            return false;
        }
        
        // 檢查機率
        if (this.chancePct < 100) {
            return Math.random() * 100 < this.chancePct;
        }
        
        return true;
    }
}

/**
 * 擊殺敵人觸發條件
 */
export class KillEnemyCondition implements PassiveSkillTriggerCondition {
    private enemyTypes: string[] = [];
    private chancePct: number;
    
    constructor(chancePct: number = 100, ...enemyTypes: string[]) {
        this.chancePct = chancePct;
        this.enemyTypes = enemyTypes;
    }
    
    checkTrigger(event: SkillEvent): boolean {
        if (event.type !== SkillEventType.PLAYER_KILL) {
            return false;
        }
        
        // 如果指定了特定敵人類型，則檢查是否匹配
        if (this.enemyTypes.length > 0 && event.data && event.data.enemyType) {
            if (!this.enemyTypes.includes(event.data.enemyType)) {
                return false;
            }
        }
        
        // 檢查機率
        if (this.chancePct < 100) {
            return Math.random() * 100 < this.chancePct;
        }
        
        return true;
    }
}

/**
 * 狀態變化觸發條件
 * 在玩家狀態變化時觸發，如獲得增益或減益效果
 */
export class StatusChangeCondition implements PassiveSkillTriggerCondition {
    private statusTypes: string[] = [];
    private isNegative?: boolean;
    
    constructor(isNegative?: boolean, ...statusTypes: string[]) {
        this.isNegative = isNegative;
        this.statusTypes = statusTypes;
    }
    
    checkTrigger(event: SkillEvent): boolean {
        if (event.type !== SkillEventType.PLAYER_STATUS_CHANGE) {
            return false;
        }
        
        // 檢查狀態類型
        if (this.statusTypes.length > 0 && event.data && event.data.statusType) {
            if (!this.statusTypes.includes(event.data.statusType)) {
                return false;
            }
        }
        
        // 檢查是否為負面狀態
        if (this.isNegative !== undefined && event.data) {
            if (this.isNegative !== !!event.data.isNegative) {
                return false;
            }
        }
        
        return true;
    }
}

/**
 * 血量條件
 * 在玩家血量低於或高於特定值時觸發
 */
export class HealthCondition implements PassiveSkillTriggerCondition {
    private thresholdPct: number;
    private isBelow: boolean;
    private eventTypesToCheck: SkillEventType[];
    
    constructor(thresholdPct: number, isBelow: boolean = true, ...eventTypesToCheck: SkillEventType[]) {
        this.thresholdPct = thresholdPct;
        this.isBelow = isBelow;
        this.eventTypesToCheck = eventTypesToCheck.length > 0 
            ? eventTypesToCheck 
            : [SkillEventType.DAMAGE_RECEIVED];
    }
    
    checkTrigger(event: SkillEvent): boolean {
        if (!this.eventTypesToCheck.includes(event.type)) {
            return false;
        }
        
        // 檢查玩家血量
        if (event.data && typeof event.data.currentHealthPct === 'number') {
            const healthPct = event.data.currentHealthPct;
            
            if (this.isBelow) {
                return healthPct < this.thresholdPct;
            } else {
                return healthPct > this.thresholdPct;
            }
        }
        
        return false;
    }
}

/**
 * 複合條件
 * 同時滿足多個條件
 */
export class AndCondition implements PassiveSkillTriggerCondition {
    private conditions: PassiveSkillTriggerCondition[];
    
    constructor(...conditions: PassiveSkillTriggerCondition[]) {
        this.conditions = conditions;
    }
    
    checkTrigger(event: SkillEvent): boolean {
        // 所有條件都必須滿足
        for (const condition of this.conditions) {
            if (!condition.checkTrigger(event)) {
                return false;
            }
        }
        return true;
    }
}

/**
 * 或條件
 * 滿足任一條件即可
 */
export class OrCondition implements PassiveSkillTriggerCondition {
    private conditions: PassiveSkillTriggerCondition[];
    
    constructor(...conditions: PassiveSkillTriggerCondition[]) {
        this.conditions = conditions;
    }
    
    checkTrigger(event: SkillEvent): boolean {
        // 任一條件滿足即可
        for (const condition of this.conditions) {
            if (condition.checkTrigger(event)) {
                return true;
            }
        }
        return false;
    }
}
