import Phaser from 'phaser';
import { Item } from '../core/items/item';
import { Equipment } from '../core/items/equipment'; 
import { Consumable } from '../core/items/consumable';
import { Material } from '../core/items/material';
import { BasePanel } from './BasePanel';
import { EquipmentSlot, StatType, WeaponRange } from '../core/data/dataloader'; // 修正 EquipmentSlot 導入路徑，移除未使用的 ItemRarity

const PANEL_WIDTH = 280; 
const MIN_PANEL_HEIGHT = 300; // 最小面板高度
const PADDING = 10;
const ICON_SIZE = 48;
const LINE_SPACING = 4; // 文字行間距
const DETAIL_FONT_SIZE = '14px';
const STAT_FONT_SIZE = '13px';

const BUTTON_WIDTH = 100;
const BUTTON_HEIGHT = 30;
const BUTTON_PADDING = 10;

// 輔助函數：獲取 StatType 的顯示名稱
function getStatTypeName(statType: StatType): string {
    switch (statType) {
        case StatType.HP: return '生命值';
        case StatType.ENERGY: return '能量';
        case StatType.PHYSICAL_ATTACK: return '物理攻擊';
        case StatType.PHYSICAL_DEFENSE: return '物理防禦';
        case StatType.MAGIC_ATTACK: return '魔法攻擊';
        case StatType.MAGIC_DEFENSE: return '魔法防禦';
        case StatType.ACCURACY: return '命中率';
        case StatType.EVASION: return '閃避率';
        case StatType.PHYSICAL_PENETRATION: return '物理穿透';
        case StatType.MAGIC_PENETRATION: return '魔法穿透';
        case StatType.ABSOLUTE_DAMAGE_REDUCTION: return '固定傷害減免';
        case StatType.MAGIC_DAMAGE_BONUS: return '魔法傷害加成';
        case StatType.PHYSICAL_DAMAGE_BONUS: return '物理傷害加成';
        case StatType.DEFENSE_IGNORE: return '防禦穿透';
        case StatType.MOVE_SPEED: return '移動速度';
        case StatType.CRIT_RATE: return '暴擊率';
        case StatType.DAMAGE_STABILITY: return '傷害穩定性';
        case StatType.VULNERABILITY: return '易傷';
        case StatType.RESISTANCE: return '抗性';
        case StatType.ENERGY_RECOVERY: return '能量恢復';
        default: return statType;
    }
}

// 輔助函數：獲取 EquipmentSlot 的顯示名稱
function getEquipmentSlotName(slot: EquipmentSlot): string {
    switch (slot) {
        case EquipmentSlot.WEAPON: return '武器';
        case EquipmentSlot.ARMOR: return '護甲';
        case EquipmentSlot.SHOES: return '鞋子';
        case EquipmentSlot.RING: return '戒指';
        case EquipmentSlot.NECKLACE: return '項鍊';
        default: return slot;
    }
}

// 輔助函數：獲取 WeaponRange 的顯示名稱
function getWeaponRangeName(range: WeaponRange): string {
    switch (range) {
        case WeaponRange.MELEE: return '近戰';
        case WeaponRange.MEDIUM: return '中程';
        case WeaponRange.LONG: return '遠程';
        default: return range;
    }
}

export class PhaserItemDetailsPanel extends BasePanel {
    private itemIcon: Phaser.GameObjects.Text;
    private itemNameText: Phaser.GameObjects.Text;
    private itemTypeText: Phaser.GameObjects.Text; 
    private itemDescriptionText: Phaser.GameObjects.Text;
    
    private itemLevelReqText: Phaser.GameObjects.Text;
    private itemSlotText: Phaser.GameObjects.Text;
    private itemRangeText: Phaser.GameObjects.Text;
    private itemAttackSpeedText: Phaser.GameObjects.Text;
    private itemEnhanceLimitText: Phaser.GameObjects.Text;
    private bonusStatsTitleText: Phaser.GameObjects.Text;
    private bonusStatTexts: Phaser.GameObjects.Text[] = [];

    private useButton: Phaser.GameObjects.Text;
    private dropButton: Phaser.GameObjects.Text;     
    private currentItem: Item | null = null;
    private buttonBackgrounds: Phaser.GameObjects.Rectangle[] = [];  // 追蹤按鈕背景

    constructor(scene: Phaser.Scene, x: number, y: number, width: number = PANEL_WIDTH, height: number = MIN_PANEL_HEIGHT) {
        super(scene, x, y, width, height, '物品詳情');
        this.initializePanelContent(); 
        this.setScrollFactor(0); 
        this.setDepth(100); 

        // 物品圖示
        this.itemIcon = this.scene.add.text(PADDING + ICON_SIZE / 2, this.titleText.y + this.titleText.height + PADDING + ICON_SIZE / 2, '', { fontSize: `${ICON_SIZE * 0.8}px`, color: '#ffffff', align: 'center' });
        this.itemIcon.setOrigin(0.5, 0.5);
        this.add(this.itemIcon);

        // 物品名稱
        this.itemNameText = this.scene.add.text(PADDING + ICON_SIZE + PADDING, this.titleText.y + this.titleText.height + PADDING, '', { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' });
        this.add(this.itemNameText);

        // 物品類型和稀有度
        this.itemTypeText = this.scene.add.text(PADDING + ICON_SIZE + PADDING, this.itemNameText.y + this.itemNameText.height + LINE_SPACING, '', { fontSize: '12px', color: '#cccccc' });
        this.add(this.itemTypeText);
        
        // 物品描述 - Position will be set in showItem
        this.itemDescriptionText = this.scene.add.text(PADDING, 0, '', { fontSize: DETAIL_FONT_SIZE, color: '#dddddd', wordWrap: { width: this.panelWidth - PADDING * 2 } });
        this.add(this.itemDescriptionText);

        // 初始化裝備特定詳情文字物件 (初始隱藏, y-pos will be set in showItem)
        const initialYForDetails = 0; // Placeholder, actual Y set in showItem

        this.itemLevelReqText = this.scene.add.text(PADDING, initialYForDetails, '', { fontSize: DETAIL_FONT_SIZE, color: '#ffffff' }).setVisible(false);
        this.add(this.itemLevelReqText);

        this.itemSlotText = this.scene.add.text(PADDING, initialYForDetails, '', { fontSize: DETAIL_FONT_SIZE, color: '#ffffff' }).setVisible(false);
        this.add(this.itemSlotText);

        this.itemRangeText = this.scene.add.text(PADDING, initialYForDetails, '', { fontSize: DETAIL_FONT_SIZE, color: '#ffffff' }).setVisible(false);
        this.add(this.itemRangeText);
        
        this.itemAttackSpeedText = this.scene.add.text(PADDING, initialYForDetails, '', { fontSize: DETAIL_FONT_SIZE, color: '#ffffff' }).setVisible(false);
        this.add(this.itemAttackSpeedText);

        this.itemEnhanceLimitText = this.scene.add.text(PADDING, initialYForDetails, '', { fontSize: DETAIL_FONT_SIZE, color: '#ffffff' }).setVisible(false);
        this.add(this.itemEnhanceLimitText);

        this.bonusStatsTitleText = this.scene.add.text(PADDING, initialYForDetails, '屬性加成:', { fontSize: DETAIL_FONT_SIZE, color: '#a9a9a9', fontStyle: 'italic' }).setVisible(false);
        this.add(this.bonusStatsTitleText);        const buttonAreaY = this.panelHeight - PADDING - BUTTON_HEIGHT;

        // 建立按鈕，但具體位置在 showItem 會更新
        const useButtonInfo = this.createButton(
            this.panelWidth / 2 - BUTTON_PADDING / 2 - BUTTON_WIDTH, 
            buttonAreaY, 
            '使用', 
            () => this.onUseItem()
        );
        
        this.useButton = useButtonInfo.text;
        this.buttonBackgrounds.push(useButtonInfo.background);

        const dropButtonInfo = this.createButton(
            this.panelWidth / 2 + BUTTON_PADDING / 2, 
            buttonAreaY, 
            '丟棄', 
            () => this.onDropItem()
        );
        
        this.dropButton = dropButtonInfo.text;
        this.buttonBackgrounds.push(dropButtonInfo.background);

        this.setVisible(false);
    }

    // 實作 BasePanel 的抽象方法
    protected initializePanelContent(): void {
        // PhaserItemDetailsPanel 的內容主要在 constructor 和 showItem 中動態處理
        // 此處可以留空，或執行一些通用的初始化（如果有的話）
    }    private createButton(x: number, y: number, text: string, callback: () => void): { text: Phaser.GameObjects.Text, background: Phaser.GameObjects.Rectangle } {
        const buttonBackground = this.scene.add.rectangle(x, y, BUTTON_WIDTH, BUTTON_HEIGHT, 0x555555)
            .setOrigin(0,0)
            .setStrokeStyle(1, 0xaaaaaa)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                buttonBackground.setFillStyle(0x333333); // 按下時變暗
            })
            .on('pointerup', () => {
                buttonBackground.setFillStyle(0x555555); // 恢復顏色
                callback();
            })
            .on('pointerover', () => buttonBackground.setFillStyle(0x777777)) // 滑鼠懸停時變亮
            .on('pointerout', () => buttonBackground.setFillStyle(0x555555)); // 滑鼠移開時恢復
        buttonBackground.setScrollFactor(0); 

        const buttonText = this.scene.add.text(x + BUTTON_WIDTH / 2, y + BUTTON_HEIGHT / 2, text, {
            fontSize: '16px',
            color: '#ffffff',
            align: 'center',
        }).setOrigin(0.5, 0.5);
        buttonText.setScrollFactor(0); 
        
        this.add(buttonBackground); 
        this.add(buttonText);     
        return { text: buttonText, background: buttonBackground }; 
    }public showItem(item: Item): void {
        this.currentItem = item;
        this.setVisible(true);

        // 清除舊的屬性加成文字
        this.bonusStatTexts.forEach(text => text.destroy());
        this.bonusStatTexts = [];

        // 預設隱藏所有裝備特定欄位
        this.itemLevelReqText.setVisible(false);
        this.itemSlotText.setVisible(false);
        this.itemRangeText.setVisible(false);
        this.itemAttackSpeedText.setVisible(false);
        this.itemEnhanceLimitText.setVisible(false);
        this.bonusStatsTitleText.setVisible(false);

        // 設定圖示
        if (item.icon) {
            this.itemIcon.setText(item.icon).setVisible(true);
        } else {
            this.itemIcon.setVisible(false);
        }

        // 設定名稱 (Y 座標由建構子設定)
        this.itemNameText.setText(item.name);
        
        // 設定類型和稀有度顏色 (Y 座標由建構子設定，相對於名稱)
        let typeText = '';
        let rarityColor = '#cccccc'; 

        if (item instanceof Equipment) {
            typeText = '裝備';
            rarityColor = item.getRarityColor(); 
            typeText += ` (${item.getRarityText()})`;
        } else if (item instanceof Consumable) {
            typeText = '消耗品';
        } else if (item instanceof Material) {
            typeText = '材料';
        }
        this.itemTypeText.setText(typeText).setColor(rarityColor);

        // 設定描述文字並定位
        this.itemDescriptionText.setText(item.description || '沒有詳細描述。');
        this.itemDescriptionText.setWordWrapWidth(this.panelWidth - PADDING * 2); 
        this.itemDescriptionText.setPosition(PADDING, this.itemTypeText.y + this.itemTypeText.height + PADDING);
        this.itemDescriptionText.setVisible(true); 

        // 從描述下方開始計算後續內容的 Y 座標
        let currentY = this.itemDescriptionText.y + this.itemDescriptionText.height + PADDING;

        if (item instanceof Equipment) {
            this.itemLevelReqText.setText(`等級需求: ${item.levelRequirement}`)
                .setPosition(PADDING, currentY)
                .setVisible(true);
            currentY += this.itemLevelReqText.height + LINE_SPACING;

            this.itemSlotText.setText(`部位: ${getEquipmentSlotName(item.slot)}`)
                .setPosition(PADDING, currentY)
                .setVisible(true);
            currentY += this.itemSlotText.height + LINE_SPACING;

            if (item.range) {
                this.itemRangeText.setText(`範圍: ${getWeaponRangeName(item.range)}`)
                    .setPosition(PADDING, currentY)
                    .setVisible(true);
                currentY += this.itemRangeText.height + LINE_SPACING;
            } else {
                this.itemRangeText.setVisible(false);
            }
            
            if (item.slot === EquipmentSlot.WEAPON && typeof item.attackSpeed === 'number') {
                 this.itemAttackSpeedText.setText(`攻擊速度: ${item.attackSpeed.toFixed(1)}`)
                    .setPosition(PADDING, currentY)
                    .setVisible(true);
                currentY += this.itemAttackSpeedText.height + LINE_SPACING;
            } else {
                this.itemAttackSpeedText.setVisible(false);
            }            this.itemEnhanceLimitText.setText(`強化上限: ${item.enhanceCount}/${item.enhanceLimit}`)
                .setPosition(PADDING, currentY)
                .setVisible(true);
            currentY += this.itemEnhanceLimitText.height + PADDING; 

            this.bonusStatsTitleText.setPosition(PADDING, currentY).setVisible(true);
            currentY += this.bonusStatsTitleText.height + LINE_SPACING;

            if (item.bonusStats && Object.keys(item.bonusStats).length > 0) {
                Object.entries(item.bonusStats).forEach(([stat, value]) => {
                    if (value !== undefined && value !== 0) { 
                        const statName = getStatTypeName(stat as StatType);
                        const statTextObj = this.scene.add.text(PADDING + 10, currentY, `${statName}: +${value}`, { fontSize: STAT_FONT_SIZE, color: '#66ff66' });
                        this.add(statTextObj); 
                        this.bonusStatTexts.push(statTextObj);
                        currentY += statTextObj.height + LINE_SPACING / 2;
                    }
                });
            } else {
                 const noBonusText = this.scene.add.text(PADDING + 10, currentY, '無額外屬性', { fontSize: STAT_FONT_SIZE, color: '#999999' });
                 this.add(noBonusText); 
                 this.bonusStatTexts.push(noBonusText);
                 currentY += noBonusText.height + LINE_SPACING / 2;
            }        } else if (item instanceof Consumable) {
            // 消耗品特定資訊
            this.itemDescriptionText.setPosition(PADDING, this.itemTypeText.y + this.itemTypeText.height + PADDING);
            currentY = this.itemDescriptionText.y + this.itemDescriptionText.height + PADDING;

            // 嘗試直接訪問原始對象的內部屬性
            let effectTypeVal = '';
            if ((item as any)._effectType) {
                // 使用類的私有屬性
                effectTypeVal = (item as any)._effectType;
                console.log('從私有屬性獲取效果類型:', effectTypeVal);
            } else if ((item as any)._data && (item as any)._data.consumeType) {
                // 嘗試訪問可能的原始數據對象
                effectTypeVal = (item as any)._data.consumeType;
                console.log('從原始數據獲取效果類型:', effectTypeVal);
            } else {
                // 使用一個默認值
                effectTypeVal = 'immediate';  // 使用一個默認值
                console.log('使用默認效果類型:', effectTypeVal);
            }
            
            // 顯示效果類型
            const effectTypeText = this.scene.add.text(PADDING, currentY, `效果類型: ${this.getEffectTypeName(effectTypeVal)}`, { fontSize: DETAIL_FONT_SIZE, color: '#ffffff' });
            this.add(effectTypeText);
            this.bonusStatTexts.push(effectTypeText);
            currentY += effectTypeText.height + LINE_SPACING;
            
            // 顯示效果值
            const effectText = this.scene.add.text(PADDING, currentY, `效果值: ${item.effectValue}`, { fontSize: DETAIL_FONT_SIZE, color: '#66ff66' });
            this.add(effectText);
            this.bonusStatTexts.push(effectText);
            currentY += effectText.height + LINE_SPACING;
            
            // 顯示屬性（如果有）
            if (item.attribute) {
                const attributeText = this.scene.add.text(PADDING, currentY, `目標屬性: ${this.getAttributeName(item.attribute)}`, { fontSize: DETAIL_FONT_SIZE, color: '#ffffff' });
                this.add(attributeText);
                this.bonusStatTexts.push(attributeText);
                currentY += attributeText.height + LINE_SPACING;
            }
            
            // 持續時間（如果有）
            if (item.duration) {
                const durationText = this.scene.add.text(PADDING, currentY, `持續時間: ${item.duration}秒`, { fontSize: DETAIL_FONT_SIZE, color: '#ffffff' });
                this.add(durationText);
                this.bonusStatTexts.push(durationText);
                currentY += durationText.height + LINE_SPACING;
            }        } else if (item instanceof Material) {
            // 材料特定資訊
            this.itemDescriptionText.setPosition(PADDING, this.itemTypeText.y + this.itemTypeText.height + PADDING);
            currentY = this.itemDescriptionText.y + this.itemDescriptionText.height + PADDING;
            
            // 顯示堆疊資訊
            const stackText = this.scene.add.text(PADDING, currentY, `可堆疊: ${item.stackable ? '是' : '否'}`, { fontSize: DETAIL_FONT_SIZE, color: '#ffffff' });
            this.add(stackText);
            this.bonusStatTexts.push(stackText);
            currentY += stackText.height + LINE_SPACING;
            
            // 顯示數量
            const quantityText = this.scene.add.text(PADDING, currentY, `數量: ${item.quantity}`, { fontSize: DETAIL_FONT_SIZE, color: '#ffffff' });
            this.add(quantityText);
            this.bonusStatTexts.push(quantityText);
            currentY += quantityText.height + LINE_SPACING;
            
            // 顯示價值
            const valueText = this.scene.add.text(PADDING, currentY, `價值: ${item.value} 金幣`, { fontSize: DETAIL_FONT_SIZE, color: '#ffdd66' });
            this.add(valueText);
            this.bonusStatTexts.push(valueText);
            currentY += valueText.height + LINE_SPACING;
            
            // 用途提示
            const usageText = this.scene.add.text(PADDING, currentY, '用途: 可用於合成或升級裝備', { fontSize: DETAIL_FONT_SIZE, color: '#aaaaaa', fontStyle: 'italic' });
            this.add(usageText);
            this.bonusStatTexts.push(usageText);
            currentY += usageText.height + LINE_SPACING;
        }        if (item instanceof Equipment) {
            this.useButton.setText('裝備');
            this.useButton.setVisible(true);
        } else if (item instanceof Consumable) {
            this.useButton.setText('使用');
            this.useButton.setVisible(true);
        } else if (item instanceof Material) {
            // 材料通常不能直接使用，因此隱藏使用按鈕
            this.useButton.setVisible(false);
        } else {
            this.useButton.setVisible(false);
        }
          if (!(item instanceof Equipment)) {
            this.itemDescriptionText.setPosition(PADDING, this.itemTypeText.y + this.itemTypeText.height + PADDING);
        }
        
        // 計算新的面板高度
        // 按鈕區域的 Y 座標應該在內容下方
        let maxContentY = this.itemDescriptionText.y + this.itemDescriptionText.height;
        
        // 如果有屬性加成文本，找出最後一個文本的位置
        if (this.bonusStatTexts.length > 0) {
            const lastStatText = this.bonusStatTexts[this.bonusStatTexts.length - 1];
            maxContentY = Math.max(maxContentY, lastStatText.y + lastStatText.height);
        }
        
        // 重新設置按鈕位置
        const buttonY = maxContentY + PADDING * 2;
        
        // 更新按鈕位置
        for (let i = 0; i < this.buttonBackgrounds.length; i++) {
            const bg = this.buttonBackgrounds[i];
            const btn = i === 0 ? this.useButton : this.dropButton;
            
            const btnX = i === 0 
                ? this.panelWidth / 2 - BUTTON_PADDING / 2 - BUTTON_WIDTH 
                : this.panelWidth / 2 + BUTTON_PADDING / 2;
                
            bg.setPosition(btnX, buttonY);
            btn.setPosition(btnX + BUTTON_WIDTH / 2, buttonY + BUTTON_HEIGHT / 2);        }
        
        // 計算新的面板高度 = 按鈕位置 + 按鈕高度 + 底部填充
        const newPanelHeight = buttonY + BUTTON_HEIGHT + PADDING;
        
        // 更新面板高度並重繪
        if (this.panelHeight !== newPanelHeight) {
            this.panelHeight = Math.max(MIN_PANEL_HEIGHT, newPanelHeight);
            this.drawPanel(); // 從BasePanel繼承的方法，用於根據新高度重繪面板
            
            // 重新設置互動區域以匹配新的面板高度
            this.resetInteractive();
        }
    }    private onUseItem(): void {
        if (!this.currentItem) return;

        console.log(`嘗試使用/裝備物品: ${this.currentItem.name}`);
        if (this.currentItem instanceof Equipment) {
            console.log(`${this.currentItem.name} 是裝備，觸發裝備事件。`);
            // 使用 game.events 而不是 scene.events 以確保跨場景傳遞
            this.scene.game.events.emit('equipItem', this.currentItem);
            console.log(`已通過 game.events 發送裝備事件: ${this.currentItem.name}`);
            
            // 強制隱藏面板
            this.setVisible(false);
            this.visible = false;
            console.log(`物品詳情面板已隱藏，可見性狀態: ${this.visible}`);
        } else if (this.currentItem instanceof Consumable) {
            console.log(`${this.currentItem.name} 是消耗品，觸發使用事件。`);
            // 使用 game.events 而不是 scene.events 以確保跨場景傳遞
            this.scene.game.events.emit('useConsumable', this.currentItem);
            console.log(`已通過 game.events 發送使用消耗品事件: ${this.currentItem.name}`);
            
            // 強制隱藏面板
            this.setVisible(false);
            this.visible = false;
            console.log(`物品詳情面板已隱藏，可見性狀態: ${this.visible}`);
        }
        // 材料已經在UI中不會顯示使用按鈕，所以這裡不需要處理
    }    private onDropItem(): void {
        if (!this.currentItem) return;

        const confirmDrop = window.confirm(`您確定要丟棄 ${this.currentItem.name} 嗎？此操作無法復原。`);
        if (confirmDrop) {
            console.log(`丟棄物品: ${this.currentItem.name}`);
            // 使用 game.events 而不是 scene.events 以確保跨場景傳遞
            this.scene.game.events.emit('dropItem', this.currentItem);
            console.log(`已通過 game.events 發送丟棄物品事件: ${this.currentItem.name}`);
            
            // 強制隱藏面板
            this.setVisible(false);
            this.visible = false;
            console.log(`物品詳情面板已隱藏（丟棄操作後），可見性狀態: ${this.visible}`);
        }
    }

    // 添加一個方法來重置互動區域以匹配新的面板尺寸
    private resetInteractive(): void {
        // 移除現有的互動設置
        this.removeInteractive();
        // 使用新的尺寸重新設置互動區域
        this.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.panelWidth, this.panelHeight), Phaser.Geom.Rectangle.Contains);
        // 重新設置為可拖動
        this.scene.input.setDraggable(this);
    }    // 獲取消耗品效果類型的顯示名稱
    private getEffectTypeName(effectType: string): string {
        switch (effectType) {
            case 'immediate': return '立即效果';
            case 'overtime': return '持續效果';
            case 'special': return '特殊效果';
            default: return effectType;
        }
    }

    // 獲取消耗品屬性的顯示名稱
    private getAttributeName(attribute: string): string {
        switch (attribute) {
            case 'heal': return '恢復';
            case 'damage': return '傷害';
            case 'buff': return '增益';
            default: return attribute;
        }
    }
}
