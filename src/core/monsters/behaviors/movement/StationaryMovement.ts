import { IMonsterEntity } from '../../IMonsterEntity';
import { IMovementStrategy } from './IMovementStrategy';

/**
 * 靜止不動的移動策略
 * 使怪物保持在原地不動
 */
export class StationaryMovement implements IMovementStrategy {
    private params: any = {};
    
    getName(): string {
        return 'stationary';
    }
    
    setParams(params: any): void {
        this.params = params || {};
    }
    
    move(entity: IMonsterEntity, delta: number, targetPosition?: { x: number, y: number }): void {
        // 靜止不動，將速度設為0
        entity.setVelocity(0, 0);
        
        // 如果有目標且配置了面向目標，則面向目標
        if (targetPosition && this.params.faceTarget) {
            this.faceTarget(entity, targetPosition);
        }
    }
    
    private faceTarget(entity: IMonsterEntity, targetPosition: { x: number, y: number }): void {
        const dx = targetPosition.x - entity.x;
        const dy = targetPosition.y - entity.y;
        entity.setRotation(Math.atan2(dy, dx));
    }
}
