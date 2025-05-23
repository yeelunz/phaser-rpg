import { SkillFactory } from './skillFactory';
import { SkillManager } from './skillManager';
// import { PhaserSkillRenderer } from './phaserSkillRenderer'; // 已廢棄
import { Player } from '../../game/Player'; // 假設 Player 路徑正確
import { Scene } from 'phaser';

/**
 * 技能系統加載器
 * 負責初始化和加載技能系統的各個組件
 */
export class SkillLoader {
    private static instance: SkillLoader;
    private initialized: boolean = false;

    /**
     * 私有建構子 (單例模式)
     */
    private constructor() {}

    /**
     * 獲取單例實例
     */
    public static getInstance(): SkillLoader {
        if (!SkillLoader.instance) {
            SkillLoader.instance = new SkillLoader();
        }
        return SkillLoader.instance;
    }

    /**
     * 初始化技能系統
     * @returns 是否成功初始化
     */
    public async initialize(): Promise<boolean> {
        if (this.initialized) {
            console.log('技能系統已經初始化過了 (Skill system already initialized)');
            return true;
        }

        try {
            // 初始化技能工廠
            const skillFactory = SkillFactory.getInstance();
            // 假設 skillFactory.initialize() 是異步的且可能拋出錯誤
            // 如果它返回 Promise<boolean>，你可能需要檢查其返回值
            await skillFactory.initialize();

            console.log('技能系統初始化成功 (Skill system initialized successfully)');
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('技能系統初始化失敗 (Skill system initialization failed):', error);
            this.initialized = false; // 確保初始化失敗時狀態正確
            return false;
        }
    }

    /**
     * 為玩家創建技能管理器
     * @param player 玩家實例
     * @returns 技能管理器實例或在失敗時返回 null
     */
    public async createSkillManagerForPlayer(player: Player): Promise<SkillManager | null> {
        // 確保技能系統已初始化
        if (!this.initialized) {
            const success = await this.initialize();
            if (!success) {
                console.error('無法創建技能管理器，因為技能系統初始化失敗 (Cannot create skill manager, skill system initialization failed)');
                return null;
            }
        }

        try {            // 創建技能管理器
            // 假設 player.getStats() 返回技能管理器構造函數所需的參數
            // 這裡我們需要獲取 scene 或 game 實例
            const scene = player.sprite?.scene || null;
            const gameInstance = scene ? scene.game : undefined;
            const skillManager = new SkillManager(player.getStats(), gameInstance);
            // 假設 skillManager.initialize() 是異步的
            await skillManager.initialize(); // 如果 SkillManager 有自己的初始化邏輯

            // 設置預設技能
            this.setupDefaultSkills(skillManager);

            return skillManager;
        } catch (error) {
            console.error('為玩家創建技能管理器失敗 (Failed to create skill manager for player):', error);
            return null;
        }
    }    /**
     * 創建技能渲染器
     * @param scene Phaser場景
     * @param player 玩家實例
     * @returns 技能渲染器實例
     * @deprecated 此方法已廢棄，請使用新的技能渲染系統
     */
    public createSkillRenderer(_scene: Scene, _player: Player): any {
        console.warn('PhaserSkillRenderer 已廢棄，請使用新的技能渲染系統');
        return null;
    }

    /**
     * 設置預設技能
     * @param skillManager 技能管理器
     */
    private setupDefaultSkills(skillManager: SkillManager): void {
        // 添加一些起始技能點數
        skillManager.addSkillPoints(10); // 假設這個方法存在

        // 嘗試學習幾個基本技能
        const defaultSkillsIds = ['slash', 'magic_missile', 'battle_roar'];

        for (const skillId of defaultSkillsIds) {
            const skill = skillManager.getSkill(skillId); // 假設 getSkill 返回技能實例或 null/undefined
            if (skill) {
                console.log(`嘗試學習技能 (Attempting to learn skill): ${skillId}`);
                // 假設 learnSkill 返回 boolean 表示成功與否
                const success = skillManager.learnSkill(skillId);
                if (success) {
                    console.log(`成功學習技能 (Successfully learned skill): ${skill.getName()}`); // 假設 skill 有 getName 方法
                } else {
                    // 這裡可以更詳細地說明為什麼學習失敗，例如：點數不足、前置技能未學習等
                    // 這取決於 learnSkill 的內部邏輯和返回值
                    console.warn(`學習技能失敗 (Failed to learn skill): ${skillId}. 可能原因：點數不足、不滿足前置條件等。`);
                }
            } else {
                console.warn(`找不到預設技能 ID (Default skill ID not found): ${skillId}`);
            }
        }

        // 將基本技能設置到技能槽
        // 確保 'slash' 技能確實存在且已學習 (如果 learnSkill 是學習的唯一途徑)
        const slashSkill = skillManager.getSkill('slash');
        if (slashSkill && slashSkill.isLearned()) { // 假設 skill 有 isLearned 方法，或者 learnSkill 成功後可以直接設置
            const slotAssigned = skillManager.setActiveSkillSlot(0, 'slash'); // 假設 setActiveSkillSlot 返回 boolean
            if (slotAssigned) {
                console.log(`技能 'slash' 已設置到技能槽 0 (Skill 'slash' set to slot 0)`);
            } else {
                console.warn(`無法將技能 'slash' 設置到技能槽 0 (Failed to set skill 'slash' to slot 0)`);
            }
        } else {
            console.warn(`技能 'slash' 未學習或不存在，無法設置到技能槽 (Skill 'slash' not learned or not found, cannot set to slot)`);
        }
        // **修正點：移除了原碼中多餘的右大括號 '}'**
    }

    /**
     * 檢查技能系統是否已初始化
     */
    public isInitialized(): boolean {
        return this.initialized;
    }
}