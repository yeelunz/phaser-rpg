/**
 * 怪物工廠 v4 - 僅使用新的狀態機行為系統
 * 完全捨棄舊行為系統
 */
import { Monster } from './monster';
import { type MonsterData, dataLoader, MonsterCategory } from '../data/dataloader';
import { BehaviorLoader } from './behaviors/definitions/behaviorLoader';

// 怪物工廠類別 - 單例模式
export class MonsterFactory {
    private static instance: MonsterFactory;

    private constructor() {
        // 確保數據加載器已經初始化
        dataLoader.loadAllData().catch(error => {
            console.error("初始化怪物工廠時無法加載數據:", error);
        });
    }

    // 獲取單例實例
    public static getInstance(): MonsterFactory {
        if (!MonsterFactory.instance) {
            MonsterFactory.instance = new MonsterFactory();
        }
        return MonsterFactory.instance;
    }

    // 根據怪物ID創建怪物實例
    public createMonsterById(id: string): Monster | null {
        const monsterData = dataLoader.getMonsterDataById(id);
        if (!monsterData) {
            console.error(`找不到ID為 ${id} 的怪物數據`);
            return null;
        }

        return this.createMonster(monsterData);
    }    // 根據怪物數據創建怪物實例
    public createMonster(data: MonsterData): Monster {
        // 已經從 monsters.json 指定了 behaviorId，則直接使用
        // 如果沒有指定，才嘗試自動分配
        if (!data.behaviorId) {
            console.debug(`[MonsterFactory] 怪物 ${data.id} 沒有指定行為ID，嘗試自動分配`);
            data.behaviorId = this.autoAssignBehaviorId(data);
            
            // 確保所有怪物都有行為ID
            if (!data.behaviorId) {
                // 如果無法分配特定行為，使用基本行為
                console.debug(`[MonsterFactory] 無法為怪物 ${data.id} 分配合適的行為，使用基本行為`);
                data.behaviorId = 'basic_enemy';
            }
        } else {
            console.debug(`[MonsterFactory] 使用怪物 ${data.id} 指定的行為ID: ${data.behaviorId}`);
        }
        
        const monster = new Monster(data);
        return monster;
    }      // 嘗試根據怪物類型自動分配行為ID    
    private autoAssignBehaviorId(data: MonsterData): string {
        // 基於怪物類型進行推斷
        if (data.category === MonsterCategory.BOSS) {
            console.debug(`[MonsterFactory] 基於類別分配 BOSS 行為給 ${data.id}`);
            return 'elite_enemy'; // 使用精英行為定義
        } else if (data.category === MonsterCategory.ELITE) {
            console.debug(`[MonsterFactory] 基於類別分配精英行為給 ${data.id}`);
            return 'elite_enemy';
        }
        
        // 默認使用基本行為定義
        console.debug(`[MonsterFactory] 為 ${data.id} 分配默認行為: basic_enemy`);
        return 'basic_enemy';
    }
    
    // 註冊自定義怪物行為
    public registerCustomBehavior(behaviorConfig: any): void {
        // 使用 BehaviorLoader 註冊新的行為配置
        BehaviorLoader.registerBehavior(behaviorConfig);
    }
    
    // 批量創建怪物
    public createMonsters(monsterIds: string[]): Monster[] {
        const monsters: Monster[] = [];
        
        for (const id of monsterIds) {
            const monster = this.createMonsterById(id);
            if (monster) {
                monsters.push(monster);
            }
        }
        
        return monsters;
    }

    // 根據類別批量創建怪物
    public createMonstersByCategory(category: MonsterCategory, count: number = 1): Monster[] {
        const monstersData = dataLoader.getMonstersByCategory(category);
        const monsters: Monster[] = [];
        
        if (monstersData.length === 0) {
            console.warn(`找不到類別為 ${category} 的怪物數據`);
            return monsters;
        }
        
        // 依據需求數量隨機選擇怪物創建
        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * monstersData.length);
            const monster = this.createMonster(monstersData[randomIndex]);
            monsters.push(monster);
        }
        
        return monsters;
    }

    // 獲取所有怪物數據
    public getAllMonsterData(): MonsterData[] {
        return dataLoader.getAllMonsterData();
    }

    // 複製一個已有的怪物實例
    public cloneMonster(monster: Monster): Monster {
        return monster.clone();
    }

    /**
     * 怪物渲染與碰撞箱設置（原本在 Game.ts）
     * @param scene Phaser.Scene 實例
     * @param player Player 實例
     * @param monster 怪物實例
     * @param monsterSprites Map<string, Sprite>
     * @param monsterCollisionBoxes Map<string, Sprite>
     * @param monsterHitboxes Map<string, Sprite>
     */
    public renderMonster(
        scene: Phaser.Scene,
        player: any,
        monster: any,
        monsterSprites: Map<string, Phaser.GameObjects.Sprite>,
        monsterCollisionBoxes: Map<string, Phaser.Physics.Arcade.Sprite>,
        monsterHitboxes: Map<string, Phaser.Physics.Arcade.Sprite>
    ): void {
        // 這部分代碼保持不變，因為它處理的是實體渲染而非行為邏輯
        let monsterSprite: Phaser.GameObjects.Sprite;
        let monsterText: Phaser.GameObjects.Text | null = null;
        if (!monster.getSprite()) {
            monsterText = scene.add.text(
                monster.getPosition().x,
                monster.getPosition().y,
                monster.getIcon() || '👾',
                {
                    fontSize: '64px',
                    stroke: '#000',
                    strokeThickness: 4,
                    align: 'center'
                }
            );
            monsterText.setOrigin(0.5, 0.5);
            monsterText.setDepth(10);
            monsterSprite = scene.physics.add.sprite(
                monster.getPosition().x,
                monster.getPosition().y,
                'transparent'
            );
            monsterSprite.setOrigin(0.5, 0.5);
            monsterSprite.setVisible(false);
            scene.events.on(Phaser.Scenes.Events.UPDATE, () => {
                if (monsterText && monsterSprite) {
                    monsterText.x = monsterSprite.x;
                    monsterText.y = monsterSprite.y;
                }
            });
        } else {
            const spriteKey = monster.getSprite() || 'transparent';
            monsterSprite = scene.physics.add.sprite(
                monster.getPosition().x,
                monster.getPosition().y,
                spriteKey
            );
        }
        monsterSprite.setOrigin(0.5, 0.5);
        monsterSprite.setDepth(5);
        
        const body = monsterSprite.body as Phaser.Physics.Arcade.Body;
        body.setSize(
            monster.getCollisionBox().width * 0.6,
            monster.getCollisionBox().height * 0.6
        );
        body.setImmovable(true);
        body.checkCollision.up = true;
        body.checkCollision.down = true;
        body.checkCollision.left = true;
        body.checkCollision.right = true;
        scene.physics.add.collider(player.sprite, monsterSprite);

        const collisionBoxSprite = scene.physics.add.sprite(
            monster.getPosition().x,
            monster.getPosition().y,
            'transparent'
        );
        collisionBoxSprite.setOrigin(0.5, 0.5);
        collisionBoxSprite.setVisible(false);
        const collisionBoxBody = collisionBoxSprite.body as Phaser.Physics.Arcade.Body;
        collisionBoxBody.setSize(
            monster.getCollisionBox().width,
            monster.getCollisionBox().height
        );
        collisionBoxBody.setImmovable(true);
        collisionBoxBody.allowGravity = false;
        collisionBoxBody.checkCollision.up = true;
        collisionBoxBody.checkCollision.down = true;
        collisionBoxBody.checkCollision.left = true;
        collisionBoxBody.checkCollision.right = true;        const hitboxSprite = scene.physics.add.sprite(
            monster.getPosition().x,
            monster.getPosition().y,
            'transparent'
        );
        hitboxSprite.setOrigin(0.5, 0.5);
        hitboxSprite.setVisible(false);
        const hitboxBody = hitboxSprite.body as Phaser.Physics.Arcade.Body;
        hitboxBody.setSize(
            monster.getHitBox().width,
            monster.getHitBox().height
        );
        hitboxBody.setImmovable(true);
        hitboxBody.allowGravity = false;
        hitboxBody.checkCollision.up = true;
        hitboxBody.checkCollision.down = true;
        hitboxBody.checkCollision.left = true;        hitboxBody.checkCollision.right = true;

        // 創建偵測圓圈（用於 Phaser debug graphic 顯示）
        // 使用怪物實際的偵測範圍，確保與邏輯偵測保持一致
        const detectionRange = (monster as any).detectionRange;
        let detectionCircleSprite: Phaser.Physics.Arcade.Sprite | null = null;
        
        // 只有當偵測範圍大於 0 時才創建偵測圓圈
        if (detectionRange && detectionRange > 0) {
            detectionCircleSprite = scene.physics.add.sprite(
                monster.getPosition().x,
                monster.getPosition().y,
                'transparent'
            );
            detectionCircleSprite.setOrigin(0.5, 0.5);
            detectionCircleSprite.setVisible(false);
            const detectionBody = detectionCircleSprite.body as Phaser.Physics.Arcade.Body;
            
            // 設置為圓形碰撞體，用於偵測
            // 使用 setCircle(radius, offsetX, offsetY) 來修正圓心位置
            detectionBody.setCircle(detectionRange, -detectionRange, -detectionRange);
            detectionBody.setImmovable(true);
            detectionBody.allowGravity = false;
            // 設置為 overlap 檢測（不產生物理碰撞）
            detectionBody.checkCollision.none = true;
            
            // 設置偵測圓圈與玩家的 overlap 檢測
            scene.physics.add.overlap(player.sprite, detectionCircleSprite, () => {
                // 這裡可以觸發怪物發現玩家的事件
                console.log(`怪物 ${monster.getName()} 偵測到玩家`);
            });
            
            console.debug(`[MonsterFactory] 為怪物 ${monster.getName()} 創建偵測圓圈，範圍: ${detectionRange}`);
        } else {
            console.debug(`[MonsterFactory] 怪物 ${monster.getName()} 偵測範圍為 ${detectionRange}，跳過偵測圓圈創建`);
        }        scene.events.on(Phaser.Scenes.Events.UPDATE, () => {
            if (collisionBoxSprite && monsterSprite) {
                collisionBoxSprite.x = monsterSprite.x;
                collisionBoxSprite.y = monsterSprite.y;
            }
            if (hitboxSprite && monsterSprite) {
                hitboxSprite.x = monsterSprite.x;
                hitboxSprite.y = monsterSprite.y;            
            }
            // 只有當偵測圓圈存在時才更新位置
            if (detectionCircleSprite && monsterSprite) {
                detectionCircleSprite.x = monsterSprite.x;
                detectionCircleSprite.y = monsterSprite.y;
            }
        });
        
        const instanceId = monster.getInstanceId ? monster.getInstanceId() : monster.getId(); // 向下相容
        monsterSprites.set(instanceId, monsterSprite);
        monsterCollisionBoxes.set(instanceId, collisionBoxSprite);
        monsterHitboxes.set(instanceId, hitboxSprite);
        
        // 自動註冊到投射物管理器
        const projectileManager = scene.game.registry.get('projectileManager');
        if (projectileManager && hitboxSprite) {
            try {
                projectileManager.registerMonsterSprite(hitboxSprite, monster);
                console.log(`[MonsterFactory] 成功註冊怪物 ${instanceId} 到投射物管理器`);
            } catch (error) {
                console.warn(`[MonsterFactory] 註冊怪物 ${instanceId} 到投射物管理器失敗:`, error);
            }
        }
    }
}

// 導出怪物工廠實例
export const monsterFactory = MonsterFactory.getInstance();
