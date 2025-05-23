import { SkillProjectile } from '../skillProjectile';

/**
 * 投射物的事件類型
 */
export enum ProjectileEventType {
    CREATED = 'created',           // 投射物創建
    START = 'start',               // 投射物開始
    MOVE = 'move',                 // 投射物移動
    UPDATE = 'update',             // 投射物更新
    HIT_ENTER = 'hit_enter',       // 投射物命中開始 (碰撞框進入)
    HIT_STAY = 'hit_stay',         // 投射物命中持續 (碰撞框重疊)
    HIT_EXIT = 'hit_exit',         // 投射物命中結束 (碰撞框離開)
    DESTROYED = 'destroyed'        // 投射物被銷毀
}

/**
 * 投射物事件處理器介面
 */
export interface ProjectileEventHandler {
    handleEvent(projectile: SkillProjectile, eventType: ProjectileEventType, data?: any): void;
}

/**
 * 投射物行為介面
 * 定義投射物的行為模式
 */
export interface ProjectileBehavior {
    // 更新投射物狀態
    update(projectile: SkillProjectile, deltaTime: number): void;
    
    // 處理碰撞
    onHitEnter(projectile: SkillProjectile, target: any): void;
    onHitStay(projectile: SkillProjectile, target: any): void;
    onHitExit(projectile: SkillProjectile, target: any): void;
    
    // 生命週期
    onStart(projectile: SkillProjectile): void;
    onDestroy(projectile: SkillProjectile): void;
}

/**
 * 投射物移動行為介面
 * 用來定義投射物如何移動
 */
export interface ProjectileMovementBehavior {
    updatePosition(projectile: SkillProjectile, position: {x: number, y: number}, deltaTime: number): {x: number, y: number};
}

/**
 * 投射物基礎行為實現
 * 提供通用的投射物行為實現
 */
export abstract class BaseProjectileBehavior implements ProjectileBehavior {
    protected movementBehavior: ProjectileMovementBehavior | null = null;
    
    constructor(movementBehavior?: ProjectileMovementBehavior) {
        this.movementBehavior = movementBehavior || null;
    }
    
    update(projectile: SkillProjectile, deltaTime: number): void {
        // 如果有移動行為，則更新位置
        if (this.movementBehavior && projectile.position) {
            projectile.position = this.movementBehavior.updatePosition(
                projectile, 
                projectile.position, 
                deltaTime
            );
        }
        
        // 子類可以覆蓋此方法提供額外的更新邏輯
    }
    
    onHitEnter(projectile: SkillProjectile, target: any): void {
        // 默認行為，子類可以覆蓋
        console.log(`投射物 ${projectile.getId()} 開始命中目標`);
    }
    
    onHitStay(projectile: SkillProjectile, target: any): void {
        // 默認行為，子類可以覆蓋
    }
    
    onHitExit(projectile: SkillProjectile, target: any): void {
        // 默認行為，子類可以覆蓋
        console.log(`投射物 ${projectile.getId()} 結束命中目標`);
    }
    
    onStart(projectile: SkillProjectile): void {
        // 默認行為，子類可以覆蓋
        console.log(`投射物 ${projectile.getId()} 開始`);
    }
    
    onDestroy(projectile: SkillProjectile): void {
        // 默認行為，子類可以覆蓋
        console.log(`投射物 ${projectile.getId()} 銷毀`);
    }
}
