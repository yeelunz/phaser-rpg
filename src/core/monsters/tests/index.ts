// 怪物測試資源索引檔案
// 自動引入所有測試檔案，確保它們能夠被執行

// 移動策略測試
import './movement-strategy-test';

console.log('[Monster Tests] 測試資源已載入完成');

// 導出一個測試輔助函數，可以用來切換怪物使用的行為
export function useTestBehavior(monsterId: string, behaviorId: string): void {
    console.log(`[Monster Tests] 設置怪物 ${monsterId} 使用測試行為: ${behaviorId}`);
    // 這個功能需要在怪物工廠類中實現
}

export default {};
