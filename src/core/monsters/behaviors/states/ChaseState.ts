import { IMonsterEntity } from "../../IMonsterEntity";
import { MonsterStateType } from "../MonsterStateType";
import { BaseState } from "../movement/BaseState";
import { IMonsterBehavior } from "../IMonsterBehavior";
import { MonsterStateMachine } from "../MonsterStateMachine";

/**
 * 追擊狀態 - 使用移動策略系統
 * 當怪物發現玩家並開始追擊時的行為
 */
export class ChaseState extends BaseState {
    public readonly type = MonsterStateType.CHASE;
    private detectionRange: number;
    private maintainDistance: number;
    private giveUpChaseDistance: number;
    private chaseCheckInterval: number = 1000; // Check every 1 second if still should chase
    private chaseCheckTimer: number = 0;

    constructor(monster: IMonsterEntity, stateMachine: MonsterStateMachine, behaviorConfig: IMonsterBehavior) {
        super(monster, stateMachine);
        this.detectionRange = behaviorConfig.detectionRange;
        this.maintainDistance = behaviorConfig.states[MonsterStateType.CHASE]?.maintainDistance || 0; // Default: try to get as close as possible
        this.giveUpChaseDistance = behaviorConfig.states[MonsterStateType.CHASE]?.giveUpChaseDistance || (this.detectionRange * 1.5);
        
        // 設置移動策略
        const chaseState = behaviorConfig.states[MonsterStateType.CHASE];
        if (chaseState?.movementStrategy) {
            // 使用配置中的移動策略
            this.setMovementStrategy(chaseState.movementStrategy);
        } else {
            // 默認使用追逐目標移動策略
            if (this.maintainDistance > 0) {
                // 需要保持距離的情況下使用維持距離策略
                this.setMovementStrategy({
                    type: 'maintainDistance',
                    params: {
                        minDistance: this.maintainDistance * 0.8,
                        maxDistance: this.maintainDistance * 1.2,
                        speedMultiplier: 1.0
                    }
                });
            } else {
                // 直接追擊的情況下使用追逐目標策略
                this.setMovementStrategy({
                    type: 'chaseTarget',
                    params: {
                        speedMultiplier: 1.0,
                        stopDistance: 30
                    }
                });
            }
        }
    }    enter(): void {
        // console.log(`${this.monster.getName()} entering CHASE state`);
        this.monster.setCurrentState(this.type);
        this.chaseCheckTimer = this.chaseCheckInterval;
    }

    exit(): void {
        // console.log(`${this.monster.getName()} exiting CHASE state`);
    }

    update(delta: number, playerPosition: { x: number; y: number }): void {
        const distanceToPlayer = this.calculateDistance(this.monster.getPosition(), playerPosition);

        // Periodically check if we should stop chasing
        this.chaseCheckTimer -= delta;
        if (this.chaseCheckTimer <= 0) {
            this.chaseCheckTimer = this.chaseCheckInterval;
            
            if (distanceToPlayer > this.giveUpChaseDistance) {
                // Player is too far, give up chase and return to wandering
                this.stateMachine.changeState(MonsterStateType.WANDERING);
                return;
            }
        }

        // 調用父類更新方法，處理移動策略
        super.update(delta, playerPosition);
    }    private calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
