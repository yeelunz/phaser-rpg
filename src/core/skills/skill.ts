import {
    SkillType,
    SkillPointRequirementType,
    WeaponRestrictionType,
    SKILL_POINT_REQUIREMENTS,
    SkillData,
    SkillCategory,
    SkillGroupType
} from './types';
import { Stats } from '../stats'; // 引入角色屬性系統

/**
 * 基礎技能類
 * 管理技能的基本屬性和狀態
 */
export class Skill {
    // 基本資料
    private id: string;                       // 唯一識別碼
    private name: string;                     // 技能名稱
    private icon: string;                     // 技能圖示
    private castTime: number;                 // 前搖時間
    private recoveryTime: number;             // 後搖時間
    private maxLevel: number;                 // 最大等級
    private animation?: string;               // 技能動畫ID
    private energyCost: number[];             // 各等級能量消耗
    private cooldown: number[];               // 各等級冷卻時間
    private type: SkillType;                  // 技能類型
    private descriptions: string[];           // 各等級描述
    private weaponRestriction: WeaponRestrictionType; // 武器要求
    private skillPointType: SkillPointRequirementType; // 技能點數類型
    private category: SkillCategory;          // 技能分類
    private groupType: SkillGroupType = SkillGroupType.REGULAR; // 技能組合類型，默認為常規

    // 實例狀態
    private learned: boolean = false;         // 是否已學習
    private currentLevel: number = 0;         // 當前等級 (0表示未學習)
    private onCooldown: boolean = false;      // 是否在冷卻中
    private cooldownRemaining: number = 0;    // 剩餘冷卻時間
    private lastCastTime: number = 0;         // 上次施放時間

    /**
     * 建構子
     * @param skillData 技能資料
     */
    constructor(skillData: SkillData) {
        this.id = skillData.id;
        this.name = skillData.name;
        this.icon = skillData.icon || '❓'; // 預設圖示
        this.castTime = skillData.castTime;
        this.recoveryTime = skillData.recoveryTime;
        this.maxLevel = Math.min(skillData.maxLevel, 5); // 最大5級
        this.animation = skillData.animation;
        this.energyCost = skillData.energyCost;
        this.cooldown = skillData.cooldown;
        this.type = skillData.type;
        this.descriptions = skillData.descriptions;
        // 不再設置 implementations，改為動態載入
        this.weaponRestriction = skillData.weaponRestriction;
        this.skillPointType = skillData.skillPointType;
        this.category = skillData.category;
        this.groupType = skillData.groupType || SkillGroupType.REGULAR; // 預設為常規技能
    }

    /**
     * 獲取技能ID
     */
    public getId(): string {
        return this.id;
    }

    /**
     * 獲取技能名稱
     */
    public getName(): string {
        return this.name;
    }

    /**
     * 獲取技能圖示
     */
    public getIcon(): string {
        return this.icon;
    }

    /**
     * 獲取技能前搖時間
     */
    public getCastTime(): number {
        return this.castTime;
    }

    /**
     * 獲取技能後搖時間
     */
    public getRecoveryTime(): number {
        return this.recoveryTime;
    }

    /**
     * 獲取技能最大等級
     */
    public getMaxLevel(): number {
        return this.maxLevel;
    }

    /**
     * 獲取技能當前等級
     */
    public getCurrentLevel(): number {
        return this.currentLevel;
    }

    /**
     * 設置技能當前等級
     * @param level 等級
     */
    public setCurrentLevel(level: number): void {
        if (level < 0) {
            this.currentLevel = 0;
            this.learned = false;
            return;
        }
        
        if (level > this.maxLevel) {
            level = this.maxLevel;
        }
        
        this.currentLevel = level;
        this.learned = level > 0;
    }    /**
     * 學習技能
     */
    public learn(): boolean {
        if (this.learned) {
            return false;
        }
        this.learned = true;
        this.currentLevel = 1;
        return true;
    }

    /**
     * 提升技能等級
     */
    public levelUp(): boolean {
        if (this.currentLevel >= this.maxLevel) {
            return false;
        }

        this.currentLevel++;
        this.learned = true;
        return true;
    }

    /**
     * 獲取技能動畫ID
     */
    public getAnimation(): string | undefined {
        return this.animation;
    }

    /**
     * 獲取技能能量消耗
     */
    public getEnergyCost(): number {
        if (!this.learned || this.currentLevel <= 0 || this.currentLevel > this.energyCost.length) {
            return 0;
        }
        return this.energyCost[this.currentLevel - 1];
    }

    /**
     * 獲取技能冷卻時間
     */
    public getCooldown(): number {
        if (!this.learned || this.currentLevel <= 0 || this.currentLevel > this.cooldown.length) {
            return 0;
        }
        return this.cooldown[this.currentLevel - 1];
    }

    /**
     * 獲取技能描述
     */
    public getDescription(): string {
        if (!this.learned || this.currentLevel <= 0 || this.currentLevel > this.descriptions.length) {
            return "技能尚未學習";
        }
        return this.descriptions[this.currentLevel - 1];
    }

    /**
     * 獲取所有等級描述
     */
    public getAllDescriptions(): string[] {
        return this.descriptions;
    }    /**
     * 獲取技能類型
     */
    public getType(): SkillType {
        return this.type;
    }

    /**
     * 獲取武器限制
     */
    public getWeaponRestriction(): WeaponRestrictionType {
        return this.weaponRestriction;
    }

    /**
     * 獲取技能點數類型
     */
    public getSkillPointType(): SkillPointRequirementType {
        return this.skillPointType;
    }

    /**
     * 獲取技能升級所需技能點數
     */
    public getUpgradePointCost(): number {
        // 基於當前等級和技能點數類型計算
        const nextLevel = this.currentLevel + 1;
        if (nextLevel > this.maxLevel) {
            return -1; // 已達最高等級
        }

        return SKILL_POINT_REQUIREMENTS[this.skillPointType]?.[nextLevel - 1] || 1;
    }

    /**
     * 檢查是否已學習技能
     */
    public isLearned(): boolean {
        return this.learned && this.currentLevel > 0;
    }

    /**
     * 檢查技能是否在冷卻中
     */
    public isOnCooldown(): boolean {
        return this.onCooldown;
    }

    /**
     * 啟動技能冷卻
     */
    public startCooldown(): void {
        this.onCooldown = true;
        this.cooldownRemaining = this.getCooldown();
        this.lastCastTime = Date.now();
    }

    /**
     * 重置技能冷卻
     */
    public resetCooldown(): void {
        this.onCooldown = false;
        this.cooldownRemaining = 0;
    }

    /**
     * 獲取剩餘冷卻時間
     * 注意：冷卻跟後搖時間是分開的
     * 冷卻時間： 技能施放後的冷卻時間，此時間內技能無法再次施放，但施放者可以移動
     * 後搖時間：技能施放後的動畫時間，此時間內施放者無法移動，也無法施放其他技能(但某些技能可以藉由參數來設定是否可以施放其他技能)
     */
    public getCooldownRemaining(): number {
        if (!this.onCooldown) {
            return 0;
        }

        // 根據冷卻開始時間和當前時間計算剩餘冷卻
        const elapsedTime = (Date.now() - this.lastCastTime) / 1000; // 轉換為秒
        this.cooldownRemaining = Math.max(0, this.getCooldown() - elapsedTime);

        // 如果冷卻已結束
        if (this.cooldownRemaining <= 0) {
            this.onCooldown = false;
            this.cooldownRemaining = 0;
        }

        return this.cooldownRemaining;
    }

    /**
     * 更新技能狀態
     * @param deltaTime 時間差(毫秒)
     */
    public update(deltaTime: number): void {
        // 更新冷卻時間
        if (this.onCooldown) {
            this.cooldownRemaining -= deltaTime / 1000; // 轉換為秒

            if (this.cooldownRemaining <= 0) {
                this.resetCooldown();
            }
        }
    }

    /**
     * 檢查是否可以使用技能
     * @param casterStats 施放者屬性
     * @param currentWeaponType 當前武器類型
     */
    public canUse(casterStats: Stats, currentWeaponType: WeaponRestrictionType): boolean {
        // 檢查是否已學習
        if (!this.isLearned()) {
            return false;
        }

        // 檢查是否在冷卻中
        if (this.isOnCooldown()) {
            return false;
        }

        // 主動技能才需要檢查能量
        if (this.type === SkillType.ACTIVE) {
            // 檢查能量是否足夠
            if (casterStats.getCurrentEnergy() < this.getEnergyCost()) {
                return false;
            }
        }

        // 檢查武器限制
        if (this.weaponRestriction !== WeaponRestrictionType.ANY && 
            this.weaponRestriction !== currentWeaponType) {
            return false;
        }

        return true;
    }

    /**
     * 獲取技能執行實現的識別碼
     * 不再依賴 implementations 數組，直接返回技能 ID
     */
    public getImplementationCode(): string {
        if (this.currentLevel <= 0 || this.currentLevel > this.maxLevel) {
            return '';
        }
        // 直接返回技能 ID，技能管理器會根據 ID 和等級動態載入實現
        return this.id;
    }

    /**
     * 獲取技能分類
     */
    public getCategory(): SkillCategory {
        return this.category;
    }

    /**
     * 獲取技能類型 (主動/被動)
     */
    public getType(): SkillType {
        return this.type;
    }

    /**
     * 獲取技能組合類型
     */
    public getGroupType(): SkillGroupType {
        return this.groupType;
    }

    /**
     * 設置技能組合類型
     */
    public setGroupType(groupType: SkillGroupType): void {
        this.groupType = groupType;
    }
}
