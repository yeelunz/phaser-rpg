/**
 * 鍵位綁定管理器 - 管理技能的鍵位設定
 */

import { SkillManager } from './skillManager';
import { Skill } from './skill';
import { SkillType } from './types';

/**
 * 技能鍵位映射
 */
export interface KeyBindMapping {
    key: string;
    skillId: string;
}

/**
 * 鍵位綁定管理器類
 */
export class KeyBindManager {
    // 單例模式
    private static instance: KeyBindManager;
    
    private keyBindings: Map<string, string> = new Map(); // key -> skillId
    private skillKeyMap: Map<string, string> = new Map(); // skillId -> key
    private skillManager: SkillManager | null = null;
    private scene: Phaser.Scene | null = null;
    
    /**
     * 獲取單例實例
     */
    public static getInstance(): KeyBindManager {
        if (!KeyBindManager.instance) {
            KeyBindManager.instance = new KeyBindManager();
        }
        return KeyBindManager.instance;
    }
    
    /**
     * 初始化鍵位綁定管理器
     * @param skillManager 技能管理器
     * @param scene Phaser 場景
     */
    public initialize(skillManager: SkillManager, scene: Phaser.Scene): void {
        this.skillManager = skillManager;
        this.scene = scene;
        this.loadBindings();
        this.setupKeyboardListeners();
    }
    
    /**
     * 設置鍵位綁定
     * @param key 鍵盤按鍵
     * @param skillId 技能ID
     * @returns 是否成功綁定
     */
    public setBinding(key: string, skillId: string): boolean {
        if (!this.skillManager) {
            console.warn('鍵位綁定管理器未初始化');
            return false;
        }
        
        // 獲取技能
        const skill = this.skillManager.getSkill(skillId);
        if (!skill) {
            console.warn(`找不到ID為 ${skillId} 的技能`);
            return false;
        }
        
        // 檢查是否為主動技能且已啟用
        if (skill.getType() !== SkillType.ACTIVE || !this.skillManager.isSkillEnabled(skillId)) {
            console.warn(`技能 ${skill.getName()} 不是主動技能或未啟用，無法綁定按鍵`);
            return false;
        }
        
        // 如果此按鍵已綁定其他技能，先解綁
        if (this.keyBindings.has(key)) {
            const oldSkillId = this.keyBindings.get(key);
            if (oldSkillId) {
                this.skillKeyMap.delete(oldSkillId);
            }
        }
        
        // 如果此技能已綁定其他按鍵，先解綁
        if (this.skillKeyMap.has(skillId)) {
            const oldKey = this.skillKeyMap.get(skillId);
            if (oldKey) {
                this.keyBindings.delete(oldKey);
            }
        }
        
        // 設置新的綁定
        this.keyBindings.set(key, skillId);
        this.skillKeyMap.set(skillId, key);
        
        // 保存綁定
        this.saveBindings();
        
        console.log(`成功綁定技能 ${skill.getName()} 到按鍵 ${key}`);
        return true;
    }
    
    /**
     * 解除按鍵綁定
     * @param key 鍵盤按鍵
     * @returns 是否成功解除
     */
    public clearBinding(key: string): boolean {
        if (this.keyBindings.has(key)) {
            const skillId = this.keyBindings.get(key);
            if (skillId) {
                this.skillKeyMap.delete(skillId);
            }
            this.keyBindings.delete(key);
            this.saveBindings();
            return true;
        }
        return false;
    }
    
    /**
     * 解除技能綁定
     * @param skillId 技能ID
     * @returns 是否成功解除
     */
    public clearSkillBinding(skillId: string): boolean {
        if (this.skillKeyMap.has(skillId)) {
            const key = this.skillKeyMap.get(skillId);
            if (key) {
                this.keyBindings.delete(key);
            }
            this.skillKeyMap.delete(skillId);
            this.saveBindings();
            return true;
        }
        return false;
    }
    
    /**
     * 獲取技能的按鍵綁定
     * @param skillId 技能ID
     * @returns 綁定的按鍵，如果未綁定則返回空字符串
     */
    public getKeyForSkill(skillId: string): string {
        return this.skillKeyMap.get(skillId) || '';
    }
    
    /**
     * 獲取按鍵綁定的技能
     * @param key 按鍵
     * @returns 綁定的技能ID，如果未綁定則返回空字符串
     */
    public getSkillForKey(key: string): string {
        return this.keyBindings.get(key) || '';
    }
    
    /**
     * 獲取所有綁定
     * @returns 所有綁定的數組
     */
    public getAllBindings(): KeyBindMapping[] {
        const bindings: KeyBindMapping[] = [];
        
        for (const [key, skillId] of this.keyBindings.entries()) {
            bindings.push({ key, skillId });
        }
        
        return bindings;
    }
    
    /**
     * 設置鍵盤事件監聽器
     */
    private setupKeyboardListeners(): void {
        if (!this.scene) return;
        
        // 使用Phaser的鍵盤事件系統
        this.scene.input.keyboard.on('keydown', (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            if (this.keyBindings.has(key)) {
                const skillId = this.keyBindings.get(key);
                if (skillId && this.skillManager) {
                    // 使用技能
                    this.useSkill(skillId);
                }
            }
        });
    }
    
    /**
     * 使用技能
     * @param skillId 技能ID
     */
    private useSkill(skillId: string): void {
        if (!this.skillManager) return;
        
        const skill = this.skillManager.getSkill(skillId);
        if (!skill) return;
        
        // 檢查技能是否可用
        if (!skill.isLearned() || !this.skillManager.isSkillEnabled(skillId)) {
            return;
        }
        
        // 觸發遊戲事件以執行技能
        if (window.gameEvents) {
            console.log(`透過鍵位綁定觸發技能: ${skill.getName()}`);
            
            // 默認座標為滑鼠位置或玩家位置前方
            const gameScene = this.scene ? this.scene.scene.get('Game') : null;
            let x: number = 0;
            let y: number = 0;
            let direction: number = 0;
            
            if (gameScene) {
                // 獲取滑鼠位置
                const input = gameScene.input as Phaser.Input.InputPlugin;
                if (input) {
                    const pointer = input.activePointer;
                    if (pointer) {
                        const camera = gameScene.cameras.main;
                        x = pointer.worldX || camera.scrollX + pointer.x;
                        y = pointer.worldY || camera.scrollY + pointer.y;
                        
                        // 獲取玩家位置
                        const player = (gameScene as any).player;
                        if (player && player.sprite) {
                            // 計算方向向量
                            const dx = x - player.sprite.x;
                            const dy = y - player.sprite.y;
                            
                            // 計算角度 (弧度)
                            direction = Math.atan2(dy, dx);
                        }
                    }
                }
            }
            
            // 發送執行技能事件
            window.gameEvents.emit('skillUseRequest', skillId, x, y, direction);
        }
    }
    
    /**
     * 保存綁定到本地存儲
     */
    private saveBindings(): void {
        try {
            const bindings: Record<string, string> = {};
            
            for (const [key, skillId] of this.keyBindings.entries()) {
                bindings[key] = skillId;
            }
            
            localStorage.setItem('skillKeyBindings', JSON.stringify(bindings));
        } catch (error) {
            console.error('保存鍵位綁定失敗:', error);
        }
    }
    
    /**
     * 從本地存儲加載綁定
     */
    private loadBindings(): void {
        try {
            const savedBindings = localStorage.getItem('skillKeyBindings');
            if (savedBindings) {
                const bindings = JSON.parse(savedBindings) as Record<string, string>;
                
                for (const [key, skillId] of Object.entries(bindings)) {
                    // 檢查技能是否存在且已啟用
                    if (this.skillManager && this.skillManager.getSkill(skillId) && 
                        this.skillManager.isSkillEnabled(skillId)) {
                        this.keyBindings.set(key, skillId);
                        this.skillKeyMap.set(skillId, key);
                    }
                }
            }
        } catch (error) {
            console.error('加載鍵位綁定失敗:', error);
        }
    }
    
    /**
     * 清理所有鍵位綁定 (當技能被禁用時)
     */
    public clearAllBindings(): void {
        this.keyBindings.clear();
        this.skillKeyMap.clear();
        localStorage.removeItem('skillKeyBindings');
    }
}

// 在全局空間聲明 gameEvents 以便在 TypeScript 中使用
declare global {
    interface Window { 
        gameEvents?: Phaser.Events.EventEmitter;
        game?: any;
    }
}
