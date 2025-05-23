import { SkillManager } from './skillManager';
import type Player from '../../game/Player';
import { SkillEventManager } from './skillEventManager';
import { SkillEvent, SkillEventType } from './types';
import { SkillBehavior, ClickSkillBehavior, HoldSkillBehavior, ToggleSkillBehavior, ChargeSkillBehavior, SkillParams } from './skillBehavior';

/**
 * SkillCaster 類負責處理技能的施放邏輯
 */
export class SkillCaster {
    private skillManager: SkillManager;
    private player: Player;
    private eventManager: SkillEventManager;
    
    // 技能施放狀態
    private _isCastingSkill: boolean = false;
    private _currentSkillId: string | null = null;
    private _currentSkillLevel: number = 0;
    
    // 技能行為狀態
    private activeSkills: Map<string, SkillBehavior> = new Map();
    
    constructor(skillManager: SkillManager, player: Player) {
        this.skillManager = skillManager;
        this.player = player;
        this.eventManager = SkillEventManager.getInstance();
        
        // 註冊事件監聽器
        this.registerEventListeners();
    }
      /**
     * 註冊技能事件監聽器
     * 處理技能施放的不同階段
     */
    private registerEventListeners(): void {
        // 監聽技能開始施放事件
        this.eventManager.addEventListener(SkillEventType.CAST_START, (event: SkillEvent) => {
            // 如果是玩家的技能
            if (event.casterId === (this.player.id || 'player')) {
                this._isCastingSkill = true;
                this._currentSkillId = event.skillId;
                this._currentSkillLevel = event.skillLevel;
                console.log(`[SkillCaster] 開始施放技能: ${event.skillId}, 等級: ${event.skillLevel}`);
            }
        });
        
        // 監聽技能效果產生事件
        this.eventManager.addEventListener(SkillEventType.CAST_EFFECT, (event: SkillEvent) => {
            // 如果是玩家的技能
            if (event.casterId === (this.player.id || 'player')) {
                console.log(`[SkillCaster] 技能效果產生: ${event.skillId}`);
                // 這時技能效果已經產生，仍在施放狀態
            }
        });
          // 監聽技能施放完成事件 (後搖結束)
        this.eventManager.addEventListener(SkillEventType.CAST_COMPLETE, (event: SkillEvent) => {
            // 如果是玩家的技能
            if (event.casterId === (this.player.id || 'player')) {
                this._isCastingSkill = false;  // 設置為非施法狀態，讓角色可以移動
                this._currentSkillId = null;
                this._currentSkillLevel = 0;
                console.log(`[SkillCaster] 技能後搖結束，角色可以移動了: ${event.skillId}`);
                
                // 技能可能還在冷卻中，但角色能夠行動
                const skill = this.skillManager.getSkill(event.skillId);
                if (skill && skill.isOnCooldown()) {
                    console.log(`[SkillCaster] 技能 ${event.skillId} 仍在冷卻中，剩餘冷卻時間: ${skill.getCooldownRemaining().toFixed(1)}秒`);
                }
            }
        });
        
        // 監聽技能施放中斷事件
        this.eventManager.addEventListener(SkillEventType.CAST_INTERRUPT, (event: SkillEvent) => {
            // 如果是玩家的技能
            if (event.casterId === (this.player.id || 'player')) {
                this._isCastingSkill = false;
                this._currentSkillId = null;
                this._currentSkillLevel = 0;
                console.log(`[SkillCaster] 技能施放中斷: ${event.skillId}, 原因: ${event.data?.reason}`);
            }
        });
    }    /**
     * 按下技能按鍵
     * @param skillId 技能ID
     * @returns Promise 解析為是否成功施放技能
     */
    public async skillKeyDown(skillId: string): Promise<boolean> {
        console.log(`嘗試按下技能按鍵: ${skillId}`);
        
        // 檢查是否正在施放其他技能，且該技能不允許使用其他技能
        if (this._isCastingSkill && this._currentSkillId !== skillId) {
            // 獲取當前技能行為
            const currentBehavior = this.getSkillBehavior(this._currentSkillId!);
            if (currentBehavior && !currentBehavior.canUseOtherSkillsWhileCasting()) {
                console.warn(`技能 ${this._currentSkillId} 正在施放中，無法使用技能 ${skillId}`);
                return false;
            }
        }
        
        // 檢查技能是否存在
        const skill = this.skillManager.getSkill(skillId);
        if (!skill) {
            console.warn(`技能 ${skillId} 不存在`);
            return false;
        }
        
        const skillLevel = skill.getCurrentLevel();
        console.log(`技能 ${skillId} 等級: ${skillLevel}`);
        
        // 獲取當前武器類型
        const currentWeaponType = this.player.equipmentManager.getCurrentWeaponType();
        
        // 檢查是否可以使用技能
        if (!skill.canUse(this.player.getStats(), currentWeaponType)) {
            // 詳細診斷原因            
             if (!skill.isLearned()) {
                console.warn(`技能 ${skillId} 尚未學習`);
            } else if (skill.isOnCooldown()) {
                const remainingCooldown = skill.getCooldownRemaining();
                console.warn(`技能 ${skillId} 正在冷卻中，剩餘冷卻時間: ${remainingCooldown.toFixed(1)}秒`);
                
                // 輸出詳細的技能冷卻資訊，方便調試
                console.log(`[SkillCaster] 技能 ${skillId} 詳細冷卻狀態:`, {
                    isOnCooldown: skill.isOnCooldown(),
                    cooldownTime: skill.getCooldown(),
                    remainingTime: skill.getCooldownRemaining()
                });
            } else if (this.player.getStats().getCurrentEnergy() < skill.getEnergyCost()) {
                console.warn(`能量不足，需要 ${skill.getEnergyCost()} 點能量，當前能量: ${this.player.getStats().getCurrentEnergy()}`);
            } else {
                console.warn(`無法使用技能 ${skillId}，可能是武器類型不符`);
                console.warn(`當前武器類型: ${currentWeaponType}`);
            }
            return false;
        }

        // 獲取技能的實現 (使用 await)
        const implementation = await this.skillManager.getSkillImplementation(skillId, skillLevel);
        if (!implementation) {
            console.warn(`技能 ${skillId} 的等級 ${skillLevel} 實現不存在`);
            return false;
        }

        // 執行技能
        console.log(`成功開始施放技能: ${skill.getName()}`);
        
        // 獲取玩家位置和方向
        const position = {
            x: this.player.sprite.x,
            y: this.player.sprite.y
        };
        const gameLogicAngle = this.player.direction * 45;
        const direction = (gameLogicAngle - 90 + 360) % 360; // 轉換為 Phaser 角度 (東=0, 南=90, 西=180, 北=270)
        console.log(`[SkillCaster] Calculated Phaser direction: ${direction} for player direction ${this.player.direction}`);

        // 創建技能參數
        const params: SkillParams = {
            x: position.x,
            y: position.y,
            direction: direction, // 使用 Phaser 角度
            casterId: this.player.id || 'player',
            skillId: skillId,
            skillLevel: skillLevel
        };
        
        // 獲取技能行為
        const behavior = this.getBehaviorForSkill(skill, implementation);
          // 開始技能 - 啟動前搖事件
        behavior.onSkillStart(params);
        
        // 如果是持續型技能，記錄在活動技能列表中
        if (!(behavior instanceof ClickSkillBehavior)) {
            this.activeSkills.set(skillId, behavior);
        }
          // 新增監聽技能效果產生事件，等前搖結束後再執行技能實現        
           const castEffectHandler = (event: SkillEvent) => {
            // 確保是當前技能的效果事件
            if (event.skillId === skillId && event.casterId === (this.player.id || 'player')) {
                console.log(`[SkillCaster] 處理技能效果: ${skillId}，開始執行實現並消耗資源`);
                try {
                    // 執行技能實現（投射物渲染）
                    const executeGameLogicAngle = this.player.direction * 45;
                    const executeDirection = (executeGameLogicAngle - 90 + 360) % 360; // 轉換為 Phaser 角度
                    console.log(`[SkillCaster] Executing skill with Phaser direction: ${executeDirection} for player direction ${this.player.direction}`);

                    implementation.execute({
                        x: this.player.sprite.x, // 使用當前位置，以防玩家在前搖期間移動
                        y: this.player.sprite.y,
                        direction: executeDirection // 使用 Phaser 角度
                    });
                    
                    // 啟動技能冷卻和消耗能量 (注意：這裡只啟動冷卻，後搖結束由事件處理)
                    skill.startCooldown();
                    const cooldownTime = skill.getCooldown();
                    this.player.getStats().useEnergy(skill.getEnergyCost());
                    
                    console.log(`[SkillCaster] 技能 ${skillId} 已啟動冷卻: ${cooldownTime}秒，後搖時間: ${skill.getRecoveryTime()}秒`);
                    console.log(`[SkillCaster] 技能進入後搖階段，角色暫時無法行動`);
                    
                    // 用於調試
                    setTimeout(() => {
                        console.log(`[SkillCaster] 技能 ${skillId} 冷卻狀態檢查 - 剩餘冷卻: ${skill.getCooldownRemaining()}秒，冷卻狀態: ${skill.isOnCooldown() ? '冷卻中' : '可用'}`);
                    }, 1000);
                } catch (error) {
                    console.error(`[SkillCaster] 處理技能效果時發生錯誤:`, error);
                } finally {
                    // 一次性事件，無論成功與否都移除監聽器
                    this.eventManager.removeEventListener(SkillEventType.CAST_EFFECT, castEffectHandler);
                }
            }
        };
        
        // 註冊一次性監聽器
        this.eventManager.addEventListener(SkillEventType.CAST_EFFECT, castEffectHandler);
        
        return true;
    }
    
    /**
     * 持續按住技能按鍵
     * @param skillId 技能ID
     */    public skillKeyHold(skillId: string): void {
        const behavior = this.activeSkills.get(skillId);
        if (behavior) {
            // 獲取玩家當前位置和方向
            const position = {
                x: this.player.sprite.x,
                y: this.player.sprite.y
            };
            const direction = this.player.direction * 45;
            
            // 創建技能參數
            const params: SkillParams = {
                x: position.x,
                y: position.y,
                direction: direction,
                casterId: this.player.id || 'player',
                skillId: skillId,
                skillLevel: this._currentSkillLevel
            };
            
            // 調用持續按住方法
            behavior.onSkillHold(params);
        }
    }
    
    /**
     * 釋放技能按鍵
     * @param skillId 技能ID
     */    public skillKeyUp(skillId: string): void {
        const behavior = this.activeSkills.get(skillId);
        if (behavior) {
            // 獲取玩家當前位置和方向
            const position = {
                x: this.player.sprite.x,
                y: this.player.sprite.y
            };
            const direction = this.player.direction * 45;
            
            // 創建技能參數
            const params: SkillParams = {
                x: position.x,
                y: position.y,
                direction: direction,
                casterId: this.player.id || 'player',
                skillId: skillId,
                skillLevel: this._currentSkillLevel
            };
            
            // 結束技能
            behavior.onSkillEnd(params);
            
            // 從活動技能列表中移除
            this.activeSkills.delete(skillId);
        }
    }
    
    /**
     * 為技能獲取對應的行為
     */
    private getBehaviorForSkill(skill: any, implementation: any): SkillBehavior {
        // 這裡需要根據實際情況判斷技能類型
        // 可以從技能或實現中獲取類型信息
        
        // 從實現中獲取類型信息的示例
        if (implementation.skillType === 'charge') {
            return new ChargeSkillBehavior(implementation.maxChargeTime || 3.0);
        } else if (implementation.skillType === 'toggle') {
            return new ToggleSkillBehavior(implementation.updateInterval || 1.0);
        } else if (implementation.skillType === 'hold') {
            return new HoldSkillBehavior(
                skill.getCastTime(),
                skill.getRecoveryTime(),
                implementation.intervalTime || 0.5
            );
        } else {
            // 默認為單擊型
            return new ClickSkillBehavior(skill.getCastTime(), skill.getRecoveryTime());
        }
    }    /**
     * 傳統的技能施放方法 (向後兼容)
     * @param skillId 技能ID
     * @param x 目標X座標 (可選)
     * @param y 目標Y座標 (可選)
     * @param direction 方向 (可選，弧度或度數)
     * @returns Promise 解析為是否成功施放技能
     */    
    public async castSkill(skillId: string = 'slash', x?: number, y?: number, direction?: number): Promise<boolean> {
        console.log(`[SkillCaster] 施放技能: ${skillId}, 位置: (${x}, ${y}), 方向: ${direction}`);
        
        // 如果提供了方向，先保存方向信息供後續使用
        // 實際的方向處理會在 skillKeyDown 及其後續調用中處理
        if (direction !== undefined) {
            // 保存方向供技能實現使用
            if (!window.gameRegistry) {
                window.gameRegistry = {};
            }
            window.gameRegistry.lastSkillDirection = direction;
        }
        
        // 直接使用按鍵處理方法
        return await this.skillKeyDown(skillId);
    }
    
    /**
     * 中斷技能施放
     * @param skillId 技能ID
     * @param reason 中斷原因
     */
    public interruptSkill(skillId: string, reason: string = '手動中斷'): void {
        const skill = this.skillManager.getSkill(skillId);
        
        if (!skill) {
            console.warn(`嘗試中斷不存在的技能: ${skillId}`);
            return;
        }
        
        const skillLevel = skill.getCurrentLevel();
        
        // 如果有活動中的技能行為，先結束它
        const behavior = this.activeSkills.get(skillId);
        if (behavior) {
            // 創建中斷參數
            const params: SkillParams = {
                x: this.player.sprite.x,
                y: this.player.sprite.y,
                direction: this.player.direction * 45,
                casterId: this.player.id || 'player',
                skillId: skillId,
                skillLevel: skillLevel
            };
            
            // 結束技能
            behavior.onSkillEnd(params);
            
            // 從活動技能列表中移除
            this.activeSkills.delete(skillId);
        }
        
        // 發送技能中斷事件
        this.eventManager.emitCastInterrupt(
            skillId,
            skillLevel,
            this.player.id || 'player',
            reason
        );
        
        console.log(`技能 ${skill.getName()} 被中斷，原因: ${reason}`);
    }
    
    /**
     * 獲取當前活動中的技能IDs
     */
    public getActiveSkillIds(): string[] {
        return Array.from(this.activeSkills.keys());
    }
    
    /**
     * 檢查技能是否處於活動狀態
     */
    public isSkillActive(skillId: string): boolean {
        return this.activeSkills.has(skillId);
    }
    
    /**
     * 更新所有活動中的技能
     * 應在遊戲循環中調用
     */
    public update(): void {
        // 更新所有活動中的技能
        for (const [skillId, behavior] of this.activeSkills.entries()) {
            // 如果是狀態型技能，可能需要特殊處理
            if (behavior instanceof ToggleSkillBehavior) {
                // 狀態型技能通常不需要特殊更新
            } else if (behavior instanceof HoldSkillBehavior) {
                // 持續更新按壓型技能
                this.skillKeyHold(skillId);
            } else if (behavior instanceof ChargeSkillBehavior) {
                // 更新蓄能型技能
                this.skillKeyHold(skillId);
            }
        }
    }    // getter 方法，提供目前的施法狀態
    public isCastingSkill(): boolean {
        // 檢查狀態一致性：如果isCastingSkill為true但currentSkillId為null，這是一個異常狀態
        if (this._isCastingSkill && !this._currentSkillId) {
            console.log('[SkillCaster] 檢測到異常狀態：isCastingSkill為true但currentSkillId為null，自動修正');
            this._isCastingSkill = false;
            return false;
        }
        return this._isCastingSkill;
    }
    
    // 重置施法狀態 (當檢測到異常狀態時可以使用)
    public resetCastingState(): void {
        const wasInCastingState = this._isCastingSkill;
        
        if (this._isCastingSkill && !this._currentSkillId) {
            console.log('[SkillCaster] 手動重置異常狀態：isCastingSkill為true但currentSkillId為null，已重置');
        }
        
        this._isCastingSkill = false;
        this._currentSkillId = null;
        this._currentSkillLevel = 0;
        
        if (wasInCastingState) {
            console.log('[SkillCaster] 施法狀態已重置，角色現在可以自由移動');
        }
    }
    
    // 獲取當前正在施放的技能ID
    public getCurrentSkillId(): string | null {
        return this._currentSkillId;
    }
    
    // 獲取當前正在施放的技能等級
    public getCurrentSkillLevel(): number {
        return this._currentSkillLevel;
    }
    
    /**
     * 獲取指定技能ID對應的技能行為
     * @param skillId 技能ID
     * @returns 技能行為對象，如果找不到則返回 undefined
     */
    public getSkillBehavior(skillId: string): SkillBehavior | undefined {
        // 優先檢查活動技能列表
        if (this.activeSkills.has(skillId)) {
            return this.activeSkills.get(skillId);
        }
        
        // 如果是當前正在施放的技能，但不在活動列表中（例如單擊型技能）
        if (this._currentSkillId === skillId) {
            // 獲取技能
            const skill = this.skillManager.getSkill(skillId);
            if (!skill) return undefined;
            
            // 獲取技能等級
            const skillLevel = skill.getCurrentLevel();
            
            // 獲取技能實現
            return this.getBehaviorForSkill(skill, { skillId }); // 只傳遞最小必要信息，因為我們只需要行為對象
        }
        
        return undefined;
    }
}

