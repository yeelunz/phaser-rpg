/**
 * PhaserDebugConsole2.ts
 * 用於處理遊戲中的 Debug Console 功能，不再依賴 PhaserUIManager
 *  只需要輸出到f12控制台即可
 */

import { InventoryManager } from '../core/items/inventory_manager';
import { ConsumableFactory } from '../core/items/consumableFactory';
import { EquipmentFactory } from '../core/items/equipmentFactory';
import { MaterialFactory } from '../core/items/materialFactory';
import { Equipment } from '../core/items/equipment';
import { ItemType } from '../core/items/item';
import { DebugRenderer } from './debugRenderer';

// 簡化的 Player 接口，避免直接導入
interface PlayerLike {
    getStats(): {
        getCurrentHP(): number;
        getMaxHP(): number;
        setCurrentHP(value: number): void;
        getCurrentEnergy(): number;
        getMaxEnergy(): number;
        setCurrentEnergy(value: number): void;
    };
}

/**
 * Debug 命令處理器類別 - 獨立版本
 */
export class PhaserDebugConsole2 {
    private scene: Phaser.Scene;
    private player?: PlayerLike;
    private debugInput: Phaser.GameObjects.DOMElement | null = null;
    private outputElement: Phaser.GameObjects.Text | null = null;
    private outputLines: string[] = []; // 用於存儲輸出消息
    private outputTimeout: number = 5000; // 輸出顯示時間（毫秒）
    private isOutputVisible: boolean = false; // 是否顯示輸出
    private outputBackground: Phaser.GameObjects.Graphics | null = null;
    private hideOutputTimer: Phaser.Time.TimerEvent | null = null;
    
    // 除錯渲染器引用
    private debugRenderer: DebugRenderer | null = null;

    /**
     * 構造函數
     * @param scene 遊戲場景
     */
    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        
        // 創建 Debug 輸入控制台
        this.createDebugConsole();
        
        // 創建輸出顯示元素
        this.createOutputDisplay();
    }

    /**
     * 創建 Debug 控制台
     */
    private createDebugConsole(): void {
        const gameHeight = this.scene.cameras.main.height;
        const inputField = document.createElement('input');
        inputField.type = 'text';
        inputField.placeholder = '輸入 debug 指令...';
        inputField.style.width = '300px';
        inputField.style.height = '20px';
        inputField.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        inputField.style.color = '#2ecc71';
        inputField.style.border = '1px solid #2ecc71';
        inputField.style.padding = '5px';
        inputField.style.fontFamily = 'Consolas, monospace';
        inputField.style.fontSize = '14px';
        inputField.style.boxSizing = 'border-box';

        this.debugInput = this.scene.add.dom(
            10,
            gameHeight - 10, // Initial position
            inputField
        );
        this.debugInput.setOrigin(0, 1);
        this.debugInput.setScrollFactor(0); // Critical for DOM elements as well
        this.debugInput.setDepth(1001); // High depth to stay on top

        const htmlInput = this.debugInput.node as HTMLInputElement;

        htmlInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                const command = htmlInput.value;
                if (command.trim() !== '') {
                    this.executeCommand(command.trim());
                    htmlInput.value = '';
                }
                event.stopPropagation(); // Prevent Phaser from processing Enter key for other things
            }
        });

        htmlInput.addEventListener('focus', () => {
            if (this.scene.input.keyboard) {
                this.scene.input.keyboard.disableGlobalCapture();
            }
        });

        htmlInput.addEventListener('blur', () => {
            if (this.scene.input.keyboard) {
                this.scene.input.keyboard.enableGlobalCapture();
            }
        });
    }    /**
     * 創建輸出顯示元素
     */
    private createOutputDisplay(): void {
        // 只保留輸出容器，但不在畫面上顯示
        this.outputLines = [];
        
        // 移除畫面顯示相關代碼，只透過瀏覽器控制台輸出
        console.log("Debug output will only be shown in browser console (F12)");
    }

    /**
     * 更新輸出元素位置（當視窗大小變化時）
     */
    public updatePosition(): void {
        if (!this.outputElement || !this.outputBackground || !this.debugInput) return;
        
        // 更新文本位置
        this.outputElement.setPosition(15, this.scene.cameras.main.height - 45);
        
        // 更新背景
        this.updateOutputBackground();
        
        // 更新輸入位置
        const camHeight = this.scene.cameras.main.height;
        this.debugInput.setPosition(10, camHeight - 10);
    }

    /**
     * 設定玩家引用
     * @param player 玩家對象
     */
    public setPlayer(player: PlayerLike): void {
        this.player = player;
    }
    
    /**
     * 設定除錯渲染器
     * @param renderer 除錯渲染器
     */
    public setDebugRenderer(renderer: DebugRenderer): void {
        this.debugRenderer = renderer;
    }

    /**
     * 執行 Debug 命令
     */
    public executeCommand(command: string): void {
        console.log(`執行 Debug2 命令: ${command}`);

        const args = command.split(' ');
        const cmd = args[0].toLowerCase();
        
        try {
            switch (cmd) {
                case 'help':
                    this.showHelp();
                    break;
                case 'hp':
                    this.handleHpCommand(args);
                    break;
                case 'energy':
                case 'mp':
                    this.handleEnergyCommand(args);
                    break;
                case 'item':
                    this.handleItemCommand(args);
                    break;
                case 'itemlist':
                    this.listAllItems();
                    break;
                case 'clear':
                    this.clearOutput();
                    break;
                case 'debug':
                    this.toggleDebugMode(args);
                    break;
                case 'projectile':
                    this.toggleProjectileDebugMode(args);
                    break;
                default:
                    this.appendOutput(`未知命令: ${cmd}. 輸入 'help' 查看可用命令。`);
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            this.appendOutput(`命令執行錯誤: ${errorMessage}`);
            console.error("Debug command execution error:", e);
        }
    }    /**
     * 顯示幫助資訊
     */
    private showHelp(): void {        const helpText = [
            "可用命令:",
            "help - 顯示此幫助信息",
            "hp [current/max] [value] - 設置或查看生命值",
            "energy [current/max] [value] - 設置或查看能量值",
            "mp [current/max] [value] - 設置或查看能量值 (energy 的別名)",
            "item add [type] [id] [quantity] - 添加物品 (consumable/equipment/material)",
            "item generate [id] [luckBonus] - 生成具有隨機屬性的裝備",
            "item equip [id] - 裝備物品",
            "item unequip [slot] - 卸下裝備",
            "itemlist - 列出所有可用物品 ID",
            "clear - 清除輸出",
            "debug [on/off/boxes/collision/physics/hitbox] - 切換調試模式",
            "projectile [hitbox/range/on/off] - 切換投射物調試模式"
        ];
        this.appendOutput(helpText.join('\n'));
    }

    /**
     * 處理 HP 相關命令
     */
    private handleHpCommand(args: string[]): void {
        if (!this.player) {
            this.appendOutput("錯誤: 玩家對象未設置");
            return;
        }

        const stats = this.player.getStats();
        
        if (args.length === 1) {
            // 僅顯示當前 HP
            this.appendOutput(`當前 HP: ${stats.getCurrentHP()}/${stats.getMaxHP()}`);
            return;
        }

        const subCommand = args[1].toLowerCase();
        
        if (subCommand === 'current' && args.length > 2) {
            const value = parseInt(args[2]);
            if (isNaN(value)) {
                this.appendOutput("錯誤: 無效的數值");
                return;
            }
            stats.setCurrentHP(value);
            this.appendOutput(`當前 HP 設置為 ${value}`);
        } else if (subCommand === 'max') {
            this.appendOutput(`最大 HP: ${stats.getMaxHP()}`);
        } else {
            this.appendOutput("用法: hp [current/max] [value]");
        }
    }

    /**
     * 處理能量相關命令
     */
    private handleEnergyCommand(args: string[]): void {
        if (!this.player) {
            this.appendOutput("錯誤: 玩家對象未設置");
            return;
        }

        const stats = this.player.getStats();
        
        if (args.length === 1) {
            // 僅顯示當前能量
            this.appendOutput(`當前能量: ${stats.getCurrentEnergy()}/${stats.getMaxEnergy()}`);
            return;
        }

        const subCommand = args[1].toLowerCase();
        
        if (subCommand === 'current' && args.length > 2) {
            const value = parseInt(args[2]);
            if (isNaN(value)) {
                this.appendOutput("錯誤: 無效的數值");
                return;
            }
            stats.setCurrentEnergy(value);
            this.appendOutput(`當前能量設置為 ${value}`);
        } else if (subCommand === 'max') {
            this.appendOutput(`最大能量: ${stats.getMaxEnergy()}`);
        } else {
            this.appendOutput("用法: energy [current/max] [value]");
        }
    }

    /**
     * 處理物品相關命令
     */    private handleItemCommand(args: string[]): void {
        if (args.length < 2) {
            this.appendOutput("用法: item [add/equip/unequip/generate] [其他參數...]");
            return;
        }

        const inventoryManager = InventoryManager.getInstance();
        const subCommand = args[1].toLowerCase();
        
        switch (subCommand) {
            case 'add':
                this.handleAddItemCommand(args.slice(2));
                break;
            case 'generate':
                this.handleGenerateItemCommand(args.slice(2));
                break;
            case 'equip':
                if (args.length < 3) {
                    this.appendOutput("用法: item equip [物品ID]");
                    return;
                }                try {
                    const itemId = args[2];
                    
                    // 先從玩家背包中找到對應ID的裝備
                    const playerItems = inventoryManager.playerInventory.getItemsById(itemId);
                    const equipmentItem = playerItems.find(item => item.type === ItemType.EQUIPMENT);
                    
                    if (!equipmentItem) {
                        this.appendOutput(`找不到裝備: ${itemId}`);
                        return;
                    }
                    
                    // 取得裝備管理器
                    const equipmentManager = this.scene.registry.get('player').getEquipmentManager();
                    if (!equipmentManager) {
                        this.appendOutput(`無法獲取裝備管理器`);
                        return;
                    }
                    
                    const success = inventoryManager.equipItem(equipmentItem as Equipment, equipmentManager);
                    if (success) {
                        this.appendOutput(`成功裝備物品: ${itemId}`);
                    } else {
                        this.appendOutput(`無法裝備物品: ${itemId}`);
                    }
                } catch (e) {
                    this.appendOutput(`裝備物品時出錯: ${e instanceof Error ? e.message : String(e)}`);
                }
                break;
            case 'unequip':
                if (args.length < 3) {
                    this.appendOutput("用法: item unequip [裝備槽位]");
                    return;
                }                try {
                    const slot = args[2];
                    
                    // 取得裝備管理器
                    const equipmentManager = this.scene.registry.get('player').getEquipmentManager();
                    if (!equipmentManager) {
                        this.appendOutput(`無法獲取裝備管理器`);
                        return;
                    }
                    
                    const success = inventoryManager.unequipItem(slot as any, equipmentManager);
                    if (success) {
                        this.appendOutput(`成功卸下 ${slot} 槽位的裝備`);
                    } else {
                        this.appendOutput(`無法卸下 ${slot} 槽位的裝備`);
                    }
                } catch (e) {
                    this.appendOutput(`卸下裝備時出錯: ${e instanceof Error ? e.message : String(e)}`);
                }
                break;
            default:
                this.appendOutput(`未知的物品子命令: ${subCommand}`);
        }
    }

    /**
     * 處理添加物品命令
     */
    private handleAddItemCommand(args: string[]): void {
        if (args.length < 2) {
            this.appendOutput("用法: item add [類型] [ID] [數量 (可選)]");
            return;
        }

        const itemType = args[0].toLowerCase();
        const itemId = args[1];
        const quantity = args.length > 2 ? parseInt(args[2]) : 1;
        
        if (isNaN(quantity) || quantity <= 0) {
            this.appendOutput("錯誤: 物品數量必須是正整數");
            return;
        }

        const inventoryManager = InventoryManager.getInstance();
        
        try {
            switch (itemType) {                case 'consumable':
                    const consumableFactory = ConsumableFactory.getInstance();
                    const consumable = consumableFactory.createConsumableById(itemId, quantity);
                    if (consumable) {
                        inventoryManager.playerInventory.addItem(consumable);
                        this.appendOutput(`已添加 ${quantity} 個消耗品: ${itemId}`);
                    } else {
                        this.appendOutput(`找不到消耗品: ${itemId}`);
                    }
                    break;                case 'equipment':
                    const equipmentFactory = EquipmentFactory.getInstance();
                    const equipment = equipmentFactory.createEquipmentById(itemId);
                    if (equipment) {
                        inventoryManager.playerInventory.addItem(equipment);
                        this.appendOutput(`已添加裝備: ${itemId}`);
                    } else {
                        this.appendOutput(`找不到裝備: ${itemId}`);
                    }
                    break;                case 'material':
                    const materialFactory = MaterialFactory.getInstance();
                    const material = materialFactory.createMaterialById(itemId, quantity);
                    if (material) {
                        inventoryManager.playerInventory.addItem(material);
                        this.appendOutput(`已添加 ${quantity} 個材料: ${itemId}`);
                    } else {
                        this.appendOutput(`找不到材料: ${itemId}`);
                    }
                    break;
                default:
                    this.appendOutput(`未知的物品類型: ${itemType}`);
            }
        } catch (e) {
            this.appendOutput(`添加物品時出錯: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    /**
     * 處理生成隨機屬性的裝備命令
     * @param args 命令參數：[裝備ID, 幸運加成(可選)]
     */
    private handleGenerateItemCommand(args: string[]): void {
        if (args.length < 1) {
            this.appendOutput("用法: item generate [裝備ID] [幸運加成(可選)]");
            return;
        }

        const equipmentId = args[0];
        const luckBonus = args.length > 1 ? parseInt(args[1]) : 0;
        
        try {
            const equipmentFactory = EquipmentFactory.getInstance();
            const equipment = equipmentFactory.generateEquipment(equipmentId, luckBonus);
            
            if (equipment) {
                const inventoryManager = InventoryManager.getInstance();
                inventoryManager.playerInventory.addItem(equipment);
                this.appendOutput(`已生成具有隨機屬性的裝備: ${equipment.name} (${equipment.id})`);
            } else {
                this.appendOutput(`找不到裝備: ${equipmentId}`);
            }
        } catch (e) {
            this.appendOutput(`生成裝備時出錯: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    /**
     * 列出所有可用物品
     */
    private listAllItems(): void {
        // 由於物品清單可能會很長，我們將它們按類型分組顯示
        try {
            // 加載物品數據
            fetch('/assets/data/items/consumable.json')
                .then(response => response.json())
                .then(data => {
                    const consumables = Object.keys(data).join(', ');
                    this.appendOutput(`消耗品: ${consumables}`);
                })
                .catch(error => this.appendOutput(`無法加載消耗品數據: ${error}`));
            
            fetch('/assets/data/items/equipment.json')
                .then(response => response.json())
                .then(data => {
                    const equipment = Object.keys(data).join(', ');
                    this.appendOutput(`裝備: ${equipment}`);
                })
                .catch(error => this.appendOutput(`無法加載裝備數據: ${error}`));
            
            fetch('/assets/data/items/material.json')
                .then(response => response.json())
                .then(data => {
                    const materials = Object.keys(data).join(', ');
                    this.appendOutput(`材料: ${materials}`);
                })
                .catch(error => this.appendOutput(`無法加載材料數據: ${error}`));
        } catch (e) {
            this.appendOutput(`列出物品時出錯: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    /**
     * 切換調試模式
     */    private toggleDebugMode(args: string[]): void {
        if (!this.debugRenderer) {
            this.appendOutput("調試渲染器未設置");
            return;
        }

        if (args.length < 2) {
            this.appendOutput(`用法: debug [on/off/boxes/collision/physics/hitbox]`);
            return;
        }

        const mode = args[1].toLowerCase();
        
        if (mode === 'on') {
            // 顯示所有調試框
            this.debugRenderer.toggleAllBoxes(true);
            this.appendOutput("調試模式已開啟，所有調試框已顯示");
        } else if (mode === 'off') {
            // 隱藏所有調試框
            this.debugRenderer.toggleAllBoxes(false);
            this.appendOutput("調試模式已關閉");
        } else if (mode === 'boxes') {
            // 切換所有調試框顯示狀態
            this.appendOutput("碰撞框顯示: " + this.debugRenderer.toggleCollisionBoxes());
            this.appendOutput("物理框顯示: " + this.debugRenderer.togglePhysicsBoxes());
            this.appendOutput("打擊框顯示: " + this.debugRenderer.toggleHitBoxes());
        } else if (mode === 'collision') {
            // 切換碰撞框顯示
            const enabled = this.debugRenderer.toggleCollisionBoxes();
            this.appendOutput(`碰撞框顯示: ${enabled ? '開啟' : '關閉'}`);
        } else if (mode === 'physics') {
            // 切換物理框顯示
            const enabled = this.debugRenderer.togglePhysicsBoxes();
            this.appendOutput(`物理框顯示: ${enabled ? '開啟' : '關閉'}`);
        } else if (mode === 'hitbox') {
            // 切換打擊框顯示
            const enabled = this.debugRenderer.toggleHitBoxes();
            this.appendOutput(`打擊框顯示: ${enabled ? '開啟' : '關閉'}`);
        } else {
            this.appendOutput("用法: debug [on/off/boxes/collision/physics/hitbox]");
        }
    }

    /**
     * 切換投射物調試模式
     */
    private toggleProjectileDebugMode(args: string[]): void {
        if (!this.debugRenderer) {
            this.appendOutput("調試渲染器未設置");
            return;
        }

        if (args.length < 2) {
            this.appendOutput(`用法: projectile [hitbox/range/on/off]`);
            return;
        }

        const mode = args[1].toLowerCase();
        
        if (mode === 'on') {
            // 顯示所有投射物調試
            this.debugRenderer.toggleAllProjectileDisplays(true);
            this.appendOutput("投射物調試已開啟");
        } else if (mode === 'off') {
            // 關閉所有投射物調試
            this.debugRenderer.toggleAllProjectileDisplays(false);
            this.appendOutput("投射物調試已關閉");
        } else if (mode === 'hitbox') {
            // 切換投射物碰撞框
            const enabled = this.debugRenderer.toggleProjectileHitboxes();
            this.appendOutput(`投射物碰撞框顯示: ${enabled ? '開啟' : '關閉'}`);
        } else if (mode === 'range') {
            // 切換投射物搜索範圍
            const enabled = this.debugRenderer.toggleSearchRanges();
            this.appendOutput(`技能搜索範圍顯示: ${enabled ? '開啟' : '關閉'}`);
        } else {
            this.appendOutput(`用法: projectile [hitbox/range/on/off]`);
        }
    }

    /**
     * 添加輸出消息
     * @param message 輸出消息
     */
    public appendOutput(message: string): void {
        // 將消息添加到輸出陣列
        this.outputLines.push(message);
        
        // 如果輸出行數超過最大值，移除最舊的消息
        const MAX_OUTPUT_LINES = 10;
        if (this.outputLines.length > MAX_OUTPUT_LINES) {
            this.outputLines.shift();
        }
        
        // 直接輸出到控制台，不顯示在畫面上
        console.log(`[DEBUG] ${message}`);
    }    /**
     * 顯示輸出
     */
    public showOutput(): void {
        // 只記錄在控制台，不顯示在畫面上
        console.log('[DEBUG] 輸出顯示 (僅在開發者控制台)');
        // 先清除已有的隱藏計時器
        this.clearHideTimer();
        this.isOutputVisible = true;
    }

    /**
     * 隱藏輸出
     */
    public hideOutput(): void {
        // 確保先清除任何計時器
        this.clearHideTimer();
        this.isOutputVisible = false;
    }

    /**
     * 清除計時器
     */
    private clearHideTimer(): void {
        if (this.hideOutputTimer) {
            this.hideOutputTimer.remove();
            this.hideOutputTimer = null;
        }
    }

    /**
     * 更新輸出背景
     */
    private updateOutputBackground(): void {
        // 不需要更新背景，因為輸出不顯示在畫面上
    }

    /**
     * 清除輸出消息
     */
    private clearOutput(): void {
        this.outputLines = [];
        if (this.outputElement) {
            this.outputElement.setText('');
        }
        this.hideOutput();
    }

    /**
     * 將 Debug 元素置於頂層
     */
    public bringToTop(): void {
        const children = this.scene.children;
        if (!children) return;

        if (this.outputBackground) {
            children.bringToTop(this.outputBackground);
        }
        if (this.outputElement) {
            children.bringToTop(this.outputElement);
        }
        if (this.debugInput) {
            children.bringToTop(this.debugInput);
        }
    }

    /**
     * 更新方法，每幀調用
     */
    public update(): void {
        // 目前暫無需要每幀更新的內容
    }

    /**
     * 銷毀資源
     */
    public destroy(): void {
        if (this.hideOutputTimer) {
            this.hideOutputTimer.remove();
        }
        if (this.outputElement) {
            this.outputElement.destroy();
        }
        if (this.outputBackground) {
            this.outputBackground.destroy();
        }
        if (this.debugInput) {
            this.debugInput.destroy();
        }
    }
}

// 單例管理
let debugConsoleInstance: PhaserDebugConsole2 | null = null;

/**
 * 初始化 Phaser Debug Console
 */
export function initPhaserDebugConsole2(scene: Phaser.Scene): PhaserDebugConsole2 {
    if (!debugConsoleInstance) {
        debugConsoleInstance = new PhaserDebugConsole2(scene);
    }
    return debugConsoleInstance;
}

/**
 * 獲取 Phaser Debug Console 實例
 */
export function getPhaserDebugConsole2(): PhaserDebugConsole2 | null {
    return debugConsoleInstance;
}
