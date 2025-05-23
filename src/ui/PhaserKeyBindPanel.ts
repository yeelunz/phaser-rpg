import { BasePanel } from './BasePanel';
import { Skill } from '../core/skills/skill';
import { SkillManager } from '../core/skills/skillManager';
import { SkillType } from '../core/skills/types';
import { KeyBindManager } from '../core/skills/keyBindManager';

/**
 * 鍵位綁定面板
 */
export class PhaserKeyBindPanel extends BasePanel {
    // 相關管理器
    private skillManager: SkillManager;
    private keyBindManager: KeyBindManager;
    
    // UI元素
    private scrollContent: Phaser.GameObjects.Container; // 可滾動內容
    private maskGraphics: Phaser.GameObjects.Graphics; // 遮罩圖形
    private scrollbarTrack: Phaser.GameObjects.Rectangle; // 滾動條軌道
    private scrollbar: Phaser.GameObjects.Rectangle; // 滾動條
    private instructionText: Phaser.GameObjects.Text; // 指導文字
    
    // 綁定項目
    private bindingItems: Array<{
        container: Phaser.GameObjects.Container;
        skillId: string;
        keyText: Phaser.GameObjects.Text;
    }> = [];
    
    // 記錄當前正在綁定的項目
    private activeBindingItem: string | null = null;
    
    // 尺寸與佈局
    private itemHeight: number = 60; // 每個綁定項目高度
    private scrollbarWidth: number = 12; // 滾動條寬度
    private listPadding: number = 10; // 列表內邊距
    private contentWidth: number = 0; // 內容區域寬度
    
    /**
     * 建構子
     */
    constructor(
        scene: Phaser.Scene, 
        x: number, 
        y: number, 
        width: number, 
        height: number, 
        skillManager: SkillManager
    ) {
        super(scene, x, y, width, height, '鍵位綁定');
        
        this.skillManager = skillManager;
        this.keyBindManager = KeyBindManager.getInstance();
        this.contentWidth = this.panelWidth - this.listPadding * 3 - this.scrollbarWidth;
        
        this.initializePanelContent();
    }
    
    /**
     * 初始化面板內容
     */
    protected initializePanelContent(): void {
        // 創建說明文字
        this.instructionText = this.scene.add.text(
            this.listPadding,
            70,
            '點擊右側鍵位設定，然後按下鍵盤按鍵以綁定技能',
            { fontSize: '14px', color: '#ffffff', wordWrap: { width: this.panelWidth - this.listPadding * 2 } }
        );
        this.add(this.instructionText);
        
        // 創建可滾動內容容器
        this.scrollContent = this.scene.add.container(this.listPadding, 100);        this.add(this.scrollContent);
        
        // 創建並應用遮罩
        const maskHeight = this.panelHeight - 120 - this.listPadding;
        this.maskGraphics = this.scene.add.graphics();
        const mask = new Phaser.Display.Masks.GeometryMask(this.scene, this.maskGraphics);
        this.scrollContent.setMask(mask);
          // 在場景的 update 事件中更新遮罩位置
        this.scene.events.on('update', () => {
            // 確保面板可見且遮罩圖形存在
            if (!this.visible || !this.maskGraphics) {
                // 如果面板不可見，確保遮罩也是空的
                if (this.maskGraphics) {
                    this.maskGraphics.clear();
                }
                return;
            }
            
            // 獲取容器在場景中的絕對座標
            const worldPos = this.getWorldTransformMatrix();
            if (worldPos) {
                const absX = worldPos.tx + this.listPadding;
                const absY = worldPos.ty + 100;
                
                // 清除並重繪遮罩以匹配列表容器的當前位置
                this.maskGraphics.clear();
                this.maskGraphics.fillStyle(0xffffff);
                this.maskGraphics.fillRect(absX, absY, this.contentWidth, maskHeight);
            }
        });
        
        // 創建滾動條軌道
        this.scrollbarTrack = this.scene.add.rectangle(
            this.panelWidth - this.scrollbarWidth - this.listPadding,
            100,
            this.scrollbarWidth,
            maskHeight,
            0x333333
        );
        this.scrollbarTrack.setOrigin(0, 0);
        this.add(this.scrollbarTrack);
        
        // 創建滾動條
        this.scrollbar = this.scene.add.rectangle(
            this.panelWidth - this.scrollbarWidth - this.listPadding,
            100,
            this.scrollbarWidth,
            100, // 初始高度會在更新時調整
            0x666666
        );
        this.scrollbar.setOrigin(0, 0);
        this.add(this.scrollbar);
        
        // 設置滾動事件
        this.setupScrolling();
        
        // 初始化鍵盤監聽器 (用於綁定按鍵)
        this.setupKeyboardListener();
        
        // 更新綁定列表
        this.updateBindingList();
    }
    
    // 先清除任何可能存在的"沒有技能"提示文字
    private clearNoSkillsText(): void {
        if (this.scrollContent) {
            this.scrollContent.each(child => {
                if (child instanceof Phaser.GameObjects.Text) {
                    child.destroy();
                }
            });
        }
    }

    /**
     * 更新綁定列表
     */
    public updateBindingList(): void {
        // 清除任何提示文字
        this.clearNoSkillsText();
        
        // 清空現有項目
        this.bindingItems.forEach(item => {
            if (item && item.container) {
                item.container.destroy();
            }
        });
        this.bindingItems = [];
        
        // 檢查 skillManager 是否存在
        if (!this.skillManager) {
            console.error("鍵位綁定面板: skillManager 未定義");
            return;
        }
        
        // 獲取所有已啟用的主動技能
        const enabledSkills: Skill[] = [];
        const enabledSkillIds = this.skillManager.getEnabledSkills();
        
        console.log("鍵位綁定面板：獲取到啟用技能IDs:", enabledSkillIds);
        
        for (const skillId of enabledSkillIds) {
            if (!skillId || skillId === '') continue; // 跳過空槽位
            
            const skill = this.skillManager.getSkill(skillId);
            if (skill && skill.getType() === SkillType.ACTIVE) {
                enabledSkills.push(skill);
                console.log("鍵位綁定面板：添加已啟用技能:", skill.getName());
            }
        }
          // 只顯示已啟用的技能
        if (enabledSkills.length === 0) {
            console.log("鍵位綁定面板：未找到已啟用技能");
        }
        
        // 創建綁定項目
        let yPosition = 0;
        
        for (const skill of enabledSkills) {
            // 創建項目容器
            const itemContainer = this.scene.add.container(0, yPosition);
            
            // 創建背景
            const bg = this.scene.add.rectangle(
                0, 0,
                this.contentWidth, this.itemHeight,
                0x222222
            );
            bg.setOrigin(0, 0);
            bg.setStrokeStyle(1, 0x444444);
            itemContainer.add(bg);
            
            // 創建技能名稱
            const nameText = this.scene.add.text(
                10, this.itemHeight / 2,
                `${skill.getIcon()} ${skill.getName()}`,
                { fontSize: '16px', color: '#ffffff' }
            );
            nameText.setOrigin(0, 0.5);
            itemContainer.add(nameText);
            
            // 獲取當前綁定的按鍵
            const boundKey = this.keyBindManager.getKeyForSkill(skill.getId());
            
            // 創建綁定按鍵顯示
            const keyText = this.scene.add.text(
                this.contentWidth - 100, this.itemHeight / 2,
                boundKey ? `[${boundKey.toUpperCase()}]` : '[未綁定]',
                { fontSize: '16px', color: boundKey ? '#ffff00' : '#999999' }
            );
            keyText.setOrigin(0.5);
            itemContainer.add(keyText);
            
            // 創建綁定按鈕
            const bindButton = this.scene.add.text(
                this.contentWidth - 40, this.itemHeight / 2,
                '設定',
                { fontSize: '14px', color: '#ffffff', backgroundColor: '#444444', padding: { left: 8, right: 8, top: 4, bottom: 4 } }
            );
            bindButton.setOrigin(0.5);
            bindButton.setInteractive({ useHandCursor: true });
            
            // 綁定按鈕點擊事件
            bindButton.on('pointerdown', () => {
                this.startBinding(skill.getId());
                keyText.setText('按下按鍵...');
                keyText.setColor('#ffaa00');
            });
            
            // 懸停效果
            bindButton.on('pointerover', () => {
                bindButton.setColor('#ffff00');
            });
            
            bindButton.on('pointerout', () => {
                bindButton.setColor('#ffffff');
            });
            
            itemContainer.add(bindButton);
            
            // 創建清除按鈕
            const clearButton = this.scene.add.text(
                this.contentWidth - 10, this.itemHeight / 2,
                '✖',
                { fontSize: '14px', color: '#ff6666' }
            );
            clearButton.setOrigin(1, 0.5);
            clearButton.setInteractive({ useHandCursor: true });
            
            // 清除按鈕點擊事件
            clearButton.on('pointerdown', () => {
                this.keyBindManager.clearSkillBinding(skill.getId());
                keyText.setText('[未綁定]');
                keyText.setColor('#999999');
            });
            
            itemContainer.add(clearButton);
            
            // 添加到滾動內容
            this.scrollContent.add(itemContainer);
            
            // 保存綁定項目引用
            this.bindingItems.push({
                container: itemContainer,
                skillId: skill.getId(),
                keyText: keyText
            });
            
            // 更新Y位置
            yPosition += this.itemHeight + 5;
        }
        
        // 更新滾動條
        this.updateScrollbar();
    }
    
    /**
     * 設置滾動功能
     */
    private setupScrolling(): void {
        // 實現滾輪滾動
        this.scene.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: any, deltaX: number, deltaY: number) => {
            // 確保指針在面板範圍內
            if (!this.getBounds().contains(pointer.x, pointer.y) || !this.visible) {
                return;
            }
            
            // 計算滾動量
            const scrollSpeed = 0.5;
            const scrollAmount = deltaY * scrollSpeed;
            
            // 更新內容Y位置
            this.scrollContent.y -= scrollAmount;
            
            // 檢查邊界
            const contentHeight = this.bindingItems.length * (this.itemHeight + 5);
            const visibleHeight = this.panelHeight - 120 - this.listPadding;
            
            if (contentHeight <= visibleHeight) {
                this.scrollContent.y = 100;
            } else {
                this.scrollContent.y = Math.min(100, Math.max(100 - (contentHeight - visibleHeight), this.scrollContent.y));
            }
            
            // 更新滾動條位置
            this.updateScrollbarPosition();
        });
        
        // 可以添加滾動條拖動功能
        this.scrollbar.setInteractive({ draggable: true });
        this.scrollbar.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            // 計算滾動條可移動範圍
            const scrollTrackHeight = this.scrollbarTrack.height;
            const scrollbarHeight = this.scrollbar.height;
            const maxScrollbarY = 100 + scrollTrackHeight - scrollbarHeight;
            
            // 更新滾動條位置
            this.scrollbar.y = Math.max(100, Math.min(maxScrollbarY, dragY));
            
            // 根據滾動條位置更新內容位置
            const contentHeight = this.bindingItems.length * (this.itemHeight + 5);
            const visibleHeight = this.panelHeight - 120 - this.listPadding;
            
            if (contentHeight > visibleHeight) {
                const scrollRatio = (this.scrollbar.y - 100) / (scrollTrackHeight - scrollbarHeight);
                const scrollOffset = scrollRatio * (contentHeight - visibleHeight);
                this.scrollContent.y = 100 - scrollOffset;
            }
        });
    }
      /**
     * 更新滾動條
     */
    private updateScrollbar(): void {
        const contentHeight = this.bindingItems.length * (this.itemHeight + 5);
        const visibleHeight = this.panelHeight - 120 - this.listPadding;
        const scrollTrackHeight = this.scrollbarTrack.height;
        
        console.log(`滾動內容高度: ${contentHeight}, 可視區域高度: ${visibleHeight}`);
          // 如果內容高度小於可視高度，隱藏滾動條
        if (contentHeight <= visibleHeight) {
            if (this.scrollbar) {
                this.scrollbar.setVisible(false);
            }
            
            // 顯示沒有技能的提示（如果沒有綁定項）
            if (this.bindingItems.length === 0 && this.scrollContent) {
              const noSkillsText = this.scene.add.text(
                this.contentWidth / 2, 
                visibleHeight / 2,
                '沒有可用的主動技能\n請先在技能面板中學習並啟用技能',
                { fontSize: '16px', color: '#999999', align: 'center' }
              );
              noSkillsText.setOrigin(0.5, 0.5);
              this.scrollContent.add(noSkillsText);
            }
            return;
        }
        
        this.scrollbar.setVisible(true);
        
        // 計算滾動條高度比例
        const heightRatio = visibleHeight / contentHeight;
        const scrollbarHeight = Math.max(30, scrollTrackHeight * heightRatio);
        
        // 更新滾動條高度
        this.scrollbar.height = scrollbarHeight;
        
        // 重置內容位置
        this.scrollContent.y = 100;
    }
    
    /**
     * 更新滾動條位置
     */
    private updateScrollbarPosition(): void {
        const contentHeight = this.bindingItems.length * (this.itemHeight + 5);
        const visibleHeight = this.panelHeight - 120 - this.listPadding;
        
        if (contentHeight <= visibleHeight) {
            this.scrollbar.y = 100;
            return;
        }
        
        const scrollTrackHeight = this.scrollbarTrack.height;
        const scrollbarHeight = this.scrollbar.height;
        
        // 計算滾動比例
        const scrollRatio = (100 - this.scrollContent.y) / (contentHeight - visibleHeight);
        this.scrollbar.y = 100 + scrollRatio * (scrollTrackHeight - scrollbarHeight);
    }
    
    /**
     * 設置鍵盤監聽器
     */
    private setupKeyboardListener(): void {
        this.scene.input.keyboard.on('keydown', (event: KeyboardEvent) => {
            // 如果沒有活動綁定項目，忽略按鍵
            if (!this.activeBindingItem || !this.visible) {
                return;
            }
            
            // 獲取按下的按鍵
            const key = event.key.toLowerCase();
            
            // 忽略某些系統按鍵
            if (['escape', 'tab', 'capslock', 'shift', 'control', 'alt', 'meta'].includes(key)) {
                return;
            }
            
            // 設置綁定
            this.keyBindManager.setBinding(key, this.activeBindingItem);
            
            // 更新UI
            const bindingItem = this.bindingItems.find(item => item.skillId === this.activeBindingItem);
            if (bindingItem) {
                bindingItem.keyText.setText(`[${key.toUpperCase()}]`);
                bindingItem.keyText.setColor('#ffff00');
            }
            
            // 結束綁定狀態
            this.activeBindingItem = null;
        });
    }
    
    /**
     * 開始綁定
     * @param skillId 要綁定的技能ID
     */
    private startBinding(skillId: string): void {
        this.activeBindingItem = skillId;
    }
    
    /**
     * 重新構建綁定列表
     * 當技能啟用/禁用狀態改變時調用
     */
    public rebuildBindingList(): void {
        this.updateBindingList();
    }
    
    /**
     * 當面板隱藏時的額外處理
     * 重寫自 BasePanel
     */
    public hide(): void {
        // 先呼叫父類方法
        super.hide();
        
        // 清除遮罩圖形
        if (this.maskGraphics) {
            this.maskGraphics.clear();
        }
        
        console.log('鍵位綁定面板已隱藏，遮罩已清除');
    }
      /**
     * 當面板顯示時的額外處理
     * 重寫自 BasePanel
     */
    public show(): void {
        // 先呼叫父類方法
        super.show();
        
        // 每次顯示時更新綁定列表
        this.updateBindingList();
        
        // 立即更新一次遮罩位置
        if (this.maskGraphics && this.visible) {
            const worldPos = this.getWorldTransformMatrix();
            if (worldPos) {
                const absX = worldPos.tx + this.listPadding;
                const absY = worldPos.ty + 100;
                const maskHeight = this.panelHeight - 120 - this.listPadding;
                
                this.maskGraphics.clear();
                this.maskGraphics.fillStyle(0xffffff);
                this.maskGraphics.fillRect(absX, absY, this.contentWidth, maskHeight);
            }
        }
        
        console.log('鍵位綁定面板已顯示，遮罩已更新');
    }
}
