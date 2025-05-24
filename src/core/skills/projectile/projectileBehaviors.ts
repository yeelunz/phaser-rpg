import { SkillProjectile } from '../skillProjectile';
import { BaseProjectileBehavior } from './projectileBehavior';
import { SkillEventManager } from '../skillEventManager';
import { SkillEventType } from '../types';
import { EntitySearchSystem, EntitySearchFilter, SearchAreaShape, SortMethod, EntityResultSelector } from '../../combat/entitySearchSystem';
import { CollisionBoxType } from '../types';

/**
 * Standard Damage Behavior
 * Handles collision detection, target searching via EntitySearchSystem, and damage dealing.
 * Supports single-target, multi-target (AOE), and multi-hit projectiles.
 */
export class StandardDamageBehavior extends BaseProjectileBehavior {
    protected damageMultiplier: number;
    protected hitCount: number;
    protected hitInterval: number;
    protected maxTargets: number;    private eventManager: SkillEventManager;
    private entitySearchSystem: EntitySearchSystem;    protected damageType: string;

    constructor(
        damageMultiplier: number = 1.0,
        hitCount: number = 1,
        hitInterval: number = 100, // ms
        maxTargets: number = 1, // Default to single target
        damageType: string = 'physical' // 預設為物理傷害
    ) {
        super();
        this.damageMultiplier = damageMultiplier;
        this.hitCount = Math.max(1, hitCount);
        this.hitInterval = Math.max(0, hitInterval);
        this.maxTargets = Math.max(1, maxTargets);
        this.damageType = damageType;
        this.eventManager = SkillEventManager.getInstance();
        this.entitySearchSystem = EntitySearchSystem.getInstance();
    }
    
    update(projectile: SkillProjectile, deltaTime: number): void {
        super.update(projectile, deltaTime);
        
        // 在這裡可以添加定期檢查區域和處理多段傷害的邏輯
    }
    
    /**
     * 搜尋並傷害目標的方法 - 讓實體搜索系統處理所有的搜尋邏輯
     */   private findAndDamageTargets(projectile: SkillProjectile, specificTarget?: any): void {
        console.log(`[StandardDamageBehavior] findAndDamageTargets - 投射物 ID: ${projectile.getId()}`);
        console.log(`[StandardDamageBehavior] 來源實體ID: ${projectile.getSourceEntityId()}`);
        
        // 如果有指定目標，輸出目標信息
        if (specificTarget) {
            console.log(`[StandardDamageBehavior] 指定目標:`, {
                id: specificTarget.id,
                getId: specificTarget.getId ? specificTarget.getId() : undefined,
                getInstanceId: specificTarget.getInstanceId ? specificTarget.getInstanceId() : undefined,
                type: specificTarget.type,
                constructor: specificTarget.constructor ? specificTarget.constructor.name : undefined
            });
        }
        
        // 獲取投射物的搜索過濾器
        const searchFilter = projectile.getSearchFilter();
        console.log(`[StandardDamageBehavior] 搜索過濾器: ${searchFilter ? JSON.stringify(searchFilter) : '未設置'}`);
        
        // 如果沒有搜索過濾器，無法進行搜索
        if (!searchFilter || !searchFilter.area) {
            console.warn(`[StandardDamageBehavior] 投射物 ${projectile.getId()} 沒有設置搜索過濾器`);
            return;
        }
 
        // 設置搜索選擇器，使用 maxTargets 限制結果數量
        const selector: EntityResultSelector = {
            sort: SortMethod.NEAREST, // 優先攻擊最近的敵人
            limit: this.maxTargets
        };
        
        // 使用實體搜索系統進行搜索
        const position = projectile.position;
        let targets: any[] = [];
        
        // 根據搜索區域類型獲取目標 所有目標都應該要從實體搜索系統獲取        // 這是統一流程，禁止直接從碰撞檢測中獲取目標，任何欲進行傷害發送的目標，都應該從實體搜索系統獲取 
        if (searchFilter.area) {
            const area = searchFilter.area;
            console.log(`[StandardDamageBehavior] 使用搜索系統執行區域搜索: ${area.type}`);
            
            // 準備搜索參數
            let searchParams: any = { position: position };
            
            // 根據搜索區域類型設置參數
            switch (area.type) {
                case SearchAreaShape.CIRCLE:
                    searchParams.radius = (area as any).radius;
                    break;
                    
                case SearchAreaShape.RECTANGLE:
                    searchParams.width = (area as any).width;
                    searchParams.height = (area as any).height;
                    searchParams.rotation = (area as any).angle;
                    break;
                    
                case SearchAreaShape.SECTOR:
                    searchParams.radius = (area as any).radius;
                    searchParams.startAngle = (area as any).startAngle;
                    searchParams.endAngle = (area as any).endAngle;
                    break;
                    
                case SearchAreaShape.LINE:
                    const lineArea = area as any;
                    const length = lineArea.length || 100;
                    const angle = lineArea.angle || 0;
                    const width = lineArea.width || 10;
                    
                    // 將角度轉換為弧度
                    const angleRad = angle * Math.PI / 180;
                    
                    // 計算線段的起點和終點
                    // 起點是當前位置，終點根據長度和角度計算
                    const startPos = { x: position.x, y: position.y };
                    const endPos = {
                        x: position.x + Math.cos(angleRad) * length,
                        y: position.y + Math.sin(angleRad) * length
                    };
                    
                    searchParams.startPos = startPos;
                    searchParams.endPos = endPos;
                    searchParams.width = width; // 線條厚度
                    
                    console.log(`[StandardDamageBehavior] 線形搜索參數: startPos=${JSON.stringify(startPos)}, endPos=${JSON.stringify(endPos)}, width=${width}`);
                    break;
                      default:
                    console.warn(`[StandardDamageBehavior] 未知的搜索區域類型: ${(area as any).type}`);
                    break;
            }
            
            targets = this.entitySearchSystem.search(
                area.type,
                searchParams,
                searchFilter,
                selector
            );
        }
        
        console.log(`[StandardDamageBehavior] 找到 ${targets.length} 個目標`);
        
        // 對每個找到的目標應用傷害
        for (const target of targets) {
            this.applyDamageToTarget(projectile, target);
        }
    }
    
    /**
     * 對目標應用傷害 - 只發送傷害事件，不處理傷害計算
     */
    private applyDamageToTarget(projectile: SkillProjectile, target: any): void {
        try {
            const currentTime = Date.now();
            
            // 嘗試獲取目標ID，使用多重嘗試策略
            let targetId;
            
            // 首先檢查是否有 monster 數據
            const monsterData = target.getData ? target.getData('monsterInstance') : null;
            if (monsterData) {
                if (monsterData.getInstanceId) {
                    targetId = monsterData.getInstanceId();
                } else if (monsterData.getId) {
                    targetId = monsterData.getId();
                }
            }

            // 如果沒有找到 monster ID，則依次嘗試其他方法
            if (!targetId) {
                console.log(`[StandardDamageBehavior] !targetId: ${targetId}`);
                if (target.getInstanceId && typeof target.getInstanceId === 'function') {
                    targetId = target.getInstanceId();
                } else if (typeof target.getId === 'function') {
                    targetId = target.getId();
                } else if (target.id) {
                    targetId = target.id;
                } else if (target.instanceId) {
                    targetId = target.instanceId;
                } else if (target.name) {
                    targetId = target.name;
                } else {
                    console.warn('[StandardDamageBehavior] 無法找到有效的目標ID，生成臨時ID');
                    targetId = "tmp_" + Math.random().toString(36).substring(2, 15);
                }
            }    
      
            const damageType = this.damageType || projectile.getAttribute('damageType') || 'physical';
            const sourceEntityId = projectile.getSourceEntityId();
            
            if (!sourceEntityId) {
                console.error(`[StandardDamageBehavior] 投射物沒有有效的來源實體ID: ${projectile.getId()}`);
                return;
            }
            
            // 使用SkillProjectile的方法直接獲取施放者狀態的複製版本
            const casterStatsCopy = projectile.getSourceEntityStatsCopy();// 觸發傷害事件
            this.eventManager.dispatchEvent({
                type: SkillEventType.DAMAGE_DEALT,
                skillId: projectile.getId(),
                skillLevel: projectile.getAttribute('level') || 1,
                casterId: sourceEntityId,
                timestamp: currentTime,
                position: projectile.position,
                data: {
                    targetId: targetId,
                    damageType: damageType,
                    damageMultiplier: this.damageMultiplier,
                    hitIndex: 0,
                    totalHits: 1,
                    casterStats: casterStatsCopy // 添加施放者狀態的複製版本
                }
            });

            // 觸發命中事件
            this.eventManager.dispatchEvent({
                type: SkillEventType.SKILL_HIT_ENEMY,
                skillId: projectile.getId(),
                skillLevel: projectile.getAttribute('level') || 1,
                casterId: sourceEntityId,
                timestamp: currentTime,
                position: projectile.position,
                data: {
                    targetId: targetId
                }
            });
        } catch (error) {
            console.error(`[StandardDamageBehavior] 應用傷害時發生錯誤:`, error);
        }
    }
    
    /**
     * 當碰撞發生時，onHitEnter 使用實體搜尋系統處理
     */
    onHitEnter(projectile: SkillProjectile, target: any): void {
        console.log(`[StandardDamageBehavior] onHitEnter 開始執行 - 投射物 ID: ${projectile.getId()}`);
        
        try {
            super.onHitEnter(projectile, target);
            
            // 碰撞觸發
            console.log(`[StandardDamageBehavior] onHitEnter 被觸發 - 投射物 ID: ${projectile.getId()}`);
            
            // 目標檢查
            const targetId = target.getId ? target.getId() : target.id;
            console.log(`[StandardDamageBehavior] 碰撞目標ID: ${targetId}, 目標類型: ${typeof target}`);
            
            // 直接處理碰撞目標，讓實體搜尋系統處理目標識別
            console.log(`[StandardDamageBehavior] 開始處理碰撞目標`);
            this.findAndDamageTargets(projectile, target);
            
            console.log(`[StandardDamageBehavior] 完成傷害處理 - 投射物 ID: ${projectile.getId()}`);
        } catch (error) {
            console.error(`[StandardDamageBehavior] onHitEnter 發生錯誤:`, error);
        }
    }
}
