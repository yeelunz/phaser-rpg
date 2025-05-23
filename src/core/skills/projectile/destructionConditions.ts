import { SkillProjectile } from '../skillProjectile';

/**
 * 銷毀條件介面
 * 定義投射物何時應該被銷毀的邏輯
 */
export interface DestructionConditionBehavior {
    /**
     * 檢查投射物是否應該被銷毀
     * @param projectile 要檢查的投射物
     * @param deltaTime 過去的時間（毫秒）
     * @returns 如果應該銷毀返回true，否則返回false
     */
    shouldDestroy(projectile: SkillProjectile, deltaTime: number): boolean;
}

/**
 * 時間銷毀條件
 * 當投射物存在時間超過指定時間時銷毀
 */
export class TimeDestructionCondition implements DestructionConditionBehavior {
    private duration: number; // 存活時間 (毫秒)
    
    constructor(duration: number) {
        this.duration = duration;
    }
      shouldDestroy(projectile: SkillProjectile, deltaTime: number): boolean {
        const shouldDestroy = projectile.getLifeTime() >= this.duration;
        if (shouldDestroy) {
            console.log(`投射物 ${projectile.getId()} 到達預設生命週期 (${this.duration}ms)，將被銷毀`);
        }
        return shouldDestroy;
    }
    
    setDuration(duration: number): void {
        this.duration = duration;
    }
    
    getDuration(): number {
        return this.duration;
    }
}

/**
 * 命中目標數銷毀條件
 * 當投射物命中的目標數達到指定數量時銷毀
 */
export class HitTargetCountDestructionCondition implements DestructionConditionBehavior {
    private maxTargets: number;
    
    constructor(maxTargets: number) {
        this.maxTargets = maxTargets;
    }
    
    shouldDestroy(projectile: SkillProjectile, deltaTime: number): boolean {
        return projectile.getHitTargets().size >= this.maxTargets;
    }
    
    setMaxTargets(maxTargets: number): void {
        this.maxTargets = maxTargets;
    }
    
    getMaxTargets(): number {
        return this.maxTargets;
    }
}

/**
 * 穿透次數銷毀條件
 * 當投射物穿透次數用完時銷毀
 */
export class PenetrationDestructionCondition implements DestructionConditionBehavior {
    private penetration: number;
    private remainingPenetration: number;
    
    constructor(penetration: number) {
        this.penetration = penetration;
        this.remainingPenetration = penetration;
    }
    
    shouldDestroy(projectile: SkillProjectile, deltaTime: number): boolean {
        // 檢查是否有新的命中事件
        const hitEvent = projectile.getAttribute('lastHitEvent');
        const hitProcessed = projectile.getAttribute('lastHitProcessed');
        
        // 如果有新的命中事件且未處理過
        if (hitEvent && hitEvent !== hitProcessed) {
            this.remainingPenetration--;
            projectile.setAttribute('lastHitProcessed', hitEvent);
        }
        
        return this.remainingPenetration <= 0;
    }
    
    getPenetration(): number {
        return this.penetration;
    }
    
    getRemainingPenetration(): number {
        return this.remainingPenetration;
    }
    
    decreasePenetration(): number {
        this.remainingPenetration = Math.max(0, this.remainingPenetration - 1);
        return this.remainingPenetration;
    }
    
    resetPenetration(): void {
        this.remainingPenetration = this.penetration;
    }
}

/**
 * 按鍵釋放銷毀條件
 * 當指定按鍵釋放時銷毀投射物
 */
export class ButtonReleaseDestructionCondition implements DestructionConditionBehavior {
    private buttonReleased: boolean = false;
    
    shouldDestroy(projectile: SkillProjectile, deltaTime: number): boolean {
        // 檢查按鍵狀態，這裡通常會從投射物的屬性中獲取
        const isReleased = projectile.getAttribute('buttonReleased') || this.buttonReleased;
        return isReleased;
    }
    
    setButtonReleased(released: boolean): void {
        this.buttonReleased = released;
    }
}

/**
 * 超出範圍銷毀條件
 * 當投射物移動超過指定距離時銷毀
 */
export class RangeDestructionCondition implements DestructionConditionBehavior {
    private maxRange: number;
    private startPosition: { x: number, y: number };
    
    constructor(maxRange: number, startPosition: { x: number, y: number }) {
        this.maxRange = maxRange;
        this.startPosition = { ...startPosition };
    }
    
    shouldDestroy(projectile: SkillProjectile, deltaTime: number): boolean {
        const currentPosition = projectile.position;
        const dx = currentPosition.x - this.startPosition.x;
        const dy = currentPosition.y - this.startPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance >= this.maxRange;
    }
    
    setMaxRange(maxRange: number): void {
        this.maxRange = maxRange;
    }
    
    getMaxRange(): number {
        return this.maxRange;
    }
    
    setStartPosition(position: { x: number, y: number }): void {
        this.startPosition = { ...position };
    }
}

/**
 * 複合銷毀條件
 * 組合多個條件，任一條件滿足時銷毀投射物
 */
export class CompositeDestructionCondition implements DestructionConditionBehavior {
    private conditions: DestructionConditionBehavior[] = [];
    
    constructor(...conditions: DestructionConditionBehavior[]) {
        this.conditions = conditions;
    }
    
    shouldDestroy(projectile: SkillProjectile, deltaTime: number): boolean {
        for (const condition of this.conditions) {
            if (condition.shouldDestroy(projectile, deltaTime)) {
                return true;
            }
        }
        return false;
    }
    
    addCondition(condition: DestructionConditionBehavior): void {
        this.conditions.push(condition);
    }
    
    removeCondition(condition: DestructionConditionBehavior): boolean {
        const index = this.conditions.indexOf(condition);
        if (index >= 0) {
            this.conditions.splice(index, 1);
            return true;
        }
        return false;
    }
    
    getConditions(): DestructionConditionBehavior[] {
        return [...this.conditions];
    }
}

/**
 * 自定義銷毀條件
 * 使用自定義函數決定投射物是否應該被銷毀
 */
export class CustomDestructionCondition implements DestructionConditionBehavior {
    private checkFunction: (projectile: SkillProjectile, deltaTime: number) => boolean;
    
    constructor(checkFunction: (projectile: SkillProjectile, deltaTime: number) => boolean) {
        this.checkFunction = checkFunction;
    }
    
    shouldDestroy(projectile: SkillProjectile, deltaTime: number): boolean {
        return this.checkFunction(projectile, deltaTime);
    }
    
    setCheckFunction(checkFunction: (projectile: SkillProjectile, deltaTime: number) => boolean): void {
        this.checkFunction = checkFunction;
    }
}
