import { SkillProjectile } from '../skillProjectile';
import { ProjectileCollisionHandler } from '../../combat/projectileCollisionHandler';
import { CollisionBoxType } from '../types';

/**
 * 技能投射物管理器
 * 負責管理所有技能產生的投射物
 */
export class ProjectileManager {    
    private projectiles: Map<string, SkillProjectile> = new Map();
    private projectileSprites: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
    private scene?: Phaser.Scene;
    private monsterCollisionGroup?: Phaser.Physics.Arcade.Group;
    
    /**
     * 建構子
     * @param scene 場景實例 (可選)
     */    
    constructor(scene?: Phaser.Scene) {
        this.scene = scene;
        if (this.scene && this.scene.physics && this.scene.physics.add) {
            this.monsterCollisionGroup = this.scene.physics.add.group();
            console.log('[ProjectileManager] 已初始化碰撞組');
        } else {
            console.log('[ProjectileManager] 初始化但無物理系統可用');
        }
        console.log('[ProjectileManager] 已初始化');
    }

    /**
     * 添加技能投射物
     * @param projectile 技能投射物實例
     */
    public addProjectile(projectile: SkillProjectile): void {
        try {
            console.log(`[ProjectileManager] 嘗試添加投射物: ${projectile.getId()}`);
            if (!this.scene || !this.scene.physics) {
                console.error(`[ProjectileManager] 場景或物理引擎未定義！無法創建投射物。`);
                return;
            }
            
            const sprite = this.scene.physics.add.sprite(
                projectile.position.x,
                projectile.position.y,
                projectile.getSpritePath()
            );
            
            // 確保啟用物理系統
            sprite.setActive(true);
            if (sprite.body) {
                sprite.body.enable = true;
                
                // 檢查並記錄碰撞設置
                console.log(`[ProjectileManager] 初始碰撞設置檢查 - ${projectile.getId()}: none=${sprite.body.checkCollision.none}, up=${sprite.body.checkCollision.up}, down=${sprite.body.checkCollision.down}, left=${sprite.body.checkCollision.left}, right=${sprite.body.checkCollision.right}`);
                
                // 確保碰撞檢測完全啟用
                if (sprite.body.checkCollision.none) {
                    console.log(`[ProjectileManager] 修正碰撞設置: ${projectile.getId()} - 將 checkCollision.none 設為 false`);
                    sprite.body.checkCollision.none = false;
                }
            }
            
            // 設置碰撞器大小
            const collisionShape = projectile.getCollisionShape();
            if (collisionShape) {
                if (collisionShape.type === CollisionBoxType.CIRCLE && collisionShape.radius) {
                    console.log(`[ProjectileManager] 設置圓形碰撞體, 半徑: ${collisionShape.radius}`);
                    sprite.setCircle(collisionShape.radius);
                    sprite.body.setOffset(sprite.width / 2 - collisionShape.radius, sprite.height / 2 - collisionShape.radius);
                } else if (collisionShape.type === CollisionBoxType.RECTANGLE && collisionShape.width && collisionShape.height) {
                    console.log(`[ProjectileManager] 設置矩形碰撞體, 寬度: ${collisionShape.width}, 高度: ${collisionShape.height}`);
                    sprite.body.setSize(collisionShape.width, collisionShape.height);
                    sprite.body.setOffset(
                        (sprite.width - collisionShape.width) / 2,
                        (sprite.height - collisionShape.height) / 2
                    );
                }
            }
            
            // 確保啟用物理系統（這部分是重複的，可以考慮移除）
            sprite.setActive(true);
            if (sprite.body) {
                console.log(`[ProjectileManager] 啟用精靈物理系統: ${projectile.getId()}`);
                sprite.body.enable = true;
            }

            // 儲存精靈和投射物的關聯
            sprite.setData('projectileId', projectile.getId());
            sprite.setData('isProjectile', true);            // 添加到碰撞組
            if (this.monsterCollisionGroup) {
                // 確保碰撞組有內容
                console.log(`[ProjectileManager] monsterCollisionGroup 成員數量: ${this.monsterCollisionGroup.getLength()}`);
                
                this.scene.physics.add.overlap(
                    sprite,
                    this.monsterCollisionGroup,
                    (projectileSprite, monsterSprite) => {
                        this.handleCollision(projectileSprite as Phaser.Physics.Arcade.Sprite, monsterSprite as Phaser.Physics.Arcade.Sprite);
                    },
                    (projectileSprite, monsterSprite) => {
                        // 更詳細的碰撞條件檢查
                        const proSprite = projectileSprite as Phaser.Physics.Arcade.Sprite;
                        const monSprite = monsterSprite as Phaser.Physics.Arcade.Sprite;
                        
                        // 如果任一精靈未啟用，跳過碰撞
                        if (!proSprite.active || !monSprite.active) {
                            console.log(`[ProjectileManager] 碰撞檢查：精靈未啟用 - Projectile(${proSprite.active}), Monster(${monSprite.active})`);
                            return false;
                        }
                        
                        if (!proSprite.body || !monSprite.body) {
                            console.log(`[ProjectileManager] 碰撞檢查：缺少物理體 - Projectile(${!!proSprite.body}), Monster(${!!monSprite.body})`);
                            return false;
                        }
                        
                        // console.log(`[ProjectileManager] 碰撞檢查通過 - ${projectile.getId()}`);
                        return true;
                    },
                    this
                );
                // console.log(`[ProjectileManager] 已設置碰撞檢測: ${projectile.getId()}`);
            } else {
                console.warn(`[ProjectileManager] 沒有可用的怪物碰撞組！${projectile.getId()} 將無法檢測碰撞。`);
            }            // 將投射物註冊到 projectileGroup 以供 EntitySearchSystem 查找
            const projectileGroup = this.scene.children.getByName('projectileGroup');
            if (projectileGroup instanceof Phaser.GameObjects.Group) {
                sprite.setData('projectileInstance', projectile);
                projectileGroup.add(sprite);
                console.log(`[ProjectileManager] 添加投射物 ${projectile.getId()} 到 projectileGroup 以供搜尋`);
            } else {
                console.warn(`[ProjectileManager] 找不到 projectileGroup，投射物將無法被 EntitySearchSystem 查找`);
            }

            this.projectileSprites.set(projectile.getId(), sprite);
            this.projectiles.set(projectile.getId(), projectile);
            
            console.log(`[ProjectileManager] 成功創建投射物: ${projectile.getId()}`);
        } catch (error) {
            console.error('[ProjectileManager] 無法創建投射物精靈:', error);
            return;
        }
    }

    /**
     * 處理碰撞回調
     */
    private handleCollision(projectileSprite: Phaser.Physics.Arcade.Sprite, monsterSprite: Phaser.Physics.Arcade.Sprite): void {
        // console.log(`[ProjectileManager] 碰撞回調被觸發！檢查精靈數據...`);
        
        const projectileId = projectileSprite.getData('projectileId');
        const monsterId = monsterSprite.getData('monsterId');
        
        // console.log(`[ProjectileManager] 碰撞數據 - projectileId: ${projectileId}, monsterId: ${monsterId}`);
        
        if (projectileId && monsterId) {
            const projectile = this.projectiles.get(projectileId);
            const monster = monsterSprite.getData('monsterInstance');
            
            // console.log(`[ProjectileManager] 碰撞物件 - projectile: ${projectile ? '存在' : '不存在'}, monster: ${monster ? '存在' : '不存在'}`);
            
            if (projectile && monster) {
                // console.log(`[ProjectileManager] 偵測到碰撞: 投射物 ${projectileId} 與怪物 ${monsterId}`);
                ProjectileCollisionHandler.getInstance().handleProjectileMonsterCollision(projectile, monster);
            } else {
                console.warn(`[ProjectileManager] 碰撞檢測失敗: 無法獲取完整實例數據 - projectile: ${!!projectile}, monster: ${!!monster}`);
            }
        } else {
            // console.warn(`[ProjectileManager] 碰撞檢測失敗: 無效的ID數據 - projectileId: ${projectileId}, monsterId: ${monsterId}`);
        }
    }

    /**
     * 移除並銷毀投射物
     * @param projectileId 技能投射物ID
     */
    public removeProjectile(projectileId: string): void {
        if (!this.projectiles.has(projectileId)) {
            return;
        }

        const projectile = this.projectiles.get(projectileId);
        if (!projectile) {
            return;
        }

        // 標記為待銷毀
        projectile.markForDestruction();
        
        // 清理碰撞記錄
        ProjectileCollisionHandler.getInstance().clearCollisionRecord(projectileId);
              // 移除投射物實例
        this.projectiles.delete(projectileId);
        
        // 銷毀精靈和所有相關資源
        const sprite = this.projectileSprites.get(projectileId);
        if (sprite) {
            // 從 projectileGroup 中移除投射物
            if (this.scene) {
                const projectileGroup = this.scene.children.getByName('projectileGroup');
                if (projectileGroup instanceof Phaser.GameObjects.Group) {
                    projectileGroup.remove(sprite, false);
                    console.log(`[ProjectileManager] 從 projectileGroup 移除投射物: ${projectileId}`);
                }
            }
            
            sprite.destroy(true);
            this.projectileSprites.delete(projectileId);
        }
        
        console.log(`[ProjectileManager] 完成移除投射物: ${projectileId}`);
    }

    /**
     * 更新所有投射物
     */
    public update(deltaTime: number): void {
        const projectilesToRemove: string[] = [];

        for (const [id, projectile] of this.projectiles) {
            // 檢查是否應該被銷毀
            if (projectile.shouldDestroy(deltaTime)) {
                projectilesToRemove.push(id);
                console.log(`[ProjectileManager] 投射物 ${id} 將被銷毀，原因: 銷毀條件滿足`);
                continue;
            }

            // 更新投射物狀態
            projectile.update(deltaTime);
            
            // 再次檢查更新後是否需要銷毀
            if (projectile.shouldDestroy(deltaTime)) {
                projectilesToRemove.push(id);
                continue;
            }

            // 更新精靈位置
            const sprite = this.projectileSprites.get(id);
            if (sprite) {
                sprite.setPosition(projectile.position.x, projectile.position.y);
            }
        }

        // 移除被標記為銷毀的投射物
        for (const id of projectilesToRemove) {
            this.removeProjectile(id);
        }
    }    /**
     * 註冊怪物精靈到碰撞組
     */
    public registerMonsterSprite(sprite: Phaser.Physics.Arcade.Sprite, monster: any): void {
        if (this.monsterCollisionGroup) {
            try {
                console.log(`[ProjectileManager] 註冊怪物精靈 - ID: ${monster.getId()}`);
                
                // 確保精靈啟用
                sprite.setActive(true);
                if (sprite.body) {
                    sprite.body.enable = true;
                    console.log(`[ProjectileManager] 怪物碰撞設置 - ID: ${monster.getId()}, checkCollision.none: ${sprite.body.checkCollision.none}`);
                }
                
                sprite.setData('monsterId', monster.getId());
                sprite.setData('monsterInstance', monster);
                this.monsterCollisionGroup.add(sprite);
                console.log(`[ProjectileManager] 已添加怪物到碰撞組，目前成員數: ${this.monsterCollisionGroup.getLength()}`);
            } catch (error) {
                console.error('[ProjectileManager] 註冊怪物精靈失敗:', error);
            }
        } else {
            console.warn('[ProjectileManager] 無法註冊怪物精靈：碰撞組未初始化');
        }
    }

    /**
     * 從碰撞組移除怪物精靈
     */
    public unregisterMonsterSprite(sprite: Phaser.Physics.Arcade.Sprite): void {
        if (this.monsterCollisionGroup) {
            try {
                this.monsterCollisionGroup.remove(sprite);
            } catch (error) {
                console.error('[ProjectileManager] 移除怪物精靈失敗:', error);
            }
        }
    }

    /**
     * 清除所有投射物
     */
    public clearAll(): void {
        // 使用 removeProjectile 來安全地移除所有投射物
        for (const id of [...this.projectiles.keys()]) {
            this.removeProjectile(id);
        }
        
        // 以防萬一,最後再清理一次
        this.projectiles.clear();
        this.projectileSprites.clear();
    }

    /**
     * 獲取投射物
     */
    public getProjectile(projectileId: string): SkillProjectile | undefined {
        return this.projectiles.get(projectileId);
    }

    /**
     * 獲取所有投射物
     */
    public getAllProjectiles(): IterableIterator<SkillProjectile> {
        return this.projectiles.values();
    }

    /**
     * 獲取所有投射物的精靈
     */
    public getAllProjectileSprites(): Map<string, Phaser.Physics.Arcade.Sprite> {
        return this.projectileSprites;
    }

    /**
     * 獲取投射物的精靈
     */
    public getProjectileSprite(projectileId: string): Phaser.Physics.Arcade.Sprite | undefined {
        return this.projectileSprites.get(projectileId);
    }
}
