import { Skill } from './skill';
import { SkillData, SkillProjectileData } from './types';
import { DataLoader } from '../data/dataloader';

/**
 * 技能工廠類
 * 負責從JSON資料創建技能實例
 */
export class SkillFactory {
    private static instance: SkillFactory;
    private skillDataCache: Map<string, SkillData> = new Map();
    private projectileDataCache: Map<string, SkillProjectileData> = new Map();
    private dataLoader: DataLoader;
    
    /**
     * 私有建構子 (單例模式)
     */
    private constructor() {
        this.dataLoader = new DataLoader();
    }
    
    /**
     * 獲取單例實例
     */
    public static getInstance(): SkillFactory {
        if (!SkillFactory.instance) {
            SkillFactory.instance = new SkillFactory();
        }
        return SkillFactory.instance;
    }
    
    /**
     * 初始化技能工廠
     * 載入所有技能資料
     */
    public async initialize(): Promise<boolean> {
        try {
            // 載入技能基礎資料
            await this.loadSkillData();
            
            // 載入技能投射物資料

            console.log(`技能工廠初始化完成。載入 ${this.skillDataCache.size} 個技能資料和 ${this.projectileDataCache.size} 個投射物資料。`);
            return true;
        } catch (error) {
            console.error("初始化技能工廠失敗:", error);
            return false;
        }
    }
    
    /**
     * 載入技能資料
     */    private async loadSkillData(): Promise<void> {
        try {
            // 從檔案載入技能資料
            const skillsData = await this.dataLoader.loadJSON('/assets/data/skills/skills.json');
            
            if (!skillsData || !Array.isArray(skillsData)) {
                throw new Error("技能資料格式不正確");
            }
            
            // 清空現有的技能資料快取
            this.skillDataCache.clear();
            
            // 遍歷所有技能資料並存入快取
            for (const skillData of skillsData) {
                if (skillData.id) {
                    this.skillDataCache.set(skillData.id, skillData);
                    console.log(`載入技能資料: ${skillData.id} - ${skillData.name}`);
                }
            }
        } catch (error) {
            console.error("載入技能資料失敗:", error);
            throw error;
        }
    }
    

    
    /**
     * 從ID創建技能實例
     * @param skillId 技能ID
     * @returns 技能實例，若ID不存在則返回undefined
     */
    public createSkillById(skillId: string): Skill | undefined {
        // 檢查快取中是否有此技能資料
        const skillData = this.skillDataCache.get(skillId);
        
        if (!skillData) {
            console.warn(`找不到ID為 ${skillId} 的技能資料`);
            return undefined;
        }
        
        // 創建技能實例
        return new Skill(skillData);
    }
    
    /**
     * 從ID獲取原始技能資料
     * @param skillId 技能ID
     * @returns 技能資料，若ID不存在則返回undefined
     */
    public getSkillDataById(skillId: string): SkillData | undefined {
        return this.skillDataCache.get(skillId);
    }
    
    /**
     * 獲取所有技能ID列表
     * @returns 技能ID列表
     */
    public getAllSkillIds(): string[] {
        return Array.from(this.skillDataCache.keys());
    }
    

}
