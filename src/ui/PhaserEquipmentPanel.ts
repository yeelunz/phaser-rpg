import { Equipment } from '../core/items/equipment';
import { EquipmentSlot, ItemRarity, StatType } from '../core/data/dataloader';
import { BasePanel } from './BasePanel'; 

export class PhaserEquipmentPanel extends BasePanel { // 繼承 BasePanel
    private slotRectangles: Map<EquipmentSlot, Phaser.GameObjects.Rectangle> = new Map();
    private slotTexts: Map<EquipmentSlot, Phaser.GameObjects.Text> = new Map();
    private slotLabels: Map<EquipmentSlot, Phaser.GameObjects.Text> = new Map();
    private slotIcons: Map<EquipmentSlot, Phaser.GameObjects.Text> = new Map(); // 添加圖標文本映射
    private statTexts: Phaser.GameObjects.Text[] = [];
    
    // 裝備物品
    private equippedItems: Map<EquipmentSlot, Equipment | null> = new Map();
    
    // 選中的裝備槽
    private selectedSlot: EquipmentSlot | null = null;
    
    // 裝備槽選擇回調
    private onSlotSelected: (slot: EquipmentSlot, equipment: Equipment | null) => void = () => {};

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
        super(scene, x, y, width, height, '裝備'); // 調用 BasePanel 的 constructor
        
        console.log("PhaserEquipmentPanel constructor called");
        
        // 初始化裝備格
        this.initializePanelContent(); // 改名並實現 BasePanel 的抽象方法
        
        // 初始化能力值顯示 (這部分是此 Panel 特有的，保留)
        this.initializeStatDisplay();
        
        // 添加裝備槽
        this.slotRectangles.forEach(rect => this.add(rect));
        this.slotTexts.forEach(text => this.add(text));
        this.slotLabels.forEach(label => this.add(label));
        this.slotIcons.forEach(icon => this.add(icon)); // 添加圖標
        
        // 添加能力值顯示
        this.statTexts.forEach(text => this.add(text));
        
        // 初始化裝備欄位(所有位置都是空的)
        Object.values(EquipmentSlot).forEach(slot => {
            this.equippedItems.set(slot, null);
        });
    }
    
    // 初始化裝備格 (改名為 initializePanelContent 並設為 protected)
    protected initializePanelContent(): void { // 實現 BasePanel 的抽象方法
        const slotSize = 64;
        const startX = 30; // 裝備槽的起始 X 位置
        const startY = 60;
        const spacing = 20;
        
        // 裝備槽的設置
        const slotPositions: Record<EquipmentSlot, { x: number, y: number, label: string }> = {
            [EquipmentSlot.WEAPON]: { x: startX, y: startY, label: '武器' },
            [EquipmentSlot.ARMOR]: { x: startX, y: startY + slotSize + spacing, label: '護甲' },
            [EquipmentSlot.SHOES]: { x: startX, y: startY + (slotSize + spacing) * 2, label: '鞋子' },
            [EquipmentSlot.RING]: { x: startX + slotSize + spacing, y: startY, label: '戒指' },
            [EquipmentSlot.NECKLACE]: { x: startX + slotSize + spacing, y: startY + slotSize + spacing, label: '項鍊' }
        };
        
        // 創建每個裝備槽
        Object.entries(slotPositions).forEach(([slotKey, position]) => {
            const slot = slotKey as EquipmentSlot;
            
            // 創建裝備槽背景
            const slotRect = this.scene.add.rectangle(
                position.x, position.y,
                slotSize, slotSize,
                0x666666
            );
            slotRect.setOrigin(0, 0);
            slotRect.setStrokeStyle(1, 0xaaaaaa);
            
            // 設置槽可交互
            slotRect.setInteractive({ useHandCursor: true });
            slotRect.setScrollFactor(0); // Ensure slot interactive area is screen-fixed
            
            // 添加點擊事件
            slotRect.on('pointerdown', () => {
                const pointer = this.scene.input.activePointer;
                const camera = this.scene.cameras.main;
                const worldPoint = pointer.positionToCamera(camera) as Phaser.Math.Vector2;
                const panelScreenX = this.x; // BasePanel's screen x
                const panelScreenY = this.y; // BasePanel's screen y
                const slotScreenX = panelScreenX + slotRect.x;
                const slotScreenY = panelScreenY + slotRect.y;

                console.log(
                    `Equipment Slot Click: Slot ${slot}, Item: ${this.equippedItems.get(slot)?.name || 'Empty'}\n` +
                    `  Pointer Screen Coords: (${pointer.x.toFixed(2)}, ${pointer.y.toFixed(2)})\n` +
                    `  Pointer World Coords: (${worldPoint.x.toFixed(2)}, ${worldPoint.y.toFixed(2)})\n` +
                    `  Camera Scroll: (x: ${camera.scrollX.toFixed(2)}, y: ${camera.scrollY.toFixed(2)})\n` +
                    `  Panel Origin (screen): (x: ${panelScreenX.toFixed(2)}, y: ${panelScreenY.toFixed(2)})\n` +
                    `  Slot Rect Relative Pos: (x: ${slotRect.x.toFixed(2)}, y: ${slotRect.y.toFixed(2)})\n` +
                    `  Slot Expected Screen Pos (top-left): (x: ${slotScreenX.toFixed(2)}, y: ${slotScreenY.toFixed(2)})\n` +
                    `  Slot Actual World Pos (top-left from transform): (x: ${slotRect.getWorldTransformMatrix().tx.toFixed(2)}, y: ${slotRect.getWorldTransformMatrix().ty.toFixed(2)})`
                );
                this.onSlotClicked(slot);
            });
            
            // 創建裝備名稱文本
            const slotText = this.scene.add.text(
                position.x + 5,
                position.y + 5,
                '',
                { fontSize: '12px', color: '#ffffff', wordWrap: { width: slotSize - 10 } }
            );
            
            // 創建裝備圖標文本 (在槽位中央)
            const slotIcon = this.scene.add.text(
                position.x + slotSize / 2,
                position.y + slotSize / 2,
                '',
                { fontSize: '32px', color: '#ffffff' }
            );
            slotIcon.setOrigin(0.5, 0.5);
            
            // 創建槽位標籤
            const slotLabel = this.scene.add.text(
                position.x + slotSize / 2,
                position.y + slotSize + 8, // 稍微向下調整標籤位置
                position.label,
                { fontSize: '12px', color: '#aaaaaa' }
            );
            slotLabel.setOrigin(0.5, 0);
            
            // 存儲引用
            this.slotRectangles.set(slot, slotRect);
            this.slotTexts.set(slot, slotText);
            this.slotLabels.set(slot, slotLabel);
            this.slotIcons.set(slot, slotIcon);
        });
    }
      // 初始化能力值顯示區域
    private initializeStatDisplay(): void {
        // 與 initializePanelContent 中使用的值保持一致，用於計算裝備槽區域的寬度
        const equipSlotsContainerX = 30;
        const equipSlotObjectSize = 64;
        const equipSlotObjectSpacing = 20;

        // 計算裝備槽區域最右側的 X 座標
        // (第一列槽位起始X + 槽位寬度 + 槽位間距 + 第二列槽位寬度)
        const equipmentSlotsAreaRightEdgeX = equipSlotsContainerX + equipSlotObjectSize + equipSlotObjectSpacing + equipSlotObjectSize;
        
        // 在裝備槽區域右側添加一些間距，作為屬性顯示區域的起始 X
        const statsDisplayAreaPaddingLeft = 20;
        const newStatDisplayStartX = equipmentSlotsAreaRightEdgeX + statsDisplayAreaPaddingLeft;

        const startY = 60;
        const lineHeight = 22; // 保持之前的行高調整
        
        // 創建標題
        const statsTitle = this.scene.add.text(
            newStatDisplayStartX, // 使用新的計算後的 X 座標
            startY - 30,
            '裝備總加成',
            { fontSize: '16px', color: '#3498db', fontStyle: 'bold' }
        );
        this.statTexts.push(statsTitle);
        
        // 創建可能的能力值加成項目
        const statItems = [
            { key: "physicalAttack", label: '物理攻擊' },
            { key: "physicalDefense", label: '物理防禦' },
            { key: "magicAttack", label: '魔法攻擊' },
            { key: "magicDefense", label: '魔法防禦' },
            { key: "hp", label: '生命值' },
            { key: "energy", label: '能量' },
            { key: "accuracy", label: '命中率' },
            { key: "evasion", label: '閃避率' },
            { key: "critRate", label: '暴擊率' },
            { key: "physicalPenetration", label: '物理穿透'},
            { key: "magicPenetration", label: '魔法穿透'},
            { key: "moveSpeed", label: '移動速度'},
            { key: "damageStability", label: '傷害穩定性'},
            { key: "defenseIgnore", label: '無視防禦'},
            { key: "energyRecovery", label: '能量回復'}
        ];
        
        // 創建每個能力值顯示項目
        statItems.forEach((item, index) => {
            const y = startY + index * lineHeight;
            const text = this.scene.add.text(
                newStatDisplayStartX, // 使用新的計算後的 X 座標
                y,
                `${item.label}: 0`,
                // 調整 wordWrap width，確保右側有足夠邊距 (例如 15px)
                { fontSize: '14px', color: '#ffffff', wordWrap: { width: Math.max(50, this.width - newStatDisplayStartX - 15) } } 
            );
            this.statTexts.push(text);
        });
    }
    
    // 點擊裝備槽時的處理
    private onSlotClicked(slot: EquipmentSlot): void {
        this.selectedSlot = slot;
        
        // 更新選中狀態的顯示
        this.updateSlotHighlight();
        
        // 觸發回調
        const equipment = this.equippedItems.get(slot) || null;
        this.onSlotSelected(slot, equipment);
    }
    
    // 更新槽位高亮顯示
    private updateSlotHighlight(): void {
        // 恢復所有槽位的默認樣式
        this.slotRectangles.forEach((rect, slot) => {
            const equipment = this.equippedItems.get(slot);
            rect.setStrokeStyle(1, equipment ? this.getRarityColor(equipment.rarity) : 0xaaaaaa);
        });
        
        // 如果有選中槽位，則突出顯示
        if (this.selectedSlot && this.slotRectangles.has(this.selectedSlot)) {
            const selectedRect = this.slotRectangles.get(this.selectedSlot)!;
            selectedRect.setStrokeStyle(3, 0xffff00); // 黃色邊框表示選中
        }
    }
    
    // 根據稀有度獲取顏色
    private getRarityColor(rarity: ItemRarity): number {
        switch (rarity) {
            case ItemRarity.INFERIOR:
                return 0x555555; // 灰色
            case ItemRarity.COMMON:
                return 0xffffff; // 白色
            case ItemRarity.RARE:
                return 0x3498db; // 藍色
            case ItemRarity.EPIC:
                return 0x9b59b6; // 紫色
            case ItemRarity.LEGENDARY:
                return 0xf1c40f; // 金色
            default:
                return 0xffffff; // 默認白色
        }
    }
      // 更新裝備信息
    public updateEquipment(equippedItems: Map<EquipmentSlot, Equipment | null>): void {
        // 創建新的 Map 以避免引用問題
        this.equippedItems = new Map();
        
        // 確保為所有槽位設置值，即使是 null
        Object.values(EquipmentSlot).forEach(slot => {
            this.equippedItems.set(slot, equippedItems.get(slot) || null);
        });
        // 更新每個槽位的顯示
        Object.values(EquipmentSlot).forEach(slot => {
            if (this.slotTexts.has(slot) && this.slotIcons.has(slot)) {
                const slotText = this.slotTexts.get(slot)!;
                const slotRect = this.slotRectangles.get(slot)!;
                const slotIcon = this.slotIcons.get(slot)!;
                const equipment = this.equippedItems.get(slot);
                
                if (equipment) {
                    slotText.setText(equipment.name);
                    slotRect.setStrokeStyle(1, this.getRarityColor(equipment.rarity));
                    
                    // 更新圖標
                    if (equipment.icon) {                        slotIcon.setText(equipment.icon);
                        slotIcon.setVisible(true);
                    } else {
                        slotIcon.setText('');
                        slotIcon.setVisible(false);
                    }
                } else {
                    slotText.setText('');
                    slotRect.setStrokeStyle(1, 0xaaaaaa);
                    slotIcon.setText('');
                    slotIcon.setVisible(false);
                }
            }
        });
        
        this.updateSlotHighlight();

        // 更新能力值加成顯示
        this.updateStatBonus();
    }    // 更新能力值加成顯示
    private updateStatBonus(): void {
        // 計算所有裝備的能力值加成總和
        const totalStats: Partial<Record<string, number>> = {};
        
        this.equippedItems.forEach(equipment => {
            if (equipment) {
                // 確保 bonusStats 存在並且是一個有效對象
                const bonusStats = equipment.bonusStats || {};
                
                // 使用 Object.entries 遍歷所有屬性
                Object.entries(bonusStats).forEach(([stat, value]) => {
                    if (typeof value === 'number') {
                        totalStats[stat] = (totalStats[stat] || 0) + value;
                    }
                });
            }
        });
        
        console.log("裝備總加成統計:", totalStats);
        
        // 定義要顯示的能力值和對應的駝峰式鍵名
        const statMappings = [
            { key: "physicalAttack", label: '物理攻擊' },
            { key: "physicalDefense", label: '物理防禦' },
            { key: "magicAttack", label: '魔法攻擊' },
            { key: "magicDefense", label: '魔法防禦' },
            { key: "hp", label: '生命值' },
            { key: "energy", label: '能量' },
            { key: "accuracy", label: '命中率' },
            { key: "evasion", label: '閃避率' },
            { key: "critRate", label: '暴擊率' },
            { key: "physicalPenetration", label: '物理穿透'},
            { key: "magicPenetration", label: '魔法穿透'},
            { key: "moveSpeed", label: '移動速度'},
            { key: "damageStability", label: '傷害穩定性'},
            { key: "defenseIgnore", label: '無視防禦'},
            { key: "energyRecovery", label: '能量回復'}
        ];
        
        statMappings.forEach((item, index) => {
            if (index + 1 < this.statTexts.length) { // 確保索引在範圍內
                const value = totalStats[item.key] || 0;
                
                // 對於暴擊率這類小數值，顯示百分比
                let displayValue;
                if (item.key === "critRate") {
                    displayValue = `${(value * 100).toFixed(1)}%`;
                } else {
                    displayValue = `${value > 0 ? '+' : ''}${value}`;
                }
                
                // 更新文本
                this.statTexts[index + 1].setText(`${item.label}: ${displayValue}`);
                
                // 如果有加成，文字顯示為綠色，否則為白色
                this.statTexts[index + 1].setColor(value > 0 ? '#2ecc71' : '#ffffff');
            }
        });
    }
    
    // 設置裝備槽選擇回調
    public setOnSlotSelected(callback: (slot: EquipmentSlot, equipment: Equipment | null) => void): void {
        this.onSlotSelected = callback;
    }
}
