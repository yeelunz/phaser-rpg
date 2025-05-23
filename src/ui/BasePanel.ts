// filepath: c:\\Users\\asas1\\OneDrive\\Desktop\\phaserRpg\\src\\ui\\BasePanel.ts
import Phaser from 'phaser';

export abstract class BasePanel extends Phaser.GameObjects.Container {
    public panelWidth: number; // Changed from protected
    public panelHeight: number; // Changed from protected

    protected background!: Phaser.GameObjects.Graphics;
    protected titleText!: Phaser.GameObjects.Text;
    protected closeButton!: Phaser.GameObjects.Text;
    public isDragging: boolean = false; // Changed from protected to public
    protected dragStartX: number = 0;
    protected dragStartY: number = 0;
    public isActive: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number, panelWidth: number, panelHeight: number, title: string) {
        super(scene, x, y);
        this.panelWidth = panelWidth;
        this.panelHeight = panelHeight;
        this.name = title; // Use name for the title as it's a property of Container
        this.setDepth(1001); // Set a default depth higher than menu buttons

        // 先初始化面板基礎元素，但不調用子類的 initializePanelContent
        this.initializeBase();
        this.setVisible(false); // Initially hidden
        
        // 添加到場景
        scene.add.existing(this);
    }    protected initializeBase(): void {
        // 不需要設置 scrollFactor，因為 UIScene 本身就是固定在螢幕上的
        
        // Background
        this.background = this.scene.add.graphics();
        this.add(this.background); // Add to container

        // Title
        this.titleText = this.scene.add.text(this.panelWidth / 2, 20, this.name, { 
            fontSize: '4px', 
            color: '#ffffff' 
        });
        this.titleText.setOrigin(0.5, 0.5);
        this.add(this.titleText); // Add to container

        // Close button
        this.closeButton = this.scene.add.text(this.panelWidth - 25, 15, 'X', { 
            fontSize: '20px', 
            color: '#ffffff',
        });
        this.closeButton.setOrigin(0.5);
        this.closeButton.setInteractive({ useHandCursor: true });
        // 不需要明確設置 scrollFactor，因為在 UIScene 中
        this.add(this.closeButton); // Add to container

        console.log(`CloseButton created at local: (${this.closeButton.x}, ${this.closeButton.y}) in panel ${this.name}.`);

        this.closeButton.on('pointerdown', () => {
            const pointer = this.scene.input.activePointer;
            const camera = this.scene.cameras.main;
            const worldPoint = pointer.positionToCamera(camera) as Phaser.Math.Vector2;
            const panelScreenX = this.x;
            const panelScreenY = this.y;
            const buttonScreenX = panelScreenX + this.closeButton.x;
            const buttonScreenY = panelScreenY + this.closeButton.y;


            console.log(`Close button clicked on panel ${this.name}! Hiding panel.`);
            this.closeButton.setColor('#00ff00');
            this.hide();
            this.scene.time.delayedCall(200, () => {
                this.closeButton.setColor('#ffffff');
            });
        });

        this.closeButton.on('pointerover', () => {
            console.log(`Pointer over close button on panel ${this.name}`);
            this.closeButton.setColor('#ffff00');
        });

        this.closeButton.on('pointerout', () => {
            console.log(`Pointer out of close button on panel ${this.name}`);
            this.closeButton.setColor('#ffffff');
        });

        this.drawPanel();
        this.makeContainerDraggable(); // Ensure this call is present
        // 不在這裡調用 initializePanelContent，讓子類自己決定何時調用
    }
    
    // 初始化面板內容，包括基礎部分和子類特定內容
    public initialize(): void {
        // 已經在構造函數中調用過基礎初始化，這裡只需調用子類內容初始化
        this.initializePanelContent();
    }

    protected abstract initializePanelContent(): void;

    protected drawPanel(): void {
        this.background.clear();
        this.background.fillStyle(0x000000, 0.8);
        this.background.fillRect(0, 0, this.panelWidth, this.panelHeight);
        this.background.lineStyle(2, 0xffffff, 1);
        this.background.strokeRect(0, 0, this.panelWidth, this.panelHeight);
    }

    protected makeContainerDraggable(): void {
        // Ensure the interactive area covers the panel for dragging
        // The hit area needs to be relative to the container itself (0,0 for its top-left)
        this.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.panelWidth, this.panelHeight), Phaser.Geom.Rectangle.Contains);
        this.scene.input.setDraggable(this);

        this.on('dragstart', (_pointer: Phaser.Input.Pointer) => {
            this.isDragging = true;
            // Optional: Store initial drag offset if needed, though Phaser provides dragX/dragY directly
            // this.dragStartX = pointer.x - this.x;
            // this.dragStartY = pointer.y - this.y;
            
            // Bring to top when starting to drag
            if (this.scene && this.scene.children) {
                this.scene.children.bringToTop(this);
            }
            console.log(`${this.name} drag started.`);
        });

        this.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            if (this.isDragging) {
                this.x = dragX;
                this.y = dragY;
            }
        });

        this.on('dragend', (_pointer: Phaser.Input.Pointer) => {
            if (this.isDragging) {
                this.isDragging = false;
                console.log(`${this.name} drag ended at (${this.x}, ${this.y}).`);
            }
        });
    }    public show(): void {
        // 確保面板是可見的
        this.setVisible(true);
        this.isActive = true;
        
        // 確保面板有較高的深度值
        this.setDepth(1001);
        
        // 確保面板在當前場景的視野範圍內
        const gameWidth = this.scene.scale.width;
        const gameHeight = this.scene.scale.height;
        
        // 調整面板位置以確保它在視野範圍內
        if (this.x < 0) this.x = 10;
        if (this.y < 0) this.y = 10;
        if (this.x + this.panelWidth > gameWidth) this.x = gameWidth - this.panelWidth - 10;
        if (this.y + this.panelHeight > gameHeight) this.y = gameHeight - this.panelHeight - 10;
        
        // 確保面板在最上層
        if (this.scene && this.scene.children) {
            this.scene.children.bringToTop(this);
        }
        
        // 強制更新面板
        this.scene.time.delayedCall(10, () => {
            // 再次確保面板是可見的並在最上層
            this.setVisible(true);
            if (this.scene && this.scene.children) {
                this.scene.children.bringToTop(this);
            }
        });
        
        console.log(`${this.name} panel shown and brought to top. 可見性=${this.visible}, 位置=(${this.x},${this.y}), 深度=${this.depth}`);
    }

    public hide(): void {
        this.setVisible(false);
        this.isActive = false;
        console.log(`${this.name} panel hidden. 可見性=${this.visible}`);
    }

    public toggle(): void {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }    /**
     * 為了向後兼容舊代碼，保留此方法但功能已不再需要
     * 在UIScene中，所有UI元素都自動固定在螢幕上
     * @param x 水平滾動因子（0表示固定在屏幕上，1表示跟隨攝影機）
     * @param y 垂直滾動因子（0表示固定在屏幕上，1表示跟隨攝影機）
     */
    public setScrollFactor(x: number, y: number = x): this {
        // 在UIScene中此方法不再需要實際功能
        console.log(`[已廢棄] ${this.name} 調用 setScrollFactor(${x}, ${y})，但在UIScene中此功能已不再需要`);
        return this;
    }
    
    /**
     * 為了向後兼容舊代碼，保留此方法但功能已不再需要
     */
    private setContainerChildrenScrollFactor(container: Phaser.GameObjects.Container, x: number, y: number): void {
        // 在UIScene中此方法不再需要實際功能
    }
}
