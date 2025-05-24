// 移動策略系統索引檔案
// 導出所有移動策略相關的組件

export * from './movement/IMovementStrategy';
export * from './movement/MovementStrategyFactory';
export * from './movement/BaseState';
export * from './movement/StationaryMovement';
export * from './movement/RandomWanderMovement';
export * from './movement/PathPatrolMovement';
export * from './movement/ChaseTargetMovement';
export * from './movement/MaintainDistanceMovement';

// 導出新的狀態類
import { WanderingState as WanderingState_new } from './states/WanderingState_new';
import { AlertState as AlertState_new } from './states/AlertState_new';
import { ChaseState as ChaseState_new } from './states/ChaseState_new';

export {
    WanderingState_new,
    AlertState_new,
    ChaseState_new
};
