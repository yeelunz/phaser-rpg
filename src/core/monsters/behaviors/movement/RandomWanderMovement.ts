import { IMonsterEntity } from '../../IMonsterEntity';
import { IMovementStrategy } from './IMovementStrategy';

/**
 * 隨機遊蕩移動策略
 * 使怪物隨機在區域內遊蕩
 */
export class RandomWanderMovement implements IMovementStrategy {
    private params: {
        changeDirectionTime: number;
        speed: number;
        maxDistance: number;
        idleChance: number;
        idleTime: number;
        originPoint?: { x: number, y: number };
    };
    
    private timer: number = 0;
    private currentDirection: { x: number, y: number } = { x: 0, y: 0 };
    private isIdle: boolean = false;
    private idleTimer: number = 0;
    private originPoint: { x: number, y: number } | null = null;    constructor() {
        // 設置默認參數
        this.params = {
            changeDirectionTime: 3000, // 3秒改變一次方向
            speed: 0.1,               // 基本速度的0.1倍，減少速度使移動更平滑
            maxDistance: 200,         // 最大遊蕩距離
            idleChance: 0.3,          // 30%機率進入閒置狀態
            idleTime: 2000            // 閒置2秒
        };
    }
    
    getName(): string {
        return 'randomWander';
    }
    
    setParams(params: any): void {
        this.params = { ...this.params, ...params };
        
        // 重置計時器和狀態
        this.timer = 0;
        this.idleTimer = 0;
        this.isIdle = false;
        this.chooseNewDirection();
    }
    
    move(entity: IMonsterEntity, delta: number, targetPosition?: { x: number, y: number }): void {
        // 記錄原始位置作為遊蕩中心點
        if (!this.originPoint) {
            this.originPoint = { x: entity.x, y: entity.y };
        }
        
        // 如果當前是閒置狀態
        if (this.isIdle) {
            entity.setVelocity(0, 0);
            this.idleTimer += delta;
            
            // 閒置時間結束
            if (this.idleTimer >= this.params.idleTime) {
                this.isIdle = false;
                this.idleTimer = 0;
                this.chooseNewDirection();
            }
            return;
        }
        
        // 檢查是否超過最大遊蕩距離
        const distanceFromOrigin = this.getDistanceBetweenPoints(
            entity.x, entity.y,
            this.originPoint.x, this.originPoint.y
        );
        
        if (distanceFromOrigin > this.params.maxDistance) {
            // 超出範圍，往回走
            const angle = Math.atan2(
                this.originPoint.y - entity.y,
                this.originPoint.x - entity.x
            );
            
            this.currentDirection = {
                x: Math.cos(angle),
                y: Math.sin(angle)
            };
            
            // 重置計時器
            this.timer = 0;
        } else {
            // 正常遊蕩，更新計時器
            this.timer += delta;
            
            // 達到改變方向的時間
            if (this.timer >= this.params.changeDirectionTime) {
                this.timer = 0;
                
                // 隨機決定是否進入閒置狀態
                if (Math.random() < this.params.idleChance) {
                    this.isIdle = true;
                    entity.setVelocity(0, 0);
                    return;
                }
                
                this.chooseNewDirection();
            }
        }        // 應用移動
        // 基本速度略有隨機變化，使移動更自然
        let speedVariance = entity.getTempData('speedVariance');
        if (speedVariance === undefined) {
            // 為每個怪物創建一個固定的速度變化因子
            speedVariance = 0.9 + Math.random() * 0.2; // 0.9-1.1 的變化範圍
            entity.setTempData('speedVariance', speedVariance);
        }
        
        let currentSpeedMultiplier = entity.getTempData('currentSpeedMultiplier') || speedVariance;
        // 對速度做小幅變動，模擬自然的步態變化
        currentSpeedMultiplier += (Math.random() - 0.5) * 0.01;
        currentSpeedMultiplier = Math.max(0.8, Math.min(1.2, currentSpeedMultiplier)); // 限制在合理範圍內
        entity.setTempData('currentSpeedMultiplier', currentSpeedMultiplier);
        
        const speed = entity.getSpeed() * this.params.speed * currentSpeedMultiplier;
        
        // 將速度存儲到怪物的臨時數據中
        const currentVelocity = {
            x: entity.getTempData('velocityX') || 0,
            y: entity.getTempData('velocityY') || 0
        };
        
        // 使用線性插值平滑過渡到新速度 (LERP)
        const lerpFactor = 0.04 + Math.random() * 0.02; // 加入些微隨機性使加速度變化更自然
        const newVelocityX = currentVelocity.x + (this.currentDirection.x * speed - currentVelocity.x) * lerpFactor;
        const newVelocityY = currentVelocity.y + (this.currentDirection.y * speed - currentVelocity.y) * lerpFactor;
        
        // 儲存新速度以便下次使用
        entity.setTempData('velocityX', newVelocityX);
        entity.setTempData('velocityY', newVelocityY);
        
        // 設置怪物速度
        entity.setVelocity(newVelocityX, newVelocityY);
        
        // 設置旋轉方向（面向移動方向），只有當速度足夠大時才改變方向
        const minSpeedForRotation = 0.01;
        if (Math.abs(newVelocityX) > minSpeedForRotation || Math.abs(newVelocityY) > minSpeedForRotation) {
            const targetRotation = Math.atan2(newVelocityY, newVelocityX);
            const currentRotation = entity.getRotation();
            
            // 平滑旋轉
            const rotationLerpFactor = 0.1;
            const angleDiff = Phaser.Math.Angle.Wrap(targetRotation - currentRotation);
            const newRotation = currentRotation + angleDiff * rotationLerpFactor;
            
            entity.setRotation(newRotation);
        }
    }
      private chooseNewDirection(): void {
        // 增加方向選擇的多樣性
        // 1. 確保不總是選擇相似的角度 (避免兩點來回移動的情況)
        // 2. 有時候選擇小角度變化，有時候選擇大角度變化
        
        // 獲取當前方向的角度
        const currentAngle = this.currentDirection.x !== 0 || this.currentDirection.y !== 0 
            ? Math.atan2(this.currentDirection.y, this.currentDirection.x)
            : 0;
            
        // 決定變化模式
        const changeMode = Math.random();
        let newAngle: number;
        
        if (changeMode < 0.3) {
            // 小角度調整 (續前進方向但稍微調整)
            newAngle = currentAngle + (Math.random() - 0.5) * Math.PI * 0.5;
        } else if (changeMode < 0.7) {
            // 中等角度變化 (45-120度的轉向)
            const turnDirection = Math.random() > 0.5 ? 1 : -1;
            newAngle = currentAngle + turnDirection * (Math.PI * 0.25 + Math.random() * Math.PI * 0.4);
        } else if (changeMode < 0.9) {
            // 大角度變化 (120-240度的大轉向)
            const turnDirection = Math.random() > 0.5 ? 1 : -1;
            newAngle = currentAngle + turnDirection * (Math.PI * 0.66 + Math.random() * Math.PI * 0.66);
        } else {
            // 完全隨機的新方向
            newAngle = Math.random() * Math.PI * 2;
        }
        
        // 設置新方向
        this.currentDirection = {
            x: Math.cos(newAngle),
            y: Math.sin(newAngle)
        };
    }
    
    private getDistanceBetweenPoints(x1: number, y1: number, x2: number, y2: number): number {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
