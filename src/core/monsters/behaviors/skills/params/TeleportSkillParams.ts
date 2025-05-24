import { CommonSkillParams } from "./CommonSkillParams";

// 瞬間移動技能的參數介面
export interface TeleportSkillParams extends CommonSkillParams {
    // 移動位置類型
    teleportType: 'random' | 'fixed' | 'near_player'; // 隨機位置、固定位置、玩家身邊
    
    // 固定位置參數 (當 teleportType 為 'fixed' 時使用)
    fixedPosition?: { x: number; y: number }; // 相對於當前位置的偏移
    
    // 隨機位置參數 (當 teleportType 為 'random' 時使用)
    randomRange?: number; // 隨機傳送的最大距離
    
    // 玩家身邊參數 (當 teleportType 為 'near_player' 時使用)
    playerDistance?: number; // 距離玩家多遠
    playerAngleRange?: number; // 在玩家周圍的角度範圍 (度，360表示任意方向)
}
