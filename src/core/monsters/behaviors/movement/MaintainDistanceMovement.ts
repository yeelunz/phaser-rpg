import { IMonsterEntity } from '../../IMonsterEntity';
import { IMovementStrategy } from './IMovementStrategy';
import { ObstacleAvoidance } from './ObstacleAvoidance';

/**
 * 保持距離移動策略
 * 使怪物與目標保持特定距離
 * 新增避障礙系統支援
 */
export class MaintainDistanceMovement implements IMovementStrategy {
    private params: {
        preferredDistance: number; // 理想距離
        tolerance: number;        // 容忍範圍
        circleTarget: boolean;    // 是否繞圈移動
        speed: number;            // 移動速度比例
        obstacleAvoidance: boolean; // 是否啟用避障
    };
    
    private circleAngle: number = 0;
    private obstacleAvoidance: ObstacleAvoidance | null = null;      constructor() {
        // 設置默認參數
        this.params = {
            preferredDistance: 150,  // 理想保持150像素距離
            tolerance: 30,          // 30像素的容忍範圍
            circleTarget: false,     // 默認不繞圈
            speed: 0.9,              // 默認速度為基礎速度的0.9倍
            obstacleAvoidance: true  // 啟用避障
        };
    }
    
    getName(): string {
        return 'maintainDistance';
    }
      setParams(params: any): void {
        this.params = { ...this.params, ...params };
        
        // 初始化避障系統
        if (this.params.obstacleAvoidance && !this.obstacleAvoidance) {
            const scene = params.scene || (params.entity && params.entity.getScene());
            if (scene) {
                this.obstacleAvoidance = new ObstacleAvoidance(scene, {
                    avoidanceDistance: 40,
                    avoidanceStrength: 0.6,
                    probeCount: 3,
                    enabled: true
                });
            }
        }
    }
      move(entity: IMonsterEntity, delta: number, targetPosition?: { x: number, y: number }): void {
        // 如果沒有目標，停止移動
        if (!targetPosition) {
            entity.setVelocity(0, 0);
            return;
        }

        // 初始化避障系統（如果還沒有的話）
        if (this.params.obstacleAvoidance && !this.obstacleAvoidance) {
            const scene = entity.getScene();
            if (scene) {
                this.obstacleAvoidance = new ObstacleAvoidance(scene);
            }
        }
        
        // 計算與目標的距離和角度
        const dx = targetPosition.x - entity.x;
        const dy = targetPosition.y - entity.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // 計算移動方向和速度
        let moveX = 0;
        let moveY = 0;
        const speed = entity.getSpeed() * this.params.speed * (delta / 16.67); // 使用 delta 進行時間補償
        
        // 檢查距離是否在理想範圍內
        const minAcceptableDistance = this.params.preferredDistance - this.params.tolerance;
        const maxAcceptableDistance = this.params.preferredDistance + this.params.tolerance;
        
        if (distance < minAcceptableDistance) {
            // 太近了，需要後退
            moveX = -Math.cos(angle) * speed;
            moveY = -Math.sin(angle) * speed;
        } else if (distance > maxAcceptableDistance) {
            // 太遠了，需要靠近
            moveX = Math.cos(angle) * speed;
            moveY = Math.sin(angle) * speed;
        } else if (this.params.circleTarget) {
            // 在理想範圍內且需要繞圈
            this.circleAngle += delta * 0.001;  // 調整繞圈速度
            
            // 計算繞圈位置
            const circleX = Math.cos(angle + Math.PI/2); // 垂直於目標方向
            const circleY = Math.sin(angle + Math.PI/2);
            
            moveX = circleX * speed * 0.7; // 降低繞圈速度
            moveY = circleY * speed * 0.7;        }
        
        // 應用避障邏輯
        if (this.params.obstacleAvoidance && this.obstacleAvoidance && (moveX !== 0 || moveY !== 0)) {
            const desiredVelocity = { x: moveX, y: moveY };
            
            // 計算避障修正後的移動方向
            const correctedVelocity = this.obstacleAvoidance.calculateAvoidance(
                entity,
                desiredVelocity
            );
            
            moveX = correctedVelocity.x;
            moveY = correctedVelocity.y;
        }
        
        // 應用移動
        entity.setVelocity(moveX, moveY);
        
        // 始終面向目標
        entity.setRotation(angle);
    }
}
