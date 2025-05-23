// 測試入口文件
import { MonsterSystemTest } from './test/monsterSystemTest';

// 當文檔加載完成後執行測試
document.addEventListener('DOMContentLoaded', () => {
    console.log("========= 怪物系統測試開始 =========");
    
    // 執行怪物系統測試
    setTimeout(() => {
        MonsterSystemTest.testCreateMonster();
    }, 1000); // 延遲1秒執行，確保數據已載入
    
    console.log("測試將在1秒後執行...");
});
