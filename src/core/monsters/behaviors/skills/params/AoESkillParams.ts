import { CommonSkillParams } from "./CommonSkillParams";

// 自身周圍傷害技能的參數介面
export interface AoESkillParams extends CommonSkillParams {
    radius: number; // 圓形範圍的半徑
    showWarning?: boolean; // 前搖時間時是否會顯示傷害範圍警告 (預設為 false)
    persistTime?: number; // 傷害持續時間 (毫秒，如果為 0 則為瞬間傷害)
}
