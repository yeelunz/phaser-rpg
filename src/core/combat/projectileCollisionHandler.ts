import { Monster } from '../monsters/monster';
import { ProjectileManager } from '../skills/projectile/projectileManager';
import { SkillProjectile } from '../skills/skillProjectile';
import { EntitySearchSystem } from './entitySearchSystem';

/**
 * 投射物碰撞處理器
 * 集中處理所有與投射物碰撞相關的邏輯
 */
export class ProjectileCollisionHandler {
    private static instance: ProjectileCollisionHandler;    private projectileManager: ProjectileManager | null = null;
    private entitySearchSystem: EntitySearchSystem;
    private processedCollisions: Map<string, Set<string>> = new Map();
    private active: boolean = false;
    private lastUpdate: number = 0;
    private readonly collisionCooldown: number = 100; // 碰撞檢測的最小間隔時間（毫秒）
      private constructor() {
        this.entitySearchSystem = EntitySearchSystem.getInstance();
        this.processedCollisions = new Map<string, Set<string>>();
        console.log('[ProjectileCollisionHandler] 已初始化碰撞記錄追蹤');
    }
    
    /**
     * 單例模式獲取實例
     */
    public static getInstance(): ProjectileCollisionHandler {
        if (!ProjectileCollisionHandler.instance) {
            ProjectileCollisionHandler.instance = new ProjectileCollisionHandler();
        }
        return ProjectileCollisionHandler.instance;
    }
    
    /**
     * 初始化碰撞處理器
     * @param projectileManager 投射物管理器
     */    public initialize(projectileManager: ProjectileManager): void {
        this.projectileManager = projectileManager;
        this.active = true;
        this.lastUpdate = Date.now();
        this.clearAllCollisionRecords();
        console.log('[ProjectileCollisionHandler] 已初始化並啟用');
    }
      /**
     * 處理投射物與怪物的碰撞
     * @param projectile 投射物
     * @param monster 怪物
     */
    public handleProjectileMonsterCollision(projectile: SkillProjectile, monster: Monster): void {
        const projectileId = projectile.getId();
        const monsterId = monster.getId();
        
        // console.log(`[ProjectileCollisionHandler] 處理碰撞: 投射物 ${projectileId} 和怪物 ${monsterId}`);
        
        // 檢查是否已經處理過該碰撞
        if (!this.processedCollisions.has(projectileId)) {
            this.processedCollisions.set(projectileId, new Set());
            console.log(`[ProjectileCollisionHandler] 為投射物 ${projectileId} 創建新的碰撞記錄集合`);
        }
        
        // 如果已經處理過這對碰撞，則跳過
        if (this.processedCollisions.get(projectileId)!.has(monsterId)) {
            // console.log(`[ProjectileCollisionHandler] 跳過已處理過的碰撞: 投射物 ${projectileId} 和怪物 ${monsterId}`);
            return;
        }
        
        // 記錄已處理的碰撞
        this.processedCollisions.get(projectileId)!.add(monsterId);
        // console.log(`[ProjectileCollisionHandler] 記錄碰撞: 投射物 ${projectileId} 和怪物 ${monsterId}`);
        
        // 觸發投射物的碰撞事件
        // console.log(`[ProjectileCollisionHandler] 即將調用 onHitEnter: 投射物 ${projectileId}`);
        projectile.onHitEnter(monster);
        // console.log(`[ProjectileCollisionHandler] 投射物 ${projectileId} 命中怪物 ${monsterId}`);
    }
    
    /**
     * 檢查物理碰撞
     * 使用 Phaser 的物理引擎檢測碰撞
     * @param projectileSprite 投射物精靈
     * @param monsterHitbox 怪物碰撞箱
     * @param callback 碰撞回調
     */    public checkPhysicalCollision(
        projectileSprite: Phaser.Physics.Arcade.Sprite, 
        monsterHitbox: Phaser.Physics.Arcade.Sprite,
        callback: (projectileId: string, monsterId: string) => void
    ): boolean {
        // 使用 Phaser 的內建碰撞檢測
        const bounds1 = projectileSprite.getBounds();
        const bounds2 = monsterHitbox.getBounds();
        
        const projectileId = projectileSprite.getData('projectileId');
        const monsterId = monsterHitbox.getData('monsterId');
        
        
        if (Phaser.Geom.Intersects.RectangleToRectangle(bounds1, bounds2)) {
            // 從精靈的自定義數據中獲取 ID
            // console.log(`[ProjectileCollisionHandler] 檢測到幾何碰撞！檢查ID數據...`);
            
            if (projectileId && monsterId) {
                // console.log(`[ProjectileCollisionHandler] 確認碰撞: 投射物 ${projectileId} 和怪物 ${monsterId}`);
                callback(projectileId, monsterId);
                return true;
            } else {
                console.warn(`[ProjectileCollisionHandler] 碰撞檢測失敗: 無效的ID數據 - projectileId: ${projectileId}, monsterId: ${monsterId}`);
            }
        }
        
        return false;
    }
    
    /**
     * 清除指定投射物的碰撞記錄
     * 通常在投射物被銷毀時調用
     * @param projectileId 投射物ID
     */
    public clearCollisionRecord(projectileId: string): void {
        this.processedCollisions.delete(projectileId);
    }
    
    /**
     * 清除所有碰撞記錄
     */
    public clearAllCollisionRecords(): void {
        this.processedCollisions.clear();
    }
    
    /**
     * 更新碰撞檢測
     * 在遊戲更新循環中調用
     * @param monsters 遊戲中的所有怪物
     * @param monsterHitboxes 怪物碰撞箱映射
     */    public update(monsters: Monster[], monsterHitboxes: Map<string, Phaser.Physics.Arcade.Sprite>): void {
        if (!this.projectileManager || !this.active) {
            return;
        }
        
        const currentTime = Date.now();
        if (currentTime - this.lastUpdate < this.collisionCooldown) {
            return; // 避免過於頻繁的碰撞檢測
        }
        this.lastUpdate = currentTime;
        
        // 獲取所有活動的投射物
        const projectiles = Array.from(this.projectileManager.getAllProjectiles());
        
        for (const projectile of projectiles) {
            const projectileId = projectile.getId();
            const projectileSprite = this.projectileManager.getProjectileSprite(projectileId);
            
            if (!projectileSprite || !projectileSprite.active) {
                this.clearCollisionRecord(projectileId);
                continue;
            }
            
            // 設置精靈的自定義數據，存儲 ID 以便在碰撞回調中使用
            projectileSprite.setData('projectileId', projectileId);
            
            // 檢查與每個怪物的碰撞
            let hasCollision = false;
            for (const monster of monsters) {
                const monsterId = monster.getId();
                const hitbox = monsterHitboxes.get(monsterId);
                
                if (hitbox && hitbox.active) {
                    // 設置怪物碰撞箱的自定義數據
                    hitbox.setData('monsterId', monsterId);
                    
                    // 檢查碰撞
                    const collided = this.checkPhysicalCollision(
                        projectileSprite, 
                        hitbox,
                        (projId, monId) => {
                            const proj = this.projectileManager?.getProjectile(projId);
                            const mon = monsters.find(m => m.getId() === monId);
                            
                            if (proj && mon) {
                                hasCollision = true;
                                this.handleProjectileMonsterCollision(proj, mon);
                            }
                        }
                    );
                    
                    if (collided) {
                        console.log(`[ProjectileCollisionHandler] 投射物 ${projectileId} 與怪物 ${monsterId} 發生碰撞`);
                    }
                }
            }
            
            // 如果投射物沒有與任何怪物發生碰撞，清除其碰撞記錄
            if (!hasCollision) {
                this.clearCollisionRecord(projectileId);
            }
        }
    }
    
    /**
     * 啟用碰撞處理器
     */
    public enable(): void {
        this.active = true;
        console.log('[ProjectileCollisionHandler] 碰撞處理器已啟用');
    }
    
    /**
     * 禁用碰撞處理器
     */
    public disable(): void {
        this.active = false;
        this.clearAllCollisionRecords();
        console.log('[ProjectileCollisionHandler] 碰撞處理器已禁用');
    }
}
