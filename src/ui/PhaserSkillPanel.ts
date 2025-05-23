import { BasePanel } from './BasePanel';
import { Skill } from '../core/skills/skill';
import { SkillManager } from '../core/skills/skillManager';
import { SkillType, SkillCategory, WeaponRestrictionType } from '../core/skills/types';

export class PhaserSkillPanel extends BasePanel {
// 核心功能管理器
private skillManager: SkillManager;

// 技能相關映射和容器
private skillSlotMap: Map<number, Skill> = new Map(); // 技能索引映射
private skillItems: Phaser.GameObjects.Container[] = []; // 技能項目容器

// UI元素
private skillPointsText: Phaser.GameObjects.Text;
private categoryButtons: Phaser.GameObjects.Container;
private listContainer: Phaser.GameObjects.Container; // 技能列表容器
private scrollContent: Phaser.GameObjects.Container; // 可滾動內容
private scrollbarTrack: Phaser.GameObjects.Rectangle; // 滾動條軌道
private scrollbar: Phaser.GameObjects.Rectangle; // 滾動條
private detailsPanel: Phaser.GameObjects.Container; // 技能詳情面板
private maskGraphics: Phaser.GameObjects.Graphics; // 遮罩圖形

// 狀態追蹤
private currentCategory: SkillCategory = SkillCategory.BASIC_ACTIVE;
private selectedSkill: Skill | null = null; // 當前選中的技能

// 尺寸與佈局
private itemHeight: number = 80; // 每個技能項目高度
private scrollbarWidth: number = 12; // 滾動條寬度
private listPadding: number = 10; // 列表內邊距
private listAreaHeight: number = 0; // 列表區域高度
private listWidth: number = 0; // 列表寬度

// 固定在屏幕上的標誌
private fixedToCamera: boolean = true;

/**
 * 建構子
 * @param scene Phaser場景
 * @param x 面板x座標
 * @param y 面板y座標
 * @param width 面板寬度
 * @param height 面板高度
 * @param skillManager 技能管理器
 * @param fixedToCamera 是否固定在屏幕上，不受攝影機移動影響
 */    constructor(
    scene: Phaser.Scene, 
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    skillManager: SkillManager,
    fixedToCamera: boolean = true
) {
    super(scene, x, y, width, height, '技能列表');
    
    console.log("PhaserSkillPanel constructor called");
    
    this.skillManager = skillManager;
    this.fixedToCamera = fixedToCamera;
    
    // 確保 UI 不受攝影機影響
    if (this.fixedToCamera) {
        this.setScrollFactor(0);
    }
    
    // 計算列表區域的尺寸
    this.listWidth = this.panelWidth - this.listPadding * 3 - this.scrollbarWidth;
    this.listAreaHeight = this.panelHeight - 150; // 減去標題和按鈕的高度
    
    // 初始化面板內容
    this.initializePanelContent();
    
    // 調試信息
    console.log("PhaserSkillPanel initialization completed");
    if (this.skillManager) {
        console.log("技能管理器連接成功，可用技能點數:", this.skillManager.getSkillPoints());
        console.log("總技能數量:", Array.from(this.skillManager.getAllSkills()).length);
    } else {
        console.error("技能管理器未定義！");
    }
}

/**
 * 初始化面板内容 (實現BasePanel的抽象方法)
 */
protected initializePanelContent(): void {
    // 創建技能點數文本
    this.skillPointsText = this.scene.add.text(
        this.listPadding,
        this.panelHeight - this.listPadding - 20,
        '可用技能點: 0',
        { fontSize: '16px', color: '#ffff00' }
    );
    this.add(this.skillPointsText);

    // 創建技能列表容器
    this.listContainer = this.scene.add.container(this.listPadding, 110);
    this.add(this.listContainer);

        // 創建分類按鈕容器
    this.categoryButtons = this.scene.add.container(this.listPadding, 60);
    this.add(this.categoryButtons);
    this.createCategoryButtons();
    this.categoryButtons.setDepth(100); // 確保分類按鈕在最上層

    // 創建列表背景
    const listBackground = this.scene.add.rectangle(
        0, 0,
        this.listWidth + this.scrollbarWidth + this.listPadding,
        this.listAreaHeight,
        0x222222
    );
    listBackground.setOrigin(0, 0);
    listBackground.setStrokeStyle(1, 0x444444);
    this.listContainer.add(listBackground);      // 創建滾動內容容器
    this.listContainer.setDepth(5); // 確保列表在背景之上


    this.scrollContent = this.scene.add.container(0, 0);
    this.listContainer.add(this.scrollContent);    // 在場景的 update 事件中實時更新遮罩
    // 創建一個矩形遮罩，並在每一幀更新其位置
    this.maskGraphics = this.scene.add.graphics();
    const mask = new Phaser.Display.Masks.GeometryMask(this.scene, this.maskGraphics);
    
    this.scrollContent.setMask(mask);
    this.scrollContent.setDepth(10); // 確保內容在背景之上


    


    
    // 在場景的 update 事件中更新遮罩位置
    this.scene.events.on('update', () => {
        if (!this.visible) return;
          // 獲取 listContainer 在場景中的絕對座標
        const worldPos = this.listContainer.getWorldTransformMatrix();
        const absX = worldPos.tx;
        const absY = worldPos.ty;
        
        // 清除並重繪遮罩以匹配列表容器的當前位置
        this.maskGraphics.clear();
        this.maskGraphics.fillStyle(0xffffff);
        this.maskGraphics.fillRect(absX, absY, this.listWidth, this.listAreaHeight);
    });
    
    // 創建滾動條軌道
    this.scrollbarTrack = this.scene.add.rectangle(
        this.listWidth + this.listPadding,
        0,
        this.scrollbarWidth,
        this.listAreaHeight,
        0x333333
    );
    this.scrollbarTrack.setOrigin(0, 0);
    this.listContainer.add(this.scrollbarTrack);
    
    // 創建滾動條
    this.scrollbar = this.scene.add.rectangle(
        this.listWidth + this.listPadding,
        0,
        this.scrollbarWidth,
        100, // 初始高度
        0x666666
    );
    this.scrollbar.setOrigin(0, 0);
    this.scrollbar.setInteractive({ useHandCursor: true, draggable: true });
    this.listContainer.add(this.scrollbar);
    
    // 配置滾動條拖動
    this.configureScrollbarDrag();
    
    // 設置鼠標滾輪事件
    this.configureMouseWheel();
    
    // 創建技能詳情面板
    this.detailsPanel = this.scene.add.container(
        this.panelWidth - 250,
        this.listPadding * 2 + (this.titleText ? this.titleText.height : 30)
    );
    this.detailsPanel.setVisible(false);
    this.add(this.detailsPanel);
    this.createDetailsPanel();
    
    // 更新技能顯示
    this.updateSkillPoints();
    this.updateSkillDisplay();
}

/**
 * 配置滾動條的拖動功能
 */
private configureScrollbarDrag(): void {
    this.scrollbar.on('drag', (_pointer: Phaser.Input.Pointer, _dragX: number, dragY: number) => {
        // 限制拖動範圍
        const maxY = this.listAreaHeight - this.scrollbar.height;
        const newY = Math.max(0, Math.min(dragY, maxY));
        this.scrollbar.y = newY;
        
        // 更新內容滾動位置
        const totalContentHeight = this.skillItems.length * this.itemHeight;
        const scrollRatio = newY / maxY;
        const scrollY = -scrollRatio * (totalContentHeight - this.listAreaHeight);
        
        // 更新列表內容位置
        this.scrollContent.y = Math.min(0, Math.max(-(totalContentHeight - this.listAreaHeight), scrollY));
    });
}

/**
 * 設置鼠標滾輪事件
 */
private configureMouseWheel(): void {
    this.scene.input.on('wheel', (pointer: Phaser.Input.Pointer, _gameObjects: any, _deltaX: number, deltaY: number) => {
        if (!this.visible) return;
        
        // 檢查鼠標是否在列表區域內
        const localX = pointer.x - (this.x + this.listContainer.x);
        const localY = pointer.y - (this.y + this.listContainer.y);
        
        if (localX >= 0 && localX <= this.listWidth &&
            localY >= 0 && localY <= this.listAreaHeight) {
            
            // 計算滾動量
            const totalContentHeight = this.skillItems.length * this.itemHeight;
            if (totalContentHeight <= this.listAreaHeight) return;
            
            const scrollStep = Math.min(50, this.itemHeight / 2);
            const newY = this.scrollContent.y - Math.sign(deltaY) * scrollStep;
            
            // 限制滾動範圍
            this.scrollContent.y = Math.min(0, Math.max(-(totalContentHeight - this.listAreaHeight), newY));
            
            // 更新滾動條位置
            const maxScrollbarY = this.listAreaHeight - this.scrollbar.height;
            const scrollRatio = Math.abs(this.scrollContent.y) / (totalContentHeight - this.listAreaHeight);
            this.scrollbar.y = scrollRatio * maxScrollbarY;
        }
    });
}
  /**
 * 創建分類按鈕
 */
private createCategoryButtons(): void {
    // 清空現有按鈕
    this.categoryButtons.removeAll(true);
    
    // 定義分類
    const categories = [
        { id: SkillCategory.BASIC_ACTIVE, name: '主動技能', icon: '🔥' },
        { id: SkillCategory.BASIC_PASSIVE, name: '被動技能', icon: '✨' },
        { id: SkillCategory.BASIC_COMMON, name: '共通技能', icon: '⚡' },
        { id: SkillCategory.ULTIMATE, name: '究極技能', icon: '🌟' }
    ];
    
    let offsetX = 0;
    const tabWidth = 120;
    const tabHeight = 40;
    
    categories.forEach((category) => {
        // 背景矩形
        const buttonBg = this.scene.add.rectangle(
            offsetX,
            0,
            tabWidth,
            tabHeight,
            category.id === this.currentCategory ? 0x444444 : 0x222222
        );
        buttonBg.setOrigin(0, 0);
        buttonBg.setStrokeStyle(1, 0xffffff);
        
        // 文字
        const tabText = this.scene.add.text(
            offsetX + tabWidth / 2,
            tabHeight / 2,
            `${category.icon} ${category.name}`,
            {
                fontSize: '14px',
                color: category.id === this.currentCategory ? '#FFFFFF' : '#AAAAAA'
            }
        );
        tabText.setOrigin(0.5);
        
        // 創建分類按鈕容器
        const categoryButton = this.scene.add.container(0, 0, [buttonBg, tabText]);
        categoryButton.setData('categoryId', category.id);
        this.categoryButtons.add(categoryButton);
        
        // 設定互動事件
        buttonBg.setInteractive({ useHandCursor: true });
        
        buttonBg.on('pointerdown', () => {
            this.setCategory(category.id);
        });
        
        buttonBg.on('pointerover', () => {
            if (this.currentCategory !== category.id) {
                buttonBg.setFillStyle(0x333333);
                tabText.setColor('#FFFFFF');
            }
        });
        
        buttonBg.on('pointerout', () => {
            if (this.currentCategory !== category.id) {
                buttonBg.setFillStyle(0x222222);
                tabText.setColor('#AAAAAA');
            }
        });
        
        // 更新偏移
        offsetX += tabWidth + 10; // 按鈕間的間距
    });
}
  /**
 * 創建技能詳情面板
 */
private createDetailsPanel(): void {
    // 清空現有內容
    this.detailsPanel.removeAll(true);

    const paneloffsetY = 75
    
    // 背景
    const bg = this.scene.add.rectangle(
        0, paneloffsetY,
        230, 280,
        0x222222
    );
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, 0xaaaaaa);
    this.detailsPanel.add(bg);
    
    // 標題
    const titleText = this.scene.add.text(
        115, paneloffsetY + 15,
        '技能詳情',
        { fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }
    );
    titleText.setOrigin(0.5, 0);
    this.detailsPanel.add(titleText);
    
    // 添加預設的內容文本
    const names = ['技能名稱:', '類型:', '等級:', '冷卻時間:', '能量消耗:', '描述:'];
    const contents = ['', '', '', '', '', ''];
    
    names.forEach((name, index) => {
        // 標籤
        const labelText = this.scene.add.text(
            10, paneloffsetY + 45 + index * 25,
            name,
            { fontSize: '14px', color: '#aaaaaa' }
        );
        labelText.setOrigin(0, 0);
        this.detailsPanel.add(labelText);
        
        // 內容
        const contentText = this.scene.add.text(
            110, paneloffsetY + 45 + index * 25,
            contents[index],
            { fontSize: '14px', color: '#ffffff', wordWrap: { width: 120 } }
        );
        contentText.setOrigin(0, 0);
        contentText.setData('type', name.replace(':', ''));
        this.detailsPanel.add(contentText);
    });
    
    // 學習/升級按鈕背景 - 調整寬度更小一些
    const buttonBg = this.scene.add.rectangle(
        70, paneloffsetY + 230,
        120, 30,
        0x444444
    );
    buttonBg.setOrigin(0.5, 0);
    buttonBg.setStrokeStyle(1, 0xffffff);
    buttonBg.setInteractive({ useHandCursor: true });
    buttonBg.setData('type', 'action');
    this.detailsPanel.add(buttonBg);
    
    // 學習/升級按鈕文本
    const buttonText = this.scene.add.text(
        70, paneloffsetY + 245,
        '學習技能',
        { fontSize: '14px', color: '#ffffff' }
    );
    buttonText.setOrigin(0.5, 0.5);
    buttonText.setData('type', 'actionText');
    this.detailsPanel.add(buttonText);
    
    // 學習/升級按鈕事件
    buttonBg.on('pointerdown', () => {
        this.onActionButtonClick();
    });
    
    buttonBg.on('pointerover', () => {
        buttonBg.setFillStyle(0x666666);
    });
    
    buttonBg.on('pointerout', () => {
        buttonBg.setFillStyle(0x444444);
    });

    // 啟用/禁用按鈕背景
    const toggleBg = this.scene.add.rectangle(
        180, paneloffsetY + 230,
        100, 30,
        0x444444
    );
    toggleBg.setOrigin(0.5, 0);
    toggleBg.setStrokeStyle(1, 0xffffff);
    toggleBg.setInteractive({ useHandCursor: true });
    toggleBg.setData('type', 'toggle');
    this.detailsPanel.add(toggleBg);
    
    // 啟用/禁用按鈕文本
    const toggleText = this.scene.add.text(
        180, paneloffsetY + 245,
        '啟用技能',
        { fontSize: '14px', color: '#ffffff' }
    );
    toggleText.setOrigin(0.5, 0.5);
    toggleText.setData('type', 'toggleText');
    this.detailsPanel.add(toggleText);
    
    // 啟用/禁用按鈕事件
    toggleBg.on('pointerdown', () => {
        this.onToggleButtonClick();
    });
    
    toggleBg.on('pointerover', () => {
        toggleBg.setFillStyle(0x666666);
    });
    
    toggleBg.on('pointerout', () => {
        toggleBg.setFillStyle(0x444444);
    });
}

/**
 * 更新技能詳情面板内容
 */
private updateDetailsPanel(skill: Skill): void {
    if (!this.detailsPanel.visible) {
        this.detailsPanel.setVisible(true);
    }
    
    this.selectedSkill = skill;
    
    // 更新各個文本內容
    this.detailsPanel.list.forEach(item => {
        if (item instanceof Phaser.GameObjects.Text) {
            const type = item.getData('type');
            switch (type) {
                case '技能名稱':
                    item.setText(skill.getName());
                    break;
                case '類型':
                    let typeText = '';
                    switch (skill.getType()) {
                        case SkillType.ACTIVE:
                            typeText = '主動技能';
                            break;
                        case SkillType.PASSIVE:
                            typeText = '被動技能';
                            break;
                        case SkillType.COMMON:
                            typeText = '共通技能';
                            break;
                    }
                    item.setText(typeText);
                    break;
                case '等級':
                    const level = skill.getCurrentLevel();
                    const maxLevel = skill.getMaxLevel();
                    item.setText(skill.isLearned() ? `${level}/${maxLevel}` : '未學習');
                    break;
                case '冷卻時間':
                    item.setText(skill.isLearned() ? `${skill.getCooldown()}秒` : '-');
                    break;
                case '能量消耗':
                    item.setText(skill.isLearned() ? `${skill.getEnergyCost()}` : '-');
                    break;
                case '描述':
                    item.setText(skill.isLearned() ? skill.getDescription() : '尚未學習此技能');
                    break;
                case 'actionText': // 學習/升級按鈕文字
                    // 保持原來的處理邏輯
                    break;
                case 'toggleText': // 啟用/禁用按鈕文字
                    if (skill.isLearned()) {
                        const isEnabled = this.skillManager?.isSkillEnabled(skill.getId()) || false;
                        item.setText(isEnabled ? '禁用技能' : '啟用技能');
                    } else {
                        item.setText('無法啟用');
                    }
                    break;
            }
        } else if (item instanceof Phaser.GameObjects.Rectangle) {
            if (item.getData('type') === 'action') { // 學習/升級按鈕
                // 更新按鈕狀態
                const actionButton = item;
                const actionText = this.detailsPanel.list.find(
                    e => e instanceof Phaser.GameObjects.Text && e.getData('type') === 'actionText'
                ) as Phaser.GameObjects.Text;
                
                if (skill.isLearned()) {
                    if (skill.getCurrentLevel() < skill.getMaxLevel()) {                        actionText.setText(`升級 (${skill.getUpgradePointCost()}點)`);
                        actionButton.setFillStyle(0x444444);
                        actionButton.setInteractive({ useHandCursor: true });
                    } else {
                        actionText.setText('已達最高等級');
                        actionButton.setFillStyle(0x333333);
                        actionButton.disableInteractive();
                    }
                } else {
                    actionText.setText(`學習 (${skill.getUpgradePointCost()}點)`);
                    actionButton.setFillStyle(0x444444);
                    actionButton.setInteractive({ useHandCursor: true });
                }
            } else if (item.getData('type') === 'toggle') { // 啟用/禁用按鈕
                // 更新按鈕狀態
                const toggleButton = item;
                
                if (skill.isLearned()) {
                    toggleButton.setFillStyle(0x444444);
                    toggleButton.setInteractive({ useHandCursor: true });
                } else {
                    toggleButton.setFillStyle(0x333333);
                    toggleButton.disableInteractive();
                }
            }
        }
    });
}      /**
 * 處理詳情面板中的操作按鈕點擊
 */
private onActionButtonClick(): void {
    if (!this.selectedSkill || !this.skillManager) {
        console.warn("無法執行操作: 未選擇技能或技能管理器為空");
        return;
    }
    
    const skill = this.selectedSkill;
    let success = false;
    
    console.log(`嘗試操作技能: ${skill.getName()}, 已學習: ${skill.isLearned()}, 技能點數: ${this.skillManager.getSkillPoints()}`);
    
    if (skill.isLearned()) {
        // 升級技能
        success = this.skillManager.upgradeSkill(skill.getId());
        if (success) {
            console.log(`成功升級技能: ${skill.getName()} 到 ${skill.getCurrentLevel()} 級`);
        } else {
            console.error(`升級技能失敗: ${skill.getName()}, 原因可能是技能點數不足或已達最高等級`);
        }
    } else {
        // 學習技能
        success = this.skillManager.learnSkill(skill.getId());
        if (success) {
            console.log(`成功學習技能: ${skill.getName()}`);
        } else {
            console.error(`學習技能失敗: ${skill.getName()}, 原因可能是技能點數不足`);
        }
    }
    
    if (success) {
        // 更新顯示
        this.updateSkillDisplay();
        this.updateDetailsPanel(skill);
        this.updateSkillPoints();
    } else {
        // 顯示錯誤訊息
        const errorText = this.scene.add.text(
            this.x + this.panelWidth / 2,
            this.y + this.panelHeight / 2,
            `操作失敗: 技能點數不足或已達最高等級`,
            { fontSize: '16px', color: '#ff0000', backgroundColor: '#000000' }
        );
        errorText.setOrigin(0.5);
        errorText.setScrollFactor(0);
        errorText.setDepth(1000);
        
        // 2秒後移除錯誤訊息
        this.scene.time.delayedCall(2000, () => {
            errorText.destroy();
        });
    }
}

/**
 * 處理啟用/禁用按鈕的點擊
 */
private onToggleButtonClick(): void {
    if (!this.selectedSkill || !this.skillManager) {
        console.warn("無法切換技能狀態: 未選擇技能或技能管理器為空");
        return;
    }
    
    const skill = this.selectedSkill;
    
    // 檢查技能是否已學習
    if (!skill.isLearned()) {
        this.showErrorMessage("必須先學習技能才能啟用");
        return;
    }
    
    // 檢查技能是否已啟用
    const isEnabled = this.skillManager.isSkillEnabled(skill.getId());
    let success = false;
    
    if (isEnabled) {
        // 如果已啟用，則禁用
        success = this.skillManager.disableSkill(skill.getId());
    } else {
        // 如果未啟用，檢查是否有可用槽位
        const availableSlots = this.skillManager.getAvailableSkillSlots();
        const enabledSkills = this.skillManager.getEnabledSkills().filter(id => id !== '');
        
        if (enabledSkills.length >= availableSlots) {
            this.showErrorMessage(`已達到最大技能槽數量 (${availableSlots})，請先禁用其他技能`);
            return;
        }
        
        // 啟用技能
        success = this.skillManager.enableSkill(skill.getId());
    }
    
    if (success) {
        console.log(`成功${isEnabled ? '禁用' : '啟用'}技能: ${skill.getName()}`);
        this.updateDetailsPanel(skill); // 更新詳情面板
    } else {
        this.showErrorMessage(`操作失敗: ${isEnabled ? '禁用' : '啟用'}技能失敗`);
    }
}

/**
 * 顯示錯誤消息
 */
private showErrorMessage(message: string): void {
    const errorText = this.scene.add.text(
        this.x + this.panelWidth / 2,
        this.y + this.panelHeight / 2,
        message,
        { fontSize: '16px', color: '#ff0000', backgroundColor: '#000000' }
    );
    errorText.setOrigin(0.5);
    errorText.setScrollFactor(0);
    errorText.setDepth(1000);
    
    // 2秒後移除錯誤訊息
    this.scene.time.delayedCall(2000, () => {
        errorText.destroy();
    });
}

/**
 * 創建技能項目
 */
private createSkillItem(skill: Skill, index: number): Phaser.GameObjects.Container {
    // 創建容器
    const container = this.scene.add.container(0, index * this.itemHeight);
    
    // 背景
    const isLearned = skill.isLearned();
    const bg = this.scene.add.rectangle(
        0, 0,
        this.listWidth, this.itemHeight,
        isLearned ? 0x446644 : 0x333333
    );
    bg.setOrigin(0);
    bg.setStrokeStyle(2, this.getColorBySkillType(skill.getType()));
    container.add(bg);
    
    // 圖標
    const iconText = this.scene.add.text(
        this.listPadding * 2,
        this.itemHeight / 2,
        skill.getIcon() || '❓',
        { fontSize: '32px', color: '#ffffff' }
    );
    iconText.setOrigin(0, 0.5);
    container.add(iconText);
    
    // 武器限制圖標
    const weaponSymbol = this.getWeaponRestrictionSymbol(skill.getWeaponRestriction());
    if (weaponSymbol) {
        const weaponText = this.scene.add.text(
            this.listPadding * 2 + 40,
            this.itemHeight / 2 + 15,
            weaponSymbol,
            { fontSize: '18px', color: '#ffffff' }
        );
        weaponText.setOrigin(0, 0.5);
        container.add(weaponText);
    }
    
    // 技能名稱
    const nameText = this.scene.add.text(
        this.listPadding * 2 + 70,
        this.itemHeight / 2 - 15,
        skill.getName(),
        { fontSize: '18px', color: isLearned ? '#AAFFAA' : '#ffffff', fontStyle: 'bold' }
    );
    nameText.setOrigin(0, 0.5);
    container.add(nameText);
    
    // 技能等級
    let levelText = '';
    if (isLearned) {
        levelText = `等級: ${skill.getCurrentLevel()}/${skill.getMaxLevel()}`;
    } else {
        levelText = '未學習';
    }
    
    const levelInfoText = this.scene.add.text(
        this.listPadding * 2 + 70,
        this.itemHeight / 2 + 15,
        levelText,
        { fontSize: '14px', color: isLearned ? '#AAFFAA' : '#AAAAAA' }
    );
    levelInfoText.setOrigin(0, 0.5);
    container.add(levelInfoText);
      // 技能點數要求
    const nextLevelCost = skill.getUpgradePointCost();
    let costMsg = '已達最高等級';
    
    if (nextLevelCost > 0) {
        costMsg = isLearned ? 
            `升級: ${nextLevelCost}點` : 
            `學習: ${nextLevelCost}點`;
    }
    
    const costText = this.scene.add.text(
        this.listWidth - this.listPadding * 3,
        this.itemHeight / 2 + 15,
        costMsg,
        { fontSize: '14px', color: '#ffff99' }
    );
    costText.setOrigin(1, 0.5);
    container.add(costText);
    
    // 最高等級標記
    if (isLearned && skill.getCurrentLevel() >= skill.getMaxLevel()) {
        const maxLabel = this.scene.add.text(
            this.listWidth - this.listPadding * 3,
            this.itemHeight / 2 - 15,
            '已達最高等級',
            { fontSize: '14px', color: '#ffcc00', fontStyle: 'bold' }
        );
        maxLabel.setOrigin(1, 0.5);
        container.add(maxLabel);
    }
    
    // 添加互動
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => {
        this.onSkillItemClick(skill);
    });
    
    bg.on('pointerover', () => {
        bg.setFillStyle(isLearned ? 0x558855 : 0x666666);
    });
    
    bg.on('pointerout', () => {
        bg.setFillStyle(isLearned ? 0x446644 : 0x555555);
    });
    
    // 如果是選中的技能，高亮顯示
    if (this.selectedSkill && skill.getId() === this.selectedSkill.getId()) {
        bg.setStrokeStyle(3, 0xffffff);
    }
    
    return container;
}

/**
 * 當點擊技能項目時
 */
private onSkillItemClick(skill: Skill): void {
    console.log(`點擊技能: ${skill.getName()}`);
    
    // 更新選中的技能
    this.selectedSkill = skill;
    
    // 更新詳情面板
    this.updateDetailsPanel(skill);
    
    // 更新高亮顯示
    this.skillItems.forEach((item, idx) => {
        const bg = item.list[0] as Phaser.GameObjects.Rectangle;
        const itemSkill = this.skillSlotMap.get(idx);
        
        if (itemSkill && this.selectedSkill && itemSkill.getId() === this.selectedSkill.getId()) {
            bg.setStrokeStyle(3, 0xffffff);
        } else if (itemSkill) {
            bg.setStrokeStyle(2, this.getColorBySkillType(itemSkill.getType()));
        }
    });
}

/**
 * 設置當前顯示的技能分類
 */
public setCategory(categoryId: SkillCategory): void {
    this.currentCategory = categoryId;
    
    // 更新分類按鈕顯示
    this.updateCategoryButtons();
    
    // 更新技能顯示
    this.updateSkillDisplay();
}

/**
 * 更新分類按鈕狀態
 */
private updateCategoryButtons(): void {
    this.categoryButtons.list.forEach(child => {
        if (child instanceof Phaser.GameObjects.Container) {
            const categoryId = child.getData('categoryId');
            const isActive = categoryId === this.currentCategory;
            
            // 獲取背景和文字
            const bg = child.list[0] as Phaser.GameObjects.Rectangle;
            const text = child.list[1] as Phaser.GameObjects.Text;
            
            // 設置顏色
            bg.setFillStyle(isActive ? 0x444444 : 0x222222);
            text.setColor(isActive ? '#FFFFFF' : '#AAAAAA');
        }
    });
}      /**
 * 更新技能點數顯示
 */
public updateSkillPoints(): void {
    // 添加空值檢查，防止this.skillManager為undefined
    const skillPoints = this.skillManager ? this.skillManager.getSkillPoints() : 0;
    this.skillPointsText.setText(`可用技能點: ${skillPoints}`);
}

/**
 * 獲取技能類型對應的顯示顏色
 */
private getColorBySkillType(type: SkillType): number {
    switch (type) {
        case SkillType.ACTIVE:
            return 0x5bc0de; // 藍色
        case SkillType.PASSIVE:
            return 0xf0ad4e; // 橙色
        case SkillType.COMMON:
            return 0x5cb85c; // 綠色
        default:
            return 0xaaaaaa; // 默認灰色
    }
}

/**
 * 獲取武器限制對應的表示符號
 */
private getWeaponRestrictionSymbol(restriction: WeaponRestrictionType): string {
    switch (restriction) {
        case WeaponRestrictionType.MELEE:
            return '⚔️'; // 近戰武器
        case WeaponRestrictionType.MEDIUM:
            return '🗡️'; // 中距離武器
        case WeaponRestrictionType.RANGED:
            return '🏹'; // 遠程武器
        case WeaponRestrictionType.ANY:
            return '🔄'; // 任何武器
        default:
            return '';
    }
}      /**
 * 更新技能顯示
 */
public updateSkillDisplay(): void {
    // 清空現有映射和項目
    this.skillSlotMap.clear();
    this.skillItems.forEach(item => item.destroy());
    this.skillItems = [];
    
    // 如果skillManager為undefined，直接返回
    if (!this.skillManager) {
        console.warn("無法更新技能顯示：skillManager未定義");
        return;
    }
    
    // 獲取當前分類的技能
    let skills = Array.from(this.skillManager.getAllSkills())
        .filter(skill => skill.getCategory() === this.currentCategory);
        
    console.log(`更新技能顯示，當前分類: ${this.currentCategory}，技能數量: ${skills.length}`);
    
    if (skills.length === 0) {
        console.warn(`當前分類 ${this.currentCategory} 中沒有找到技能`);
        
        // 創建提示文本
        const noSkillsText = this.scene.add.text(
            this.listWidth / 2,
            this.listAreaHeight / 2,
            `此分類中無技能`,
            { fontSize: '18px', color: '#aaaaaa' }
        );
        noSkillsText.setOrigin(0.5);
        this.scrollContent.add(noSkillsText);
        // 
        
        // 更新滾動條
        this.updateScrollbar();
        return;
    }
    
    // 排序：已學習的在前，未學習的在後
    skills.sort((a, b) => {
        // 優先顯示已學習的技能
        if (a.isLearned() && !b.isLearned()) return -1;
        if (!a.isLearned() && b.isLearned()) return 1;
        
        // 如果都已學習，按等級從高到低排序
        if (a.isLearned() && b.isLearned()) {
            return b.getCurrentLevel() - a.getCurrentLevel();
        }
        
        // 如果都未學習，按名稱字母順序排序
        return a.getName().localeCompare(b.getName());
    });
    
    // 創建滾動內容
    this.scrollContent.y = 0;
    this.scrollContent.removeAll(true); // 清空舊項目
    
    // 創建技能項目
    skills.forEach((skill, index) => {
        const item = this.createSkillItem(skill, index);
        this.scrollContent.add(item);
        this.skillItems.push(item);
        this.skillSlotMap.set(index, skill);
    });
    
    // 更新滾動條
    this.updateScrollbar();
    
    // 如果選中的技能不在當前分類，重置選中狀態
    if (this.selectedSkill && !skills.some(s => s.getId() === this.selectedSkill?.getId())) {
        this.selectedSkill = null;
        this.detailsPanel.setVisible(false);
    }
    // 如果有選中的技能，更新它的詳情
    else if (this.selectedSkill) {
        const updatedSkill = skills.find(s => s.getId() === this.selectedSkill?.getId());
        if (updatedSkill) {
            this.updateDetailsPanel(updatedSkill);
        }
    }
}

/**
 * 更新滾動條狀態
 */
private updateScrollbar(): void {
    const totalContentHeight = this.skillItems.length * this.itemHeight;
    
    // 如果內容不需要滾動，隱藏滾動條
    if (totalContentHeight <= this.listAreaHeight) {
        this.scrollbar.setVisible(false);
        return;
    }
    
    // 顯示滾動條
    this.scrollbar.setVisible(true);
    
    // 更新滾動條高度和位置
    const scrollRatio = this.listAreaHeight / totalContentHeight;
    const scrollbarHeight = Math.max(30, this.listAreaHeight * scrollRatio);
    this.scrollbar.height = scrollbarHeight;
    this.scrollbar.y = 0; // 重置滾動條位置
}
  /**
 * 重寫show方法，確保顯示時更新內容
 */
public show(): void {
    super.show();
    
    // 確保技能管理器已正確初始化
    if (this.skillManager) {
        const skillCount = Array.from(this.skillManager.getAllSkills()).length;
        console.log(`顯示技能面板，已載入技能數: ${skillCount}`);
    } else {
        console.warn("顯示技能面板時，技能管理器未定義");
    }
    
    this.updateSkillPoints();
    this.updateSkillDisplay();
    
    // 立即更新遮罩，確保它顯示在正確位置
    if (this.maskGraphics && this.listContainer) {
        const worldPos = this.listContainer.getWorldTransformMatrix();
        this.maskGraphics.clear();
        this.maskGraphics.fillStyle(0xffffff);
        this.maskGraphics.fillRect(worldPos.tx, worldPos.ty, this.listWidth, this.listAreaHeight);
    }
}

/**
 * 重寫隱藏方法，確保遮罩也跟著消失
 */
public hide(): void {
    super.hide();
    
    // 清除遮罩圖形
    if (this.maskGraphics) {
        this.maskGraphics.clear();
    }
}

}