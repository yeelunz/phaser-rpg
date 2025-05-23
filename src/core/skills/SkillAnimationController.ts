import { SkillEventManager } from './skillEventManager';
import { SkillEvent, SkillEventType } from './types';

/**
 * 技能動畫和後搖管理器
 * 明確分離後搖和技能冷卻
 */
export class SkillAnimationController {
    private static instance: SkillAnimationController;
    private eventManager: SkillEventManager;
    
    // 記錄目前正在後搖中的技能
    private activeRecoverySkills: Map<string, {
        skillId: string,
        casterId: string,
        endTime: number,
        recoveryTime: number
    }> = new Map();
    
    // 是否啟用自動檢查和修復異常狀態
    private enableAutoFix: boolean = true;
    
    private constructor() {
        this.eventManager = SkillEventManager.getInstance();
        this.setupEventListeners();
    }
    
    /**
     * 獲取單例實例
     */
    public static getInstance(): SkillAnimationController {
        if (!SkillAnimationController.instance) {
            SkillAnimationController.instance = new SkillAnimationController();
        }
        return SkillAnimationController.instance;
    }
    
    /**
     * 設置事件監聽器
     */
    private setupEventListeners(): void {
        // 監聽技能效果產生事件 (前搖結束，後搖開始)
        this.eventManager.addEventListener(SkillEventType.CAST_EFFECT, (event: SkillEvent) => {
            // 建立技能後搖計時器
            const skillKey = `${event.skillId}-${event.casterId}`;
            const recoveryTime = event.data?.recoveryTime || 0.5; // 默認0.5秒後搖
            
            this.activeRecoverySkills.set(skillKey, {
                skillId: event.skillId,
                casterId: event.casterId,
                endTime: Date.now() + (recoveryTime * 1000),
                recoveryTime
            });
            
            console.log(`[SkillAnimationController] 技能 ${event.skillId} 進入後搖階段，持續時間: ${recoveryTime}秒`);
        });
        
        // 監聽技能中斷事件
        this.eventManager.addEventListener(SkillEventType.CAST_INTERRUPT, (event: SkillEvent) => {
            const skillKey = `${event.skillId}-${event.casterId}`;
            if (this.activeRecoverySkills.has(skillKey)) {
                this.activeRecoverySkills.delete(skillKey);
                console.log(`[SkillAnimationController] 技能 ${event.skillId} 的後搖被中斷`);
            }
        });
    }
    
    /**
     * 更新所有後搖中的技能
     * 應在遊戲循環中調用
     */
    public update(): void {
        const now = Date.now();
        const completedSkills: string[] = [];
        
        // 檢查是否有後搖結束的技能
        this.activeRecoverySkills.forEach((skill, key) => {
            if (now >= skill.endTime) {
                completedSkills.push(key);
                
                // 後搖結束，發送完成事件
                this.eventManager.emitCastComplete(
                    skill.skillId,
                    0, // 技能等級不重要，因為只是標記後搖結束
                    skill.casterId
                );
                
                console.log(`[SkillAnimationController] 技能 ${skill.skillId} 後搖結束，角色可以移動了`);
            }
        });
        
        // 移除已完成後搖的技能
        completedSkills.forEach(key => this.activeRecoverySkills.delete(key));
    }
    
    /**
     * 檢查特定技能是否在後搖階段
     * @param skillId 技能ID
     * @param casterId 施法者ID
     */
    public isInRecovery(skillId: string, casterId: string): boolean {
        const skillKey = `${skillId}-${casterId}`;
        return this.activeRecoverySkills.has(skillKey);
    }
    
    /**
     * 獲取特定技能的後搖剩餘時間
     * @param skillId 技能ID
     * @param casterId 施法者ID
     * @returns 剩餘時間（秒），如果不在後搖中則返回0
     */
    public getRecoveryTimeRemaining(skillId: string, casterId: string): number {
        const skillKey = `${skillId}-${casterId}`;
        const skill = this.activeRecoverySkills.get(skillKey);
        
        if (!skill) return 0;
        
        const remaining = Math.max(0, (skill.endTime - Date.now()) / 1000);
        return remaining;
    }
      /**
     * 強制結束技能的後搖階段
     * @param skillId 技能ID
     * @param casterId 施法者ID
     */
    public forceEndRecovery(skillId: string, casterId: string): void {
        const skillKey = `${skillId}-${casterId}`;
        if (this.activeRecoverySkills.has(skillKey)) {
            const skill = this.activeRecoverySkills.get(skillKey)!;
            this.activeRecoverySkills.delete(skillKey);
            
            // 發送完成事件
            this.eventManager.emitCastComplete(
                skill.skillId,
                0,
                skill.casterId
            );
            
            console.log(`[SkillAnimationController] 技能 ${skillId} 後搖被強制結束`);
        }
    }
    
    /**
     * 檢查並修復異常的角色技能狀態
     * 用於解決某些情況下後搖結束但角色無法移動的問題
     * @param skillCaster 技能施放器實例
     */
    public checkAndFixCastingState(skillCaster: any): void {
        if (!this.enableAutoFix) return;
        
        // 檢查是否存在異常狀態：isCastingSkill=true但沒有currentSkillId
        if (skillCaster && skillCaster.isCastingSkill && skillCaster.isCastingSkill() && 
            (!skillCaster.getCurrentSkillId || !skillCaster.getCurrentSkillId())) {
            console.log('[SkillAnimationController] 檢測到異常狀態：isCastingSkill=true但currentSkillId=null，進行修復');
            
            // 使用resetCastingState方法重置狀態
            if (skillCaster.resetCastingState) {
                skillCaster.resetCastingState();
                console.log('[SkillAnimationController] 修復完成：已重置角色的施法狀態');
            }
        }
    }
    
    /**
     * 啟用或禁用自動修復功能
     */
    public setAutoFixEnabled(enabled: boolean): void {
        this.enableAutoFix = enabled;
        console.log(`[SkillAnimationController] 自動修復功能已${enabled ? '啟用' : '禁用'}`);
    }
}
