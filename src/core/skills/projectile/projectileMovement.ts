import { SkillProjectile } from '../skillProjectile';
import { ProjectileMovementBehavior } from './projectileBehavior';

/**
 * 靜態移動行為
 * 用於那些不需要移動的投射物（如原地爆炸、區域效果等）
 */
export class StaticMovementBehavior implements ProjectileMovementBehavior {
    private offset: { x: number, y: number } = { x: 0, y: 0 };
    
    constructor(offset?: { x: number, y: number }) {
        if (offset) {
            this.offset = offset;
        }
    }
    
    updatePosition(projectile: SkillProjectile, position: {x: number, y: number}, deltaTime: number): {x: number, y: number} {
        // 靜態行為不移動，只返回原位置加上可能的偏移
        return {
            x: position.x + this.offset.x,
            y: position.y + this.offset.y
        };
    }
    
    setOffset(offset: { x: number, y: number }): void {
        this.offset = offset;
    }
}

/**
 * 直線移動行為
 * 讓投射物沿著指定方向以固定速度移動
 */
export class LinearMovementBehavior implements ProjectileMovementBehavior {
    private speed: number;
    private direction: number; // 角度
    
    constructor(speed: number, direction: number) {
        this.speed = speed;
        this.direction = direction;
    }
    
    updatePosition(projectile: SkillProjectile, position: {x: number, y: number}, deltaTime: number): {x: number, y: number} {
        const radians = this.direction * Math.PI / 180;
        const dx = Math.cos(radians) * this.speed * (deltaTime / 1000);
        const dy = Math.sin(radians) * this.speed * (deltaTime / 1000);
        
        return {
            x: position.x + dx,
            y: position.y + dy
        };
    }
    
    setDirection(direction: number): void {
        this.direction = direction;
    }
    
    setSpeed(speed: number): void {
        this.speed = speed;
    }
}

/**
 * 追蹤移動行為
 * 讓投射物追蹤目標移動
 */
export class TrackingMovementBehavior implements ProjectileMovementBehavior {
    private speed: number;
    private target: { x: number, y: number } | (() => { x: number, y: number });
    private maxTurnRate: number = 5; // 每秒最大轉向角度
    private currentDirection: number = 0;
    
    constructor(speed: number, target: { x: number, y: number } | (() => { x: number, y: number })) {
        this.speed = speed;
        this.target = target;
    }
    
    updatePosition(projectile: SkillProjectile, position: {x: number, y: number}, deltaTime: number): {x: number, y: number} {
        // 獲取目標位置
        const targetPos = typeof this.target === 'function' ? this.target() : this.target;
        
        if (!targetPos) return position;
        
        // 計算方向向量
        const dx = targetPos.x - position.x;
        const dy = targetPos.y - position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 計算目標角度
        const targetAngle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // 平滑轉向
        let angleDiff = targetAngle - this.currentDirection;
        
        // 確保角度差在 -180 到 180 之間
        if (angleDiff > 180) angleDiff -= 360;
        if (angleDiff < -180) angleDiff += 360;
        
        // 根據最大轉向速率限制轉向
        const maxChange = this.maxTurnRate * deltaTime / 1000;
        const change = Math.max(-maxChange, Math.min(maxChange, angleDiff));
        
        this.currentDirection += change;
        
        // 確保角度在 0-360 範圍內
        this.currentDirection = (this.currentDirection + 360) % 360;
        
        // 轉換為弧度
        const radians = this.currentDirection * Math.PI / 180;
        
        // 計算移動距離
        const moveDistance = Math.min(distance, this.speed * (deltaTime / 1000));
        
        return {
            x: position.x + Math.cos(radians) * moveDistance,
            y: position.y + Math.sin(radians) * moveDistance
        };
    }
    
    setSpeed(speed: number): void {
        this.speed = speed;
    }
    
    setTarget(target: { x: number, y: number } | (() => { x: number, y: number })): void {
        this.target = target;
    }
    
    setMaxTurnRate(degrees: number): void {
        this.maxTurnRate = degrees;
    }
}

/**
 * 彈跳移動行為
 * 讓投射物在遇到障礙物時彈跳
 */
export class BouncingMovementBehavior implements ProjectileMovementBehavior {
    private speed: number;
    private direction: number; // 角度
    private maxBounces: number;
    private bouncesLeft: number;
    private bounceCallback?: (newDirection: number) => void;
    
    constructor(speed: number, direction: number, maxBounces: number = 3) {
        this.speed = speed;
        this.direction = direction;
        this.maxBounces = maxBounces;
        this.bouncesLeft = maxBounces;
    }
    
    updatePosition(projectile: SkillProjectile, position: {x: number, y: number}, deltaTime: number): {x: number, y: number} {
        const radians = this.direction * Math.PI / 180;
        const dx = Math.cos(radians) * this.speed * (deltaTime / 1000);
        const dy = Math.sin(radians) * this.speed * (deltaTime / 1000);
        
        const newPos = {
            x: position.x + dx,
            y: position.y + dy
        };
        
        // 這裡僅計算移動，實際碰撞檢測和彈跳需要在外部處理
        return newPos;
    }
    
    handleBounce(normal: { x: number, y: number }): boolean {
        if (this.bouncesLeft <= 0) return false;
        
        // 計算入射向量
        const incomingRadians = this.direction * Math.PI / 180;
        const incomingVector = {
            x: Math.cos(incomingRadians),
            y: Math.sin(incomingRadians)
        };
        
        // 法線向量長度歸一化
        const normalLength = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
        const normalizedNormal = {
            x: normal.x / normalLength,
            y: normal.y / normalLength
        };
        
        // 計算反射向量 r = i - 2(i·n)n
        const dot = incomingVector.x * normalizedNormal.x + incomingVector.y * normalizedNormal.y;
        const reflectionVector = {
            x: incomingVector.x - 2 * dot * normalizedNormal.x,
            y: incomingVector.y - 2 * dot * normalizedNormal.y
        };
        
        // 更新方向
        this.direction = Math.atan2(reflectionVector.y, reflectionVector.x) * 180 / Math.PI;
        
        // 減少彈跳次數
        this.bouncesLeft--;
        
        // 呼叫回調
        if (this.bounceCallback) {
            this.bounceCallback(this.direction);
        }
        
        return true;
    }
    
    setBounceCallback(callback: (newDirection: number) => void): void {
        this.bounceCallback = callback;
    }
    
    getRemainingBounces(): number {
        return this.bouncesLeft;
    }
    
    setDirection(direction: number): void {
        this.direction = direction;
    }
    
    getDirection(): number {
        return this.direction;
    }
    
    setSpeed(speed: number): void {
        this.speed = speed;
    }
}

/**
 * 旋轉移動行為
 * 讓投射物圍繞一個點旋轉
 */
export class OrbitalMovementBehavior implements ProjectileMovementBehavior {
    private center: { x: number, y: number } | (() => { x: number, y: number });
    private radius: number;
    private angularSpeed: number; // 度/秒
    private currentAngle: number;
    
    constructor(
        center: { x: number, y: number } | (() => { x: number, y: number }), 
        radius: number, 
        angularSpeed: number, 
        startAngle: number = 0
    ) {
        this.center = center;
        this.radius = radius;
        this.angularSpeed = angularSpeed;
        this.currentAngle = startAngle;
    }
    
    updatePosition(projectile: SkillProjectile, position: {x: number, y: number}, deltaTime: number): {x: number, y: number} {
        // 更新角度
        this.currentAngle += this.angularSpeed * deltaTime / 1000;
        
        // 確保角度在 0-360 範圍內
        this.currentAngle = (this.currentAngle + 360) % 360;
        
        // 獲取中心點
        const centerPos = typeof this.center === 'function' ? this.center() : this.center;
        
        if (!centerPos) return position;
        
        // 計算新位置
        const radians = this.currentAngle * Math.PI / 180;
        return {
            x: centerPos.x + Math.cos(radians) * this.radius,
            y: centerPos.y + Math.sin(radians) * this.radius
        };
    }
    
    setCenter(center: { x: number, y: number } | (() => { x: number, y: number })): void {
        this.center = center;
    }
    
    setRadius(radius: number): void {
        this.radius = radius;
    }
    
    setAngularSpeed(speed: number): void {
        this.angularSpeed = speed;
    }
      getCurrentAngle(): number {
        return this.currentAngle;
    }
}

/**
 * 弧形移動行為
 * 讓投射物沿著拋物線或弧形路徑移動到目標位置
 */
export class ArcMovementBehavior implements ProjectileMovementBehavior {
    private startPos: { x: number, y: number };
    private targetPos: { x: number, y: number } | (() => { x: number, y: number });
    private speed: number;
    private maxHeight: number;
    private progress: number = 0;
    private totalDistance: number;
    
    constructor(
        startPos: { x: number, y: number },
        targetPos: { x: number, y: number } | (() => { x: number, y: number }),
        speed: number,
        maxHeight: number
    ) {
        this.startPos = { ...startPos };
        this.targetPos = targetPos;
        this.speed = speed;
        this.maxHeight = maxHeight;
        
        // 初始化時計算總距離
        const target = typeof targetPos === 'function' ? targetPos() : targetPos;
        const dx = target.x - startPos.x;
        const dy = target.y - startPos.y;
        this.totalDistance = Math.sqrt(dx * dx + dy * dy);
    }
    
    updatePosition(projectile: SkillProjectile, position: {x: number, y: number}, deltaTime: number): {x: number, y: number} {
        // 獲取當前目標位置
        const target = typeof this.targetPos === 'function' ? this.targetPos() : this.targetPos;
        
        // 更新進度
        const moveDistance = this.speed * (deltaTime / 1000);
        const progressIncrement = moveDistance / this.totalDistance;
        this.progress = Math.min(1, this.progress + progressIncrement);
        
        // 計算當前位置
        const t = this.progress;
        
        // 線性差值計算水平位置
        const x = this.startPos.x + (target.x - this.startPos.x) * t;
        
        // 使用拋物線函數計算高度偏移
        // 公式: h = 4 * maxHeight * t * (1 - t)，在 t = 0.5 時達到最高點
        const heightOffset = 4 * this.maxHeight * t * (1 - t);
        
        // 計算實際y坐標，考慮起點和終點的高度差
        const baseY = this.startPos.y + (target.y - this.startPos.y) * t;
        const y = baseY - heightOffset; // 減去是因為在遊戲坐標系中，y軸向下為正
        
        return { x, y };
    }
    
    isCompleted(): boolean {
        return this.progress >= 1;
    }
    
    reset(newStartPos?: { x: number, y: number }): void {
        if (newStartPos) {
            this.startPos = { ...newStartPos };
        }
        this.progress = 0;
        
        // 重新計算總距離
        const target = typeof this.targetPos === 'function' ? this.targetPos() : this.targetPos;
        const dx = target.x - this.startPos.x;
        const dy = target.y - this.startPos.y;
        this.totalDistance = Math.sqrt(dx * dx + dy * dy);
    }
    
    setTargetPos(targetPos: { x: number, y: number } | (() => { x: number, y: number })): void {
        this.targetPos = targetPos;
        
        // 更新總距離
        const target = typeof targetPos === 'function' ? targetPos() : targetPos;
        const dx = target.x - this.startPos.x;
        const dy = target.y - this.startPos.y;
        this.totalDistance = Math.sqrt(dx * dx + dy * dy);
    }
    
    setSpeed(speed: number): void {
        this.speed = speed;
    }
    
    setMaxHeight(height: number): void {
        this.maxHeight = height;
    }
    
    getProgress(): number {
        return this.progress;
    }
}
