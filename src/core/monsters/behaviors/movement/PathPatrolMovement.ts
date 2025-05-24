import { IMonsterEntity } from '../../IMonsterEntity';
import { IMovementStrategy } from './IMovementStrategy';

/**
 * 路徑巡邏移動策略
 * 使怪物按照設定的路徑點進行巡邏
 */
export class PathPatrolMovement implements IMovementStrategy {
    private params: {
        patrolPoints: { x: number, y: number }[];
        speed: number;
        waitTime: number;
        loop: boolean;
    };
    
    private currentPointIndex: number = 0;
    private waiting: boolean = false;
    private waitTimer: number = 0;
    private reverse: boolean = false;
      constructor() {
        // 設置默認參數
        this.params = {
            patrolPoints: [],
            speed: 0.8,      // 基本速度的0.8倍
            waitTime: 1000,  // 在每個點等待1秒
            loop: true       // 循環巡邏
        };
    }
    
    getName(): string {
        return 'pathPatrol';
    }
    
    setParams(params: any): void {
        this.params = { ...this.params, ...params };
        this.currentPointIndex = 0;
        this.waiting = false;
        this.waitTimer = 0;
        this.reverse = false;
    }
    
    move(entity: IMonsterEntity, delta: number, targetPosition?: { x: number, y: number }): void {
        // 如果沒有巡邏點或只有一個點，保持靜止
        if (!this.params.patrolPoints || this.params.patrolPoints.length < 2) {
            entity.setVelocity(0, 0);
            return;
        }
        
        // 如果正在等待中
        if (this.waiting) {
            entity.setVelocity(0, 0);
            this.waitTimer += delta;
            
            // 等待時間結束
            if (this.waitTimer >= this.params.waitTime) {
                this.waiting = false;
                this.moveToNextPoint();
            }
            return;
        }
        
        // 獲取當前目標點
        const targetPoint = this.params.patrolPoints[this.currentPointIndex];
        
        // 計算與目標點的距離
        const dx = targetPoint.x - entity.x;
        const dy = targetPoint.y - entity.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 如果已經到達目標點
        if (distance < 5) {
            this.waiting = true;
            this.waitTimer = 0;
            entity.setVelocity(0, 0);
            return;
        }
        
        // 向目標點移動
        const angle = Math.atan2(dy, dx);
        const speed = entity.getSpeed() * (this.params.speed / 100);
        
        entity.setVelocity(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        );
        
        // 設置旋轉方向（面向移動方向）
        entity.setRotation(angle);
    }
    
    private moveToNextPoint(): void {
        if (this.reverse) {
            this.currentPointIndex--;
            
            // 達到起點
            if (this.currentPointIndex < 0) {
                if (this.params.loop) {
                    // 循環模式：切換方向或重置到最後一個點
                    this.reverse = false;
                    this.currentPointIndex = 1; // 從第二個點開始向前走
                } else {
                    // 非循環模式：停在第一個點
                    this.currentPointIndex = 0;
                }
            }
        } else {
            this.currentPointIndex++;
            
            // 達到終點
            if (this.currentPointIndex >= this.params.patrolPoints.length) {
                if (this.params.loop) {
                    // 循環模式：切換方向或重置到第一個點
                    this.reverse = true;
                    this.currentPointIndex = this.params.patrolPoints.length - 2; // 從倒數第二個點開始往回走
                } else {
                    // 非循環模式：停在最後一個點
                    this.currentPointIndex = this.params.patrolPoints.length - 1;
                }
            }
        }
    }
}
