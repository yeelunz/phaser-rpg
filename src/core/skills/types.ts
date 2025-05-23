/**
 * 技能系統類型定義文件
 */

// 從 combat/entitySearchSystem 導入 EntitySearchFilter
import { EntitySearchFilter } from '../combat/entitySearchSystem';

/**
 * 技能實現介面
 * 所有技能實現類必須實現此介面
 */
export interface SkillImplementation {
    /**
     * 執行技能
     * @param params 技能參數，包含施法位置和方向
     */
    execute(params: { x: number, y: number, direction: number }): void;
    
    /**
     * 獲取技能等級
     */
    getLevel(): number;
}

/**
 * 技能實現工廠介面
 * 每個技能文件需要實現此介面以創建對應等級的技能實現
 */
export interface SkillImplementationFactory {
    /**
     * 創建技能實現實例
     * @param level 技能等級
     * @param game Phaser遊戲實例
     * @returns 對應等級的技能實現
     */
    createImplementation(level: number, game: Phaser.Game): SkillImplementation;
}

/**
 * 技能事件類型列舉
 */
export enum SkillEventType {
    // 基本技能施放事件
    CAST_START = 'cast_start',         // 開始施法
    CAST_EFFECT = 'cast_effect',       // 施法效果產生（前搖結束）
    CAST_COMPLETE = 'cast_complete',   // 施法完全結束（後搖結束）
    CAST_INTERRUPT = 'cast_interrupt', // 施法被中斷
    
    // 新增技能行為事件
    SKILL_HOLD = 'skill_hold',         // 技能持續按住中
    SKILL_CHARGE = 'skill_charge',     // 技能蓄能中
    SKILL_RELEASE = 'skill_release',   // 技能釋放按鍵
    SKILL_TOGGLE = 'skill_toggle',     // 技能狀態切換
    
    // 傷害相關事件
    DAMAGE_DEALT = 'damage_dealt',        // 造成傷害
    DAMAGE_RECEIVED = 'damage_received',  // 受到傷害
    SKILL_HIT_ENEMY = 'skill_hit_enemy',  // 技能命中敵人
    CRITICAL_HIT = 'critical_hit',        // 暴擊事件
    
    // 特殊條件事件
    PLAYER_ATTACK = 'player_attack',      // 玩家攻擊
    PLAYER_KILL = 'player_kill',          // 玩家擊殺敵人
    PLAYER_DODGE = 'player_dodge',        // 玩家閃避
    PLAYER_BLOCK = 'player_block',        // 玩家格擋
    PLAYER_STATUS_CHANGE = 'player_status_change'  // 玩家狀態變化
}

/**
 * 技能事件介面
 */
export interface SkillEvent {
    type: SkillEventType;        // 事件類型
    skillId: string;             // 技能ID
    skillLevel: number;          // 技能等級
    casterId: string;            // 施法者ID
    timestamp: number;           // 事件發生時間戳
    position?: { x: number, y: number }; // 施法位置
    direction?: number;          // 施法方向
    data?: any;                  // 額外資料
}

/**
 * 技能事件監聽器介面
 */
export interface SkillEventListener {
    (event: SkillEvent): void;
}

/**
 * 技能類別列舉 - 區分主動或被動技能
 */
export enum SkillType {
    ACTIVE = 'active',     // 主動技能 - 需要玩家主動使用
    PASSIVE = 'passive'    // 被動技能 - 自動生效
}

/**
 * 技能組合類型列舉 - 區分單一技能或組合技能
 */
export enum SkillGroupType {
    REGULAR = 'regular',   // 常規技能 - 每個技能學習/升級對應一個技能
    BUNDLED = 'bundled'    // 組合技能 - 主題式技能，一個主題有一個主動和一個被動技能，同時升級
}

// 從 combat/entitySearchSystem 導入 EntitySearchFilter
export type { EntitySearchFilter } from '../combat/entitySearchSystem';

/**
 * 技能分類列舉 - 用於技能樹UI分類
 */
export enum SkillCategory {
    BASIC_ACTIVE = 'basic_active',       // 基礎技能-主動
    BASIC_PASSIVE = 'basic_passive',     // 基礎技能-被動
    BASIC_COMMON = 'basic_common',       // 基礎技能-共通
    ULTIMATE = 'ultimate'                // 究極技能
}

/**
 * 技能點數需求類型
 */
export enum SkillPointRequirementType {
    A = 'A', // A型技能
    B = 'B', // B型技能
    C = 'C', // C型技能
    D = 'D', // D型技能
    E = 'E', // E型技能
    F = 'F'  // F型技能
}

/**
 * 武器限制類型
 */

export enum WeaponRestrictionType {
    ANY = 'any',           // 任何武器都可使用
    MELEE = 'melee',       // 近戰武器限定
    MEDIUM = 'medium',     // 中距離武器限定
    RANGED = 'ranged',     // 遠程武器限定
    NONE = 'none'          // 無限制
}

/**
 * 技能傷害類型
 */
export enum SkillDamageType {
    PHYSICAL = 'physical', // 物理傷害
    MAGICAL = 'magical',   // 魔法傷害
    HYBRID = 'hybrid'      // 混合傷害
}

/**
 * 技能投射物類別
 */
export enum SkillProjectileCategory {
    PROJECTILE = 'projectile',  // 投射物 (箭矢、火球等)
    SLASH = 'slash',            // 斬擊 (近戰揮砍)
    THRUST = 'thrust',          // 刺擊 (向前刺擊)
    AREA = 'area',              // 範圍效果 (爆炸、光環)
    BUFF = 'buff',              // 增益效果
    DEBUFF = 'debuff'           // 減益效果
}

/**
 * 碰撞框類型
 */
export enum CollisionBoxType {
    CIRCLE = 'circle',      // 圓形碰撞框
    RECTANGLE = 'rectangle' // 矩形碰撞框
}

/**
 * 技能消失機制
 */
export enum SkillFadeType {
    TIME = 'time',               // 時間結束消失
    OUT_OF_RANGE = 'range',      // 超出範圍消失
    BUTTON_RELEASE = 'release',  // 釋放按鍵消失
    HIT_TARGET = 'hit',          // 命中目標消失
    PENETRATION_DEPLETED = 'penetration' // 穿透次數耗盡消失
}

/**
 * JSON中的技能資料結構
 */
export interface SkillData {
    id: string;                      // 唯一技能ID
    name: string;                    // 技能名稱
    icon: string;                    // 技能圖示 (emoji)
    castTime: number;                // 技能前搖時間(秒)
    recoveryTime: number;            // 技能後搖時間(秒)
    maxLevel: number;                // 技能最大等級 (最高5級)
    animation?: string;              // 技能動畫ID (可選)
    energyCost: number[];            // 各等級能量消耗 [等級1, 等級2, ...]
    cooldown: number[];              // 各等級冷卻時間 [等級1, 等級2, ...]
    type: SkillType;                 // 技能類型 (主動/被動)    category: SkillCategory;         // 技能分類 (基礎主動/基礎被動/究極)
    descriptions: string[];          // 各等級技能描述
    implementations?: string[];      // 各等級技能實現代碼前綴 (兼容舊版，不再使用)
    weaponRestriction: WeaponRestrictionType; // 武器限制
    skillPointType: SkillPointRequirementType; // 技能點數需求類型
    groupType?: SkillGroupType;      // 技能組合類型 (常規/組合)
}

/**
 * 技能投射物資料結構
 */
export interface SkillProjectileData {
    id: string;                      // 唯一ID
    name: string;                    // 名稱
    animationType: string;           // 動畫類型
    category: SkillProjectileCategory; // 技能類別
    spriteScale?: number;            // 精靈大小比例
    sourceEntityId?: string;         // 傷害來源ID
    spritePath?: string;             // 精靈圖路徑
    
    // 物理模型屬性
    position?: { x: number, y: number }; // 初始位置
    collisionType?: CollisionBoxType; // 碰撞器類型
    width?: number;                  // 矩形寬度
    height?: number;                 // 矩形高度
    radius?: number;                 // 圓形半徑
    
    // 技能傷害屬性
    damageType?: SkillDamageType;   // 傷害類型
    attributes?: Record<string, any>; // 額外屬性
    
    // 行為系統
    movementBehavior?: any;         // 移動行為
    behaviors?: any[];              // 行為列表
    destructionCondition?: any;     // 銷毀條件
    
    // 目標搜索
    searchFilter?: EntitySearchFilter; // 目標搜索過濾器
}

/**
 * 技能點數需求表
 */
export const SKILL_POINT_REQUIREMENTS: Record<SkillPointRequirementType, number[]> = {
    [SkillPointRequirementType.A]: [1, 2, 3, 4, 0],  // 0代表無法升到5級
    [SkillPointRequirementType.B]: [1, 1, 2, 4, 0],
    [SkillPointRequirementType.C]: [1, 3, 5, 7, 0],
    [SkillPointRequirementType.D]: [2, 4, 6, 8, 0],
    [SkillPointRequirementType.E]: [5, 5, 5, 5, 0],
    [SkillPointRequirementType.F]: [10, 10, 10, 10, 0]
};
