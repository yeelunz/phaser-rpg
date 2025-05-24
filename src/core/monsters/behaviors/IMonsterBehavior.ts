import { MonsterStateType } from "./MonsterStateType";
import { SkillPool } from "./skills/SkillPool";
import { IMonsterEntity } from "../IMonsterEntity";

/**
 * 移動策略參數接口
 */
export interface IMovementStrategyConfig {
    // 移動策略類型
    type: 'stationary' | 'randomWander' | 'pathPatrol' | 'chaseTarget' | 'maintainDistance';
    // 移動策略參數
    params?: any;
}

/**
 * 怪物行為接口
 */
export interface IMonsterBehavior {
    behaviorId: string;
    detectionRange: number;
    states: {
        [MonsterStateType.WANDERING]?: {
            skillPool: SkillPool | null;
            movementStrategy?: IMovementStrategyConfig; // 移動策略配置
        };
        [MonsterStateType.ALERT]?: {
            skillPool: SkillPool | null;
            movementStrategy?: IMovementStrategyConfig; // 移動策略配置
            duration: number; // 警戒狀態持續時間
            minDuration: number, // 最小警戒時間（新增）
            lookAround?: boolean; // 是否環顧四周
        };
        [MonsterStateType.CHASE]?: {
            skillPool: SkillPool | null;
            movementStrategy?: IMovementStrategyConfig; // 移動策略配置
        };
        // 其他可能的狀態，如ATTACKING, HURT等
    };
}
