import { CommonSkillParams } from "./CommonSkillParams";

// 突進技能的參數介面
export interface DashSkillParams extends CommonSkillParams {
    // 衝刺參數
    dashDistance: number; // 衝刺距離 (最多只會衝這麼多距離)
    dashSpeed?: number; // 衝刺速度 (如果不指定則使用怪物移動速度的倍數)
    dashSpeedMultiplier?: number; // 衝刺速度倍數 (相對於怪物基礎移動速度)
    
    // 衝刺終點位置
    dashTarget: 'random' | 'fixed' | 'player'; // 隨機方向、固定方向、朝向玩家
    
    // 固定方向參數 (當 dashTarget 為 'fixed' 時使用)
    fixedDirection?: number; // 衝刺方向 (角度)
    
    // 衝刺過程中是否造成傷害
    damagesDuringDash?: boolean; // 衝刺過程中是否對路徑上的敵人造成傷害
    dashDamageMultiplier?: number; // 衝刺傷害倍率 (如果 damagesDuringDash 為 true)
    
    // 碰撞處理
    stopOnCollision?: boolean; // 碰到障礙物或邊界時是否停止 (預設為 true)
}
