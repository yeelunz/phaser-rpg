import { Stats } from "../core/stats";
import { InventoryManager } from "../core/items/inventory_manager";
import { EquipmentManager } from "../core/items/equipmentManager";
import { SkillManager } from "../core/skills";
import { SkillEventManager } from "../core/skills/skillEventManager";
import { SkillEventType, SkillEvent } from "../core/skills/types";

// 方向常數
export const Direction = {
  UP: 0,
  UP_RIGHT: 1,
  RIGHT: 2,
  DOWN_RIGHT: 3,
  DOWN: 4,
  DOWN_LEFT: 5,
  LEFT: 6,
  UP_LEFT: 7,
} as const;

export type DirectionType = (typeof Direction)[keyof typeof Direction];

class Player {
  sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  speed: number = 150;
  currentDirection: string = "down";
  direction: DirectionType = Direction.DOWN;
  // 玩家狀態系統
  stats: Stats;

  // 裝備管理器
  equipmentManager: EquipmentManager;  // 玩家技能系統
  skillManager: SkillManager;
  skillRenderer: any | null = null; // 原本使用已廢棄的 PhaserSkillRenderer

  // 碰撞尺寸
  size: number = 32;

  // ID屬性，用於技能事件系統中識別玩家
  id: string = "player";

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // 創建玩家精靈
    this.sprite = scene.physics.add.sprite(x, y, "player");    // 設置物理屬性 (更新為 Phaser 3.90.0 語法)
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDisplaySize(32, 32);

    // 明確設置物理屬性
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (body) {
        // 確保碰撞體積比視覺大小稍大以提高碰撞成功率
        body.setSize(this.size, this.size); // 使用 this.size (例如 32) 設定物理實體大小
        body.setOffset(0, 0); // 重置偏移
        body.setBounce(0); // 不反彈
        body.setDrag(0, 0); // 沒有阻力
        body.setMaxVelocity(1000, 1000); // 最大速度限制
        body.setImmovable(false); // 設置為可移動體 (動態物體)
        
        // 啟用物理碰撞
        body.checkCollision.none = false;
        body.checkCollision.up = true;
        body.checkCollision.down = true;
        body.checkCollision.left = true;
        body.checkCollision.right = true;
        
        // 設置更高的碰撞優先級，確保與靜態物體碰撞時玩家會受到推擠
        body.pushable = true; // 明確設置可被推動
        body.useDamping = false; // 不使用阻尼
        body.allowDrag = false; // 不允許拖拽
        
        console.log(`[Player.ts] Player physics configured. Body size: ${body.width}x${body.height}`);
    }
    console.log(
      `[Player.ts] Player sprite created. Body enabled: ${body.enable}, Body size: ${body.width}x${body.height}, Pos: (${this.sprite.x}, ${this.sprite.y})`
    ); // 獲取鍵盤控制
    if (scene.input && scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
    } else {
      console.error("[Player.ts] 無法獲取鍵盤控制");
      // 創建空的鍵值對象以防出錯
      this.cursors = {
        up: { isDown: false } as Phaser.Input.Keyboard.Key,
        down: { isDown: false } as Phaser.Input.Keyboard.Key,
        left: { isDown: false } as Phaser.Input.Keyboard.Key,
        right: { isDown: false } as Phaser.Input.Keyboard.Key,
        space: { isDown: false } as Phaser.Input.Keyboard.Key,
        shift: { isDown: false } as Phaser.Input.Keyboard.Key,
      };
    } // 初始化玩家狀態系統
    this.stats = new Stats();

    // 設置物品欄管理器對玩家狀態的引用
    const inventoryManager = InventoryManager.getInstance();
    inventoryManager.setPlayerStats(this.stats);

    // 創建並初始化裝備管理器
    this.equipmentManager = new EquipmentManager();

    // 設置裝備管理器對Player的引用
    this.equipmentManager.setStats(this.stats);

    // 從物品欄同步裝備到裝備管理器並應用裝備加成
    this.updateStats();    console.log("[Player.ts] 裝備管理器已初始化並就緒");
    
    // 創建技能管理器
    this.skillManager = new SkillManager(this.stats, scene.game);

    // 啟動技能管理器異步初始化（不阻塞構造函數）
    this.initializeSkillManager(scene).catch(error => {
      console.error("[Player.ts] 技能管理器異步初始化失敗:", error);
    });
    console.log("[Player.ts] SkillManager 已創建，異步初始化已開始");
  }
  /**
   * 初始化技能管理器
   */  private async initializeSkillManager(scene: Phaser.Scene): Promise<void> {
    // skillManager 現在總是存在，只需要初始化它
    const initialized = await this.skillManager.initialize();
    if (initialized) {
      console.log("[Player.ts] 成功初始化技能管理器");
      // 添加一些技能點數供測試
      this.skillManager.addSkillPoints(20);
    } else {
      console.error("[Player.ts] 技能管理器初始化失敗");
    }
    
    // 註冊衝刺事件監聽器
    this.setupDashEventListener(scene);
  }

  /**
   * 設置衝刺事件監聽器
   */
  private setupDashEventListener(scene: Phaser.Scene): void {
    const eventManager = SkillEventManager.getInstance();
    eventManager.addEventListener(SkillEventType.PLAYER_DASH, (event: SkillEvent) => {
      // 確保事件是針對這個玩家的
      if (event.casterId !== this.id) {
        return;
      }
      
      const dashData = event.data;
      if (!dashData || !dashData.startPosition || !dashData.endPosition) {
        console.warn('[Player.ts] 衝刺事件數據不完整');
        return;
      }
      
      const { startPosition, endPosition, duration, easing = 'Power2.easeOut' } = dashData;
      
      console.log(`[Player.ts] 收到衝刺事件 - 從 (${startPosition.x}, ${startPosition.y}) 到 (${endPosition.x}, ${endPosition.y}), 持續時間: ${duration}ms`);
      
      // 使用 Phaser 的 Tween 系統創建平滑的衝刺動畫
      if (scene.tweens && this.sprite) {
        scene.tweens.add({
          targets: this.sprite,
          x: endPosition.x,
          y: endPosition.y,
          duration: duration,
          ease: easing,
          onComplete: () => {
            console.log(`[Player.ts] 衝刺動畫完成，玩家到達: (${endPosition.x}, ${endPosition.y})`);
            
            // 確保玩家的物理體位置也得到更新
            if (this.sprite.body) {
              this.sprite.body.x = endPosition.x - this.sprite.body.halfWidth;
              this.sprite.body.y = endPosition.y - this.sprite.body.halfHeight;
            }
          },
          onCompleteScope: this
        });
      } else {
        // 如果無法使用 Tween，回退到立即移動
        console.warn('[Player.ts] 無法找到場景的 tweens 系統，使用立即移動');
        this.sprite.setPosition(endPosition.x, endPosition.y);
      }
    });
    
    console.log('[Player.ts] 衝刺事件監聽器已註冊');
  }/**
   * 獲取玩家的唯一識別碼
   * 用於戰鬥系統和實體管理器識別
   */
  getId(): string {
    return this.id;
  }
  
  update() {
    // 重置速度
    this.sprite.setVelocity(0);

    // 檢查玩家是否處於技能施放狀態且不能移動
    // 通過遊戲註冊表獲取 skillCaster
    const canMove = this.canMove();
    
    // 偵錯輸出
    const isMoving = (
      this.cursors.left.isDown ||
      this.cursors.right.isDown ||
      this.cursors.up.isDown ||
      this.cursors.down.isDown
    );
    
    if (isMoving && !canMove) {
      console.log(`[Player.ts] 玩家嘗試移動但被禁止，canMove=false`);
    }
    
    if (!canMove) {
      // 如果不能移動，提前返回
      return;
    }

    let dx = 0;
    let dy = 0;

    // 獲取移動速度，使用狀態系統的速度值
    const baseSpeed = 150; // 基本速度為150
    const speedMultiplier = this.stats.getMoveSpeed() / 100; // 將狀態速度值轉換為倍率 (100為基準值)
    const speed = baseSpeed * speedMultiplier; // 應用倍率到基礎速度

    // 水平移動
    if (this.cursors.left.isDown) {
      this.sprite.setVelocityX(-speed);
      dx = -1;
      this.currentDirection = "left";
      this.updatePlayerColor();
    } else if (this.cursors.right.isDown) {
      this.sprite.setVelocityX(speed);
      dx = 1;
      this.currentDirection = "right";
      this.updatePlayerColor();
    } // 垂直移動
    if (this.cursors.up.isDown) {
      this.sprite.setVelocityY(-speed);
      dy = -1;
      if (!this.cursors.left.isDown && !this.cursors.right.isDown) {
        this.currentDirection = "up";
        this.updatePlayerColor();
      }
    } else if (this.cursors.down.isDown) {
      this.sprite.setVelocityY(speed);
      dy = 1;
      if (!this.cursors.left.isDown && !this.cursors.right.isDown) {
        this.currentDirection = "down";
        this.updatePlayerColor();
      }
    }

    // 更新 8 方向系統
    this.updateDirection(dx, dy);
  }
    /**
   * 檢查玩家是否可以移動
   * 當玩家處於技能施放狀態且該技能不允許移動時，返回 false
   */  canMove(): boolean {
    if (!this.sprite.scene.game.registry.has('skillCaster')) {
        return true;
    }

    const skillCaster = this.sprite.scene.game.registry.get('skillCaster');
    
    // 檢查前搖狀態
    if (skillCaster.isCastingSkill()) {
        const currentSkillId = skillCaster.getCurrentSkillId();
        if (currentSkillId) {
            const behavior = skillCaster.getSkillBehavior(currentSkillId);
            if (behavior && !behavior.canMoveWhileCasting()) {
                return false;
            }
        }
    }
    
    // 檢查後搖狀態
    const activeSkillIds = skillCaster.getActiveSkillIds();
    for (const skillId of activeSkillIds) {
        const behavior = skillCaster.getSkillBehavior(skillId);
        if (behavior && !behavior.canMoveWhileCasting()) {
            return false;
        }
    }

    return true;
  }

  // 更新八方向系統
  private updateDirection(dx: number, dy: number) {
    if (dx !== 0 || dy !== 0) {
      // 設定方向 (八方向)
      if (dx < 0 && dy < 0) this.direction = Direction.UP_LEFT;
      else if (dx === 0 && dy < 0) this.direction = Direction.UP;
      else if (dx > 0 && dy < 0) this.direction = Direction.UP_RIGHT;
      else if (dx > 0 && dy === 0) this.direction = Direction.RIGHT;
      else if (dx > 0 && dy > 0) this.direction = Direction.DOWN_RIGHT;
      else if (dx === 0 && dy > 0) this.direction = Direction.DOWN;
      else if (dx < 0 && dy > 0) this.direction = Direction.DOWN_LEFT;
      else if (dx < 0 && dy === 0) this.direction = Direction.LEFT;
    }
  }

  updatePlayerColor() {
    // 根據方向變更玩家顏色
    switch (this.currentDirection) {
      case "down":
        this.sprite.setTint(0x0000ff); // 藍色
        this.sprite.setTexture("player_down");
        break;
      case "left":
        this.sprite.setTint(0xff0000); // 紅色
        this.sprite.setTexture("player_left");
        break;
      case "right":
        this.sprite.setTint(0x00ff00); // 綠色
        this.sprite.setTexture("player_right");
        break;
      case "up":
        this.sprite.setTint(0xffff00); // 黃色
        this.sprite.setTexture("player_up");
        break;
    }
  }

  // 設置玩家位置
  setPosition(x: number, y: number): void {
    if (this.sprite) {
      this.sprite.setPosition(x, y);
    }
  }

  // 檢查玩家是否正在移動
  isMoving(): boolean {
    return (
      this.cursors.left.isDown ||
      this.cursors.right.isDown ||
      this.cursors.up.isDown ||
      this.cursors.down.isDown
    );
  }

  // 獲取玩家統計數據
  getStats(): Stats {
    return this.stats;
  }

  // 獲取裝備管理器
  getEquipmentManager(): EquipmentManager {
    return this.equipmentManager;
  }

  // 更新玩家stats，應用裝備等加成
  updateStats(): void {
    try {
      // 獲取庫存管理器
      const inventoryManager = InventoryManager.getInstance();

      // 確保庫存管理器知道我們的玩家狀態對象
      inventoryManager.setPlayerStats(this.stats);

      // 確保裝備管理器引用正確的狀態對象
      this.equipmentManager.setStats(this.stats);

      // 同步裝備管理器（確保使用同一個裝備管理器實例）
      inventoryManager.syncEquipmentManager(this.equipmentManager);

      // 重新計算裝備加成並應用到統計對象
      this.equipmentManager.recalculateStats();

      console.log("[Player.ts] 玩家狀態已更新，裝備加成已應用");
    } catch (error) {
      console.error("[Player.ts] 更新玩家狀態時出錯:", error);
    }
  }

  // 返回玩家的 x 坐標
  get x(): number {
    return this.sprite.x;
  }
  // 返回玩家的 y 坐標
  get y(): number {
    return this.sprite.y;
  }
}

export default Player;
