// debugConsole.ts
// 用於處理遊戲中的 Debug Console 功能

import { PhaserDebugConsole2, initPhaserDebugConsole2 } from './PhaserDebugConsole2';

// Debug 命令處理器類別
export class DebugCommandHandler {
    private debugConsole: PhaserDebugConsole2;

    constructor(scene: Phaser.Scene) {
        // 使用新的 PhaserDebugConsole2
        this.debugConsole = initPhaserDebugConsole2(scene);
        console.log("Debug console initialized with console-only output");
    }

    // 設置玩家引用
    setPlayer(player: any): void {
        this.debugConsole.setPlayer(player);
    }

    // 設置除錯渲染器
    setDebugRenderer(renderer: any): void {
        this.debugConsole.setDebugRenderer(renderer);
    }

    // 執行命令 - 委派給 PhaserDebugConsole2
    executeCommand(command: string): void {
        this.debugConsole.executeCommand(command);
    }
    
    // 更新位置
    updatePosition(): void {
        this.debugConsole.updatePosition();
    }
    
    // 更新 - 每幀調用
    update(): void {
        // 不需要更新，因為輸出顯示在控制台
    }
    
    // 銷毀資源
    destroy(): void {
        this.debugConsole.destroy();
    }
}

// 創建並導出 Debug Console 的單例實例
let debugConsoleInstance: DebugCommandHandler | null = null;

export function initDebugConsole(scene: Phaser.Scene): DebugCommandHandler {
    if (!debugConsoleInstance) {
        debugConsoleInstance = new DebugCommandHandler(scene);
    }
    return debugConsoleInstance;
}

export function getDebugConsole(): DebugCommandHandler | null {
    return debugConsoleInstance;
}
