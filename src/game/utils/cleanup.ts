// 遊戲資源清理工具
// 為遊戲場景提供統一的資源清理功能

/**
 * 清理遊戲場景資源
 * 當場景關閉時，統一調用此函數來清理所有資源
 * 
 * @param scene Phaser 遊戲場景
 */
export function cleanupGameResources(scene: Phaser.Scene): void {
    console.log('正在清理遊戲場景資源...');
    
    // 清理全局事件監聽器
    if (scene.game && scene.game.events) {
        scene.game.events.off('equipItem');
        scene.game.events.off('dropItem');
        scene.game.events.off('useConsumable');
        console.log('已清理全局事件監聽器');
    }
    
    // 清理增強版戰鬥系統
    if (typeof window !== 'undefined' && window.combatSystem) {
        window.combatSystem.destroy();
        window.combatSystem = undefined;
        console.log('已清理戰鬥系統資源');
    }
    
    // 清理除錯渲染器 (如果存在)
    const gameScene = scene as any; // 使用 any 類型以訪問可能不在接口中的屬性
    if (gameScene.debugRenderer) {
        gameScene.debugRenderer.destroy();
        console.log('已清理除錯渲染器');
    }
    
    console.log('遊戲場景資源清理完成');
}
