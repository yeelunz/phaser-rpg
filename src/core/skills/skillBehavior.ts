import { SkillEventManager } from './skillEventManager';
import { SkillEvent, SkillEventType } from './types';

/**
 * 計算實際前後搖時間
 * @param baseTime 基礎時間
 * @param attackSpeed 攻擊速度
 * @returns 實際時間
 */
function calculateActualCastTime(baseTime: number, attackSpeed: number): number {
    // 確保攻擊速度至少為0.1以避免除以0或負數的情況
    const safeAttackSpeed = Math.max(0.1, attackSpeed);
    return baseTime / safeAttackSpeed;
}

/**
 * 技能參數介面
 */
export interface SkillParams {
    skillId: string;
    skillLevel: number;
    casterId: string;
    x: number;
    y: number;
    direction: number;
    casterStats?: {
        attackSpeed: number;
        [key: string]: any;
    };
}

/**
 * 技能行為介面
 * 定義不同技能類型的行為模式
 */
export interface SkillBehavior {
    onSkillStart(params: SkillParams): void;        // 技能開始
    onSkillHold(params: SkillParams): void;         // 技能持續按住 (適用於按壓型和蓄能型)
    onSkillEnd(params: SkillParams): void;          // 技能結束 (適用於按壓型、狀態型和蓄能型)
    
    canInterruptOtherSkills(): boolean;             // 是否可以打斷其他技能
    canMoveWhileCasting(): boolean;                 // 施放期間是否可以移動
    canUseOtherSkillsWhileCasting(): boolean;       // 施放期間是否可以使用其他技能
}

/**
 * 單擊型技能行為基礎實現
 * 適用於單次點擊即釋放的技能
 */
export class ClickSkillBehavior implements SkillBehavior {
    protected eventManager: SkillEventManager;
    protected castTime: number;       // 前搖時間
    protected recoveryTime: number;   // 後搖時間
    
    constructor(castTime: number = 0.3, recoveryTime: number = 0.5) {
        this.eventManager = SkillEventManager.getInstance();
        this.castTime = castTime;
        this.recoveryTime = recoveryTime;
    }
    
    onSkillStart(params: SkillParams): void {
        // 從施法者狀態獲取攻擊速度，如果沒有提供則使用1
        const attackSpeed = params.casterStats?.attackSpeed || 1;
        
        // 計算實際的前搖和後搖時間
        const actualCastTime = calculateActualCastTime(this.castTime, attackSpeed);
        const actualRecoveryTime = calculateActualCastTime(this.recoveryTime, attackSpeed);

        console.log(`[ClickSkillBehavior] 技能 ${params.skillId} 開始施放，攻擊速度: ${attackSpeed}, 實際前搖: ${actualCastTime}秒, 實際後搖: ${actualRecoveryTime}秒`);
        
        // 發送技能開始事件（前搖開始，角色無法移動）
        this.eventManager.emitCastStart(
            params.skillId,
            params.skillLevel,
            params.casterId,
            { x: params.x, y: params.y },
            params.direction
        );
        
        // 在實際前搖結束後發送效果事件
        setTimeout(() => {
            this.eventManager.emitCastEffect(
                params.skillId,
                params.skillLevel,
                params.casterId,
                { x: params.x, y: params.y },
                params.direction,
                { recoveryTime: actualRecoveryTime }
            );
            
            // 在實際後搖結束後發送完成事件
            setTimeout(() => {
                this.eventManager.emitCastComplete(
                    params.skillId,
                    params.skillLevel,
                    params.casterId
                );
            }, actualRecoveryTime * 1000);
        }, actualCastTime * 1000);
    }
    
    onSkillHold(_params: SkillParams): void {
        // 不需要實現，這是給持續型技能使用的
    }
    
    onSkillEnd(_params: SkillParams): void {
        // 不需要實現，這是給持續型技能使用的
    }
    
    canInterruptOtherSkills(): boolean {
        return true;
    }
    
    canMoveWhileCasting(): boolean {
        return false;
    }
    
    canUseOtherSkillsWhileCasting(): boolean {
        return false;
    }
}

/**
 * 按壓型技能行為
 * 適用於持續按住按鍵釋放的技能，可定期產生效果
 */
export class HoldSkillBehavior implements SkillBehavior {
    protected eventManager: SkillEventManager;
    protected castTime: number;       // 前搖時間
    protected recoveryTime: number;   // 後搖時間
    protected intervalTime: number;   // 效果觸發間隔
    private intervalId: number | null = null;
    
    constructor(castTime: number = 0.2, recoveryTime: number = 0.3, intervalTime: number = 0.5) {
        this.eventManager = SkillEventManager.getInstance();
        this.castTime = castTime;
        this.recoveryTime = recoveryTime;
        this.intervalTime = intervalTime;
    }
    
    onSkillStart(params: SkillParams): void {
        // 從施法者狀態獲取攻擊速度
        const attackSpeed = params.casterStats?.attackSpeed || 1;
        
        // 計算實際的前搖和後搖時間
        const actualCastTime = calculateActualCastTime(this.castTime, attackSpeed);
        
        // 發送技能開始事件
        this.eventManager.emitCastStart(
            params.skillId,
            params.skillLevel,
            params.casterId,
            { x: params.x, y: params.y },
            params.direction
        );
        
        // 在前搖結束後開始定期觸發
        setTimeout(() => {
            // 初次觸發效果
            this.triggerEffect(params);
            
            // 設置定時器，定期觸發效果
            this.intervalId = window.setInterval(() => {
                this.triggerEffect(params);
            }, this.intervalTime * 1000);
            
        }, actualCastTime * 1000);
    }
    
    onSkillHold(_params: SkillParams): void {
        // 按壓型技能在持續按住時自動由定時器觸發效果
    }
    
    onSkillEnd(params: SkillParams): void {
        // 清除定時器
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        const attackSpeed = params.casterStats?.attackSpeed || 1;
        const actualRecoveryTime = calculateActualCastTime(this.recoveryTime, attackSpeed);
        
        // 在後搖結束後發送完成事件
        setTimeout(() => {
            this.eventManager.emitCastComplete(
                params.skillId,
                params.skillLevel,
                params.casterId
            );
        }, actualRecoveryTime * 1000);
    }

    protected triggerEffect(params: SkillParams): void {
        // 發送技能效果事件
        this.eventManager.emitCastEffect(
            params.skillId,
            params.skillLevel,
            params.casterId,
            { x: params.x, y: params.y },
            params.direction
        );
    }
    
    canInterruptOtherSkills(): boolean {
        return true;
    }
    
    canMoveWhileCasting(): boolean {
        return false;
    }
    
    canUseOtherSkillsWhileCasting(): boolean {
        return false;
    }
}

/**
 * 狀態型技能行為
 * 適用於開關式技能，第一次點擊開啟，再次點擊關閉
 */
export class ToggleSkillBehavior implements SkillBehavior {
    private eventManager: SkillEventManager;
    private isActive: boolean = false;
    
    constructor() {
        this.eventManager = SkillEventManager.getInstance();
    }
    
    onSkillStart(params: SkillParams): void {
        this.isActive = !this.isActive;
        
        // 切換技能狀態時不需要前後搖，直接觸發效果
        this.eventManager.emitCastEffect(
            params.skillId,
            params.skillLevel,
            params.casterId,
            { x: params.x, y: params.y },
            params.direction,
            { isActive: this.isActive }
        );
        
        // 立即完成施放
        this.eventManager.emitCastComplete(
            params.skillId,
            params.skillLevel,
            params.casterId
        );
    }
    
    onSkillHold(_params: SkillParams): void {
        // 開關技能不需要處理持續按住
    }
    
    onSkillEnd(_params: SkillParams): void {
        // 開關技能在 onSkillStart 中處理狀態切換
    }
    
    canInterruptOtherSkills(): boolean {
        return true;
    }
    
    canMoveWhileCasting(): boolean {
        return true;
    }
    
    canUseOtherSkillsWhileCasting(): boolean {
        return true;
    }
    
    isSkillActive(): boolean {
        return this.isActive;
    }
}

/**
 * 蓄能型技能行為
 * 適用於按住蓄力，釋放後根據蓄力時間產生不同效果的技能
 */
export class ChargeSkillBehavior implements SkillBehavior {
    protected eventManager: SkillEventManager;
    private chargeStartTime: number = 0;
    private maxChargeTime: number;
    private chargingIntervalId: number | null = null;
    private updateInterval: number = 0.1; // 秒
    
    constructor(maxChargeTime: number = 3.0) {
        this.eventManager = SkillEventManager.getInstance();
        this.maxChargeTime = maxChargeTime;
    }
    
    onSkillStart(params: SkillParams): void {
        // 記錄蓄能開始時間
        this.chargeStartTime = Date.now();
        
        // 發送技能開始事件
        this.eventManager.emitCastStart(
            params.skillId,
            params.skillLevel,
            params.casterId,
            { x: params.x, y: params.y },
            params.direction
        );
        
        // 設置定時器，定期發送蓄能中事件
        this.chargingIntervalId = window.setInterval(() => {
            const chargeTime = (Date.now() - this.chargeStartTime) / 1000;
            const chargePercent = Math.min(chargeTime / this.maxChargeTime, 1.0);
            
            this.eventManager.emitCastEffect(
                params.skillId,
                params.skillLevel,
                params.casterId,
                { x: params.x, y: params.y },
                params.direction,
                { chargePercent, chargeTime }
            );
        }, this.updateInterval * 1000);
    }
    
    onSkillHold(_params: SkillParams): void {
        // 蓄能型技能在持續按住時通過定時器發送蓄能事件
    }
    
    onSkillEnd(params: SkillParams): void {
        // 清除定時器
        if (this.chargingIntervalId !== null) {
            clearInterval(this.chargingIntervalId);
            this.chargingIntervalId = null;
        }
        
        // 計算蓄能時間和百分比
        const chargeTime = Math.min((Date.now() - this.chargeStartTime) / 1000, this.maxChargeTime);
        const chargePercent = chargeTime / this.maxChargeTime;

        // 獲取攻擊速度並計算實際後搖時間
        const attackSpeed = params.casterStats?.attackSpeed || 1;
        const actualRecoveryTime = calculateActualCastTime(0.5, attackSpeed); // 使用0.5秒作為基礎後搖時間
        
        // 發送技能效果事件，帶上蓄能信息
        this.eventManager.emitCastEffect(
            params.skillId,
            params.skillLevel,
            params.casterId,
            { x: params.x, y: params.y },
            params.direction,
            { chargePercent, chargeTime, recoveryTime: actualRecoveryTime }
        );
        
        // 在後搖結束後發送完成事件
        setTimeout(() => {
            this.eventManager.emitCastComplete(
                params.skillId,
                params.skillLevel,
                params.casterId
            );
        }, actualRecoveryTime * 1000);
    }
    
    canInterruptOtherSkills(): boolean {
        return true;
    }
    
    canMoveWhileCasting(): boolean {
        return false;
    }
    
    canUseOtherSkillsWhileCasting(): boolean {
        return false;
    }
    
    getChargePercent(): number {
        if (this.chargeStartTime === 0) return 0;
        
        const chargeTime = Math.min((Date.now() - this.chargeStartTime) / 1000, this.maxChargeTime);
        return chargeTime / this.maxChargeTime;
    }
}
