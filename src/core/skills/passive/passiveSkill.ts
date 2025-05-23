import { SkillImplementation } from '../types';
import { SkillEventManager } from '../skillEventManager';
import { SkillEvent, SkillEventType } from '../types';

/**
 * 被動技能觸發條件介面
 */
export interface PassiveSkillTriggerCondition {
    /**
     * 檢查是否滿足觸發條件
     */
    checkTrigger(event: SkillEvent): boolean;
}

/**
 * 被動技能效果介面
 */
export interface PassiveSkillEffect {
    /**
     * 應用被動技能效果
     */
    applyEffect(event: SkillEvent): void;
}

/**
 * 被動技能實現
 * 基於事件系統實現被動技能
 */
export class PassiveSkill implements SkillImplementation {
    private triggerConditions: PassiveSkillTriggerCondition[] = [];
    private effects: PassiveSkillEffect[] = [];
    private level: number;
    private eventManager: SkillEventManager;
    private skillId: string;
    
    constructor(skillId: string, level: number) {
        this.skillId = skillId;
        this.level = level;
        this.eventManager = SkillEventManager.getInstance();
        this.setupEventListeners();
    }
    
    /**
     * 設置事件監聽器
     * 監聽所有可能觸發被動技能的事件
     */
    private setupEventListeners(): void {
        // 註冊所有可能觸發被動的事件
        const eventTypes = [
            SkillEventType.DAMAGE_DEALT,
            SkillEventType.DAMAGE_RECEIVED,
            SkillEventType.SKILL_HIT_ENEMY,
            SkillEventType.CRITICAL_HIT,
            SkillEventType.PLAYER_ATTACK,
            SkillEventType.PLAYER_KILL,
            SkillEventType.PLAYER_DODGE,
            SkillEventType.PLAYER_BLOCK,
            SkillEventType.PLAYER_STATUS_CHANGE
        ];
        
        for (const eventType of eventTypes) {
            this.eventManager.addEventListener(eventType, (event) => {
                this.checkAndTrigger(event);
            });
        }
    }
    
    /**
     * 檢查並觸發被動技能
     */
    private checkAndTrigger(event: SkillEvent): void {
        // 檢查所有觸發條件
        for (const condition of this.triggerConditions) {
            if (condition.checkTrigger(event)) {
                // 符合條件，應用所有效果
                for (const effect of this.effects) {
                    effect.applyEffect(event);
                }
                
                // 發送被動技能觸發的事件
                this.eventManager.dispatchEvent({
                    type: SkillEventType.CAST_EFFECT,
                    skillId: this.skillId,
                    skillLevel: this.level,
                    casterId: event.casterId,
                    timestamp: Date.now(),
                    data: {
                        isPassive: true,
                        triggeringEventType: event.type,
                        triggeringEventData: event.data
                    }
                });
                
                break; // 觸發一次即可
            }
        }
    }
    
    /**
     * 實現SkillImplementation介面的execute方法
     * 被動技能不需要主動執行
     */
    execute(params: { x: number, y: number, direction: number }): void {
        // 被動技能不需要主動執行，但可以在這裡添加額外邏輯
        console.log(`被動技能 ${this.skillId} 嘗試主動執行，但這不是必要的`);
    }
    
    /**
     * 獲取技能等級
     */
    getLevel(): number {
        return this.level;
    }
    
    /**
     * 新增觸發條件
     */
    addTriggerCondition(condition: PassiveSkillTriggerCondition): void {
        this.triggerConditions.push(condition);
    }
    
    /**
     * 新增效果
     */
    addEffect(effect: PassiveSkillEffect): void {
        this.effects.push(effect);
    }
    
    /**
     * 清除特定類型的觸發條件
     */
    clearTriggerConditions(): void {
        this.triggerConditions = [];
    }
    
    /**
     * 清除特定類型的效果
     */
    clearEffects(): void {
        this.effects = [];
    }
}
