import Phaser from "phaser";

/**
 * 按鈕信息介面
 */
interface ButtonInfo {
  icon: string;
  label: string;
  callback: () => void;
}

// MD3 Inspired Color Palette (Dark Theme)
const MD3_COLOR_PRIMARY = 0x8A85FF; // Accent for pressed state
const MD3_COLOR_ON_PRIMARY = 0x000000; // Text on primary
const MD3_COLOR_SURFACE_CONTAINER = 0x2D2D30; // Button resting background
const MD3_COLOR_ON_SURFACE = 0xE0E0E0; // Text/icon color on surface
const MD3_COLOR_ON_SURFACE_VARIANT = 0xB0B0B0; // Lighter text for labels
const MD3_COLOR_SURFACE_CONTAINER_HIGH = 0x3A3A3D; // Button hover background
// const MD3_COLOR_OUTLINE = 0x5A5A5D; // Optional: subtle outline

/**
 * PhaserMenuButtons 類別
 * 負責創建和管理遊戲的選單按鈕 (MD3 風格 with fallback)
 */
export class PhaserMenuButtons {
  private scene: Phaser.Scene;
  public container: Phaser.GameObjects.Container;

  // MD3 Style Properties
  private readonly buttonWidth = 64;
  private readonly buttonHeight = 72;
  private readonly borderRadius = 16;
  private readonly iconSize = 28; //px
  private readonly labelSize = 10; //px
  private readonly spacing = 12;
  private readonly menuMarginRight = 20;
  private readonly menuMarginTop = 80;

  private supportsRoundRectangle: boolean;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.supportsRoundRectangle = !!this.scene.add.roundRectangle; // Check for RoundRectangle support

    if (!this.supportsRoundRectangle) {
      console.warn(
        'Phaser.GameObjects.RoundRectangle is not available (requires Phaser 3.60+). ' +
        'Falling back to Graphics object for buttons. Appearance should be similar.'
      );
    }
    this.createMenuButtons();
  }

  /**
   * 創建選單按鈕
   */
  private createMenuButtons(): void {
    // Calculate initial position for the main container (top-center of the button strip)
    const initialFixedX = this.scene.cameras.main.width - this.menuMarginRight - this.buttonWidth / 2;
    const initialFixedY = this.menuMarginTop;

    this.container = this.scene.add.container(initialFixedX, initialFixedY);
    this.container.setScrollFactor(0); // Crucial: container does not scroll with the camera
    this.container.setDepth(1000); // High depth to keep on top

    console.log(`選單按鈕容器建立於位置 (${initialFixedX}, ${initialFixedY}) 深度 1000`);    const buttons: ButtonInfo[] = [
      { icon: '📦', label: '物品', callback: () => { console.log('物品按鈕被點擊，發送 toggleInventoryPanel 事件'); this.scene.game.events.emit('toggleInventoryPanel'); } },
      { icon: '👤', label: '狀態', callback: () => { console.log('狀態按鈕被點擊，發送 toggleStatusPanel 事件'); this.scene.game.events.emit('toggleStatusPanel'); } },
      { icon: '⚔️', label: '裝備', callback: () => { console.log('裝備按鈕被點擊，發送 toggleEquipmentPanel 事件'); this.scene.game.events.emit('toggleEquipmentPanel'); } },
      { icon: '✨', label: '技能', callback: () => { console.log('技能按鈕被點擊，發送 toggleSkillPanel 事件'); this.scene.game.events.emit('toggleSkillPanel'); } },
      { icon: '⌨️', label: '按鍵', callback: () => { console.log('按鍵設定按鈕被點擊，發送 toggleKeyBindPanel 事件'); this.scene.game.events.emit('toggleKeyBindPanel'); } },
      { icon: '📜', label: '任務', callback: () => console.log('打開任務功能尚未實現') },
      { icon: '⚙️', label: '設定', callback: () => console.log('打開設定功能尚未實現') }
    ];

    let yPos = 0; // Relative Y position for each buttonContainer within the main 'this.container'

    buttons.forEach((buttonInfo, index) => {
      // Create a container for each button's elements.
      // Its (0,0) will be the top-left of this button's "slot".
      const buttonContainer = this.scene.add.container(0, yPos);

      let buttonBgElement: Phaser.GameObjects.RoundRectangle | Phaser.GameObjects.Graphics;
      let currentFillColor = MD3_COLOR_SURFACE_CONTAINER; // Track logical fill for state management
      let isPointerCurrentlyOver = false; // Flag to track hover state for delayed callbacks

      // Define the center point for the button's visual elements, relative to buttonContainer's origin
      const buttonVisualCenterX = 0; // Horizontally centered within buttonContainer
      const buttonVisualCenterY = this.buttonHeight / 2; // Vertically centered within buttonContainer

      // --- Button Background (RoundRectangle or Graphics) ---
      if (this.supportsRoundRectangle) {
        buttonBgElement = this.scene.add.roundRectangle(
          buttonVisualCenterX, // x position relative to buttonContainer
          buttonVisualCenterY, // y position relative to buttonContainer
          this.buttonWidth,
          this.buttonHeight,
          this.borderRadius,
          MD3_COLOR_SURFACE_CONTAINER
        ) as Phaser.GameObjects.RoundRectangle;
        buttonBgElement.setOrigin(0.5, 0.5); // Set origin to the center of the RoundRectangle
      } else {
        const graphics = this.scene.add.graphics();
        // Position the Graphics object itself so its origin (0,0) is at the button's visual center
        graphics.setPosition(buttonVisualCenterX, buttonVisualCenterY);

        // Store render config for redrawing, coordinates are relative to the Graphics object's origin
        (graphics as any)._renderConfig = {
          x: -this.buttonWidth / 2,
          y: -this.buttonHeight / 2,
          width: this.buttonWidth,
          height: this.buttonHeight,
          radius: this.borderRadius,
        };
        
        const cfg = (graphics as any)._renderConfig;
        graphics.fillStyle(MD3_COLOR_SURFACE_CONTAINER, 1);
        graphics.fillRoundedRect(cfg.x, cfg.y, cfg.width, cfg.height, cfg.radius);
        buttonBgElement = graphics;
      }

      // --- Icon Text ---
      const iconText = this.scene.add.text(
        buttonVisualCenterX, // Centered horizontally
        buttonVisualCenterY - this.buttonHeight * 0.15, // Position icon slightly above the button's vertical center
        buttonInfo.icon,
        {
          fontSize: `${this.iconSize}px`,
          color: `#${MD3_COLOR_ON_SURFACE.toString(16)}`,
          align: 'center',
        }
      );
      iconText.setOrigin(0.5, 0.5);

      // --- Label Text ---
      const labelText = this.scene.add.text(
        buttonVisualCenterX, // Centered horizontally
        buttonVisualCenterY + this.buttonHeight * 0.25, // Position label below the button's vertical center
        buttonInfo.label,
        {
          fontSize: `${this.labelSize}px`,
          color: `#${MD3_COLOR_ON_SURFACE_VARIANT.toString(16)}`,
          align: 'center',
        }
      );
      labelText.setOrigin(0.5, 0.5);
      
      // Add all visual elements for this button to its dedicated buttonContainer
      buttonContainer.add([buttonBgElement, iconText, labelText]);
      // Add this button's container to the main menu container
      this.container.add(buttonContainer);

      // --- Helper to set fill style for both RoundRectangle and Graphics ---
      const setFill = (target: typeof buttonBgElement, color: number, alpha: number = 1) => {
        currentFillColor = color; // Update logical fill state
        if (this.supportsRoundRectangle) {
          (target as Phaser.GameObjects.RoundRectangle).setFillStyle(color, alpha);
        } else {
          const gfx = target as Phaser.GameObjects.Graphics;
          const cfg = (gfx as any)._renderConfig;
          gfx.clear();
          gfx.fillStyle(color, alpha);
          gfx.fillRoundedRect(cfg.x, cfg.y, cfg.width, cfg.height, cfg.radius);
        }
      };
      
      // --- Interaction Handling ---
      if (this.supportsRoundRectangle) {
        buttonBgElement.setInteractive({ useHandCursor: true });
      } else {
        // For Graphics objects, define a hit area shape.
        // The hit area coordinates are relative to the Graphics object's origin,
        // which we've set to be its visual center.
        const hitArea = new Phaser.Geom.Rectangle(
            -this.buttonWidth / 2, 
            -this.buttonHeight / 2,
            this.buttonWidth,
            this.buttonHeight
        );
        buttonBgElement.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains, { useHandCursor: true });
      }

      buttonBgElement.on('pointerdown', () => {
        console.log(`選單按鈕被點擊: "${buttonInfo.label}"`);
        setFill(buttonBgElement, MD3_COLOR_PRIMARY, 1);
        iconText.setColor(`#${MD3_COLOR_ON_PRIMARY.toString(16)}`);
        labelText.setColor(`#${MD3_COLOR_ON_PRIMARY.toString(16)}`);
        
        this.scene.time.delayedCall(100, () => {
          // After a short delay, revert to hover or resting state
          if (isPointerCurrentlyOver) { 
            setFill(buttonBgElement, MD3_COLOR_SURFACE_CONTAINER_HIGH, 1);
            iconText.setColor(`#${MD3_COLOR_ON_SURFACE.toString(16)}`);
            labelText.setColor(`#${MD3_COLOR_ON_SURFACE_VARIANT.toString(16)}`);
          } else {
            setFill(buttonBgElement, MD3_COLOR_SURFACE_CONTAINER, 1);
            iconText.setColor(`#${MD3_COLOR_ON_SURFACE.toString(16)}`);
            labelText.setColor(`#${MD3_COLOR_ON_SURFACE_VARIANT.toString(16)}`);
          }
          buttonInfo.callback(); // Execute the button's action
        });
      });

      buttonBgElement.on('pointerover', () => {
        isPointerCurrentlyOver = true; // Set hover flag
        // Change to hover style only if not currently in "pressed" state
        if (currentFillColor !== MD3_COLOR_PRIMARY) { 
          setFill(buttonBgElement, MD3_COLOR_SURFACE_CONTAINER_HIGH, 1);
        }
      });

      buttonBgElement.on('pointerout', () => {
        isPointerCurrentlyOver = false; // Clear hover flag
        // Revert to resting style only if not currently in "pressed" state
        if (currentFillColor !== MD3_COLOR_PRIMARY) { 
          setFill(buttonBgElement, MD3_COLOR_SURFACE_CONTAINER, 1);
          iconText.setColor(`#${MD3_COLOR_ON_SURFACE.toString(16)}`); // Ensure text colors reset
          labelText.setColor(`#${MD3_COLOR_ON_SURFACE_VARIANT.toString(16)}`);
        }
      });
      
      console.log(`按鈕 ${index} (${buttonInfo.label}) 建立於選單容器的相對位置 (0, ${yPos})`);
      // Update yPos for the next buttonContainer
      yPos += this.buttonHeight + this.spacing;
    });

    // Ensure the main menu container is on top of other scene elements
    this.scene.children.bringToTop(this.container);
  }

  /**
   * 更新選單按鈕位置，保持在螢幕右側固定位置
   * Call this if the game screen/camera size changes.
   */
  public updatePosition(): void {
    if (this.container) {
      const fixedX = this.scene.cameras.main.width - this.menuMarginRight - this.buttonWidth / 2;
      const fixedY = this.menuMarginTop;
      this.container.setPosition(fixedX, fixedY);
    }
  }

  /**
   * 確保選單按鈕在最上層
   */
  public bringToTop(): void {
    if (this.container) {
      this.scene.children.bringToTop(this.container);
    }
  }

  /**
   * 銷毀選單按鈕容器及其所有子元素
   */
  public destroy(): void {
    if (this.container) {
      this.container.destroy(true); // true to destroy children as well
      // this.container = null; // Optional: if you need to explicitly nullify for GC or state checks
    }
  }
}