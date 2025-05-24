// filepath: c:\Users\asas1\OneDrive\Desktop\phaserRpg\src\game\scenes\Game.ts
import { Scene } from "phaser";
import Player from "../Player";
import { PhaserMapManager } from "../../core/PhaserMapManager";
import { initDebugConsole } from "../../debug/debugConsole";
import { InventoryManager } from "../../core/items/inventory_manager";
import { EquipmentFactory } from "../../core/items/equipmentFactory";
import { ConsumableFactory } from "../../core/items/consumableFactory";
import { monsterFactory } from "../../core/monsters/monsterFactory"; // 引入怪物工廠
import { Monster } from "../../core/monsters/monster"; // 引入怪物類別
import { CombatSystem } from "../../core/combat/combatSystem"; // 引入新的戰鬥系統
import { DebugRenderer } from "../../debug/debugRenderer"; // 引入除錯渲染器
import { getPhaserDebugConsole2 } from "../../debug/PhaserDebugConsole2"; // 引入 PhaserDebugConsole2
import { SkillCaster } from "../../core/skills/skillCaster"; // 引入技能施放器
import { ProjectileManager } from "../../core/skills/projectile/projectileManager"; // 引入投射物管理器
import { cleanupGameResources } from "../utils/cleanup"; // 引入資源清理工具
import { SkillAnimationController } from "../../core/skills/SkillAnimationController"; // 引入技能動畫控制器
import { SkillManager } from "../../core/skills/skillManager"; // 引入技能管理器
import { ProjectileCollisionHandler } from "../../core/combat/projectileCollisionHandler"; // 引入投射物碰撞處理器
import { MonsterRenderManager } from "../../core/monsters/MonsterRenderManager"; // 引入怪物渲染管理器

export class Game extends Scene {
  // 技能施放器
  skillCaster: SkillCaster;
  camera: Phaser.Cameras.Scene2D.Camera;
  player: Player;
  // 投射物管理器
  projectileManager: ProjectileManager;
  // 技能動畫控制器
  private skillAnimController: any = null;

  // 地圖管理器
  mapManager: PhaserMapManager;  // 地圖相關
  map: Phaser.Tilemaps.Tilemap;
  groundLayer?: Phaser.Tilemaps.TilemapLayer | null;
  obstaclesLayer?: Phaser.Tilemaps.TilemapLayer | null;

  // Debug 控制
  debugConsole: any;

  // 地圖大小和圖塊大小
  mapWidth: number = 2048;
  mapHeight: number = 2048;
  tileSize: number = 32;
  currentMapId: string = "town_square";
  isTransitioning: boolean = false; // 怪物相關
  monsters: Monster[] = [];
  private monsterSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private monsterCollisionBoxes: Map<string, Phaser.Physics.Arcade.Sprite> =
    new Map();  
  private monsterHitboxes: Map<string, Phaser.Physics.Arcade.Sprite> =
    new Map();

  // 實體搜尋用群組
  private playerGroup: Phaser.GameObjects.Group;

  // 戰鬥系統
  combatSystem: CombatSystem;
  // 除錯渲染器
  debugRenderer: DebugRenderer;

  // 怪物渲染管理器
  private monsterRenderManager: MonsterRenderManager;

  constructor() {
    super("Game");

    // 確保全局事件發射器在實例化時就被設置
    if (typeof window !== "undefined") {
      window.gameEvents = window.gameEvents || new Phaser.Events.EventEmitter();
    }
  }
  
  async create() {
    this.camera = this.cameras.main;

    // 設置全局事件發射器 (使用遊戲的事件系統)
    window.gameEvents = this.game.events;
    window.game = this.game;

    // 初始化實體搜尋用的群組
    this.playerGroup = this.add.group({ name: "playerGroup" });

    // 初始化技能動畫控制器
    this.skillAnimController = SkillAnimationController.getInstance();
    console.log("[Game.ts] 成功初始化技能動畫控制器");

    console.log("Game 場景：全局事件發射器已設置", !!window.gameEvents);

    // 啟用物理系統
    this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);

    // 初始化地圖管理器
    this.mapManager = new PhaserMapManager(this);

    // 載入並創建地圖
    await this.loadMap(this.currentMapId);

    // 創建玩家
    const spawnPoint = this.mapManager.getSpawnPoint();
    const x = spawnPoint ? spawnPoint.x : 512;
    const y = spawnPoint ? spawnPoint.y : 384;
    this.player = new Player(this, x, y);
    this.player.updatePlayerColor(); // 初始化顏色

    // 等待技能管理器初始化完成
    try {
      await SkillManager.waitForInitialization(this.player.skillManager);
      console.log("[Game] 技能管理器初始化完成");
    } catch (error) {
      console.error("[Game] 等待技能管理器初始化失敗:", error);
    }

    // 將玩家添加到 playerGroup 以供 EntitySearchSystem 查找
    this.playerGroup.add(this.player.sprite);
    this.player.sprite.setData("playerInstance", this.player);
    console.log("[Game] 將玩家添加到 playerGroup");

    // 初始化玩家物品欄 - 添加測試物品
    this.initializePlayerInventory_test();

    // 獲取庫存管理器用於UIScene
    const inventoryManager = InventoryManager.getInstance();

    // 等待技能管理器初始化完成
    if (this.player.skillManager) {
      await SkillManager.waitForInitialization(this.player.skillManager);
    }

    // 啟動 UI 場景並傳遞需要的數據
    console.log(
      "Game: 啟動 UIScene，傳遞數據 skillManager:",
      !!this.player.skillManager,
      "stats:",
      !!this.player.getStats(),
      "inventoryManager:",
      !!inventoryManager
    );
    this.scene.launch("UIScene", {
      skillManager: this.player.skillManager,
      stats: this.player.getStats(),
      inventoryManager: inventoryManager,
      player: this.player, // 傳遞整個 player 實例
    });

    // 初始化 Debug Console 並設置玩家引用
    this.debugConsole = initDebugConsole(this);
    if (this.debugConsole) {
      this.debugConsole.setPlayer(this.player);
      console.log("Debug Console initialized with player reference");
    }

    // 初始化除錯渲染器
    this.debugRenderer = new DebugRenderer(this);

    // 初始化怪物渲染管理器
    this.monsterRenderManager = MonsterRenderManager.getInstance();

    // 將除錯渲染器設置到 Debug Console
    if (this.debugConsole) {
      this.debugConsole.setDebugRenderer(this.debugRenderer);
    }
    const phaserDebugConsole = getPhaserDebugConsole2();
    if (phaserDebugConsole) {
      phaserDebugConsole.setDebugRenderer(this.debugRenderer);
      console.log("Debug Renderer initialized and set in Debug Console");
    }

    // 監聽場景關閉事件，進行資源清理
    this.events.once("shutdown", () => {
      cleanupGameResources(this);
    });

    // 設置碰撞
    if (this.obstaclesLayer) {
      this.physics.add.collider(this.player.sprite, this.obstaclesLayer);
    }

    // 設置相機跟隨玩家，確保相機設定正確
    this.camera.setBounds(0, 0, this.mapWidth, this.mapHeight);
    this.camera.startFollow(this.player.sprite, true, 0.05, 0.05); // 添加平滑跟隨參數
    this.camera.setZoom(1.0); // 確保縮放正確
    console.log(
      "Camera following player set up. Map size:",
      this.mapWidth,
      this.mapHeight
    );
    
    // 設置物品和裝備事件監聽
    InventoryManager.getInstance().setupItemEvents(this.game, this.player);

    // 創建怪物（在戰鬥系統初始化之前）
    this.createMonsters_test();

    // 初始化戰鬥管理器（改為同步等待）
    await this.initCombatSystemAsync();

    // 只啟用一次調試渲染
    this.physics.world.createDebugGraphic();
    this.physics.world.debugGraphic.setDepth(999);

    // 初始化投射物碰撞處理器
    const projectileCollisionHandler = ProjectileCollisionHandler.getInstance();
    projectileCollisionHandler.initialize(this.projectileManager);
  }
  
  // 初始化戰鬥系統
  private async initCombatSystemAsync(): Promise<void> {
    try {
      // 同步導入所有模組
      const [
        combatModule,
        keyBindModule,
        entitySearchModule,
        entityManagerModule
      ] = await Promise.all([
        import("../../core/combat/combatSystem"),
        import("../../core/skills/keyBindManager"),
        import("../../core/combat/entitySearchSystem"),
        import("../../core/combat/entityManager")
      ]);

      const CombatSystem = combatModule.CombatSystem;
      const combatSystem = new CombatSystem();

      // 初始化戰鬥系統
      combatSystem.initialize(this);

      // 初始化其他系統
      const KeyBindManager = keyBindModule.KeyBindManager;
      const keyBindManager = KeyBindManager.getInstance();
      keyBindManager.initialize(this.player.skillManager, this);
      console.log("鍵位綁定管理器初始化完成");

      const EntitySearchSystem = entitySearchModule.EntitySearchSystem;
      const searchSystem = EntitySearchSystem.getInstance();
      searchSystem.initialize(this);

      const EntityManager = entityManagerModule.EntityManager;
      const manager = EntityManager.getInstance();
      manager.initialize(this);

      // 註冊玩家實體
      manager.registerEntity(this.player);
      combatSystem.registerEntity(this.player);

      // 註冊所有怪物（此時怪物已經創建完成）
      this.monsters.forEach((monster) => {
        manager.registerEntity(monster);
      });

      // 設置要監控的怪物
      const monsterEntitiesForCombatSystem = this.monsters
        .map((monster) => {
          const instanceId = monster.getInstanceId
            ? monster.getInstanceId()
            : monster.getId(); // 向下相容
          const sprite = this.monsterSprites.get(instanceId);
          if (!sprite) {
            console.warn(
              `[Game.ts] 在為戰鬥系統設置怪物時，找不到怪物 ${instanceId} (類型ID: ${monster.getId()}) 的 Sprite。`
            );
            return null;
          }
          const collisionBoxSprite =
            this.monsterCollisionBoxes.get(instanceId);
          // isTriggerOnly 的邏輯可能需要根據遊戲需求調整
          // 例如，如果怪物不是固體，則可能只是一個觸發器
          const isTriggerOnly = !monster.isSolidObject();

          return {
            monster: monster,
            sprite: sprite,
            isTriggerOnly: isTriggerOnly,
            collisionBoxSprite: collisionBoxSprite,
            hitboxSprite: this.monsterHitboxes.get(instanceId),
          };
        })
        .filter((entry) => entry !== null) as {
        sprite: Phaser.GameObjects.Sprite;
        monster: Monster;
        isTriggerOnly?: boolean;
        collisionBoxSprite?: Phaser.Physics.Arcade.Sprite;
        hitboxSprite?: Phaser.Physics.Arcade.Sprite;
      }[];

      combatSystem.setMonsters(monsterEntitiesForCombatSystem);

      // 設置碰撞檢測
      combatSystem.setupCollisions();

      // 初始化投射物管理器
      this.projectileManager = new ProjectileManager(this);

      // 將投射物管理器註冊到遊戲的註冊表中，這樣其他地方可以訪問
      this.game.registry.set("projectileManager", this.projectileManager);

      // 將所有怪物的 hitbox 註冊到投射物管理器中
      this.monsters.forEach((monster) => {
        const instanceId = monster.getInstanceId
          ? monster.getInstanceId()
          : monster.getId();
        const hitboxSprite = this.monsterHitboxes.get(instanceId);
        if (hitboxSprite) {
          this.projectileManager?.registerMonsterSprite(
            hitboxSprite,
            monster
          );
        }
      });

      // 初始化技能施放器
      if (this.player.skillManager) {
        this.skillCaster = new SkillCaster(
          this.player.skillManager,
          this.player
        );
        combatSystem.setSkillCaster(this.skillCaster);

        // 將 skillCaster 註冊到遊戲註冊表中，這樣玩家可以訪問它
        this.game.registry.set("skillCaster", this.skillCaster);
      }

      // 保存到類屬性中
      this.combatSystem = combatSystem;

      // 儲存在全局作用域以便後續使用
      window.combatSystem = combatSystem;

      // 設置事件監聽器
      this.setupSkillEventListeners();

      console.log("新版戰鬥系統已初始化完成！");
    } catch (error) {
      console.error("初始化戰鬥系統失敗:", error);
    }
  }

  private setupSkillEventListeners(): void {
    if (window.gameEvents) {
      // 移除舊的監聽器（如果存在）
      window.gameEvents.removeAllListeners("skillUseRequest");
      
      // 設置新的監聽器
      window.gameEvents.on(
        "skillUseRequest",
        async (
          skillId: string,
          x: number,
          y: number,
          direction: number
        ) => {
          console.log(
            `收到技能使用請求: ${skillId}, 位置: (${x}, ${y}), 方向: ${direction}`
          );

          if (this.skillCaster) {
            // 檢查是否可以使用技能
            if (this.skillCaster.isCastingSkill()) {
              // 獲取當前技能 ID
              const currentSkillId = this.skillCaster.getCurrentSkillId();
              if (currentSkillId) {
                // 獲取該技能行為
                const behavior =
                  this.skillCaster.getSkillBehavior(currentSkillId);
                // 檢查該技能是否允許使用其他技能
                if (behavior && !behavior.canUseOtherSkillsWhileCasting()) {
                  console.log(
                    `技能 ${currentSkillId} 正在施放中，禁止使用其他技能`
                  );
                  return;
                }
              }
            }

            // 施放指定的技能
            await this.skillCaster.castSkill(skillId, x, y, direction);
          }
        }
      );
    }

    // 設置測試按鍵
    if (this.input && this.input.keyboard) {
      this.input.keyboard.removeAllListeners("keydown-SPACE");
      this.input.keyboard.on("keydown-SPACE", async () => {
        // 按空格鍵時，使用技能施放器施放橫斬技能
        if (this.skillCaster) {
          // 檢查是否可以使用技能
          if (this.skillCaster.isCastingSkill()) {
            const currentSkillId = this.skillCaster.getCurrentSkillId();
            if (currentSkillId) {
              const behavior =
                this.skillCaster.getSkillBehavior(currentSkillId);
              if (behavior && !behavior.canUseOtherSkillsWhileCasting()) {
                console.log(
                  `技能 ${currentSkillId} 正在施放中，禁止使用其他技能`
                );
                return;
              }
            }
          }

          await this.skillCaster.castSkill("slash");
        }
      });
    }
  }

  // 創建怪物_測試用
  private createMonsters_test(): void {
    // 清空現有怪物
    this.monsters.forEach((monster) => {
      const instanceId = monster.getInstanceId
        ? monster.getInstanceId()
        : monster.getId(); // 向下相容
      const sprite = this.monsterSprites.get(instanceId);
      const collisionBox = this.monsterCollisionBoxes.get(instanceId);
      const hitbox = this.monsterHitboxes.get(instanceId);
      if (sprite) sprite.destroy();
      if (collisionBox) collisionBox.destroy();
      if (hitbox) hitbox.destroy();
    });
    this.monsters = [];
    this.monsterSprites.clear();
    this.monsterCollisionBoxes.clear();
    this.monsterHitboxes.clear();

    // 使用怪物工廠創建石像守衛
    const guardian1 = monsterFactory.createMonsterById("stone_guardian_001");
    const guardian2 = monsterFactory.createMonsterById("stone_guardian_001");
    if (guardian1 && guardian2) {
      guardian1.setPosition(this.mapWidth / 2 - 100, this.mapHeight / 2 - 100);
      guardian2.setPosition(this.mapWidth / 2 + 100, this.mapHeight / 2 + 100);
      guardian1.activate();
      guardian2.activate();

      // 渲染怪物（改用 monsterFactory 的方法）
      monsterFactory.renderMonster(
        this,
        this.player,
        guardian1,
        this.monsterSprites,
        this.monsterCollisionBoxes,
        this.monsterHitboxes
      );
      monsterFactory.renderMonster(
        this,
        this.player,
        guardian2,
        this.monsterSprites,
        this.monsterCollisionBoxes,
        this.monsterHitboxes
      ); // 添加到怪物列表
      this.monsters.push(guardian1, guardian2);

      console.log("創建了兩隻石像守衛");
    } else {
      console.error("無法創建石像守衛");
    }

    const goblin1 = monsterFactory.createMonsterById("goblin_wanderer_001");
    if (goblin1) {
      goblin1.setPosition(this.mapWidth / 2 + 100, this.mapHeight / 2 - 100);
      goblin1.activate();
      monsterFactory.renderMonster(
        this,
        this.player,
        goblin1,
        this.monsterSprites,
        this.monsterCollisionBoxes,
        this.monsterHitboxes
      );
      this.monsters.push(goblin1);
      console.log("創建了一隻哥布林");
    }
  }

  async loadMap(mapId: string) {
    try {
      // 檢查地圖管理器是否初始化
      if (!this.mapManager) {
        console.error("[Game.ts] 地圖管理器未初始化");
        this.mapManager = new PhaserMapManager(this);
      }

      // 確保 mapId 有效
      if (!mapId) {
        console.error("[Game.ts] 無效的地圖 ID");
        throw new Error("無效的地圖 ID");
      }

      console.log(`[Game.ts] 開始載入地圖: ${mapId}`);

      // 從 PhaserMapManager 載入地圖數據
      await this.mapManager.loadMapFromCache(mapId);
      console.log(`[Game.ts] 地圖數據載入完成: ${mapId}`);

      // 載入 Phaser Tilemap
      this.createTilemap(mapId);
      this.currentMapId = mapId;

      console.log(`[Game.ts] 地圖創建完成: ${mapId}`);
    } catch (error) {
      console.error("[Game.ts] 載入地圖失敗:", error);
      // 創建一個默認地圖
      console.log("[Game.ts] 嘗試創建默認地圖");
      this.createDefaultMap();
    }
  }
  
  createTilemap(mapIdToLoad: string) {
  try {
    console.log(`Creating hardcoded test map instead of loading ${mapIdToLoad}_map`);

    // 檢查確保 tileSize 已被定義
    if (!this.tileSize || typeof this.tileSize !== "number") {
      console.error("[Game.ts] tileSize 未定義或不是數字，設定為預設值 32");
      this.tileSize = 32;
    }

    // 移除創建測試用圖塊紋理的調用，因為已經在 Preloader 中創建了
    // this.createTestTileTextures();

    // 創建 Phaser Tilemap
    this.createPhaserTilemap();

    console.log(`Map created successfully. Size: ${this.mapWidth}x${this.mapHeight} pixels.`);
  } catch (error) {
    console.error("創建測試地圖時出錯:", error);
    this.createDefaultMap();
  }
}
  

  
private createPhaserTilemap(): void {
  try {
    // 確保基本參數有效
    if (!this.mapWidth || !this.mapHeight || !this.tileSize) {
      console.error("[Game.ts] 地圖參數無效:", { 
        mapWidth: this.mapWidth, 
        mapHeight: this.mapHeight, 
        tileSize: this.tileSize 
      });
      throw new Error("地圖參數無效");
    }

    const mapWidthInTiles = Math.ceil(this.mapWidth / this.tileSize);
    const mapHeightInTiles = Math.ceil(this.mapHeight / this.tileSize);

    console.log(`[Game.ts] 創建地圖: ${mapWidthInTiles}x${mapHeightInTiles} 圖塊, 圖塊大小: ${this.tileSize}px`);

    // 創建一個新的空白地圖
    this.map = this.make.tilemap({
      width: mapWidthInTiles,
      height: mapHeightInTiles,
      tileWidth: this.tileSize,
      tileHeight: this.tileSize,
    });

    // 檢查地圖是否成功創建
    if (!this.map) {
      console.error("[Game.ts] 無法創建 tilemap");
      throw new Error("無法創建 tilemap");
    }

    // 驗證地圖屬性（安全地檢查）
    const mapInfo = {
      width: this.map.width || 0,
      height: this.map.height || 0,
      tileWidth: this.map.tileWidth || this.tileSize,
      tileHeight: this.map.tileHeight || this.tileSize,
      widthInPixels: this.map.widthInPixels || (mapWidthInTiles * this.tileSize),
      heightInPixels: this.map.heightInPixels || (mapHeightInTiles * this.tileSize)
    };
    
    console.log(`[Game.ts] 地圖創建成功，屬性檢查:`, mapInfo);

    // 確保紋理已經載入成功（這些現在應該在 Preloader 中已經創建）
    if (!this.textures.exists('floor_tile') || !this.textures.exists('wall_tile')) {
      console.error("[Game.ts] 必要的紋理尚未載入");
      throw new Error("必要的紋理尚未載入");
    }

    // 添加圖塊集
    const tileset = this.map.addTilesetImage('terrain', 'floor_tile', this.tileSize, this.tileSize);
    const wallTileset = this.map.addTilesetImage('walls', 'wall_tile', this.tileSize, this.tileSize);

    if (!tileset || !wallTileset) {
      console.error("[Game.ts] 無法創建圖塊集");
      throw new Error("無法創建圖塊集");
    }
    
    // 創建圖層
    this.groundLayer = this.map.createBlankLayer("ground", tileset);
    this.obstaclesLayer = this.map.createBlankLayer("obstacles", wallTileset);

    if (!this.groundLayer || !this.obstaclesLayer) {
      console.error("[Game.ts] 無法創建圖層");
      throw new Error("無法創建圖層");
    }

    // 填充地面
    this.groundLayer.fill(0);

    // 創建邊界牆壁和隨機障礙物
    this.createMapObstacles();

    // 設置碰撞
    this.obstaclesLayer.setCollisionByExclusion([-1]);
    
    // 啟用與玩家和怪物的碰撞
    if (this.player && this.player.sprite) {
      this.physics.add.collider(this.player.sprite, this.obstaclesLayer);
    }
    
    // 更新地圖尺寸（使用實際計算出的像素尺寸）
    this.mapWidth = mapWidthInTiles * this.tileSize;
    this.mapHeight = mapHeightInTiles * this.tileSize;

    // 更新物理世界和相機邊界
    this.updateWorldBounds();
    
    console.log("[Game.ts] 成功創建地圖和圖層，並設置碰撞");
  } catch (error) {
    console.error("[Game.ts] 創建地圖時發生錯誤:", error);
    this.createDefaultMap();
  }
}

private createMapObstacles(): void {
  if (!this.map || !this.obstaclesLayer) {
    console.error("[Game.ts] 地圖或障礙物圖層未初始化");
    return;
  }

  // 使用 this.tileSize 和計算出的地圖尺寸，而不是依賴 this.map 的屬性
  const mapWidthInTiles = Math.ceil(this.mapWidth / this.tileSize);
  const mapHeightInTiles = Math.ceil(this.mapHeight / this.tileSize);

  console.log(`[Game.ts] 創建地圖障礙物，地圖尺寸: ${mapWidthInTiles}x${mapHeightInTiles} 圖塊`);

  // 在邊界周圍添加障礙物
  for (let x = 0; x < mapWidthInTiles; x++) {
    for (let y = 0; y < mapHeightInTiles; y++) {
      // 在地圖邊界創建障礙物
      if (
        x === 0 ||
        x === mapWidthInTiles - 1 ||
        y === 0 ||
        y === mapHeightInTiles - 1
      ) {
        // 使用索引 0 創建障礙物，並設置碰撞
        const tile = this.obstaclesLayer.putTileAt(0, x, y);
        if (tile) {
          tile.setCollision(true, true, true, true); // 設置全方向碰撞
          tile.properties = { collides: true }; // 添加自定義屬性以標記為碰撞
        }
      } else {
        // 隨機添加一些障礙物
        if (x > 5 && y > 5 && Math.random() < 0.02) {
          const tile = this.obstaclesLayer.putTileAt(0, x, y);
          if (tile) {
            tile.setCollision(true, true, true, true); // 設置全方向碰撞
            tile.properties = { collides: true }; // 添加自定義屬性以標記為碰撞
          }
        }
      }
    }
  }

  // 確保障礙物有碰撞 - 使用多種方法確保碰撞正確設置
  this.obstaclesLayer.setCollisionByExclusion([-1]); // -1 是空白圖塊的索引
  this.obstaclesLayer.setCollisionByProperty({ collides: true }); // 根據屬性設置碰撞
  
  // 顯示碰撞調試圖形 - 這樣可以在遊戲中看到碰撞區域
  // 注意：這是可選的，僅在開發環境中使用
  const debugGraphics = this.add.graphics().setAlpha(0.7);
  if (this.obstaclesLayer && debugGraphics) {
    this.obstaclesLayer.renderDebug(debugGraphics, {
      tileColor: null, // Color of non-colliding tiles
      collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255), // Color of colliding tiles
      faceColor: new Phaser.Display.Color(40, 39, 37, 255) // Color of colliding face edges
    });
  }
  
  console.log("[Game.ts] 成功設置地圖障礙物和碰撞");
}





  createDefaultMap() {
    console.log("[Game.ts] 創建默認地圖");

    try {
      // 確保地圖尺寸有默認值
      this.mapWidth = this.mapWidth || 2048;
      this.mapHeight = this.mapHeight || 2048;
      this.tileSize = this.tileSize || 32;

      // 清除之前的圖層
      if (this.groundLayer) {
        this.groundLayer.destroy();
        this.groundLayer = null;
      }
      if (this.obstaclesLayer) {
        this.obstaclesLayer.destroy();
        this.obstaclesLayer = null;
      }

      // 創建綠色背景
      const background = this.add.rectangle(
        this.mapWidth / 2,
        this.mapHeight / 2,
        this.mapWidth,
        this.mapHeight,
        0x55aa55 // 綠色背景
      );
      background.setDepth(-10); // 確保在最底層

      // 創建邊界牆壁及其物理碰撞體
      const walls = this.physics.add.staticGroup();
      const wallThickness = this.tileSize;

      // 上邊界
      const topWall = this.add.rectangle(
        this.mapWidth / 2,
        wallThickness / 2,
        this.mapWidth,
        wallThickness,
        0x666666
      );
      
      // 下邊界
      const bottomWall = this.add.rectangle(
        this.mapWidth / 2,
        this.mapHeight - wallThickness / 2,
        this.mapWidth,
        wallThickness,
        0x666666
      );
      
      // 左邊界
      const leftWall = this.add.rectangle(
        wallThickness / 2,
        this.mapHeight / 2,
        wallThickness,
        this.mapHeight,
        0x666666
      );
      
      // 右邊界
      const rightWall = this.add.rectangle(
        this.mapWidth - wallThickness / 2,
        this.mapHeight / 2,
        wallThickness,
        this.mapHeight,
        0x666666
      );

      // 將邊界物體添加到physics group
      walls.add(topWall);
      walls.add(bottomWall);
      walls.add(leftWall);
      walls.add(rightWall);

      // 添加一些隨機障礙物
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * (this.mapWidth - wallThickness * 2) + wallThickness;
        const y = Math.random() * (this.mapHeight - wallThickness * 2) + wallThickness;
        
        // 創建障礙物矩形
        const obstacle = this.add.rectangle(x, y, this.tileSize, this.tileSize, 0x666666);
        walls.add(obstacle); // 添加到碰撞組
      }

      // 設置玩家與邊界及障礙物的碰撞
      if (this.player && this.player.sprite) {
        this.physics.add.collider(this.player.sprite, walls);
      }

      // 設置怪物與邊界及障礙物的碰撞
      this.monsters.forEach(monster => {
        const instanceId = monster.getInstanceId ? monster.getInstanceId() : monster.getId();
        const collisionBox = this.monsterCollisionBoxes.get(instanceId);
        if (collisionBox) {
          this.physics.add.collider(collisionBox, walls);
        }
      });

      console.log(`[Game.ts] 默認地圖已創建。尺寸：${this.mapWidth}x${this.mapHeight} 像素。`);
    } catch (error) {
      console.error("[Game.ts] 創建默認地圖時出錯:", error);
    }
  }

  update(time: number, delta: number) {
    if (this.player) {
      this.player.update();
      this.player.getStats().recoverEnergy(delta);

      // 更新技能管理器，更新技能冷卻時間
      if (
        this.player.skillManager &&
        typeof this.player.skillManager.updateCooldowns === "function"
      ) {
        this.player.skillManager.updateCooldowns(delta);
      } else if (
        this.player.skillManager &&
        typeof this.player.skillManager.update === "function"
      ) {
        this.player.skillManager.update(delta);
      }

      // 更新技能動畫控制器，確保後搖結束後角色可以移動
      if (this.game.registry.has("skillCaster") && this.skillAnimController) {
        try {
          const skillCaster = this.game.registry.get("skillCaster");
          this.skillAnimController.checkAndFixCastingState(skillCaster);
        } catch (error) {
          console.error("[Game.ts] 無法使用SkillAnimationController:", error);
        }
      }
    }

    // 更新所有怪物
    this.monsters.forEach((monster) => {
      if (monster && this.player) {
        monster.update(delta, {
          x: this.player.sprite.x,
          y: this.player.sprite.y,
        });
      }
    });

    // 使用 MonsterRenderManager 更新怪物視覺表現 - 添加安全檢查
    if (this.monsterRenderManager) {
      this.monsterRenderManager.updateAllMonsterVisuals(
        this.monsters,
        this.monsterSprites,
        this.monsterCollisionBoxes,
        this.monsterHitboxes,
        delta
      );
    } else {
      // 如果 MonsterRenderManager 還沒初始化，先初始化它
      console.warn("[Game.ts] MonsterRenderManager 未初始化，正在初始化...");
      this.monsterRenderManager = MonsterRenderManager.getInstance();
    }

    // 更新 Debug Console
    if (this.debugConsole) {
      this.debugConsole.updatePosition();
    }

    // 更新戰鬥系統
    if (this.combatSystem) {
      this.combatSystem.update(time, delta);
    }
    // 更新投射物
    if (this.projectileManager) {
      this.projectileManager.update(delta);

      // 使用投射物碰撞處理器處理碰撞
      const projectileCollisionHandler =
        ProjectileCollisionHandler.getInstance();
      projectileCollisionHandler.update(this.monsters, this.monsterHitboxes);
    }

    // 更新除錯渲染器
    if (this.debugRenderer) {
      // 渲染投射物碰撞框和搜索範圍
      if (this.projectileManager) {
        // 創建一個符合 ProjectileDebugRenderer 期望的 Map 格式
        const projectilesMap = new Map<string, any>();

        // 將 ProjectileManager 中的投射物轉換為需要的格式
        for (const projectile of this.projectileManager.getAllProjectiles()) {
          // 投射物可能在其屬性中或通過行為存儲其精靈
          // 使用自定義屬性來獲取精靈或位置信息
          projectilesMap.set(projectile.getId(), {
            projectile: projectile,
            sprite: {
              // 使用投射物的位置作為精靈的位置
              x: projectile.position.x,
              y: projectile.position.y,
            },
          });
        }
        // 渲染投射物碰撞框
        this.debugRenderer.renderProjectiles(projectilesMap);
      }

      // 渲染怪物除錯資訊
      if (this.debugRenderer.isMonsterDebugEnabled()) {
        this.debugRenderer.renderMonsters(this.monsters);
      }
    }
  }

  // 初始化玩家物品欄 - 添加測試物品
  private initializePlayerInventory_test(): void {
    // 獲取庫存管理器
    const inventoryManager = InventoryManager.getInstance();
    // 重設玩家物品欄並設置初始金幣
    inventoryManager.resetPlayerInventory(30, 500);

    // 從裝備工廠創建測試裝備
    const equipmentFactory = EquipmentFactory.getInstance();
    const consumableFactory = ConsumableFactory.getInstance();

    // 添加一些測試裝備
    const helmet = equipmentFactory.createEquipmentById("wt");
    const chestplate = equipmentFactory.createEquipmentById("armor_001");
    const potion = consumableFactory.createConsumableById("consumable_004", 5);

    if (helmet) inventoryManager.playerInventory.addItem(helmet);
    if (chestplate) inventoryManager.playerInventory.addItem(chestplate);
    if (potion) inventoryManager.playerInventory.addItem(potion);
    console.log(
      `初始化玩家物品欄，添加了 ${inventoryManager.playerInventory.items.length} 個物品`
    );
  }

  /**
   * 更新物理世界和相機邊界
   */
  private updateWorldBounds(): void {
    // 更新物理世界邊界
    this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);
    // 更新相機邊界
    this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
    console.log(`[Game.ts] 已更新世界邊界: ${this.mapWidth}x${this.mapHeight}`);
  }
}
