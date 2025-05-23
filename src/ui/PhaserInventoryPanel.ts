import { Inventory } from '../core/items/inventory';
import { Item } from '../core/items/item'; // 移除未使用的 ItemType
import { Equipment } from '../core/items/equipment';
import { ItemRarity } from '../core/data/dataloader';
import { BasePanel, PanelOptions } from './BasePanel'; // 引入 BasePanel
import { PhaserItemDetailsPanel } from './PhaserItemDetailsPanel'; // 引入物品詳情面板

export interface InventoryPanelOptions extends PanelOptions {}

export class PhaserInventoryPanel extends BasePanel { // 繼承 BasePanel
    private goldText: Phaser.GameObjects.Text;
    private slotRectangles: Phaser.GameObjects.Rectangle[] = [];
    private slotTexts: Phaser.GameObjects.Text[] = [];
    private slotItemImages: Phaser.GameObjects.Text[] = []; // 改為 Text[] 來顯示 Emoji
    private itemSlotMap: Map<number, Item> = new Map(); // 格子索引到物品的映射
    private itemDetailsPanel: PhaserItemDetailsPanel; // 添加物品詳情面板成員
    
    // 面板屬性
    private rows: number = 5;
    private cols: number = 6;
    private slotSize: number = 50;
    private internalPadding: number = 10; // Renamed from padding to avoid conflict and make it specific to this panel    
    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) { // Standardized constructor signature
        super(scene, x, y, width, height, '物品欄'); // 調用 BasePanel 的 constructor
        
        console.log("PhaserInventoryPanel constructor called");
        
        // 創建金幣文本 (此 Panel 特有)
        this.goldText = scene.add.text(
            this.internalPadding, // Use internalPadding
            this.panelHeight - this.internalPadding - 20, // Use panelHeight from BasePanel
            '金幣: 0', 
            { fontSize: '16px', color: '#ffff00' }
        );
        this.add(this.goldText); // Add to container
        
        // 手動調用初始化面板內容
        this.initializePanelContent();

        // 初始化物品詳情面板 (預設隱藏)
        // 讓 PhaserItemDetailsPanel 使用其內部的預設寬度和高度
        // 位置可以根據需要調整，例如顯示在物品欄旁邊或下方
        // 這裡暫時將其放置在物品欄右側
        const itemDetailsPanelX = this.x + width + 10; // 物品欄右側，間隔10px
        const itemDetailsPanelY = this.y; // 與物品欄頂部對齊

        this.itemDetailsPanel = new PhaserItemDetailsPanel(this.scene, itemDetailsPanelX, itemDetailsPanelY);
        this.itemDetailsPanel.setVisible(false);
        this.scene.add.existing(this.itemDetailsPanel);

        console.log("PhaserInventoryPanel initialization completed");
    }
    
    // 初始化庫存格 (改名為 initializePanelContent 並設為 protected)
    protected initializePanelContent(): void { // 實現 BasePanel 的抽象方法
        console.log("PhaserInventoryPanel - Initializing inventory grid with", this.rows, "rows and", this.cols, "columns");
        const startX = this.internalPadding * 2; // Use internalPadding
        const startY = this.internalPadding * 3 + (this.titleText ? this.titleText.height : 30); 
        
        // 清空現有的格子和圖示
        this.slotRectangles.forEach(rect => rect.destroy());
        this.slotTexts.forEach(text => text.destroy());
        this.slotItemImages.forEach(text => text.destroy()); // 銷毀舊的 Emoji 文字物件

        this.slotRectangles = [];
        this.slotTexts = [];
        this.slotItemImages = []; // 初始化 Emoji 文字陣列
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const index = row * this.cols + col;
                const x = startX + col * (this.slotSize + this.internalPadding); // Use internalPadding
                const y = startY + row * (this.slotSize + this.internalPadding); // Use internalPadding
                
                // 創建格子背景
                const slotRect = this.scene.add.rectangle(
                    x, y, 
                    this.slotSize, this.slotSize, 
                    0x666666
                );
                slotRect.setOrigin(0, 0);
                slotRect.setStrokeStyle(1, 0xaaaaaa);
                this.add(slotRect); // Add to container
                this.slotRectangles.push(slotRect);
                
                slotRect.setInteractive({ useHandCursor: true });
                slotRect.setData('slotIndex', index);
                slotRect.setScrollFactor(0); // Ensure slot interactive area is screen-fixed

                slotRect.on('pointerdown', () => {
                    // Log detailed information for debugging
                    const pointer = this.scene.input.activePointer;
                    const camera = this.scene.cameras.main;
                    const worldPoint = pointer.positionToCamera(camera) as Phaser.Math.Vector2;
                    
                    // Calculate the panel's current screen position
                    // This assumes the panel's setPosition in UIManager correctly reflects its top-left screen coordinates
                    const panelScreenX = this.x;
                    const panelScreenY = this.y;

                    // slotRect.x and slotRect.y are relative to the panel container
                    const slotScreenX = panelScreenX + slotRect.x;
                    const slotScreenY = panelScreenY + slotRect.y;

                    console.log(
                        `Inventory Slot Click: index ${index}, Item: ${this.itemSlotMap.get(index)?.name || 'Empty'}\n` +
                        `  Pointer Screen Coords: (${pointer.x.toFixed(2)}, ${pointer.y.toFixed(2)})\n` +
                        `  Pointer World Coords: (${worldPoint.x.toFixed(2)}, ${worldPoint.y.toFixed(2)})\n` +
                        `  Camera Scroll: (x: ${camera.scrollX.toFixed(2)}, y: ${camera.scrollY.toFixed(2)})\n` +
                        `  Panel Origin (screen): (x: ${panelScreenX.toFixed(2)}, y: ${panelScreenY.toFixed(2)})\n` +
                        `  Slot Rect Relative Pos: (x: ${slotRect.x.toFixed(2)}, y: ${slotRect.y.toFixed(2)})\n` +
                        `  Slot Expected Screen Pos (top-left): (x: ${slotScreenX.toFixed(2)}, y: ${slotScreenY.toFixed(2)})\n` +
                        `  Slot Actual World Pos (top-left from transform): (x: ${slotRect.getWorldTransformMatrix().tx.toFixed(2)}, y: ${slotRect.getWorldTransformMatrix().ty.toFixed(2)})`
                    );
                    this.onSlotClick(index);
                });

                // 創建 Emoji 圖示文字物件
                const itemEmojiText = this.scene.add.text(
                    x + this.slotSize / 2, 
                    y + this.slotSize / 2 - 5, // 稍微向上調整，為物品名稱讓出更多空間
                    '', 
                    { fontSize: '24px', color: '#ffffff', align: 'center' } // 調整 Emoji 字體大小和顏色
                );
                itemEmojiText.setOrigin(0.5, 0.5); // 中心對齊
                itemEmojiText.setVisible(false); // 初始隱藏
                this.add(itemEmojiText);
                this.slotItemImages.push(itemEmojiText); // 注意這裡變成了 slotItemImages
                
                // 創建物品名稱文本 (位置已在格子底部)
                const slotText = this.scene.add.text(
                    x + this.slotSize / 2, // 水平置中
                    y + this.slotSize - 10, // 將文字移到格子底部，並稍微向上調整
                    '', 
                    { fontSize: '10px', color: '#ffffff', wordWrap: { width: this.slotSize - 4 }, align: 'center' }
                );
                slotText.setOrigin(0.5, 0.5); // 中心對齊
                this.add(slotText); // Add to container
                this.slotTexts.push(slotText);

            }
        }
        
        console.log(`Created ${this.slotRectangles.length} inventory slots`);
    }
    
    // 點擊格子時的處理
    private onSlotClick(slotIndex: number): void {
        const item = this.itemSlotMap.get(slotIndex);
        if (item) {
            // 顯示物品信息
            console.log(`點擊了物品: ${item.name} (${item.description})`);
            this.itemDetailsPanel.showItem(item); // 顯示物品詳情
            this.itemDetailsPanel.setVisible(true);
            
            // 這裡可以添加詳細的物品交互邏輯
            // 如使用物品、丟棄物品等
        } else {
            // 如果點擊空格子，則隱藏詳情面板
            this.itemDetailsPanel.setVisible(false);
            console.log(`點擊了空格子: ${slotIndex}`);
        }
    }
    
    // 更新庫存
    public updateInventory(inventory: Inventory): void {
        // 清空現有映射
        this.itemSlotMap.clear();
        
        // 重置所有格子文本、Emoji 和背景及邊框
        this.slotTexts.forEach(text => text.setText(''));
        this.slotItemImages.forEach(text => { // 重置 Emoji 文字
            text.setText(''); // 清除文字
            text.setVisible(false); // 設為不可見
        });
        this.slotRectangles.forEach(rect => {
            rect.setFillStyle(0x666666); // 設定預設的灰色背景
            rect.setStrokeStyle(1, 0xaaaaaa); // 設定預設的邊框 (1px, 淺灰色)
        });
        
        // 顯示物品
        const items = inventory.items;
        console.log(`更新物品欄顯示，物品數量: ${items.length}`);
        
        items.forEach((item, index) => {
            if (index < this.slotTexts.length && index < this.slotItemImages.length) { // 確保索引在範圍內
                // 保存物品映射
                this.itemSlotMap.set(index, item);

                // 顯示物品 Emoji
                if (item.icon) {
                    this.slotItemImages[index].setText(item.icon); // 設定 Emoji
                    this.slotItemImages[index].setVisible(true);
                } else {
                    this.slotItemImages[index].setText('');
                    this.slotItemImages[index].setVisible(false); // 沒有 icon 屬性則隱藏
                }
                
                // 設置物品名稱文本
                const displayText = item.stackable && item.quantity > 1 
                    ? `${item.name} (${item.quantity})` 
                    : item.name;
                this.slotTexts[index].setText(displayText);
                
                // 背景已在上面統一設置為 0x666666
                // 邊框已在上面統一設置為預設值 (1px, 0xaaaaaa)
                // 現在根據物品稀有度調整裝備的邊框
                if (item instanceof Equipment) { // 確保 item 是 Equipment 的實例以訪問 rarity
                    let borderColor = 0xaaaaaa; // 裝備的預設/回退邊框顏色
                    const borderWidth = 2;      // 裝備使用稍粗的邊框 (2px)

                    switch (item.rarity) {
                        case ItemRarity.INFERIOR:
                            borderColor = 0x9d9d9d; // 灰色邊框
                            break;
                        case ItemRarity.COMMON:
                            borderColor = 0xffffff; // 白色邊框
                            break;
                        case ItemRarity.RARE:
                            borderColor = 0x5bc0de; // 資訊藍邊框
                            break;
                        case ItemRarity.EPIC:
                            borderColor = 0x9d60db; // 紫色邊框
                            break;
                        case ItemRarity.LEGENDARY:
                            borderColor = 0xf0ad4e; // 警告橙邊框
                            break;
                        // default: borderColor 維持 0xaaaaaa
                    }
                    this.slotRectangles[index].setStrokeStyle(borderWidth, borderColor);
                }
                // 非 Equipment 物品將保持預設的 1px, 0xaaaaaa邊框
            }
        });
        
        // 更新金幣
        this.goldText.setText(`金幣: ${inventory.gold}`);
    }
}
