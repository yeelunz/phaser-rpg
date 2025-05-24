import { SkillCondition } from "../SkillCondition";

// 所有技能共用的基礎參數介面
export interface CommonSkillParams {
    name: string;
    maxCooldown: number; // 技能最大冷卻時間 (毫秒)
    weight: number; // 技能在技能池中的權重 (用於隨機選擇)
    conditions?: SkillCondition[] | null; // 技能使用限制條件
    chainable?: boolean; // 使用完此技能是否會再度從技能池挑選技能 (預設為 false)
    preCastTime?: number; // 前搖時間 (毫秒)
    postCastTime?: number; // 後搖時間 (毫秒)
    
    // 傷害相關的共用參數
    damageMultiplier?: number; // 傷害倍率 (基於怪物攻擊力)
    ignoreDefense?: number; // 傷害追加的無視防禦值
    maxHpDamagePercent?: number; // 傷害追加的敵方最大HP百分比
    damageType?: 'physical' | 'magic' | 'mixed'; // 傷害類型
    damageTicks?: number; // 傷害段數 (預設為 1)
}
