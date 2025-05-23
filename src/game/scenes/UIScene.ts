import Phaser from "phaser";
import { SkillManager } from "../../core/skills/skillManager";
import { PhaserSkillPanel } from "../../ui/PhaserSkillPanel";
import { PhaserStatusPanel } from "../../ui/PhaserStatusPanel";
import { PhaserInventoryPanel } from "../../ui/PhaserInventoryPanel";
import { PhaserEquipmentPanel } from "../../ui/PhaserEquipmentPanel";
import { PhaserKeyBindPanel } from "../../ui/PhaserKeyBindPanel";
import { Stats } from "../../core/stats";
import { InventoryManager } from "../../core/items/inventory_manager";
import { Equipment } from "../../core/items/equipment";
import { EquipmentSlot } from "../../core/data/dataloader";
import { Inventory } from "../../core/items/inventory";
import { PhaserHUD } from "../../ui/PhaserHUD";
import { PhaserMenuButtons } from "../../ui/PhaserMenuButtons";
import { KeyBindManager } from "../../core/skills/keyBindManager";
import Player from "../../game/Player"; // 導入 Player 類

export class UIScene extends Phaser.Scene {  // UI面板
  private skillPanel: PhaserSkillPanel;
  private statusPanel: PhaserStatusPanel;
  private inventoryPanel: PhaserInventoryPanel;
  private equipmentPanel: PhaserEquipmentPanel;
  private keyBindPanel: PhaserKeyBindPanel;
  
  // HUD 與選單按鈕
  private hud: PhaserHUD;
  private menuButtons: PhaserMenuButtons;

  // 核心管理器
  private skillManager: SkillManager;
  private keyBindManager: KeyBindManager;
  private playerStats: Stats;
  private inventoryManager: InventoryManager;
  private player: Player; // 添加對 Player 實例的引用

  constructor() {
    super({ key: "UIScene", active: true });
  }  
  init(data: any): void {
    // 從遊戲場景接收必要數據
    this.skillManager = data.skillManager || null;
    this.playerStats = data.stats || null;
    this.inventoryManager = data.inventoryManager || null;
    this.player = data.player || null;  // 接收 player 實例
    
    console.log("UIScene initialized with data:", data);
    console.log(
      "初始化狀態: skillManager:",
      !!this.skillManager,
      "playerStats:",
      !!this.playerStats,
      "inventoryManager:",
      !!this.inventoryManager,
      "player:",
      !!this.player
    );
    
    // 檢查技能管理器的技能數量
    if (this.skillManager) {
      const skillCount = Array.from(this.skillManager.getAllSkills()).length;
      console.log(`技能管理器中的技能數量: ${skillCount}`);
      
      if (skillCount === 0) {
        console.warn("技能管理器中沒有技能，可能初始化未完成");
      }
    }
  }
  create(): void {
    console.log("UIScene created");

    const { width, height } = this.scale;    // 確認核心數據存在並創建默認數據（如果缺失）
    if (!this.playerStats) {
      console.warn("UIScene: playerStats is undefined! 創建一個預設的 playerStats");
      this.playerStats = new Stats();
    }    if (!this.skillManager) {
      console.warn("UIScene: skillManager is undefined! 創建一個預設的 skillManager");
      this.skillManager = new SkillManager(this.playerStats, this.game);
    }

    if (!this.inventoryManager) {
      console.warn("UIScene: inventoryManager is undefined! 創建一個預設的 inventoryManager");
      this.inventoryManager = InventoryManager.getInstance();
    }
      // 創建 HUD 元素 (包含技能槽)
    this.hud = new PhaserHUD(this, this.playerStats, this.skillManager);
    
    // 創建選單按鈕
    this.menuButtons = new PhaserMenuButtons(this);// 創建技能面板 - 初始隱藏
    this.skillPanel = new PhaserSkillPanel(
      this,
      width / 2 - 250,
      height / 2 - 200,
      500,
      400,
      this.skillManager
    );
    
    // 如果技能管理器已加載技能，立即更新面板
    if (this.skillManager && Array.from(this.skillManager.getAllSkills()).length > 0) {
      this.skillPanel.updateSkillPoints();
      this.skillPanel.updateSkillDisplay();
      console.log("已更新技能面板顯示");
    } else {
      console.warn("技能管理器未準備好，無法更新技能面板");
    }
    
    this.skillPanel.hide();

    // 創建狀態面板 - 初始隱藏
    this.statusPanel = new PhaserStatusPanel(
      this,
      width / 2 - 200,
      height / 2 - 250,
      400,
      630,
      this.playerStats
    );
    this.statusPanel.hide(); // 如果有庫存管理器，創建庫存面板
    if (this.inventoryManager) {
      // 創建物品欄面板 - 初始隱藏
      this.inventoryPanel = new PhaserInventoryPanel(
        this,
        width / 2 - 250,
        height / 2 - 225,
        500,
        450
      );
      this.inventoryPanel.hide();
      console.log("UIScene: 物品欄面板創建完成");

      // 創建裝備面板 - 初始隱藏
      this.equipmentPanel = new PhaserEquipmentPanel(
        this,
        width / 2 - 200,
        height / 2 - 225,
        400,
        450
      );      this.equipmentPanel.hide();
      console.log("UIScene: 裝備面板創建完成");
      
      // 初始化鍵位綁定管理器
      this.keyBindManager = KeyBindManager.getInstance();
      
      // 創建鍵位綁定面板 - 初始隱藏
      this.keyBindPanel = new PhaserKeyBindPanel(
        this,
        width / 2 - 250,
        height / 2 - 200,
        500,
        400,
        this.skillManager
      );
      this.keyBindPanel.hide();
      console.log("UIScene: 鍵位綁定面板創建完成");
      
      // 設置裝備面板槽位選擇回調
      this.setupEquipmentInteraction();
    } else {
      console.warn(
        "UIScene: inventoryManager is undefined, skipping inventory and equipment panels"
      );
    } // 添加鍵盤事件來控制面板顯示

    // 監聽來自 Game 場景的 UI 事件
    this.setupEventListeners();

    // 監聽場景關閉事件，清理資源
    this.events.once("shutdown", this.shutdown, this);
  }
  // 設置事件監聽器，響應來自 Game 場景的 UI 事件  
    private setupEventListeners(): void {
    if (!this.game || !this.game.events) {
      console.error("UIScene: game events system is not available");
      return;
    }

    // 監聽物品欄面板事件
    this.game.events.on("showInventoryPanel", () => {
      if (this.inventoryPanel && this.inventoryManager) {
        this.inventoryPanel.updateInventory(
          this.inventoryManager.playerInventory
        );
        this.inventoryPanel.show();
        this.children.bringToTop(this.inventoryPanel);
      }
    });
      // 監聽庫存更新事件
    this.game.events.on("inventoryUpdated", (inventory: Inventory) => {
      console.log("UIScene 收到 inventoryUpdated 事件");
      if (this.inventoryPanel) {
        this.inventoryPanel.updateInventory(inventory);
      }
    });
    
    // 確認事件監聽器已設置
    console.log('UIScene: 設置了 inventoryUpdated 事件監聽器', !!this.game.events);// 監聽裝備更新事件
    this.game.events.on("equipmentUpdated", (equipmentMap: Map<EquipmentSlot, Equipment | null>) => {
      console.log("UIScene 收到 equipmentUpdated 事件");
      if (this.equipmentPanel) {
        this.equipmentPanel.updateEquipment(equipmentMap);
      }
    });

    // 監聽玩家狀態更新事件
    this.game.events.on("playerStatsUpdated", (stats: Stats) => {
      console.log("UIScene 收到 playerStatsUpdated 事件");
      if (this.statusPanel) {
        this.statusPanel.updateStats(stats);
      }
      // 更新本地 stats 引用
      this.playerStats = stats;
    });

    this.game.events.on("hideInventoryPanel", () => {
      if (this.inventoryPanel) {
        this.inventoryPanel.hide();
      }
    });

    this.game.events.on("toggleInventoryPanel", () => {
      console.log("UIScene 收到 toggleInventoryPanel 事件");
      if (this.inventoryPanel) {
        // 如果面板未初始化，則更新庫存
        if (this.inventoryManager) {
          console.log(
            "UIScene: 更新物品欄數據，物品數量:",
            this.inventoryManager.playerInventory.items.length
          );
          this.inventoryPanel.updateInventory(
            this.inventoryManager.playerInventory
          );
        } else {
          console.error("UIScene: inventoryManager 未定義，無法更新物品欄數據");
        }
        this.togglePanel(this.inventoryPanel);
        console.log(
          "UIScene 切換後物品欄面板可見狀態:",
          this.inventoryPanel.visible
        );
      } else {
        console.error("UIScene: 物品欄面板未初始化");
      }
    });

    // 監聽狀態面板事件
    this.game.events.on("showStatusPanel", () => {
      if (this.statusPanel && this.playerStats) {
        this.statusPanel.updateStats(this.playerStats);
        this.statusPanel.show();
        this.children.bringToTop(this.statusPanel);
      }
    });

    this.game.events.on("hideStatusPanel", () => {
      if (this.statusPanel) {
        this.statusPanel.hide();
      }
    });

    this.game.events.on("toggleStatusPanel", () => {
      if (this.statusPanel) {
        this.togglePanel(this.statusPanel);
      }
    });

    // 監聽裝備面板事件
    this.game.events.on("showEquipmentPanel", () => {
      if (this.equipmentPanel && this.player) {
        // 更新裝備面板數據，使用 player 的 equipmentManager
        const equippedItems = this.player.getEquipmentManager().getAllEquipment();
        this.equipmentPanel.updateEquipment(equippedItems);
        this.equipmentPanel.show();
        this.children.bringToTop(this.equipmentPanel);
      }
    });

    this.game.events.on("hideEquipmentPanel", () => {
      if (this.equipmentPanel) {
        this.equipmentPanel.hide();
      }
    });

    this.game.events.on("toggleEquipmentPanel", () => {
      if (this.equipmentPanel) {
        this.togglePanel(this.equipmentPanel);
      }
    });    // 監聽技能面板事件
    this.game.events.on("showSkillPanel", () => {
      if (this.skillPanel) {
        this.skillPanel.show();
        this.children.bringToTop(this.skillPanel);
      }
    });
    
    // 監聽鍵位綁定面板事件
    this.game.events.on("showKeyBindPanel", () => {
      if (this.keyBindPanel && this.skillManager) {
        this.keyBindPanel.updateBindingList();
        this.keyBindPanel.show();
        this.children.bringToTop(this.keyBindPanel);
      }
    });

    this.game.events.on("hideKeyBindPanel", () => {
      if (this.keyBindPanel) {
        this.keyBindPanel.hide();
      }
    });

    this.game.events.on("toggleKeyBindPanel", () => {
      if (this.keyBindPanel) {
        this.togglePanel(this.keyBindPanel);
      }
    });

    this.game.events.on("hideSkillPanel", () => {
      if (this.skillPanel) {
        this.skillPanel.hide();
      }
    });

    this.game.events.on("toggleSkillPanel", () => {
      if (this.skillPanel) {
        this.togglePanel(this.skillPanel);
      }
    });
  }
  private togglePanel(panel: any): void {
    console.log("UIScene.togglePanel 呼叫, 面板可見性:", panel.visible);
    if (panel.visible) {
      panel.hide();
      console.log(`面板已隱藏，可見性現在為: ${panel.visible}`);
    } else {
      // 先隱藏所有面板
      this.hideAllPanels();

      // 顯示指定面板
      panel.show();

      // 確保面板在最上層
      this.children.bringToTop(panel);

      // 檢查面板可見性是否已更新
      console.log(
        `面板已顯示，可見性現在為: ${panel.visible}，位置: (${panel.x}, ${panel.y})`
      );

      // 如果面板有深度屬性，確保它設置為高值
      if (panel.setDepth) {
        panel.setDepth(1000);
        console.log(`面板深度已設置為 1000`);
      }            // 嘗試強制刷新面板
            this.time.delayedCall(100, () => {
                console.log(`延遲 100ms 後檢查面板狀態: 可見性=${panel.visible}`);
                if (panel.visible) {
                    // 再次確保面板在最上層
                    this.children.bringToTop(panel);
                }
            });
    }
    console.log("UIScene.togglePanel 切換後, 面板可見性:", panel.visible);
  }
  private hideAllPanels(): void {
    if (this.skillPanel) this.skillPanel.hide();
    if (this.statusPanel) this.statusPanel.hide();
    if (this.inventoryPanel) this.inventoryPanel.hide();
    if (this.equipmentPanel) this.equipmentPanel.hide();
    if (this.keyBindPanel) this.keyBindPanel.hide();
  }

  // Setup equipment panel interaction
  private setupEquipmentInteraction(): void {
    if (!this.equipmentPanel || !this.inventoryManager || !this.player) {
      console.warn("無法設置裝備欄互動：裝備面板、庫存管理器或玩家實例未初始化");
      return;
    }

    // 設置裝備欄的槽位選擇回調
    this.equipmentPanel.setOnSlotSelected((slot, equipment) => {
      console.log(`UIScene: 裝備欄槽位 ${slot} 被選中，裝備: ${equipment ? equipment.name : '無'}`);

      if (equipment) {
        // 如果槽位有裝備，執行卸下裝備邏輯
        const success = this.inventoryManager.unequipItem(slot, this.player.getEquipmentManager());
        if (success) {
          console.log(`UIScene: 成功卸下裝備: ${equipment.name}`);

          // 發送事件通知 Game 場景更新玩家狀態
          this.game.events.emit('unequipItem', slot, equipment);

          // 更新 UI
          this.equipmentPanel.updateEquipment(this.player.getEquipmentManager().getAllEquipment());
          if (this.statusPanel) {
            this.statusPanel.updateStats(this.playerStats);
          }
          if (this.inventoryPanel) {
            this.inventoryPanel.updateInventory(this.inventoryManager.playerInventory);
          }
        } else {
          console.warn(`UIScene: 卸下裝備失敗: ${equipment.name}`);
        }
      }
    });
  }  update(_time: number, _delta: number): void {
    // 更新所有活躍的面板
    if (this.statusPanel && this.statusPanel.isActive && this.playerStats) {
      this.statusPanel.updateStats(this.playerStats);
    }
    
    // 更新 HUD
    if (this.hud && this.playerStats) {
      this.hud.updateHUD(this.playerStats);
    }
    
    // 更新技能管理器
    if (this.skillManager) {
      this.skillManager.update(_delta);
    }
    
    // 更新選單按鈕位置
    if (this.menuButtons) {
      this.menuButtons.updatePosition();
    }
  }
  // 關閉場景時的清理工作
  shutdown(): void {
    console.log("UIScene shutting down");

    // 移除事件監聽器
    if (this.game && this.game.events) {
      this.game.events.off("showInventoryPanel");
      this.game.events.off("hideInventoryPanel");
      this.game.events.off("toggleInventoryPanel");
      this.game.events.off("inventoryUpdated");
      this.game.events.off("equipmentUpdated");
      this.game.events.off("playerStatsUpdated");
      this.game.events.off("showStatusPanel");
      this.game.events.off("hideStatusPanel");
      this.game.events.off("toggleStatusPanel");
      this.game.events.off("showEquipmentPanel");
      this.game.events.off("hideEquipmentPanel");
      this.game.events.off("toggleEquipmentPanel");      this.game.events.off("showSkillPanel");
      this.game.events.off("hideSkillPanel");
      this.game.events.off("toggleSkillPanel");
      this.game.events.off("showKeyBindPanel");
      this.game.events.off("hideKeyBindPanel");
      this.game.events.off("toggleKeyBindPanel");
    }

    // 移除鍵盤事件監聽器
    if (this.input && this.input.keyboard) {
      this.input.keyboard.off("keydown-K");
      this.input.keyboard.off("keydown-C");
      this.input.keyboard.off("keydown-I");
      this.input.keyboard.off("keydown-E");
      this.input.keyboard.off("keydown-B");
    }
    
    // 清理 HUD 和選單按鈕
    if (this.hud) {
      this.hud.destroy();
    }
    
    if (this.menuButtons) {
      this.menuButtons.destroy();
    }
  }
}
