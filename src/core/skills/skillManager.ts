import { Skill } from './skill';
import { SkillFactory } from './skillFactory';
import { SkillType, SkillImplementation, SkillEventType, SkillEventListener } from './types';
import { Stats } from '../stats';
import { SkillEventManager } from './skillEventManager';

/**
 * 技能管理器類
 * 管理角色的技能和技能點數
 */
export class SkillManager {
    private skills: Map<string, Skill> = new Map();  // 所有技能映射表
    private skillPoints: number = 0;                 // 可用技能點數
    private totalSkillPoints: number = 0;            // 總共獲得的技能點數
    private activeSkillSlots: string[] = ['', '', '', ''];  // 主動技能快捷槽 (最多4個技能)
    private enabledSkills: string[] = ['', '', '', '', '']; // 啟用的技能槽位 (最多5個技能)
    private ownerStats: Stats;                          // 擁有者的屬性
    private eventManager: SkillEventManager = SkillEventManager.getInstance(); // 技能事件管理器
    private gameInstance: Phaser.Game | undefined;      // Phaser遊戲實例
    
    /**
     * 建構子
     * @param ownerStats 角色的屬性
     * @param gameInstance Phaser遊戲實例
     */
    constructor(ownerStats: Stats, gameInstance?: Phaser.Game) {
        this.ownerStats = ownerStats;
        this.gameInstance = gameInstance;
    }
    
    /**
     * 初始化技能管理器
     * 載入所有可用技能
     */
    public async initialize(): Promise<boolean> {
        try {
            const skillFactory = SkillFactory.getInstance();
            await skillFactory.initialize();
            
            // 載入所有技能ID
            const allSkillIds = skillFactory.getAllSkillIds();
            
            // 為每個技能ID創建技能實例
            for (const skillId of allSkillIds) {
                const skill = skillFactory.createSkillById(skillId);
                if (skill) {
                    this.skills.set(skillId, skill);
                }
            }
            
            console.log(`技能管理器初始化完成。載入 ${this.skills.size} 個技能。`);
            return true;
        } catch (error) {
            console.error("初始化技能管理器失敗:", error);
            return false;
        }
    }
    
    /**
     * 更新技能冷卻
     * @param deltaTime 過去的時間（毫秒）
     */
    public update(deltaTime: number): void {
        // 更新所有技能的冷卻
        for (const skill of this.skills.values()) {
            skill.update(deltaTime);
        }
    }
    
    /**
     * 更新所有技能的冷卻時間（別名，與update方法相同）
     * @param deltaTime 過去的時間（毫秒）
     */
    public updateCooldowns(deltaTime: number): void {
        this.update(deltaTime);
    }
    
    /**
     * 獲取技能實例
     * @param skillId 技能ID
     * @returns 技能實例，若ID不存在則返回undefined
     */
    public getSkill(skillId: string): Skill | undefined {
        return this.skills.get(skillId);
    }
    
    /**
     * 獲取所有技能
     * @returns 所有技能的迭代器
     */
    public getAllSkills(): Iterable<Skill> {
        return this.skills.values();
    }
    
    /**
     * 獲取已學習的技能列表
     * @returns 已學習的技能數組
     */
    public getLearnedSkills(): Skill[] {
        const learnedSkills: Skill[] = [];
        
        for (const skill of this.skills.values()) {
            if (skill.isLearned()) {
                learnedSkills.push(skill);
            }
        }
        
        return learnedSkills;
    }
    
    /**
     * 獲取可用技能點數
     */
    public getSkillPoints(): number {
        return this.skillPoints;
    }
    
    /**
     * 獲取總共獲得的技能點數
     */
    public getTotalSkillPoints(): number {
        return this.totalSkillPoints;
    }
    
    /**
     * 增加技能點數
     * @param points 增加的點數
     */
    public addSkillPoints(points: number): void {
        if (points <= 0) return;
        
        this.skillPoints += points;
        this.totalSkillPoints += points;
        console.log(`獲得 ${points} 技能點數，目前可用: ${this.skillPoints}`);
    }
    
    /**
     * 學習技能
     * @param skillId 技能ID
     * @returns 是否成功學習
     */
    public learnSkill(skillId: string): boolean {
        const skill = this.skills.get(skillId);
        
        if (!skill) {
            console.warn(`找不到ID為 ${skillId} 的技能`);
            return false;
        }
        
        if (skill.isLearned()) {
            console.warn(`技能 ${skill.getName()} 已經學習過了`);
            return false;
        }
          // 檢查所需技能點數
        const requiredPoints = skill.getUpgradePointCost();
        
        if (requiredPoints > this.skillPoints) {
            console.warn(`技能點數不足。需要 ${requiredPoints} 點，當前有 ${this.skillPoints} 點`);
            return false;
        }
        
        // 消耗技能點數
        this.skillPoints -= requiredPoints;
        
        // 學習技能
        const success = skill.learn();
        
        if (success) {
            console.log(`成功學習技能 ${skill.getName()}，消耗 ${requiredPoints} 技能點數`);
        }
        
        return success;
    }
    
    /**
     * 升級技能
     * @param skillId 技能ID
     * @returns 是否成功升級
     */
    public upgradeSkill(skillId: string): boolean {
        const skill = this.skills.get(skillId);
        
        if (!skill) {
            console.warn(`找不到ID為 ${skillId} 的技能`);
            return false;
        }
          if (!skill.isLearned()) {
            console.warn(`尚未學習技能 ${skill.getName()}`);
            return false;
        }
        
        // 檢查所需技能點數
        const requiredPoints = skill.getUpgradePointCost();
        
        if (requiredPoints < 0) {
            console.warn(`技能 ${skill.getName()} 已達到最大等級`);
            return false;
        }
        
        if (requiredPoints > this.skillPoints) {
            console.warn(`技能點數不足。需要 ${requiredPoints} 點，當前有 ${this.skillPoints} 點`);
            return false;
        }
        
        // 消耗技能點數
        this.skillPoints -= requiredPoints;
        
        // 升級技能
        const success = skill.levelUp();
        
        if (success) {
            console.log(`成功升級技能 ${skill.getName()}，消耗 ${requiredPoints} 技能點數`);
        }
        
        return success;
    }
    
    /**
     * 設置主動技能到快捷槽
     * @param slotIndex 快捷槽索引 (0-3)
     * @param skillId 技能ID，如果為空字符串則清空該槽位
     * @returns 是否成功設置
     */
    public setActiveSkillSlot(slotIndex: number, skillId: string): boolean {
        // 檢查槽位索引是否有效
        if (slotIndex < 0 || slotIndex >= this.activeSkillSlots.length) {
            console.warn(`無效的技能槽位索引: ${slotIndex}`);
            return false;
        }
        
        // 如果是清空槽位
        if (!skillId) {
            this.activeSkillSlots[slotIndex] = '';
            console.log(`清空技能槽位 ${slotIndex + 1}`);
            return true;
        }
        
        // 檢查技能是否存在
        const skill = this.skills.get(skillId);
        
        if (!skill) {
            console.warn(`找不到ID為 ${skillId} 的技能`);
            return false;
        }
        
        // 檢查技能是否已學習
        if (!skill.isLearned()) {
            console.warn(`尚未學習技能 ${skill.getName()}`);
            return false;
        }
        
        // 檢查技能是否為主動技能
        if (skill.getType() !== SkillType.ACTIVE) {
            console.warn(`無法將被動技能 ${skill.getName()} 設置到快捷槽`);
            return false;
        }
        
        // 檢查技能是否已在其他槽位
        const existingSlot = this.activeSkillSlots.indexOf(skillId);
        if (existingSlot >= 0 && existingSlot !== slotIndex) {
            // 清空原有槽位
            this.activeSkillSlots[existingSlot] = '';
            console.log(`從槽位 ${existingSlot + 1} 移除技能 ${skill.getName()}`);
        }
        
        // 設置技能到槽位
        this.activeSkillSlots[slotIndex] = skillId;
        console.log(`設置技能 ${skill.getName()} 到槽位 ${slotIndex + 1}`);
        
        return true;
    }
    
    /**
     * 獲取技能槽位內容
     * @returns 技能槽位的技能ID數組
     */
    public getActiveSkillSlots(): string[] {
        return [...this.activeSkillSlots]; // 返回副本
    }
    
    /**
     * 使用技能槽位的技能
     * @param slotIndex 快捷槽索引 (0-3)
     * @returns 被使用的技能實例，若槽位為空或技能不可用則返回undefined
     */
    public useSkillInSlot(slotIndex: number): Skill | undefined {
        // 檢查槽位索引是否有效
        if (slotIndex < 0 || slotIndex >= this.activeSkillSlots.length) {
            console.warn(`無效的技能槽位索引: ${slotIndex}`);
            return undefined;
        }
        
        // 檢查槽位是否有技能
        const skillId = this.activeSkillSlots[slotIndex];
        if (!skillId) {
            console.warn(`技能槽位 ${slotIndex + 1} 為空`);
            return undefined;
        }
        
        // 獲取技能實例
        const skill = this.skills.get(skillId);
        if (!skill) {
            console.warn(`技能槽位 ${slotIndex + 1} 中的技能 ID ${skillId} 無效`);
            return undefined;
        }  
        
        // 消耗能量
        if (skill.getType() === SkillType.ACTIVE) {
            this.ownerStats.consumeEnergy(skill.getEnergyCost());
        }  
        // 開始冷卻
        skill.startCooldown();
        
        console.log(`使用技能 ${skill.getName()}`);
        
        return skill;
    }
    
    /**
     * 直接使用指定ID的技能
     * @param skillId 技能ID
     * @returns 被使用的技能實例，若技能不存在或不可用則返回undefined
     */
    public useSkill(skillId: string): Skill | undefined {
        // 獲取技能實例
        const skill = this.skills.get(skillId);
        if (!skill) {
            console.warn(`找不到ID為 ${skillId} 的技能`);
            return undefined;
        }
        
        // 檢查技能是否已學習
        if (!skill.isLearned()) {
            console.warn(`尚未學習技能 ${skill.getName()}`);
            return undefined;
        }
        
        // 消耗能量
        if (skill.getType() === SkillType.ACTIVE) {
            this.ownerStats.consumeEnergy(skill.getEnergyCost());
        }
        
        // 開始冷卻
        skill.startCooldown();
        
        console.log(`使用技能 ${skill.getName()}`);
        
        return skill;
    }
    /**
     * 獲取技能的實現
     * @param skillId 技能ID
     * @param level 技能等級
     * @returns Promise 解析為技能實現實例，若找不到則返回undefined
     */
    public async getSkillImplementation(skillId: string, level: number): Promise<SkillImplementation | undefined> {
        try {
            console.log(`嘗試載入技能實現: ${skillId}，等級: ${level}`);
            
            // 使用 Vite 的 import.meta.glob 來預加載所有實現文件
            // 這樣 Vite 在構建時就能識別所有可能的導入路徑
            const modules = import.meta.glob('./implementations/*.ts') as Record<string, () => Promise<any>>;
            const modulePath = `./implementations/${skillId}.ts`;
            
            if (!(modulePath in modules)) {
                console.warn(`找不到技能實現文件: ${modulePath}`);
                return undefined;
            }
            
            // 動態載入模組
            const moduleLoader = modules[modulePath];
            const module = await moduleLoader();
            
            // 檢查模組是否提供了工廠方法
            const factoryName = `${skillId}Factory`;
            if (module && typeof module[factoryName]?.createImplementation === 'function') {
                console.log(`成功載入技能實現: ${skillId}，等級: ${level}`);
                return module[factoryName].createImplementation(level, this.gameInstance);
            } else {
                console.warn(`技能 ${skillId} 的模組沒有提供有效的工廠方法: ${factoryName}`);
                return undefined;
            }
        } catch (error) {
            console.error(`載入技能 ${skillId} 的實現失敗:`, error);
            return undefined;
        }
    }
    
    /**
     * 重置所有技能冷卻
     */
    public resetAllCooldowns(): void {
        for (const skill of this.skills.values()) {
            skill.resetCooldown();
        }
        console.log('已重置所有技能冷卻');
    }
    
    /**
     * 註冊技能事件監聽器
     * @param eventType 事件類型
     * @param listener 監聽器函數
     */
    public addEventListener(eventType: SkillEventType, listener: SkillEventListener): void {
        this.eventManager.addEventListener(eventType, listener);
    }
    
    /**
     * 移除技能事件監聽器
     * @param eventType 事件類型
     * @param listener 監聽器函數
     */
    public removeEventListener(eventType: SkillEventType, listener: SkillEventListener): void {
        this.eventManager.removeEventListener(eventType, listener);
    }
    
    /**
     * 獲取技能事件管理器
     * @returns 技能事件管理器實例
     */
    public getEventManager(): SkillEventManager {
        return this.eventManager;
    }

    /**
     * 根據角色等級獲取可用的技能槽數量
     * @returns 技能槽數量(1~5)
     */
    public getAvailableSkillSlots(): number {
        // 根據角色等級獲取可用的技能槽數量
        if (!this.ownerStats) return 2; // 預設最小值
        
        const level = this.ownerStats.getLevel ? this.ownerStats.getLevel() : 1;
        
        if (level >= 40) return 5;      // LV40~LV50+: 5個槽位
        else if (level >= 25) return 4; // LV25~LV39: 4個槽位
        else if (level >= 10) return 3; // LV10~LV24: 3個槽位
        return 2;                       // LV1~LV9: 2個槽位
    }

    /**
     * 獲取已啟用的技能ID列表
     * @returns 已啟用的技能ID列表
     */
    public getEnabledSkills(): string[] {
        return [...this.enabledSkills]; // 返回副本
    }

    /**
     * 啟用技能
     * @param skillId 要啟用的技能ID
     * @param slotIndex 指定的槽位索引，如果不指定則自動選擇第一個空槽
     * @returns 是否成功啟用
     */
    public enableSkill(skillId: string, slotIndex?: number): boolean {
        // 檢查技能是否存在且已學習
        const skill = this.skills.get(skillId);
        if (!skill || !skill.isLearned()) {
            console.warn(`無法啟用技能: ${skillId}，技能不存在或未學習`);
            return false;
        }
        
        // 獲取可用的技能槽數量
        const availableSlots = this.getAvailableSkillSlots();
        
        // 檢查技能是否已經啟用
        const existingIndex = this.enabledSkills.indexOf(skillId);
        if (existingIndex >= 0) {
            console.log(`技能 ${skill.getName()} 已在槽位 ${existingIndex + 1} 啟用`);
            return true; // 已經啟用，視為成功
        }
        
        // 如果指定槽位
        if (slotIndex !== undefined) {
            // 檢查槽位是否有效
            if (slotIndex < 0 || slotIndex >= availableSlots) {
                console.warn(`槽位索引 ${slotIndex} 無效，可用槽位數量: ${availableSlots}`);
                return false;
            }
            
            // 檢查指定槽位是否已有技能
            if (this.enabledSkills[slotIndex] !== '') {
                console.warn(`槽位 ${slotIndex + 1} 已有技能，請先禁用該槽位的技能`);
                return false;
            }
            
            // 啟用技能到指定槽位
            this.enabledSkills[slotIndex] = skillId;
            console.log(`技能 ${skill.getName()} 已啟用到槽位 ${slotIndex + 1}`);
            return true;
        }
        
        // 自動選擇第一個空槽
        for (let i = 0; i < availableSlots; i++) {
            if (this.enabledSkills[i] === '') {
                this.enabledSkills[i] = skillId;
                console.log(`技能 ${skill.getName()} 已啟用到槽位 ${i + 1}`);
                return true;
            }
        }
        
        console.warn(`無法啟用技能 ${skill.getName()}，所有可用槽位 (${availableSlots}) 已滿`);
        return false;
    }

    /**
     * 禁用技能
     * @param skillId 要禁用的技能ID或槽位索引
     * @returns 是否成功禁用
     */
    public disableSkill(skillIdOrIndex: string | number): boolean {
        let skillId = '';
        
        if (typeof skillIdOrIndex === 'number') {
            // 使用索引禁用
            const index = skillIdOrIndex;
            if (index < 0 || index >= this.enabledSkills.length) {
                console.warn(`槽位索引 ${index} 無效`);
                return false;
            }
            
            skillId = this.enabledSkills[index];
            if (skillId === '') {
                console.warn(`槽位 ${index + 1} 沒有啟用的技能`);
                return false;
            }
            
            const skill = this.skills.get(skillId);
            this.enabledSkills[index] = '';
            console.log(`技能 ${skill ? skill.getName() : skillId} 已從槽位 ${index + 1} 禁用`);

            // 清除鍵位綁定
            this.clearKeyBinding(skillId);
            
            return true;
        } else {
            // 使用技能ID禁用
            skillId = skillIdOrIndex;
            const index = this.enabledSkills.indexOf(skillId);
            if (index < 0) {
                console.warn(`技能 ${skillId} 未啟用，無法禁用`);
                return false;
            }
            
            const skill = this.skills.get(skillId);
            this.enabledSkills[index] = '';
            console.log(`技能 ${skill ? skill.getName() : skillId} 已從槽位 ${index + 1} 禁用`);
            
            // 清除鍵位綁定
            this.clearKeyBinding(skillId);
            
            return true;
        }
    }

    /**
     * 清除技能的鍵位綁定
     * @param skillId 技能ID
     */    private clearKeyBinding(skillId: string): void {
        try {
            // 動態引入鍵位綁定管理器 - 使用 ES6 import 語法
            import('./keyBindManager').then(({ KeyBindManager }) => {
                const keyBindManager = KeyBindManager.getInstance();
                keyBindManager.clearSkillBinding(skillId);
                console.log(`已清除技能 ${skillId} 的鍵位綁定`);
            }).catch(error => {
                console.warn('無法清除鍵位綁定:', error);
            });
        } catch (error) {
            console.warn('無法清除鍵位綁定:', error);
        }
    }

    /**
     * 檢查技能是否已啟用
     * @param skillId 技能ID
     * @returns 技能是否已啟用
     */
    public isSkillEnabled(skillId: string): boolean {
        return this.enabledSkills.includes(skillId);
    }

    /**
     * 獲取技能的槽位索引
     * @param skillId 技能ID
     * @returns 槽位索引，如果未啟用則返回-1
     */
    public getSkillSlotIndex(skillId: string): number {
        return this.enabledSkills.indexOf(skillId);
    }

    /**
     * 等待技能管理器初始化完成（原本在 Game.ts）
     */
    public static async waitForInitialization(skillManager: SkillManager): Promise<void> {
        if (!skillManager) {
            console.warn('等待技能管理器: skillManager 不存在');
            await new Promise(resolve => setTimeout(resolve, 500));
            return;
        }
        let retries = 0;
        const maxRetries = 10;
        while (retries < maxRetries) {
            const hasSkills = Array.from(skillManager.getAllSkills()).length > 0;
            if (hasSkills) {
                console.log('技能管理器初始化完成，已加載技能數量:', Array.from(skillManager.getAllSkills()).length);
                return;
            }
            console.log('等待技能管理器初始化...', retries + 1);
            await new Promise(resolve => setTimeout(resolve, 500));
            retries++;
        }
        console.warn('技能管理器初始化等待超時，繼續執行');
    }
}