import { EntityType } from './entitySearchSystem';
import { Stats } from '../stats';

/**
 * 實體接口
 * 定義基本的實體操作
 */
export interface EntityObject {
    getId(): string;
    getInstanceId?(): string;  // 可選的實例ID方法
    getPosition(): { x: number, y: number };
    getStats(): Stats;
}

/**
 * 實體管理器
 * 提供集中式的實體管理，方便通過ID查找實體
 */
export class EntityManager {
    private static instance: EntityManager;
    private entities: Map<string, any> = new Map();
    private playerEntity: any = null;
    private gameScene: Phaser.Scene | null = null;

    /**
     * 單例模式獲取實例
     */
    public static getInstance(): EntityManager {
        if (!EntityManager.instance) {
            EntityManager.instance = new EntityManager();
        }
        return EntityManager.instance;
    }

    /**
     * 初始化實體管理器
     * @param gameScene Phaser遊戲場景
     */
    public initialize(gameScene: Phaser.Scene): void {
        this.gameScene = gameScene;
        console.log('EntityManager已初始化');
    }

    /**
     * 註冊實體
     * @param entity 要註冊的實體
     */
    public registerEntity(entity: any): void {
        try {
            const id = this.getEntityId(entity);
            if (!id) {
                console.warn('無法註冊實體: 缺少有效ID');
                return;
            }
            
            // 添加詳細的註冊日誌
            console.log(`正在註冊實體，ID: ${id}，類型: ${entity.constructor ? entity.constructor.name : '未知'}`);
            
            // 檢查實體是否有 getId 方法
            const hasGetId = entity.getId && typeof entity.getId === 'function';
            if (hasGetId) {
                console.log(`實體 ${id} 有 getId 方法，返回值: ${entity.getId()}`);
            } else {
                console.warn(`實體 ${id} 沒有 getId 方法`);
            }
            
            this.entities.set(id, entity);
            
            // 如果這是玩家實體，額外保存一個引用
            if (this.isPlayerEntity(entity)) {
                this.playerEntity = entity;
                console.log('已註冊玩家實體，ID:', id);
            }
            
            console.log(`實體註冊完成，當前註冊實體總數: ${this.entities.size}`);
        } catch (error) {
            console.error('註冊實體時發生錯誤:', error);
        }
    }

    /**
     * 註銷實體
     * @param entityId 要註銷的實體ID
     */
    public unregisterEntity(entityId: string): void {
        const entity = this.entities.get(entityId);
        if (entity) {
            // 如果是玩家實體，清除引用
            if (entity === this.playerEntity) {
                this.playerEntity = null;
            }
            
            this.entities.delete(entityId);
        }
    }

    /**
     * 根據ID獲取實體
     * @param entityId 實體ID
     * @returns 實體對象或undefined
     */
    public getEntityById(entityId: string): any | undefined {
        const entity = this.entities.get(entityId);
        
        if (!entity) {
            console.warn(`查找實體失敗: ${entityId}，當前已註冊的實體 IDs: ${Array.from(this.entities.keys()).join(', ')}`);
            
            // 嘗試搜索所有實體，查看是否存在實例ID匹配的情況
            for (const [key, value] of this.entities.entries()) {
                if (value.getInstanceId && typeof value.getInstanceId === 'function') {
                    const instanceId = value.getInstanceId();
                    if (instanceId && instanceId.includes(entityId)) {
                        console.log(`找到可能匹配的實體: ${key} (instanceId: ${instanceId}) 匹配查詢 ${entityId}`);
                    }
                }
            }
        } else {
            console.log(`已找到實體: ${entityId}`);
        }
        
        return entity;
    }

    /**
     * 獲取當前註冊的玩家實體
     */
    public getPlayer(): any | null {
        return this.playerEntity;
    }

    /**
     * 獲取所有註冊的實體
     */
    public getAllEntities(): any[] {
        return Array.from(this.entities.values());
    }

    /**
     * 獲取指定類型的實體
     * @param type 實體類型
     */
    public getEntitiesByType(type: EntityType): any[] {
        return Array.from(this.entities.values()).filter(entity => {
            const entityType = this.getEntityType(entity);
            return entityType === type || type === EntityType.ANY;
        });
    }

    /**
     * 從場景中查找和註冊所有實體
     * 這個方法可以在場景載入後調用，以初始化實體列表
     */
    public scanAndRegisterEntities(): void {
        if (!this.gameScene) {
            console.error('無法掃描實體: 遊戲場景未初始化');
            return;
        }

        // 清空現有實體
        this.entities.clear();
        this.playerEntity = null;        // 掃描場景中的所有物件群組
        const groups = ['players', 'monsters', 'npcs', 'projectiles'];
        
        for (const groupName of groups) {
            const gameObject = this.gameScene.children.getByName(groupName);
            
            if (gameObject && 'getChildren' in gameObject) {
                const group = gameObject as unknown as Phaser.GameObjects.Group;
                const entities = group.getChildren();
                
                for (const entity of entities) {
                    this.registerEntity(entity);
                }
                
                console.log(`已從 ${groupName} 群組註冊 ${entities.length} 個實體`);
            }
        }
        
        console.log(`掃描完成，總共註冊了 ${this.entities.size} 個實體`);
    }

    /**
     * 銷毀所有實體數據
     */
    public clearAllEntities(): void {
        this.entities.clear();
        this.playerEntity = null;
        console.log('已清空所有實體數據');
    }

    // ======= 輔助方法 =======

    /**
     * 獲取實體ID
     */    private getEntityId(entity: any): string {
        try {
            // 優先使用 getInstanceId 方法
            if (entity.getInstanceId && typeof entity.getInstanceId === 'function') {
                const instanceId = entity.getInstanceId();
                if (instanceId) {
                    return instanceId.toString();
                }
            }
            
            // 其次嘗試使用 getId 方法
            if (entity.getId && typeof entity.getId === 'function') {
                return entity.getId().toString();
            }
            
            // 接著嘗試使用 id 屬性
            if (entity.id !== undefined) {
                return entity.id.toString();
            }
            
            // 最後嘗試使用 name 屬性
            if (entity.name !== undefined) {
                return entity.name.toString();
            }
        } catch (error) {
            console.error('獲取實體ID時發生錯誤:', error);
        }
        
        return '';
    }

    /**
     * 判斷是否為玩家實體
     */
    private isPlayerEntity(entity: any): boolean {
        // 根據實體類型判斷
        if (entity.type === 'player' || 
            (entity.constructor && entity.constructor.name.toLowerCase().includes('player'))) {
            return true;
        }
        
        // 檢查是否為唯一玩家
        if (entity.isPlayer === true) {
            return true;
        }
        
        return false;
    }

    /**
     * 獲取實體類型
     */
    private getEntityType(entity: any): EntityType {
        // 檢查不同可能的類型屬性
        if (entity.type) {
            switch (entity.type.toLowerCase()) {
                case 'player': return EntityType.PLAYER;
                case 'monster': return EntityType.MONSTER;
                case 'npc': return EntityType.NPC;
                case 'projectile': return EntityType.PROJECTILE;
            }
        }
        
        // 根據實例類型判斷
        if (entity.constructor) {
            const name = entity.constructor.name.toLowerCase();
            if (name.includes('player')) return EntityType.PLAYER;
            if (name.includes('monster')) return EntityType.MONSTER;
            if (name.includes('npc')) return EntityType.NPC;
            if (name.includes('projectile')) return EntityType.PROJECTILE;
        }
        
        return EntityType.ANY;
    }
      /**
     * 清理實體管理器資源
     */
    public destroy(): void {
        // 清理所有實體
        this.entities.clear();
        this.playerEntity = null;
        this.gameScene = null;
        
        // 通知任何可能的監聽器
        const event = new CustomEvent('entityManagerDestroyed');
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(event);
        }
        
        console.log('EntityManager 資源已清理');
    }
}
