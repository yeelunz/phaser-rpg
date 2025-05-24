import { SkillDamageType } from '../skills/types';

/**
 * 搜索範圍形狀
 */
export enum SearchAreaShape {
    CIRCLE = 'circle',       // 圓形範圍
    RECTANGLE = 'rectangle', // 矩形範圍
    SECTOR = 'sector',       // 扇形範圍
    GLOBAL = 'global'        // 全局範圍
}

/**
 * 圓形搜索區域定義
 */
export interface CircleSearchArea {
    type: SearchAreaShape.CIRCLE;
    radius: number;
}

/**
 * 矩形搜索區域定義
 */
export interface RectangleSearchArea {
    type: SearchAreaShape.RECTANGLE;
    width: number;
    height: number;
    angle?: number; // 相對於實體朝向的角度 (度)，0 表示與實體朝向一致
}

/**
 * 扇形搜索區域定義
 */
export interface SectorSearchArea {
    type: SearchAreaShape.SECTOR;
    radius: number;
    startAngle: number; // 相對於實體朝向的開始角度 (度)
    endAngle: number;   // 相對於實體朝向的結束角度 (度)
}



/**
 * 搜索區域定義的聯合類型
 */
export type SearchAreaDefinition = CircleSearchArea | RectangleSearchArea | SectorSearchArea | LineSearchArea;

/**
 * 實體類型
 */
export enum EntityType {
    PLAYER = 'player',       // 玩家
    MONSTER = 'monster',     // 怪物
    NPC = 'npc',             // NPC
    PROJECTILE = 'projectile', // 投射物
    ANY = 'any'              // 任何類型
}

/**
 * 排序方式
 */
export enum SortMethod {
    NEAREST = 'nearest',     // 距離最近
    FARTHEST = 'farthest',   // 距離最遠
    MOST_HP = 'most_hp',     // 血量最多
    LEAST_HP = 'least_hp',   // 血量最少
    RANDOM = 'random'        // 隨機排序
}

/**
 * 目標過濾條件
 */
export interface EntitySearchFilter {
    entityTypes?: EntityType[];       // 實體類型
    excludeIds?: string[];            // 排除的實體ID
    requireIds?: string[];            // 必須包含的實體ID
    teamId?: number;                  // 隊伍ID
    isEnemy?: boolean;                // 是否是敵人
    isAlly?: boolean;                 // 是否是友方
    minHealth?: number;               // 最小血量百分比
    maxHealth?: number;               // 最大血量百分比
    withStatusEffect?: string[];      // 帶有的狀態效果
    withoutStatusEffect?: string[];   // 不帶有的狀態效果
    resistantTo?: SkillDamageType;    // 抗性
    area?: SearchAreaDefinition;      // <--- 將 area 的類型修改為 SearchAreaDefinition | undefined
    custom?: (entity: any) => boolean; // 自定義過濾函數
}

/**
 * 搜索結果選擇器
 */
export interface EntityResultSelector {
    sort?: SortMethod;             // 排序方式
    limit?: number;                // 限制結果數量
    random?: boolean;              // 是否隨機選擇
    randomCount?: number;          // 隨機選擇的數量
}

/**
 * 位置接口
 */
export interface Position {
    x: number;
    y: number;
}

/**
 * 實體搜索系統
 * 提供強大的實體搜索功能
 */
export class EntitySearchSystem {
    private static instance: EntitySearchSystem;
    private gameScene: Phaser.Scene | null = null;

    /**
     * 單例模式獲取實例
     */
    public static getInstance(): EntitySearchSystem {
        if (!EntitySearchSystem.instance) {
            EntitySearchSystem.instance = new EntitySearchSystem();
        }
        return EntitySearchSystem.instance;
    }

    /**
     * 初始化系統
     * @param gameScene Phaser遊戲場景
     */
    public initialize(gameScene: Phaser.Scene): void {
        this.gameScene = gameScene;
    }

    /**
     * 在圓形範圍內搜索實體
     * @param position 圓心位置
     * @param radius 半徑
     * @param filter 過濾條件
     * @param selector 結果選擇器
     * @returns 符合條件的實體列表
     */
    public searchInCircle(
        position: Position,
        radius: number,
        filter?: EntitySearchFilter,
        selector?: EntityResultSelector
    ): any[] {
        console.log(`[EntitySearchSystem] 開始圓形搜索 - 位置:(${position.x}, ${position.y}), 半徑:${radius}`);

        // 取得所有實體
        const allEntities = this.getAllEntities();
        
        // 過濾在範圍內的實體
        const inRangeEntities = allEntities.filter(entity => {
            if (!entity) return false;

            const entityPos = this.getEntityPosition(entity);
            if (!entityPos) return false;

            // 獲取實體的物理邊界
            let entityBounds = {
                width: 0,
                height: 0
            };

            if (entity.body) {
                // 使用物理體的尺寸
                entityBounds.width = entity.body.width;
                entityBounds.height = entity.body.height;
            } else if (entity.width && entity.height) {
                // 使用實體本身的尺寸
                entityBounds.width = entity.width;
                entityBounds.height = entity.height;
            } else if (entity.displayWidth && entity.displayHeight) {
                // 使用顯示尺寸
                entityBounds.width = entity.displayWidth;
                entityBounds.height = entity.displayHeight;
            }
            
            // 如果實體的邊界框的任何部分與圓形相交,則視為在範圍內
            const halfWidth = entityBounds.width / 2;
            const halfHeight = entityBounds.height / 2;
            
            // 找出實體邊界框最近的點到圓心的距離
            const closestX = Math.max(entityPos.x - halfWidth, Math.min(position.x, entityPos.x + halfWidth));
            const closestY = Math.max(entityPos.y - halfHeight, Math.min(position.y, entityPos.y + halfHeight));
            
            // 計算最近點到圓心的距離
            const distanceSquared = Math.pow(position.x - closestX, 2) + Math.pow(position.y - closestY, 2);
            const inRange = distanceSquared <= (radius * radius);

            if (inRange) {
                console.log(`[EntitySearchSystem] 實體在範圍內 - 位置:(${entityPos.x}, ${entityPos.y}), 距離平方:${distanceSquared}`);
            }

            return inRange;
        });

        const filteredEntities = this.applyFilter(inRangeEntities, filter);
        return this.selectResults(filteredEntities, position, selector);
    }    /**
     * 在矩形範圍內搜索實體
     * @param position 矩形中心位置
     * @param width 寬度
     * @param height 高度
     * @param rotation 旋轉角度（弧度）
     * @param filter 過濾條件
     * @param selector 結果選擇器
     * @returns 符合條件的實體列表
     */
    public searchInRectangle(
        position: Position,
        width: number,
        height: number,
        rotation: number = 0,
        filter?: EntitySearchFilter,
        selector?: EntityResultSelector
    ): any[] {
        console.log(`[EntitySearchSystem] 開始矩形搜索 - 位置:(${position.x}, ${position.y}), 寬度:${width}, 高度:${height}, 旋轉:${rotation}弧度`);
        
        const allEntities = this.getAllEntities();
        
        // 過濾在範圍內的實體 - 使用與圓形搜索相同的邏輯結構
        const inRangeEntities = allEntities.filter(entity => {
            if (!entity) return false;

            const entityPos = this.getEntityPosition(entity);
            if (!entityPos) return false;

            // 獲取實體的物理邊界 - 與圓形搜索使用完全相同的邏輯
            let entityBounds = {
                width: 0,
                height: 0
            };

            if (entity.body) {
                // 使用物理體的尺寸
                entityBounds.width = entity.body.width;
                entityBounds.height = entity.body.height;
            } else if (entity.width && entity.height) {
                // 使用實體本身的尺寸
                entityBounds.width = entity.width;
                entityBounds.height = entity.height;
            } else if (entity.displayWidth && entity.displayHeight) {
                // 使用顯示尺寸
                entityBounds.width = entity.displayWidth;
                entityBounds.height = entity.displayHeight;
            }
            
            // 如果實體的邊界框的任何部分與矩形相交,則視為在範圍內
            const halfWidth = entityBounds.width / 2;
            const halfHeight = entityBounds.height / 2;
            
            // 檢查實體邊界框與矩形是否相交
            const inRange = this.isEntityBoundsIntersectRectangle(
                entityPos, 
                halfWidth, 
                halfHeight, 
                position, 
                width / 2, 
                height / 2, 
                rotation
            );

            if (inRange) {
                console.log(`[EntitySearchSystem] 實體在矩形範圍內 - 位置:(${entityPos.x}, ${entityPos.y})`);
            }

            return inRange;
        });

        console.log(`[EntitySearchSystem] 矩形搜索找到 ${inRangeEntities.length} 個實體`);
        const filteredEntities = this.applyFilter(inRangeEntities, filter);
        return this.selectResults(filteredEntities, position, selector);
    }

    /**
     * 檢查實體邊界框是否與矩形相交
     * 這個方法實現了與圓形搜索一致的邊界框檢測邏輯，但使用矩形幾何
     */
    private isEntityBoundsIntersectRectangle(
        entityPos: Position,
        entityHalfWidth: number,
        entityHalfHeight: number,
        rectCenter: Position,
        rectHalfWidth: number,
        rectHalfHeight: number,
        rotation: number
    ): boolean {
        if (rotation === 0) {
            // 無旋轉情況：標準AABB檢測
            const entityLeft = entityPos.x - entityHalfWidth;
            const entityRight = entityPos.x + entityHalfWidth;
            const entityTop = entityPos.y - entityHalfHeight;
            const entityBottom = entityPos.y + entityHalfHeight;
            
            const rectLeft = rectCenter.x - rectHalfWidth;
            const rectRight = rectCenter.x + rectHalfWidth;
            const rectTop = rectCenter.y - rectHalfHeight;
            const rectBottom = rectCenter.y + rectHalfHeight;
            
            // 檢查兩個矩形是否相交
            return !(entityLeft > rectRight || 
                    entityRight < rectLeft || 
                    entityTop > rectBottom || 
                    entityBottom < rectTop);
        } else {
            // 有旋轉情況：使用分離軸定理(SAT)檢測
            return this.checkRotatedRectangleIntersection(
                entityPos, entityHalfWidth, entityHalfHeight,
                rectCenter, rectHalfWidth, rectHalfHeight, rotation
            );
        }
    }

    /**
     * 使用分離軸定理檢測旋轉矩形與實體邊界框的相交
     * 這確保了與圓形搜索相同的精確度和一致性
     */
    private checkRotatedRectangleIntersection(
        entityPos: Position,
        entityHalfWidth: number,
        entityHalfHeight: number,
        rectCenter: Position,
        rectHalfWidth: number,
        rectHalfHeight: number,
        rotation: number
    ): boolean {
        // 將實體邊界框的中心點轉換到旋轉矩形的局部座標系
        const dx = entityPos.x - rectCenter.x;
        const dy = entityPos.y - rectCenter.y;
        
        const cosA = Math.cos(-rotation);
        const sinA = Math.sin(-rotation);
        const rotatedCenterX = dx * cosA - dy * sinA;
        const rotatedCenterY = dx * sinA + dy * cosA;
        
        // 在旋轉矩形的局部座標系中進行AABB檢測
        // 這等同於檢查實體邊界框與旋轉後的矩形是否相交
        const distX = Math.abs(rotatedCenterX);
        const distY = Math.abs(rotatedCenterY);
        
        // 檢查是否相交：距離小於兩個矩形半寬/半高的和
        return (distX <= (rectHalfWidth + entityHalfWidth)) && 
               (distY <= (rectHalfHeight + entityHalfHeight));
    }

    /**
     * 在扇形範圍內搜索實體
     * @param position 扇形頂點位置
     * @param radius 半徑
     * @param startAngle 起始角度（度）
     * @param endAngle 結束角度（度）
     * @param filter 過濾條件
     * @param selector 結果選擇器
     * @returns 符合條件的實體列表
     */
    public searchInSector(
        position: Position,
        radius: number,
        startAngle: number,
        endAngle: number,
        filter?: EntitySearchFilter,
        selector?: EntityResultSelector
    ): any[] {
        const allEntities = this.getAllEntities();
        const inRangeEntities = allEntities.filter(entity => {
            const entityPos = this.getEntityPosition(entity);
            if (!entityPos) return false;

            const dx = entityPos.x - position.x;
            const dy = entityPos.y - position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > radius) return false;
            if (distance === 0) return true; // 實體在圓心，視為在扇形內

            let angle = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
            angle = (angle + 360) % 360; // 將角度標準化到 [0, 360)

            let normalizedStartAngle = (startAngle + 360) % 360;
            let normalizedEndAngle = (endAngle + 360) % 360;

            if (normalizedStartAngle <= normalizedEndAngle) {
                // 正常情況，例如 30度到60度
                return angle >= normalizedStartAngle && angle <= normalizedEndAngle;
            } else {
                // 跨越0度/360度的情況，例如 330度到30度
                return angle >= normalizedStartAngle || angle <= normalizedEndAngle;
            }
        });

        const filteredEntities = this.applyFilter(inRangeEntities, filter);
        return this.selectResults(filteredEntities, position, selector);
    }

    

    /**
     * 全局搜索實體
     * @param filter 過濾條件
     * @param selector 結果選擇器
     * @returns 符合條件的實體列表
     */
    public searchGlobal(
        filter?: EntitySearchFilter,
        selector?: EntityResultSelector
    ): any[] {
        const allEntities = this.getAllEntities();
        const filteredEntities = this.applyFilter(allEntities, filter);
        // 對於全局搜索，排序的參考原點可以設為 (0,0) 或其他邏輯中心
        const center = { x: 0, y: 0 };
        return this.selectResults(filteredEntities, center, selector);
    }

    /**
     * 通用搜索方法
     * @param shape 搜索範圍形狀
     * @param params 形狀參數
     * @param filter 過濾條件
     * @param selector 結果選擇器
     * @returns 符合條件的實體列表
     */
    public search(
        shape: SearchAreaShape,
        params: any,
        filter?: EntitySearchFilter,
        selector?: EntityResultSelector
    ): any[] {
        switch (shape) {
            case SearchAreaShape.CIRCLE:
                return this.searchInCircle(
                    params.position,
                    params.radius,
                    filter,
                    selector
                );
            case SearchAreaShape.RECTANGLE:
                return this.searchInRectangle(
                    params.position,
                    params.width,
                    params.height,
                    params.rotation || 0,
                    filter,
                    selector
                );
            case SearchAreaShape.SECTOR:
                return this.searchInSector(
                    params.position,
                    params.radius,
                    params.startAngle,
                    params.endAngle,
                    filter,
                    selector
                );
            case SearchAreaShape.GLOBAL:
                return this.searchGlobal(filter, selector);
            default:
                console.error(`不支持的搜索形狀: ${shape}`);
                return [];
        }
    }

    /**
     * 獲取最接近目標位置的實體
     * @param position 參考位置
     * @param filter 過濾條件
     * @returns 最接近的實體或null
     */
    public getNearestEntity(position: Position, filter?: EntitySearchFilter): any | null {
        const entities = this.searchGlobal(filter, {
            sort: SortMethod.NEAREST,
            limit: 1
        });
        return entities.length > 0 ? entities[0] : null;
    }

    /**
     * 獲取可以進行彈射的下一個目標
     * @param currentPosition 當前位置
     * @param bounceHistory 已彈射過的目標ID列表
     * @param maxDistance 最大搜索距離
     * @param filter 額外的過濾條件
     * @returns 下一個彈射目標或null
     */
    public getNextBounceTarget(
        currentPosition: Position,
        bounceHistory: string[],
        maxDistance: number,
        filter?: EntitySearchFilter
    ): any | null {
        const bounceFilter: EntitySearchFilter = {
            ...filter,
            excludeIds: [...(filter?.excludeIds || []), ...bounceHistory]
        };

        const targets = this.searchInCircle(
            currentPosition,
            maxDistance,
            bounceFilter,
            { sort: SortMethod.NEAREST, limit: 1 }
        );
        return targets.length > 0 ? targets[0] : null;
    }

    /**
     * 獲取所有實體 (需要根據遊戲具體實現調整)
     */
    private getAllEntities(): any[] {
        if (!this.gameScene) return [];
        let entities: any[] = [];

        // 首先嘗試從標準群組中獲取實體
        const playerGroup = this.gameScene.children.getByName('playerGroup');
        const monsterGroup = this.gameScene.children.getByName('monsterGroup');
        const npcGroup = this.gameScene.children.getByName('npcGroup');
        const projectileGroup = this.gameScene.children.getByName('projectileGroup');

        // 另外嘗試從碰撞系統獲取實體
        const physicsMonsters = this.gameScene.physics?.world?.bodies?.entries
            ?.filter(body =>
                body.gameObject &&
                (body.gameObject.getData?.('isMonster') ||
                    body.gameObject.getData?.('monsterInstance') ||
                    body.gameObject.type === EntityType.MONSTER)
            )
            .map(body => body.gameObject) || [];

        if (physicsMonsters.length > 0) {
            console.log(`[EntitySearchSystem] 從物理世界找到 ${physicsMonsters.length} 個怪物實體`);
            entities = entities.concat(physicsMonsters);
        }

        // 處理標準群組
        if (playerGroup instanceof Phaser.GameObjects.Group) {
            entities = entities.concat(playerGroup.getChildren());
            console.log(`[EntitySearchSystem] 從 playerGroup 找到 ${playerGroup.getChildren().length} 個玩家實體`);
        }
        if (monsterGroup instanceof Phaser.GameObjects.Group) {
            const monsterEntities = monsterGroup.getChildren();
            entities = entities.concat(monsterEntities);
            console.log(`[EntitySearchSystem] 從 monsterGroup 找到 ${monsterEntities.length} 個怪物實體`);
        }
        if (npcGroup instanceof Phaser.GameObjects.Group) {
            entities = entities.concat(npcGroup.getChildren());
        }
        if (projectileGroup instanceof Phaser.GameObjects.Group) {
            entities = entities.concat(projectileGroup.getChildren());
            console.log(`[EntitySearchSystem] 從 projectileGroup 找到 ${projectileGroup.getChildren().length} 個投射物實體`);
        }

        // 從場景中搜索所有遊戲對象，使用更多方法識別實體
        const allGameObjects = this.gameScene.children.list;
        for (const obj of allGameObjects) {
            let isEntity = false;

            // 檢查是否為具有特定數據或標記的遊戲對象
            try {
                if (obj.getData && typeof obj.getData === 'function' && (
                    obj.getData('isMonster') ||
                    obj.getData('monsterInstance') ||
                    obj.getData('isPlayer') ||
                    obj.getData('isNPC') ||
                    obj.getData('isProjectile')
                )) {
                    isEntity = true;
                }
            } catch (e) {
                // 忽略 getData 可能導致的錯誤
            }

            // 根據對象類型識別
            if (obj.type === 'Sprite' || obj.type === 'Container' || obj.type === 'Image') {
                // 檢查是否是怪物
                if (
                    (obj.id && typeof obj.id === 'string') ||
                    (obj.id && typeof obj.id === 'string' && obj.id.includes('monster')) ||
                    (obj.name && typeof obj.name === 'string' && (
                        obj.name.includes('monster') ||
                        obj.name.includes('guardian') ||
                        obj.name.includes('boss')
                    )) ||
                    obj.type === EntityType.MONSTER ||
                    (obj.category && (
                        obj.category === 'monster' ||
                        obj.category === 'elite' ||
                        obj.category === 'boss'
                    ))
                ) {
                    isEntity = true;
                    console.log(`[EntitySearchSystem] 通過實體特征識別怪物: ${obj.id || obj.name || 'unnamed'}`);
                }
            }

            // 檢查物理身體
            if (obj.body && (
                obj.body.label && typeof obj.body.label === 'string' &&
                (obj.body.label.includes('monster') || obj.body.label.includes('enemy'))
            )) {
                isEntity = true;
                console.log(`[EntitySearchSystem] 通過物理身體標籤識別怪物: ${obj.body.label}`);
            }

            if (isEntity && !entities.includes(obj)) {
                entities.push(obj);
            }
        }

        // 去重並過濾無效實體
        const uniqueEntities = Array.from(new Set(entities));
        const filteredEntities = uniqueEntities.filter(e => e && (e.active !== false)); // 確保實體是 active 的
        console.log(`[EntitySearchSystem] 總共找到 ${filteredEntities.length} 個活動實體`);
        return filteredEntities;
    }

    /**
     * 過濾實體
     */
    private applyFilter(entities: any[], filter?: EntitySearchFilter): any[] {
        if (!filter) return entities;

        console.log('[DEBUG] applyFilter - 輸入實體數量:', entities.length);
        console.log('[DEBUG] applyFilter - 過濾條件:', filter);

        return entities.filter(entity => {
            console.log('[DEBUG] 檢查實體:', {
                entityId: entity.entityId || entity.name || entity.id || 'unknown',
                hasGetData: typeof entity.getData === 'function',
                type: entity.type,
                isMonster: entity.isMonster,
                constructorName: entity.constructor?.name
            });

            if (filter.entityTypes && !filter.entityTypes.some(type => {
                const isType = this.isEntityType(entity, type);
                console.log(`[DEBUG] 檢查實體類型 ${type}:`, {
                    entityId: this.getEntityId(entity),
                    result: isType
                });
                return isType;
            })) {
                console.log('[DEBUG] 實體類型不符合，被過濾:', this.getEntityId(entity));
                return false;
            }
            
            if (filter.excludeIds && filter.excludeIds.includes(this.getEntityId(entity))) {
                return false;
            }
            if (filter.requireIds && !filter.requireIds.includes(this.getEntityId(entity))) {
                return false;
            }
            if (filter.teamId !== undefined && this.getEntityTeamId(entity) !== filter.teamId) {
                return false;
            }
            if (filter.minHealth !== undefined && this.getEntityHealthPercent(entity) < filter.minHealth) {
                return false;
            }
            if (filter.maxHealth !== undefined && this.getEntityHealthPercent(entity) > filter.maxHealth) {
                return false;
            }
            if (filter.withStatusEffect && !filter.withStatusEffect.every(eff => this.entityHasStatusEffect(entity, eff))) {
                return false;
            }
            if (filter.withoutStatusEffect && filter.withoutStatusEffect.some(eff => this.entityHasStatusEffect(entity, eff))) {
                return false;
            }
            if (filter.resistantTo && !this.isEntityResistantTo(entity, filter.resistantTo)) {
                return false;
            }
            if (filter.custom && !filter.custom(entity)) {
                console.log('[DEBUG] 自定義過濾器不通過:', this.getEntityId(entity));
                return false;
            }
            
            console.log('[DEBUG] 實體通過所有過濾條件:', this.getEntityId(entity));
            return true;
        });
    }

    /**
     * 排序和選擇結果
     */
    private selectResults(entities: any[], origin: Position, selector?: EntityResultSelector): any[] {
        if (!selector) return entities;

        let result = [...entities];

        if (selector.sort) {
            switch (selector.sort) {
                case SortMethod.NEAREST:
                    result.sort((a, b) => this.getDistance(origin, this.getEntityPosition(a)) - this.getDistance(origin, this.getEntityPosition(b)));
                    break;
                case SortMethod.FARTHEST:
                    result.sort((a, b) => this.getDistance(origin, this.getEntityPosition(b)) - this.getDistance(origin, this.getEntityPosition(a)));
                    break;
                case SortMethod.MOST_HP:
                    result.sort((a, b) => this.getEntityHealthPercent(b) - this.getEntityHealthPercent(a));
                    break;
                case SortMethod.LEAST_HP:
                    result.sort((a, b) => this.getEntityHealthPercent(a) - this.getEntityHealthPercent(b));
                    break;
                case SortMethod.RANDOM:
                    result.sort(() => Math.random() - 0.5);
                    break;
            }
        }

        if (selector.random && selector.randomCount && selector.randomCount > 0 && result.length > 0) {
            const shuffled = [...result].sort(() => 0.5 - Math.random()); // Create a new shuffled array
            result = shuffled.slice(0, Math.min(selector.randomCount, result.length));
        } else if (selector.limit && result.length > selector.limit) {
            result = result.slice(0, selector.limit);
        }

        return result;
    }

    /**
     * 獲取實體位置
     */
    public getEntityPosition(entity: any): Position {
        try {
            // 檢查是否為 Phaser Sprite 或 GameObject
            if (entity && 'x' in entity && 'y' in entity && typeof entity.x === 'number' && typeof entity.y === 'number') {
                // Phaser.GameObjects.Sprite is a good check, but `x` and `y` are often enough
                return { x: entity.x, y: entity.y };
            }

            // 檢查 monsterInstance 數據
            if (entity?.getData && typeof entity.getData === 'function') {
                const monsterInstance = entity.getData('monsterInstance');
                if (monsterInstance && 'x' in monsterInstance && 'y' in monsterInstance &&
                    typeof monsterInstance.x === 'number' && typeof monsterInstance.y === 'number') {
                    return { x: monsterInstance.x, y: monsterInstance.y };
                }
            }

            // 檢查 sprite 屬性
            if (entity?.sprite && 'x' in entity.sprite && 'y' in entity.sprite &&
                typeof entity.sprite.x === 'number' && typeof entity.sprite.y === 'number') {
                return { x: entity.sprite.x, y: entity.sprite.y };
            }

            // 檢查 getPosition 方法
            if (entity?.getPosition && typeof entity.getPosition === 'function') {
                const pos = entity.getPosition();
                if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
                    return pos;
                }
            }

            // 檢查 body 屬性 (用於 Arcade Physics)
            // Note: body.x/y might be top-left, center depends on body settings.
            // For consistency, prefer GameObject's x/y if available.
            if (entity?.body && 'x' in entity.body && 'y' in entity.body &&
                typeof entity.body.x === 'number' && typeof entity.body.y === 'number') {
                // This might be body's top-left, if it has a size, center might be (body.x + body.width/2, body.y + body.height/2)
                // or body.center.x, body.center.y if available and appropriate
                return { x: entity.body.center?.x ?? entity.body.x, y: entity.body.center?.y ?? entity.body.y };
            }
        } catch (error) {
            console.warn('[EntitySearchSystem] 獲取實體位置時發生錯誤:', entity, error);
        }

        console.warn('[EntitySearchSystem] 無法獲取實體位置, 返回 (0,0):', entity);
        return { x: 0, y: 0 }; // Default fallback
    }

    /**
     * 計算兩點間距離
     */
    private getDistance(pos1: Position, pos2: Position): number {
        if (!pos1 || !pos2) return Infinity; // Handle undefined positions gracefully
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }    /**
     * 計算點到線段的最短距離
     * @param p 點
     * @param a 線段端點A
     * @param b 線段端點B
     * @returns 點到線段的最短距離
     */
    private pointToLineSegmentDistance(p: Position, a: Position, b: Position): number {
        // 檢查所有位置參數的有效性
        if (!p || !a || !b || 
            typeof p.x !== 'number' || typeof p.y !== 'number' ||
            typeof a.x !== 'number' || typeof a.y !== 'number' ||
            typeof b.x !== 'number' || typeof b.y !== 'number') {
            console.warn('[EntitySearchSystem] pointToLineSegmentDistance: 無效的位置參數', { p, a, b });
            return Infinity;
        }

        const l2 = this.getDistance(a, b) ** 2;
        if (l2 === 0) return this.getDistance(p, a); // a 和 b 是同一個點

        // 考慮點 p 在線段 ab 上的投影
        // t = [(p-a) . (b-a)] / |b-a|^2
        let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
        t = Math.max(0, Math.min(1, t)); // 將 t 限制在 [0, 1] 範圍內，確保投影點在線段上

        const closestPoint = {
            x: a.x + t * (b.x - a.x),
            y: a.y + t * (b.y - a.y)
        };
        return this.getDistance(p, closestPoint);
    }

    /**
     * 獲取實體ID
     */
    private getEntityId(entity: any): string {
        if (entity && entity.id && typeof entity.id === 'string') {
            return entity.id;
        }
        if (entity && entity.getId && typeof entity.getId === 'function') {
            const id = entity.getId();
            if (typeof id === 'string') return id;
        }
        // Fallback to name or a generated unique symbol/string if needed
        return entity?.name || 'unknown_entity_id';
    }

    /**
     * 獲取實體隊伍ID
     */
    private getEntityTeamId(entity: any): number | undefined {
        if (entity && entity.teamId && typeof entity.teamId === 'number') {
            return entity.teamId;
        }
        if (entity && entity.stats && entity.stats.teamId && typeof entity.stats.teamId === 'number') {
            return entity.stats.teamId;
        }
        // Add other ways to get teamId if necessary
        return undefined;
    }

    /**
     * 判斷實體類型
     */
    private isEntityType(entity: any, type: EntityType): boolean {
        if (!entity) return false;
        if (type === EntityType.ANY) return true;        console.log('[DEBUG] isEntityType 檢查:', {
            entityId: this.getEntityId(entity),
            targetType: type,
            entityType: entity.type,
            rawEntityId: entity.id,
            entityName: entity.name,
            hasGetData: typeof entity.getData === 'function',
            isMonster: entity.isMonster,
            category: entity.category,
            constructorName: entity.constructor?.name
        });

        // 檢查實體本身和它的 gameObject 屬性 (常見於組件模式)
        const targetsToCheck = [entity, entity.gameObject].filter(e => e != null);

        for (const target of targetsToCheck) {
            console.log('[DEBUG] 檢查目標:', {
                targetType: type,
                target: {
                    type: target.type,
                    id: target.id,
                    name: target.name,
                    isMonster: target.isMonster,
                    category: target.category,
                    hasGetData: typeof target.getData === 'function',
                    getData_isMonster: target.getData ? target.getData('isMonster') : undefined,
                    getData_monsterInstance: target.getData ? target.getData('monsterInstance') : undefined
                }
            });

            switch (type) {
                case EntityType.MONSTER:
                    const isMonster = (
                        target.type === EntityType.MONSTER ||
                        target.type === 'monster' ||
                        (target.id && typeof target.id === 'string' && (
                            target.id.includes('monster') ||
                            target.id.includes('guardian') ||
                            target.id.includes('boss') ||
                            target.id.includes('enemy') // Common alias
                        )) ||
                        (target.name && typeof target.name === 'string' && (
                            target.name.toLowerCase().includes('monster') ||
                            target.name.toLowerCase().includes('guardian') ||
                            target.name.toLowerCase().includes('boss') ||
                            target.name.toLowerCase().includes('enemy')
                        )) ||
                        (target.getData && (
                            target.getData('isMonster') === true ||
                            target.getData('monsterInstance') != null
                        )) ||
                        target.isMonster === true ||
                        target.monsterInstance != null || // If monsterInstance is a property
                        (target.category && (
                            target.category === 'monster' ||
                            target.category === 'elite' ||
                            target.category === 'boss'
                        ))
                        // Add instanceof check if you have a Monster class:
                        // || target instanceof YourGameMonsterClass
                    );
                    
                    console.log('[DEBUG] 怪物類型檢查結果:', {
                        entityId: this.getEntityId(target),
                        isMonster: isMonster,
                        checks: {
                            typeEnum: target.type === EntityType.MONSTER,
                            typeString: target.type === 'monster',
                            idIncludes: target.id && typeof target.id === 'string' && (
                                target.id.includes('monster') ||
                                target.id.includes('guardian') ||
                                target.id.includes('boss') ||
                                target.id.includes('enemy')
                            ),
                            nameIncludes: target.name && typeof target.name === 'string' && (
                                target.name.toLowerCase().includes('monster') ||
                                target.name.toLowerCase().includes('guardian') ||
                                target.name.toLowerCase().includes('boss') ||
                                target.name.toLowerCase().includes('enemy')
                            ),
                            getDataIsMonster: target.getData ? target.getData('isMonster') === true : false,
                            getDataMonsterInstance: target.getData ? target.getData('monsterInstance') != null : false,
                            isMonsterProp: target.isMonster === true,
                            monsterInstanceProp: target.monsterInstance != null,
                            categoryCheck: target.category && (
                                target.category === 'monster' ||
                                target.category === 'elite' ||
                                target.category === 'boss'
                            )
                        }
                    });
                    
                    if (isMonster) {
                        console.log(`[DEBUG] 確認為怪物: ${this.getEntityId(target)}`);
                        return true;
                    }
                    break;
                    
                // ...existing cases for PLAYER, NPC, PROJECTILE...
                case EntityType.PLAYER:
                    if (
                        target.type === EntityType.PLAYER ||
                        target.type === 'player' ||
                        target.getData?.('isPlayer') === true ||
                        target.isPlayer === true
                        // || target instanceof YourGamePlayerClass
                    ) return true;
                    break;
                case EntityType.NPC:
                    if (
                        target.type === EntityType.NPC ||
                        target.type === 'npc' ||
                        target.getData?.('isNPC') === true ||
                        target.isNPC === true
                        // || target instanceof YourGameNpcClass
                    ) return true;
                    break;
                case EntityType.PROJECTILE:
                    if (
                        target.type === EntityType.PROJECTILE ||
                        target.type === 'projectile' ||
                        target.getData?.('isProjectile') === true ||
                        target.isProjectile === true
                        // || target instanceof YourGameProjectileClass
                    ) return true;
                    break;
            }
        }
        
        console.log(`[DEBUG] 實體 ${this.getEntityId(entity)} 不符合類型 ${type}`);
        return false;
    }


    /**
     * 獲取實體當前血量百分比
     */
    private getEntityHealthPercent(entity: any): number {
        let currentHealth: number | undefined;
        let maxHealth: number | undefined;

        if (entity?.stats) {
            currentHealth = entity.stats.getHealth ? entity.stats.getHealth() : entity.stats.health;
            maxHealth = entity.stats.getMaxHealth ? entity.stats.getMaxHealth() : entity.stats.maxHealth;
        } else if (entity) {
            if (typeof entity.getHealth === 'function' && typeof entity.getMaxHealth === 'function') {
                currentHealth = entity.getHealth();
                maxHealth = entity.getMaxHealth();
            } else if (typeof entity.health === 'number' && typeof entity.maxHealth === 'number') {
                currentHealth = entity.health;
                maxHealth = entity.maxHealth;
            }
        }

        if (typeof currentHealth === 'number' && typeof maxHealth === 'number' && maxHealth > 0) {
            return (currentHealth / maxHealth) * 100;
        }
        return 0; // Default to 0% if health info is unavailable or maxHealth is 0
    }

    /**
     * 判斷實體是否有特定狀態效果
     */
    private entityHasStatusEffect(entity: any, effectName: string): boolean {
        if (entity?.statusEffects && Array.isArray(entity.statusEffects)) {
            return entity.statusEffects.some((effect: any) =>
                (effect?.name === effectName) || (effect?.id === effectName)
            );
        }
        if (entity?.stats?.hasStatusEffect && typeof entity.stats.hasStatusEffect === 'function') {
            return entity.stats.hasStatusEffect(effectName);
        }
        if (entity?.hasStatusEffect && typeof entity.hasStatusEffect === 'function') {
            return entity.hasStatusEffect(effectName);
        }
        // Add other ways to check status effects if necessary
        return false;
    }

    /**
     * 判斷實體是否對某傷害類型有抗性
     */
    private isEntityResistantTo(entity: any, damageType: SkillDamageType): boolean {
        if (entity?.stats?.isResistantTo && typeof entity.stats.isResistantTo === 'function') {
            return entity.stats.isResistantTo(damageType);
        }
        if (entity?.resistances && typeof entity.resistances[damageType] === 'number') {
            return entity.resistances[damageType] > 0; // Assuming positive value means resistance
        }
        // Add other ways to check resistances
        return false;
    }

    /**
     * 判斷實體是否對某傷害類型較弱
     */
    private isEntityWeakTo(entity: any, damageType: SkillDamageType): boolean {
        if (entity?.stats?.isWeakTo && typeof entity.stats.isWeakTo === 'function') {
            return entity.stats.isWeakTo(damageType);
        }
        if (entity?.weaknesses && typeof entity.weaknesses[damageType] === 'number') {
            return entity.weaknesses[damageType] > 0; // Assuming positive value means weakness
        }
        // Add other ways to check weaknesses
        return false;
    }
}