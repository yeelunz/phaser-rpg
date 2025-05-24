import { IMonsterEntity } from "../../IMonsterEntity";
import { MonsterStateType } from "../MonsterStateType";
import { BaseState } from "../movement/BaseState";
import { IMonsterBehavior } from "../IMonsterBehavior";
import { MonsterStateMachine } from "../MonsterStateMachine";

/**
 * 遊蕩狀態 - 使用移動策略系統
 * 當怪物沒有檢測到玩家時的行為
 */
export class WanderingState extends BaseState {
    public readonly type = MonsterStateType.WANDERING;
    private detectionRange: number;

    constructor(monster: IMonsterEntity, stateMachine: MonsterStateMachine, behaviorConfig: IMonsterBehavior) {
        super(monster, stateMachine);
        this.detectionRange = behaviorConfig.detectionRange;
          const wanderingState = behaviorConfig.states[MonsterStateType.WANDERING];
        
        // 設置移動策略
        if (wanderingState?.movementStrategy) {
            this.setMovementStrategy(wanderingState.movementStrategy);
        } else {
            // 使用默認的隨機遊蕩策略，參數優化以創造更自然的移動
            this.setMovementStrategy({
                type: 'randomWander',
                params: {
                    changeDirectionTime: Math.floor(2000 + Math.random() * 1500), // 變化方向的間隔時間
                    speed: 0.07 + Math.random() * 0.06, // 讓每個怪物速度略有不同
                    maxDistance: 180 + Math.random() * 60, // 遊蕩範圍也個體差異化
                    idleChance: 0.35, // 增加一點閒置的機率
                    idleTime: Math.floor(1500 + Math.random() * 1500) // 閒置時間也有變化
                }
            });
        }
        
        // 設置技能池
        if (wanderingState?.skillPool) {
            this.setSkillPool(wanderingState.skillPool);
        }
    }

    enter(): void {
        // console.log(`${this.monster.getName()} entering WANDERING state`);
        this.monster.setCurrentState(this.type);
    }
    
    exit(): void {
        // console.log(`${this.monster.getName()} exiting WANDERING state`);
    }

    update(delta: number, playerPosition: { x: number; y: number }): void {
        // 首先檢查是否可以看到玩家
        const distanceToPlayer = this.calculateDistance(this.monster.getPosition(), playerPosition);

        if (distanceToPlayer <= this.detectionRange && this.monster.canSeePlayer(playerPosition)) {
            this.stateMachine.changeState(MonsterStateType.ALERT);
            return;
        }

        // 調用父類更新方法，處理移動策略
        super.update(delta, playerPosition);
    }

    private calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
