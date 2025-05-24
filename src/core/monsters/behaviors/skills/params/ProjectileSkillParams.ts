import { CommonSkillParams } from "./CommonSkillParams";

// 發射子彈技能的參數介面
export interface ProjectileSkillParams extends CommonSkillParams {
    // 投射物相關參數 (這些需要對應到現有的投射物系統)
    projectileType: string; // 投射物類型標識符 (對應到現有投射物系統)
    projectileSpeed?: number; // 投射物速度
    projectileLifespan?: number; // 投射物生存時間 (毫秒)
    
    // 發射行為參數
    firingDirection: 'player' | 'random' | 'fixed'; // 發射方向
    fixedDirection?: number; // 如果 firingDirection 為 'fixed'，指定角度 (度)
    barrageAngle: number; // 彈幕範圍角度 (0度=1顆，90度=4顆，60度=6顆等)
    
    // 持續發射相關 (兩種模式二選一)
    firingMode: 'duration' | 'fixed_count'; // 發射模式
    
    // 持續時間發射模式的參數
    totalDuration?: number; // 總持續時間 (毫秒)
    firingInterval?: number; // 發射間隔 (毫秒)
    
    // 固定彈數發射模式的參數
    totalBulletCount?: number; // 總共能夠發射的子彈數量
    bulletInterval?: number; // 每顆子彈之間的發射間隔 (毫秒)
    
    // 特殊投射物屬性
    piercingProjectile?: boolean; // 是否穿透目標
    maxPiercingTargets?: number; // 最大穿透目標數
    homingProjectile?: boolean; // 是否追蹤目標
    homingStrength?: number; // 追蹤強度 (0-1)
    
    // 視覺與音效
    projectileEffectKey?: string; // 投射物視覺效果鍵值
    projectileSoundKey?: string; // 投射物音效鍵值
}
