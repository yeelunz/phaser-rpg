import { IMonsterEntity } from '../../IMonsterEntity';
import { IMovementStrategy } from './IMovementStrategy';
import { ObstacleAvoidance, ObstacleAvoidanceConfig } from './ObstacleAvoidance';

/**
 * 追擊目標移動策略
 * 使怪物直接追向目標（玩家）
 * 新增避障礙系統支援
 */
export class ChaseTargetMovement implements IMovementStrategy {
    private params: {
        speed: number;
        minDistance: number;
        maxDistance: number;
        usePathfinding: boolean;
        giveUpDistance: number;
        obstacleAvoidance: boolean;
    };
    private obstacleAvoidance: ObstacleAvoidance | null = null;      constructor() {
        // 設置默認參數
        this.params = {
            speed: 1.0,         // 基本速度的1.0倍
            minDistance: 0,     // 最小追擊距離
            maxDistance: 0,     // 最大追擊距離（0表示無限）
            usePathfinding: false,  // 是否使用尋路算法
            giveUpDistance: 300,     // 放棄追擊的距離
            obstacleAvoidance: true  // 是否啟用避障
        };
    }
    
    getName(): string {
        return 'chaseTarget';
    }    setParams(params: any): void {
        this.params = { ...this.params, ...params };
        
        // 初始化避障系統
        if (this.params.obstacleAvoidance && !this.obstacleAvoidance) {
            const scene = params.scene || (params.entity && params.entity.getScene());
            if (scene) {
                this.obstacleAvoidance = new ObstacleAvoidance(scene, {
                    avoidanceDistance: 80,     // 提高檢測距離
                    avoidanceStrength: 1.2,    // 提高避障強度
                    probeCount: 7,             // 增加探測射線數量，提高準確性
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
        
        // 計算與目標的距離
        const dx = targetPosition.x - entity.x;
        const dy = targetPosition.y - entity.y;
        const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
        
        // 檢查是否超出放棄距離
        if (this.params.giveUpDistance > 0 && distanceToTarget > this.params.giveUpDistance) {
            // 超出放棄距離，停止追擊
            entity.setVelocity(0, 0);
            return;
        }
        
        // 檢查是否需要保持距離
        if (this.params.minDistance > 0 && distanceToTarget < this.params.minDistance) {
            // 太近了，後退
            const angle = Math.atan2(dy, dx);
            const speed = entity.getSpeed() * this.params.speed * (delta / 16.67); // 使用 delta 進行時間補償
            
            entity.setVelocity(
                -Math.cos(angle) * speed * 0.5, // 後退速度降低
                -Math.sin(angle) * speed * 0.5
            );
            
            // 但仍然面向目標
            entity.setRotation(angle);
            return;
        }
        
        // 檢查是否需要靠近
        if (this.params.maxDistance > 0 && distanceToTarget > this.params.maxDistance) {
            // 太遠了，需要靠近
        } else if (this.params.maxDistance > 0) {
            // 在適當距離，保持不動
            entity.setVelocity(0, 0);
            
            // 面向目標
            const angle = Math.atan2(dy, dx);
            entity.setRotation(angle);
            return;
        }
          // 標準追擊邏輯
        const angle = Math.atan2(dy, dx);
        const speed = entity.getSpeed() * this.params.speed * (delta / 16.67); // 使用 delta 進行時間補償
        
        // 計算基本移動向量
        let velocityX = Math.cos(angle) * speed;
        let velocityY = Math.sin(angle) * speed;

        // 應用避障修正
        if (this.params.obstacleAvoidance && this.obstacleAvoidance) {
            const correctedVelocity = this.obstacleAvoidance.calculateAvoidance(
                entity, 
                { x: velocityX, y: velocityY }
            );
            velocityX = correctedVelocity.x;
            velocityY = correctedVelocity.y;
        }        
        // 如果有尋路算法，這裡應該調用尋路函數
        if (this.params.usePathfinding) {
            // TODO: 實現尋路算法
            // 這裡先使用直線追擊
            entity.setVelocity(velocityX, velocityY);
        } else {
            // 直線追擊
            entity.setVelocity(velocityX, velocityY);
        }
        
        // 面向目標
        entity.setRotation(angle);
    }
}
