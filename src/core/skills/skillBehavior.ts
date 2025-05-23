import { SkillEventManager } from './skillEventManager';
import { SkillEvent, SkillEventType } from './types';

/**
 * 技能參數介面
 */
export interface SkillParams {
    x: number;             // 施法位置 x
    y: number;             // 施法位置 y
    direction: number;     // 施法方向（度數）
    casterId: string;      // 施法者 ID
    skillId?: string;      // 技能 ID
    skillLevel?: number;   // 技能等級
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
        if (!params.skillId || !params.skillLevel) {
            console.error('[ClickSkillBehavior] 缺少技能ID或等級');
            return;
        }
        
        // 發送技能開始事件（前搖開始，角色無法移動）
        this.eventManager.emitCastStart(
            params.skillId,
            params.skillLevel,
            params.casterId,
            { x: params.x, y: params.y },
            params.direction
        );
        
        // 在前搖結束後發送效果事件
        setTimeout(() => {
            // 前搖結束，發送效果事件（技能效果產生）
            // 此時技能效果已經產生，但角色仍在後搖階段，仍然無法移動
            this.eventManager.emitCastEffect(
                params.skillId,
                params.skillLevel,
                params.casterId,
                { x: params.x, y: params.y },
                params.direction,
                { recoveryTime: this.recoveryTime } // 添加後搖時間信息
            );
            
            // 在後搖結束後發送完成事件
            setTimeout(() => {
                // 後搖結束，技能施放完成，角色可以移動了
                // 注意：此時技能可能仍在冷卻中，但角色可以移動
                this.eventManager.emitCastComplete(
                    params.skillId,
                    params.skillLevel,
                    params.casterId
                );
                
                console.log(`[ClickSkillBehavior] 技能 ${params.skillId} 的後搖已結束，角色可以移動了`);
            }, this.recoveryTime * 1000);
            
        }, this.castTime * 1000);
    }
    
    onSkillHold(params: SkillParams): void {
        // 單擊型技能不需要實現此方法
    }
    
    onSkillEnd(params: SkillParams): void {
        // 單擊型技能不需要實現此方法
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
        if (!params.skillId || !params.skillLevel) {
            console.error('[HoldSkillBehavior] 缺少技能ID或等級');
            return;
        }
        
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
            
        }, this.castTime * 1000);
    }
    
    onSkillHold(params: SkillParams): void {
        // 按壓型技能在持續按住時會通過定時器觸發效果
        // 此方法可以用來更新參數，例如玩家移動後的位置
    }
    
    onSkillEnd(params: SkillParams): void {
        if (!params.skillId || !params.skillLevel) {
            console.error('[HoldSkillBehavior] 缺少技能ID或等級');
            return;
        }
        
        // 清除定時器
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        // 發送技能完成事件
        this.eventManager.emitCastComplete(
            params.skillId,
            params.skillLevel,
            params.casterId
        );
    }
    
    protected triggerEffect(params: SkillParams): void {
        if (!params.skillId || !params.skillLevel) return;
        
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
    protected eventManager: SkillEventManager;
    private active: boolean = false;
    private intervalId: number | null = null;
    private updateInterval: number;
    
    constructor(updateInterval: number = 1.0) {
        this.eventManager = SkillEventManager.getInstance();
        this.updateInterval = updateInterval;
    }
    
    onSkillStart(params: SkillParams): void {
        if (!params.skillId || !params.skillLevel) {
            console.error('[ToggleSkillBehavior] 缺少技能ID或等級');
            return;
        }
        
        if (!this.active) {
            // 開啟技能
            this.active = true;
            
            // 發送技能開始事件
            this.eventManager.emitCastStart(
                params.skillId,
                params.skillLevel,
                params.casterId,
                { x: params.x, y: params.y },
                params.direction
            );
            
            // 觸發首次效果
            this.eventManager.emitCastEffect(
                params.skillId,
                params.skillLevel,
                params.casterId,
                { x: params.x, y: params.y },
                params.direction
            );
            
            // 設置定時器，定期更新效果
            this.intervalId = window.setInterval(() => {
                if (this.active) {
                    this.eventManager.emitCastEffect(
                        params.skillId,
                        params.skillLevel,
                        params.casterId,
                        { x: params.x, y: params.y },
                        params.direction,
                        { isToggleUpdate: true }
                    );
                }
            }, this.updateInterval * 1000);
            
        } else {
            // 關閉技能
            this.onSkillEnd(params);
        }
    }
    
    onSkillHold(params: SkillParams): void {
        // 狀態型技能不需要實現此方法
    }
    
    onSkillEnd(params: SkillParams): void {
        if (!params.skillId || !params.skillLevel) {
            console.error('[ToggleSkillBehavior] 缺少技能ID或等級');
            return;
        }
        
        // 清除定時器
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        // 切換狀態
        this.active = false;
        
        // 發送技能完成事件
        this.eventManager.emitCastComplete(
            params.skillId,
            params.skillLevel,
            params.casterId,
            undefined,
            undefined,
            { wasToggleActive: true }
        );
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
    
    isActive(): boolean {
        return this.active;
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
        if (!params.skillId || !params.skillLevel) {
            console.error('[ChargeSkillBehavior] 缺少技能ID或等級');
            return;
        }
        
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
            
            this.eventManager.dispatchEvent({
                type: SkillEventType.SKILL_CHARGE,
                skillId: params.skillId,
                skillLevel: params.skillLevel,
                casterId: params.casterId,
                timestamp: Date.now(),
                position: { x: params.x, y: params.y },
                direction: params.direction,
                data: { chargePercent, chargeTime }
            });
            
        }, this.updateInterval * 1000);
    }
    
    onSkillHold(params: SkillParams): void {
        // 蓄能型技能在持續按住時通過定時器發送蓄能事件
    }
    
    onSkillEnd(params: SkillParams): void {
        if (!params.skillId || !params.skillLevel) {
            console.error('[ChargeSkillBehavior] 缺少技能ID或等級');
            return;
        }
        
        // 清除定時器
        if (this.chargingIntervalId !== null) {
            clearInterval(this.chargingIntervalId);
            this.chargingIntervalId = null;
        }
        
        // 計算蓄能時間和百分比
        const chargeTime = Math.min((Date.now() - this.chargeStartTime) / 1000, this.maxChargeTime);
        const chargePercent = chargeTime / this.maxChargeTime;
        
        // 發送技能效果事件，帶上蓄能信息
        this.eventManager.emitCastEffect(
            params.skillId,
            params.skillLevel,
            params.casterId,
            { x: params.x, y: params.y },
            params.direction,
            { chargePercent, chargeTime }
        );
        
        // 發送技能結束事件
        setTimeout(() => {
            this.eventManager.emitCastComplete(
                params.skillId,
                params.skillLevel,
                params.casterId
            );
        }, 500); // 短暫後搖
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
