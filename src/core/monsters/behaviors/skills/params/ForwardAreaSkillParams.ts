import { CommonSkillParams } from "./CommonSkillParams";

// 前方範圍傷害技能的參數介面
export interface ForwardAreaSkillParams extends CommonSkillParams {
    // 範圍類型
    areaType: 'circle' | 'rectangle'; // 圓形或方框
    
    // 距離自身中心的偏移
    offsetDistance: number; // 距離怪物中心多遠開始生效
    
    // 實際範圍參數
    // 對於圓形：radius 為半徑
    // 對於方框：width 和 height 為寬高
    radius?: number; // 圓形半徑
    width?: number; // 方框寬度
    height?: number; // 方框高度
    
    // 持續時間
    persistTime?: number; // 傷害持續時間 (毫秒，如果為 0 則為瞬間傷害)
    showWarning?: boolean; // 是否顯示攻擊範圍警告
    
    // 視覺和音效
    visualEffectKey?: string; // 視覺效果鍵值
    soundEffectKey?: string; // 音效鍵值
}
