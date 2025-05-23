import {
    SkillProjectileData,
    SkillDamageType,
    SkillProjectileCategory,
    CollisionBoxType,
    EntitySearchFilter
} from './types';
import { ProjectileBehavior } from './projectile/projectileBehavior';
import { ProjectileMovementBehavior } from './projectile/projectileBehavior';
import { DestructionConditionBehavior } from './projectile/destructionConditions';

/**
 * 技能投射物類
 * 代表一個技能釋放時產生的實際效果物件
 */
export class SkillProjectile {    
    private id: string;                     // 唯一識別碼
    private name: string;                   // 名稱描述
    private animationType: string;          // 動畫類型
    private category: SkillProjectileCategory; // 技能類別
    private damageType: SkillDamageType;    // 傷害類型
    private spriteScale: number;            // 精靈大小比例
    private sourceEntityId?: string;        // 傷害來源ID
    private sourceEntity?: any;             // 傷害來源實體的引用
    private spritePath: string;             // 精靈圖路徑
    
    // 架構核心屬性
    public position: { x: number, y: number } = { x: 0, y: 0 }; // 公開位置供行為使用
    private collisionShape: { type: CollisionBoxType, width?: number, height?: number, radius?: number } | null = null; // 碰撞形狀定義
    private behaviors: ProjectileBehavior[] = [];               // 行為列表
    private movementBehavior: ProjectileMovementBehavior | null = null; // 移動行為
    private destructionCondition: DestructionConditionBehavior | null = null; // 銷毀條件
    private searchFilter: EntitySearchFilter | null = null; // 搜索過濾器
    
    // 命中目標相關
    private hitTargets: Set<string> = new Set(); // 已命中的目標ID
    private hitCount: number = 0;    // 命中次數計數器
    // 實例狀態
    private createdTime: number;            // 創建時間
    private lifeTime: number = 0;           // 已存在時間
    private markedForDestruction: boolean = false; // 是否標記為待銷毀
    private attributes: Record<string, any>; // 額外屬性

    /**
     * 建構子
     * @param data 技能投射物資料
     * @param uniqueSuffix 同類型投射物的唯一後綴 (可選)
     */
    constructor(data: SkillProjectileData, uniqueSuffix?: string) {
        this.id = uniqueSuffix ? `${data.id}_${uniqueSuffix}` : data.id;
        this.name = data.name;
        this.animationType = data.animationType;
        this.category = data.category;
        this.spriteScale = data.spriteScale || 1.0;
        this.sourceEntityId = data.sourceEntityId;
        this.spritePath = data.spritePath || 'projectile_placeholder'; // 使用提供的路徑或默認路徑
        
        // 設置默認值
        this.damageType = data.damageType || SkillDamageType.PHYSICAL;
        this.attributes = data.attributes ? { ...data.attributes } : {};
        
        // 設置初始位置 (如有)
        if (data.position) {
            this.position = { ...data.position };
        }
        
        // 設置碰撞形狀 (如有)
        if (data.collisionType === CollisionBoxType.CIRCLE && data.radius) {
            this.collisionShape = {
                type: CollisionBoxType.CIRCLE,
                radius: data.radius
            };
        } else if (data.collisionType === CollisionBoxType.RECTANGLE && data.width && data.height) {
            this.collisionShape = {
                type: CollisionBoxType.RECTANGLE,
                width: data.width,
                height: data.height
            };
        }
        
        // 設置移動行為 (如有)
        if (data.movementBehavior) {
            this.movementBehavior = data.movementBehavior;
        }
        
        // 添加行為 (如有)
        if (data.behaviors && data.behaviors.length > 0) {
            this.behaviors = [...data.behaviors];
        }

        // 設置銷毀條件 (如有)
        if (data.destructionCondition) {
            this.destructionCondition = data.destructionCondition;
        }

        // 設置搜索過濾器 (如有)
        if (data.searchFilter) {
            this.searchFilter = data.searchFilter;
        }
        
        this.createdTime = Date.now();
    }
    
    /**
     * 獲取技能投射物ID
     */
    public getId(): string {
        return this.id;
    }
    
    /**
     * 獲取技能投射物名稱
     */
    public getName(): string {
        return this.name;
    }
    
    /**
     * 獲取動畫類型
     */
    public getAnimationType(): string {
        return this.animationType;
    }
    
    /**
     * 獲取技能傷害類型
     */
    public getDamageType(): SkillDamageType {
        return this.damageType;
    }
    
    /**
     * 獲取技能類別
     */
    public getCategory(): SkillProjectileCategory {
        return this.category;
    }
    
    /**
     * 獲取精靈縮放比例
     */
    public getSpriteScale(): number {
        return this.spriteScale;
    }

    /**
     * 獲取投射物精靈圖路徑
     * @returns 精靈圖的資源鍵值
     */
    public getSpritePath(): string {
        return this.spritePath;
    }
    
    /**
     * 記錄命中目標
     * @param targetId 目標ID
     * @returns 是否成功記錄（如果已經命中過會返回false）
     */
    public recordHitTarget(targetId: string): boolean {
        if (this.hitTargets.has(targetId)) {
            return false;
        }
        
        this.hitTargets.add(targetId);
        
        // 記錄最後命中事件的時間戳，用於穿透檢測
        const lastHitEvent = Date.now().toString();
        this.setAttribute('lastHitEvent', lastHitEvent);
        
        return true;
    }
    
    /**
     * 獲取已命中的目標ID集合
     */
    public getHitTargets(): Set<string> {
        return this.hitTargets;
    }
    
    /**
     * 檢查目標是否已被命中
     * @param target 檢查的目標
     */
    public hasHitTarget(target: any): boolean {
        const targetId = target.getId ? target.getId() : target.id;
        return targetId ? this.hitTargets.has(targetId) : false;
    }
    
    /**
     * 獲取特定額外屬性
     * @param key 屬性鍵值
     */
    public getAttribute(key: string): any {
        return this.attributes[key];
    }
    
    /**
     * 設置特定額外屬性
     * @param key 屬性鍵值
     * @param value 屬性值
     */
    public setAttribute(key: string, value: any): void {
        this.attributes[key] = value;
    }

    /**
     * 獲取搜索過濾器
     * @returns 搜索過濾器或 null
     */
    public getSearchFilter(): EntitySearchFilter | null {
        return this.searchFilter;
    }
    
    /**
     * 設置搜索過濾器
     * @param filter 實體搜索過濾器
     */
    public setSearchFilter(filter: EntitySearchFilter): void {
        this.searchFilter = filter;
        console.log(`[SkillProjectile ${this.id}] 設置搜索過濾器:`, filter);
    }
      /**
     * 獲取傷害來源ID
     */
    public getSourceEntityId(): string | undefined {
        return this.sourceEntityId;
    }
    
    /**
     * 設置傷害來源ID
     * @param entityId 源實體ID
     */
    public setSourceEntityId(entityId: string): void {
        this.sourceEntityId = entityId;
        console.log(`[SkillProjectile ${this.id}] 設置傷害來源ID: ${entityId}`);
    }
    
    /**
     * 設置源實體
     */
    public setSourceEntity(entity: any): void {
        this.sourceEntity = entity;
        if (entity) {
            // 同時更新sourceEntityId以保持一致
            if (entity.getId && typeof entity.getId === 'function') {
                this.sourceEntityId = entity.getId();
            } else if (entity.id !== undefined) {
                this.sourceEntityId = entity.id.toString();
            }
        }
    }
    
    /**
     * 獲取源實體
     */
    public getSourceEntity(): any | undefined {
        return this.sourceEntity;
    }
    
    /**
     * 獲取施放者（源實體）狀態數據的深複製
     * @returns 施放者狀態的複製版本或 null（如果無法獲取或複製）
     */
    public getSourceEntityStatsCopy(): any | null {
        let casterStats = null;
        const sourceEntity = this.getSourceEntity();
        
        // 嘗試獲取源實體的狀態數據
        if (sourceEntity) {
            if (sourceEntity.getStats && typeof sourceEntity.getStats === 'function') {
                casterStats = sourceEntity.getStats();
            } else if (sourceEntity.stats) {
                casterStats = sourceEntity.stats;
            }
        }
        
        // 如果找到了狀態數據，進行深複製
        if (casterStats) {
            try {
                return JSON.parse(JSON.stringify(casterStats));
            } catch (err) {
                console.warn(`[SkillProjectile ${this.id}] 無法複製施放者狀態數據:`, err);
                // 如果無法深複製，則使用原始引用（不推薦，但作為備選）
                return casterStats;
            }
        }
        
        return null;
    }
    
    /**
     * 獲取創建時間
     */
    public getCreatedTime(): number {
        return this.createdTime;
    }
    
    /**
     * 獲取已存在時間（毫秒）
     */
    public getLifeTime(): number {
        return this.lifeTime;
    }
    
    /**
     * 更新技能投射物
     * @param deltaTime 過去的時間（毫秒）
     */
    public update(deltaTime: number): void {
        // 如果已經標記為待銷毀，不再進行更新
        if (this.markedForDestruction) {
            return;
        }

        this.lifeTime += deltaTime;
        
        // 更新位置
        if (this.movementBehavior) {
            this.position = this.movementBehavior.updatePosition(this, this.position, deltaTime);
        }
        
        // 執行所有行為的更新
        for (const behavior of this.behaviors) {
            behavior.update(this, deltaTime);
        }
        
        // 檢查銷毀條件
        if (this.destructionCondition) {
            try {
                const shouldDestroy = this.destructionCondition.shouldDestroy(this, deltaTime);
                if (shouldDestroy) {
                    console.log(`[SkillProjectile] ${this.id} 滿足銷毀條件，將被銷毀`);
                    this.markForDestruction();
                }
            } catch (error) {
                console.error(`[SkillProjectile] 檢查銷毀條件時發生錯誤:`, error);
            }
        }
    }      /**
     * 處理碰撞進入
     * @param target 碰撞目標
     */
    public onHitEnter(target: any): void {
        console.log(`[SkillProjectile] onHitEnter 被呼叫！檢查目標...`, target);
        
        // 檢查目標物件結構
        console.log(`[SkillProjectile] 目標物件檢查 - 類型: ${typeof target}, 有getId方法: ${!!target.getId}, 有id屬性: ${target.id !== undefined}`);
        
        const targetId = target.getId ? target.getId() : target.id;
        console.log(`[SkillProjectile] 目標ID: ${targetId}`);
        
        if (targetId && !this.hitTargets.has(targetId)) {
            console.log(`[SkillProjectile] ${this.id} 命中新目標 ${targetId}, 添加到命中列表`);
            this.hitTargets.add(targetId);
            this.incrementHitCount();
            
            console.log(`[SkillProjectile] ${this.id} 開始命中目標 ${targetId}`);
            console.log(`[SkillProjectile] 行為數量: ${this.behaviors.length}`);
            
            for (const behavior of this.behaviors) {
                console.log(`[SkillProjectile] 處理行為: ${behavior.constructor.name}, 有onHitEnter: ${!!behavior.onHitEnter}`);
                if (behavior.onHitEnter) {
                    console.log(`[SkillProjectile] 呼叫行為的onHitEnter`);
                    behavior.onHitEnter(this, target);
                }
            }
            
            console.log(`[SkillProjectile] ${this.id} 完成處理命中事件`);
        } else if (targetId) {
            console.log(`[SkillProjectile] ${this.id} 重複命中目標 ${targetId} (已忽略)`);
        } else {
            console.warn(`[SkillProjectile] ${this.id} 命中無效目標 (無ID)`);
        }
    }
    
    /**
     * 處理碰撞持續
     * @param target 碰撞目標
     */
    public onHitStay(target: any): void {
        for (const behavior of this.behaviors) {
            behavior.onHitStay(this, target);
        }
    }
    
    /**
     * 處理碰撞離開
     * @param target 碰撞目標
     */
    public onHitExit(target: any): void {
        for (const behavior of this.behaviors) {
            behavior.onHitExit(this, target);
        }
    }
    
    /**
     * 獲取碰撞形狀定義
     * @returns 碰撞形狀定義或 null
     */
    public getCollisionShape(): { type: CollisionBoxType, width?: number, height?: number, radius?: number } | null {
        return this.collisionShape;
    }
    
    /**
     * 添加行為
     */
    public addBehavior(behavior: ProjectileBehavior): void {
        this.behaviors.push(behavior);
        behavior.onStart(this);
    }
    
    /**
     * 設置移動行為
     */
    public setMovementBehavior(movementBehavior: ProjectileMovementBehavior): void {
        this.movementBehavior = movementBehavior;
    }
    
    /**
     * 獲取所有行為
     */
    public getBehaviors(): ProjectileBehavior[] {
        return [...this.behaviors];
    }
    
    /**
     * 獲取移動行為
     */
    public getMovementBehavior(): ProjectileMovementBehavior | null {
        return this.movementBehavior;
    }
    
    /**
     * 設置銷毀條件
     */
    public setDestructionCondition(condition: DestructionConditionBehavior): void {
        this.destructionCondition = condition;
        console.log(`[SkillProjectile] 設置銷毀條件 - ID: ${this.id}`);
    }

    /**
     * 獲取銷毀條件
     */
    public getDestructionCondition(): DestructionConditionBehavior | null {
        return this.destructionCondition;
    }

    /**
     * 檢查是否應該被銷毀
     * 這個方法僅由 ProjectileManager 調用
     */
    public shouldDestroy(deltaTime: number): boolean {
        if (this.markedForDestruction) {
            return true;
        }
        
        // 檢查銷毀條件
        if (this.destructionCondition) {
            try {
                const shouldDestroy = this.destructionCondition.shouldDestroy(this, deltaTime);
                if (shouldDestroy) {
                    console.log(`[SkillProjectile] ${this.id} 滿足銷毀條件，將被銷毀`);
                    this.markForDestruction();
                    return true;
                }
            } catch (error) {
                console.error(`[SkillProjectile] ${this.id} 檢查銷毀條件時發生錯誤:`, error);
            }
        }
        
        return false;
    }
    
    /**
     * 標記投射物為待銷毀並通知相關系統
     * 這是唯一的銷毀入口點
     */
    public markForDestruction(): void {
        if (this.markedForDestruction) {
            return; // 已經標記過,避免重複處理
        }

        console.log(`[SkillProjectile] ${this.id} 被標記為待銷毀`);
        
        // 通知所有行為
        for (const behavior of this.behaviors) {
            behavior.onDestroy(this);
        }
        
        this.markedForDestruction = true;
    }
    
    /**
     * 檢查投射物是否已被標記為待銷毀
     */
    public isMarkedForDestruction(): boolean {
        return this.markedForDestruction;
    }

    /**
     * 獲取命中次數
     */
    public getHitCount(): number {
        return this.hitCount;
    }

    /**
     * 增加命中次數
     */
    private incrementHitCount(): void {
        this.hitCount++;
    }
}
