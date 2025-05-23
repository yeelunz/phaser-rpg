// filepath: c:\Users\asas1\OneDrive\Desktop\phaserRpg\src\game\scenes\Game.ts
import { Scene } from 'phaser';
import Player from '../Player';
import { PhaserMapManager } from '../../core/PhaserMapManager';
import { initDebugConsole, getDebugConsole } from '../../debug/debugConsole';
import { InventoryManager } from '../../core/items/inventory_manager';
import { EquipmentFactory } from '../../core/items/equipmentFactory';
import { ConsumableFactory } from '../../core/items/consumableFactory';
import { monsterFactory } from '../../core/monsters/monsterFactory'; // 引入怪物工廠
import { Monster } from '../../core/monsters/monster'; // 引入怪物類別
import { CombatSystem } from '../../core/combat/combatSystem'; // 引入新的戰鬥系統
import { EntityManager } from '../../core/combat/entityManager'; // 引入實體管理器
import { DebugRenderer } from '../../debug/debugRenderer'; // 引入除錯渲染器
import { getPhaserDebugConsole2 } from '../../debug/PhaserDebugConsole2'; // 引入 PhaserDebugConsole2
import { SkillCaster } from '../../core/skills/skillCaster'; // 引入技能施放器
import { ProjectileManager } from '../../core/skills/projectile/projectileManager'; // 引入投射物管理器
import { cleanupGameResources } from '../utils/cleanup'; // 引入資源清理工具
import { SkillAnimationController } from '../../core/skills/SkillAnimationController'; // 引入技能動畫控制器
import { SkillManager } from '../../core/skills/skillManager'; // 引入技能管理器
import { ProjectileCollisionHandler } from '../../core/combat/projectileCollisionHandler'; // 引入投射物碰撞處理器

export class Game extends Scene {
    // 技能施放器
    skillCaster: SkillCaster;
    camera: Phaser.Cameras.Scene2D.Camera;
    player: Player;
      // 投射物管理器
    projectileManager: ProjectileManager;
    
    // 投射物碰撞處理器
    private projectileCollisionHandler: ProjectileCollisionHandler;
    
    // 技能動畫控制器
    private skillAnimController: any = null;

    // 地圖管理器
    mapManager: PhaserMapManager;
    // 地圖相關
    map: Phaser.Tilemaps.Tilemap;
    groundLayer?: Phaser.Tilemaps.TilemapLayer;
    obstaclesLayer?: Phaser.Tilemaps.TilemapLayer;

    // Debug 控制
    debugConsole: any;

    // 地圖大小和圖塊大小
    mapWidth: number = 2048;
    mapHeight: number = 2048;
    tileSize: number = 32;    
    currentMapId: string = 'town_square';    
    isTransitioning: boolean = false;        // 怪物相關
    monsters: Monster[] = [];
    private monsterSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
    private monsterCollisionBoxes: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
    private monsterHitboxes: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
    
    // 實體搜尋用群組
    private playerGroup: Phaser.GameObjects.Group;
    private monsterGroup: Phaser.GameObjects.Group;
    private npcGroup: Phaser.GameObjects.Group;
    private projectileGroup: Phaser.GameObjects.Group;

    // 戰鬥系統
    combatSystem: CombatSystem;
    
    // 除錯渲染器
    debugRenderer: DebugRenderer;

    constructor() {
        super('Game');
        
        // 確保全局事件發射器在實例化時就被設置
        if (typeof window !== 'undefined') {
            window.gameEvents = window.gameEvents || new Phaser.Events.EventEmitter();
        }
    }        
    async create() {
        this.camera = this.cameras.main;

        // 設置全局事件發射器 (使用遊戲的事件系統)
        window.gameEvents = this.game.events;
        window.game = this.game;
        
        // 初始化實體搜尋用的群組
        this.playerGroup = this.add.group({ name: 'playerGroup' });
        this.monsterGroup = this.add.group({ name: 'monsterGroup' });
        this.npcGroup = this.add.group({ name: 'npcGroup' });
        this.projectileGroup = this.add.group({ name: 'projectileGroup' });
        
        // 初始化技能動畫控制器
        this.skillAnimController = SkillAnimationController.getInstance();
        console.log('[Game.ts] 成功初始化技能動畫控制器');
        
        console.log('Game 場景：全局事件發射器已設置', !!window.gameEvents);

        // 啟用物理系統
        this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);

        // 初始化地圖管理器
        this.mapManager = new PhaserMapManager(this);

        // 載入並創建地圖
        await this.loadMap(this.currentMapId);

        // 創建玩家        
        const spawnPoint = this.mapManager.getSpawnPoint();
        const x = spawnPoint ? spawnPoint.x : 512;
        const y = spawnPoint ? spawnPoint.y : 384;          this.player = new Player(this, x, y);
        this.player.updatePlayerColor(); // 初始化顏色
        
        // 等待技能管理器初始化完成
        try {
            await SkillManager.waitForInitialization(this.player.skillManager);
            console.log('[Game] 技能管理器初始化完成');
        } catch (error) {
            console.error('[Game] 等待技能管理器初始化失敗:', error);
        }
        
        // 將玩家添加到 playerGroup 以供 EntitySearchSystem 查找
        this.playerGroup.add(this.player.sprite);
        this.player.sprite.setData('playerInstance', this.player);
        console.log('[Game] 將玩家添加到 playerGroup');
        
        // 初始化玩家物品欄 - 添加測試物品
        this.initializePlayerInventory_test();
        
        // 獲取庫存管理器用於UIScene
        const inventoryManager = InventoryManager.getInstance();
        
        // 等待技能管理器初始化完成
        if (this.player.skillManager) {
            await SkillManager.waitForInitialization(this.player.skillManager);
        }

        // 啟動 UI 場景並傳遞需要的數據
        console.log('Game: 啟動 UIScene，傳遞數據 skillManager:', !!this.player.skillManager, 'stats:', !!this.player.getStats(), 'inventoryManager:', !!inventoryManager);
        this.scene.launch('UIScene', {
            skillManager: this.player.skillManager,
            stats: this.player.getStats(),
            inventoryManager: inventoryManager,
            player: this.player  // 傳遞整個 player 實例
        });

        // 初始化 Debug Console 並設置玩家引用
        this.debugConsole = initDebugConsole(this);
        if (this.debugConsole) {
            this.debugConsole.setPlayer(this.player);
            console.log("Debug Console initialized with player reference");
        }
        
        // 初始化除錯渲染器
        this.debugRenderer = new DebugRenderer(this);
        
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
        this.events.once('shutdown', () => {
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
        console.log("Camera following player set up. Map size:", this.mapWidth, this.mapHeight);

        // 設置物品和裝備事件監聽
        InventoryManager.getInstance().setupItemEvents(this.game, this.player);

        // 創建怪物
        this.createMonsters_test();
        
        // 初始化戰鬥管理器
        this.initCombatSystem();        // 初始化投射物管理器
        this.projectileManager = new ProjectileManager(this);
        
        // 啟用調試渲染
        this.physics.world.createDebugGraphic();
        this.physics.world.debugGraphic.setDepth(999);
        
        // 初始化投射物碰撞處理器
        const projectileCollisionHandler = ProjectileCollisionHandler.getInstance();
        projectileCollisionHandler.initialize(this.projectileManager);

        this.physics.world.createDebugGraphic();
        this.camera.startFollow(this.player.sprite, true, 0.05, 0.05);
    }    // 初始化戰鬥系統      
     private initCombatSystem(): void {        
        // 只使用新戰鬥系統架構，不再保留舊版兼容
        import('../../core/combat/combatSystem').then(module => {
            const CombatSystem = module.CombatSystem;
            const combatSystem = new CombatSystem();
            
            // 初始化戰鬥系統
            combatSystem.initialize(this);
            
            // 初始化鍵位綁定管理器
            import('../../core/skills/keyBindManager').then(keyBindModule => {
                const KeyBindManager = keyBindModule.KeyBindManager;
                const keyBindManager = KeyBindManager.getInstance();
                keyBindManager.initialize(this.player.skillManager, this);
                console.log("鍵位綁定管理器初始化完成");
            });
            
            // 初始化實體搜索系統
            import('../../core/combat/entitySearchSystem').then(module => {
                const EntitySearchSystem = module.EntitySearchSystem;
                const searchSystem = EntitySearchSystem.getInstance();
                searchSystem.initialize(this);
            });
            
            // 初始化實體管理器
            import('../../core/combat/entityManager').then(module => {
                const EntityManager = module.EntityManager;
                const manager = EntityManager.getInstance();
                manager.initialize(this);
                
                // 註冊玩家實體
                manager.registerEntity(this.player);
                
                // 註冊所有怪物
                this.monsters.forEach(monster => {
                    manager.registerEntity(monster);
                });
            });
            
            // 註冊玩家實體
            combatSystem.registerEntity(this.player);
              // 設置要監控的怪物
            const monsterEntitiesForCombatSystem = this.monsters.map(monster => {
                const instanceId = monster.getInstanceId ? monster.getInstanceId() : monster.getId(); // 向下相容
                const sprite = this.monsterSprites.get(instanceId);
                if (!sprite) {
                    console.warn(`[Game.ts] 在為戰鬥系統設置怪物時，找不到怪物 ${instanceId} (類型ID: ${monster.getId()}) 的 Sprite。`);
                    return null; 
                }
                const collisionBoxSprite = this.monsterCollisionBoxes.get(instanceId);
                // isTriggerOnly 的邏輯可能需要根據遊戲需求調整
                // 例如，如果怪物不是固體，則可能只是一個觸發器
                const isTriggerOnly = !monster.isSolidObject(); 

                return {
                    monster: monster,
                    sprite: sprite,
                    isTriggerOnly: isTriggerOnly, 
                    collisionBoxSprite: collisionBoxSprite,
                    hitboxSprite: this.monsterHitboxes.get(instanceId)
                };
            }).filter(entry => entry !== null) as {
                sprite: Phaser.GameObjects.Sprite, 
                monster: Monster, 
                isTriggerOnly?: boolean, 
                collisionBoxSprite?: Phaser.Physics.Arcade.Sprite, 
                hitboxSprite?: Phaser.Physics.Arcade.Sprite 
            }[];
            
            combatSystem.setMonsters(monsterEntitiesForCombatSystem);
            
            // 設置碰撞檢測
            combatSystem.setupCollisions();
              // 初始化投射物管理器
            this.projectileManager = new ProjectileManager(this);
            
            // 將投射物管理器註冊到遊戲的註冊表中，這樣其他地方可以訪問
            this.game.registry.set('projectileManager', this.projectileManager);
            
            // 將所有怪物的 hitbox 註冊到投射物管理器中
            this.monsters.forEach(monster => {
                const instanceId = monster.getInstanceId ? monster.getInstanceId() : monster.getId();
                const hitboxSprite = this.monsterHitboxes.get(instanceId);
                if (hitboxSprite) {
                    this.projectileManager?.registerMonsterSprite(hitboxSprite, monster);
                }
            });

            // 初始化技能施放器
            if (this.player.skillManager) {
                this.skillCaster = new SkillCaster(this.player.skillManager, this.player);
                combatSystem.setSkillCaster(this.skillCaster);
                
                // 將 skillCaster 註冊到遊戲註冊表中，這樣玩家可以訪問它
                this.game.registry.set('skillCaster', this.skillCaster);
            }
            // 保存到類屬性中
            this.combatSystem = combatSystem;
            
            // 儲存在全局作用域以便後續使用
            window.combatSystem = combatSystem;
            
            console.log('新版戰鬥系統已初始化完成！');
              // 設置全局技能施放事件監聽
            if (window.gameEvents) {
                // 監聽從 KeyBindManager 發出的技能使用請求
                window.gameEvents.on('skillUseRequest', async (skillId: string, x: number, y: number, direction: number) => {
                    console.log(`收到技能使用請求: ${skillId}, 位置: (${x}, ${y}), 方向: ${direction}`);
                    
                    if (this.skillCaster) {
                        // 檢查是否可以使用技能
                        if (this.skillCaster.isCastingSkill()) {
                            // 獲取當前技能 ID
                            const currentSkillId = this.skillCaster.getCurrentSkillId();
                            if (currentSkillId) {
                                // 獲取該技能行為
                                const behavior = this.skillCaster.getSkillBehavior(currentSkillId);
                                // 檢查該技能是否允許使用其他技能
                                if (behavior && !behavior.canUseOtherSkillsWhileCasting()) {
                                    console.log(`技能 ${currentSkillId} 正在施放中，禁止使用其他技能`);
                                    return;
                                }
                            }
                        }
                        
                        // 施放指定的技能
                        await this.skillCaster.castSkill(skillId, x, y, direction);
                    }
                });
            }
            
            // 保留原有的測試按鍵 (使用空格施放橫斬技能)
            if (this.input && this.input.keyboard) {                
                this.input.keyboard.on('keydown-SPACE', async () => {
                    // 按空格鍵時，使用技能施放器施放橫斬技能
                    if (this.skillCaster) {
                        // 檢查是否可以使用技能
                        if (this.skillCaster.isCastingSkill()) {
                            const currentSkillId = this.skillCaster.getCurrentSkillId();
                            if (currentSkillId) {
                                const behavior = this.skillCaster.getSkillBehavior(currentSkillId);
                                if (behavior && !behavior.canUseOtherSkillsWhileCasting()) {
                                    console.log(`技能 ${currentSkillId} 正在施放中，禁止使用其他技能`);
                                    return;
                                }
                            }
                        }
                        
                        await this.skillCaster.castSkill('slash');
                    }
                });
            }
        }).catch(error => {
            console.error('初始化戰鬥系統失敗:', error);
        });
    }
    

    // 創建怪物_測試用
    private createMonsters_test(): void {
        // 清空現有怪物
        this.monsters.forEach(monster => {
            const instanceId = monster.getInstanceId ? monster.getInstanceId() : monster.getId(); // 向下相容
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
        const guardian1 = monsterFactory.createMonsterById('stone_guardian_001');
        const guardian2 = monsterFactory.createMonsterById('stone_guardian_001');
        if (guardian1 && guardian2) {
            guardian1.setPosition(this.mapWidth / 2 - 100, this.mapHeight / 2 - 100);
            guardian2.setPosition(this.mapWidth / 2 + 100, this.mapHeight / 2 + 100);
            guardian1.activate();
            guardian2.activate();

            // 渲染怪物（改用 monsterFactory 的方法）
            monsterFactory.renderMonster(this, this.player, guardian1, this.monsterSprites, this.monsterCollisionBoxes, this.monsterHitboxes);
            monsterFactory.renderMonster(this, this.player, guardian2, this.monsterSprites, this.monsterCollisionBoxes, this.monsterHitboxes);            // 添加到怪物列表
            this.monsters.push(guardian1, guardian2);


            console.log("創建了兩隻石像守衛");
        } else {
            console.error("無法創建石像守衛");
        }
    }
    
    async loadMap(mapId: string) {
        try {
            // 從 PhaserMapManager 載入地圖數據
            await this.mapManager.loadMapFromCache(mapId);
            // 載入 Phaser Tilemap
            this.createTilemap(mapId); // Pass mapId here
            this.currentMapId = mapId;
        } catch (error) {
            console.error('載入地圖失敗:', error);
            // 創建一個默認地圖
            this.createDefaultMap();
        }
    }

    createTilemap(mapIdToLoad: string) { // Accept mapIdToLoad
        // 測試中，使用硬編碼的地圖，不從文件載入
        try {
            console.log(`Creating hardcoded test map instead of loading ${mapIdToLoad}_map`);

            // 直接創建一個空白地圖，不從檔案載入
            this.map = this.make.tilemap({
                tileWidth: this.tileSize, // Use class member tileSize
                tileHeight: this.tileSize, // Use class member tileSize
                width: 50, // Example width in tiles
                height: 50  // Example height in tiles
            });

            const graphics = this.add.graphics();

            // 綠色地板紋理
            graphics.fillStyle(0x55AA55);
            graphics.fillRect(0, 0, this.tileSize, this.tileSize);
            graphics.lineStyle(1, 0x448844);
            graphics.strokeRect(0, 0, this.tileSize, this.tileSize);
            graphics.generateTexture('floor_tile', this.tileSize, this.tileSize);

            // 灰色牆壁紋理
            graphics.clear();
            graphics.fillStyle(0x666666);
            graphics.fillRect(0, 0, this.tileSize, this.tileSize);
            graphics.lineStyle(1, 0x444444);
            graphics.strokeRect(0, 0, this.tileSize, this.tileSize);
            graphics.generateTexture('wall_tile', this.tileSize, this.tileSize);

            // 釋放圖形對象
            graphics.destroy();

            // 添加自訂圖塊集（使用剛生成的紋理）
            const tileset = this.map.addTilesetImage('terrain', 'floor_tile');
            const wallTileset = this.map.addTilesetImage('walls', 'wall_tile');

            if (!tileset || !wallTileset) {
                console.error(`[Game.ts] Failed to add custom tilesets.`);
                this.createDefaultMap(); // Fallback to default map
                return;
            }

            // 手動創建圖層
            this.groundLayer = this.map.createBlankLayer('Ground', tileset, 0, 0) as Phaser.Tilemaps.TilemapLayer;
            this.obstaclesLayer = this.map.createBlankLayer('Obstacles', wallTileset, 0, 0) as Phaser.Tilemaps.TilemapLayer;

            if (!this.groundLayer || !this.obstaclesLayer) {
                console.error(`[Game.ts] Failed to create blank layers.`);
                this.createDefaultMap(); // Fallback to default map
                return;
            }

            // 使用 fill 方法填充圖層
            this.groundLayer.fill(0); // 填充地面圖層為綠色 (index 0 of 'terrain' tileset)

            // 在邊界周圍添加障礙物
            for (let x = 0; x < this.map.width; x++) {
                for (let y = 0; y < this.map.height; y++) {
                    // 在地圖邊界創建障礙物
                    if (x === 0 || x === this.map.width - 1 || y === 0 || y === this.map.height - 1) {
                        this.obstaclesLayer.putTileAt(0, x, y); // 使用灰色牆壁紋理 (index 0 of 'walls' tileset)
                    } else {
                        // 隨機添加一些障礙物 (減少密度)
                        if (x > 5 && y > 5 && Math.random() < 0.02) {
                            this.obstaclesLayer.putTileAt(0, x, y); // 使用灰色牆壁紋理
                        }
                    }
                }
            }

            // 設定碰撞
            this.obstaclesLayer.setCollision([0]); // 指定哪些圖塊索引會產生碰撞 (index 0 of 'walls' tileset)

            // 設定世界邊界和攝影機邊界
            this.mapWidth = this.map.widthInPixels; // Use map's pixel dimensions
            this.mapHeight = this.map.heightInPixels; // Use map's pixel dimensions

            // 更新物理世界和相機邊界
            this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);

            // 確保攝影機邊界已更新
            if (this.camera) {
                this.camera.setBounds(0, 0, this.mapWidth, this.mapHeight);
                // 如果玩家存在，確保攝影機繼續跟隨
                if (this.player && this.player.sprite) {
                    this.camera.startFollow(this.player.sprite, true, 0.05, 0.05);
                }
            }

            console.log(`Map created successfully. Size: ${this.mapWidth}x${this.mapHeight} pixels.`);
            console.log(`World bounds: (0,0) to (${this.mapWidth},${this.mapHeight}).`);

        } catch (error) {
            console.error('創建測試地圖時出錯:', error);
            // 創建一個默認地圖作為備用
            this.createDefaultMap();
        }
    }

    createDefaultMap() {
        console.log('創建默認地圖');
        // 在這裡可以實現一個簡單的默認地圖
        // 如果無法載入 Tilemap 數據

        // 創建一個簡單的網格背景
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0x333333);

        // 繪製網格
        for (let x = 0; x < this.mapWidth; x += 32) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, this.mapHeight);
        }
        for (let y = 0; y < this.mapHeight; y += 32) {
            graphics.moveTo(0, y);
            graphics.lineTo(this.mapWidth, y);
        }
        graphics.strokePath();
    }    

    update(time: number, delta: number) {
        if (this.player) {
            this.player.update();
            this.player.getStats().recoverEnergy(delta); // 玩家能量恢復
              // 更新技能管理器，更新技能冷卻時間
            if (this.player.skillManager && typeof this.player.skillManager.updateCooldowns === 'function') {
                this.player.skillManager.updateCooldowns(delta);
                // console.log("[Game.ts] 更新技能管理器冷卻時間");
            } else if (this.player.skillManager && typeof this.player.skillManager.update === 'function') {
                // 如果沒有 updateCooldowns 方法，使用 update 方法
                this.player.skillManager.update(delta);
                // console.log("[Game.ts] 使用 update 方法更新技能管理器冷卻時間");
            }
            // 更新技能動畫控制器，確保後搖結束後角色可以移動
            if (this.game.registry.has('skillCaster') && this.skillAnimController) {
                try {
                    // 檢查並修復異常的技能施放狀態
                    const skillCaster = this.game.registry.get('skillCaster');
                    this.skillAnimController.checkAndFixCastingState(skillCaster);
                } catch (error) {
                    console.error('[Game.ts] 無法使用SkillAnimationController:', error);
                }
            }
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
            const projectileCollisionHandler = ProjectileCollisionHandler.getInstance();
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
                            y: projectile.position.y
                        }
                    });
                }
                
                // 渲染投射物碰撞框
                this.debugRenderer.renderProjectiles(projectilesMap);
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
        const helmet = equipmentFactory.createEquipmentById('wt');
        const chestplate = equipmentFactory.createEquipmentById('armor_001');
        const potion = consumableFactory.createConsumableById('consumable_004', 5);

        if (helmet) inventoryManager.playerInventory.addItem(helmet);
        if (chestplate) inventoryManager.playerInventory.addItem(chestplate);
        if (potion) inventoryManager.playerInventory.addItem(potion);        
        console.log(`初始化玩家物品欄，添加了 ${inventoryManager.playerInventory.items.length} 個物品`);
    }    
}