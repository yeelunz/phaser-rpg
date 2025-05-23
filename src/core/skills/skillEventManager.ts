import { SkillEvent, SkillEventType, SkillEventListener } from './types';

/**
 * 技能事件管理器
 * 負責管理技能事件的發布和訂閱
 */
export class SkillEventManager {
    private static instance: SkillEventManager;
    private listeners: Map<SkillEventType, SkillEventListener[]> = new Map();
    
    /**
     * 私有構造函數，防止直接實例化
     */
    private constructor() {}
    
    /**
     * 獲取單例實例
     */
    public static getInstance(): SkillEventManager {
        if (!SkillEventManager.instance) {
            SkillEventManager.instance = new SkillEventManager();
        }
        return SkillEventManager.instance;
    }
    
    /**
     * 添加事件監聽器
     * @param eventType 事件類型
     * @param listener 監聽器函數
     */
    public addEventListener(eventType: SkillEventType, listener: SkillEventListener): void {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        
        const eventListeners = this.listeners.get(eventType);
        if (eventListeners && !eventListeners.includes(listener)) {
            eventListeners.push(listener);
        }
    }
    
    /**
     * 移除事件監聽器
     * @param eventType 事件類型
     * @param listener 監聽器函數
     */
    public removeEventListener(eventType: SkillEventType, listener: SkillEventListener): void {
        if (!this.listeners.has(eventType)) {
            return;
        }
        
        const eventListeners = this.listeners.get(eventType);
        if (eventListeners) {
            const index = eventListeners.indexOf(listener);
            if (index !== -1) {
                eventListeners.splice(index, 1);
            }
        }
    }
    
    /**
     * 分發事件
     * @param event 事件物件
     */
    public dispatchEvent(event: SkillEvent): void {
        if (!this.listeners.has(event.type)) {
            return;
        }
        
        const eventListeners = this.listeners.get(event.type);
        if (eventListeners) {
            // 創建一個副本，防止在事件處理過程中修改監聽器列表
            const listeners = [...eventListeners];
            for (const listener of listeners) {
                try {
                    listener(event);
                } catch (error) {
                    console.error(`Error in skill event listener for event type ${event.type}:`, error);
                }
            }
        }
    }
    
    /**
     * 移除特定類型的所有監聽器
     * @param eventType 事件類型
     */
    public clearEventListeners(eventType?: SkillEventType): void {
        if (eventType) {
            this.listeners.delete(eventType);
        } else {
            this.listeners.clear();
        }
    }
    
    /**
     * 創建並分發技能開始施法事件
     * @param skillId 技能ID
     * @param skillLevel 技能等級
     * @param casterId 施法者ID
     * @param position 施法位置
     * @param direction 施法方向
     */
    public emitCastStart(
        skillId: string,
        skillLevel: number,
        casterId: string,
        position?: { x: number, y: number },
        direction?: number
    ): void {
        const event: SkillEvent = {
            type: SkillEventType.CAST_START,
            skillId,
            skillLevel,
            casterId,
            timestamp: Date.now(),
            position,
            direction
        };
        
        this.dispatchEvent(event);
    }
    
    /**
     * 創建並分發技能效果產生事件
     * @param skillId 技能ID
     * @param skillLevel 技能等級
     * @param casterId 施法者ID
     * @param position 施法位置
     * @param direction 施法方向
     * @param data 額外資料
     */
    public emitCastEffect(
        skillId: string,
        skillLevel: number,
        casterId: string,
        position?: { x: number, y: number },
        direction?: number,
        data?: any
    ): void {
        const event: SkillEvent = {
            type: SkillEventType.CAST_EFFECT,
            skillId,
            skillLevel,
            casterId,
            timestamp: Date.now(),
            position,
            direction,
            data
        };
        
        this.dispatchEvent(event);
    }
      /**
     * 創建並分發技能施法完成事件（後搖結束事件）
     * @param skillId 技能ID
     * @param skillLevel 技能等級
     * @param casterId 施法者ID
     */
    public emitCastComplete(
        skillId: string,
        skillLevel: number,
        casterId: string
    ): void {
        console.log(`[SkillEventManager] 發送技能後搖結束事件：skillId=${skillId}, casterId=${casterId}`);
        const event: SkillEvent = {
            type: SkillEventType.CAST_COMPLETE,
            skillId,
            skillLevel,
            casterId,
            timestamp: Date.now()
        };
        
        this.dispatchEvent(event);
    }
    
    /**
     * 創建並分發技能施法中斷事件
     * @param skillId 技能ID
     * @param skillLevel 技能等級
     * @param casterId 施法者ID
     * @param reason 中斷原因
     */
    public emitCastInterrupt(
        skillId: string,
        skillLevel: number,
        casterId: string,
        reason: string
    ): void {
        const event: SkillEvent = {
            type: SkillEventType.CAST_INTERRUPT,
            skillId,
            skillLevel,
            casterId,
            timestamp: Date.now(),
            data: { reason }
        };
        
        this.dispatchEvent(event);
    }
}
