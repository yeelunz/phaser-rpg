// filepath: c:\Users\asas1\Desktop\phaser-rpg\src\core\monsters\behaviors\states\AlertState.ts
import { IMonsterEntity } from "../../IMonsterEntity";
import { MonsterStateType } from "../MonsterStateType";
import { BaseState } from "../movement/BaseState";
import { IMonsterBehavior } from "../IMonsterBehavior";
import { MonsterStateMachine } from "../MonsterStateMachine";

/**
 * 警戒狀態 - 使用移動策略系統
 * 當怪物失去玩家視線但仍處於警戒狀態時的行為
 */
export class AlertState extends BaseState {
    public readonly type: MonsterStateType = MonsterStateType.ALERT;
    
    private alertDuration: number = 0;
    private maxAlertDuration: number = 2000; // 2秒警戒時間
     private minAlertDuration: number = 500;  // 新增：最小警戒時間 0.5秒
    private lastPlayerPosition: { x: number; y: number } | null = null;

    constructor(monster: IMonsterEntity, stateMachine: MonsterStateMachine, behaviorConfig?: IMonsterBehavior) {
        super(monster, stateMachine);
        
        if (behaviorConfig) {
            const alertState = behaviorConfig.states[MonsterStateType.ALERT];
            if (alertState?.movementStrategy) {
                // 使用新的移動策略
                this.setMovementStrategy(alertState.movementStrategy);
            } else {
                // 默認使用維持距離移動策略，保持在最後已知位置附近
                this.setMovementStrategy({
                    type: 'maintainDistance',
                    params: {
                        minDistance: 50,
                        maxDistance: 100,
                        speedMultiplier: 0.5
                    }
                });
            }
            
            // 從配置中獲取參數
            this.maxAlertDuration = alertState?.duration || this.maxAlertDuration;
        } else {
            // 向後兼容，使用默認移動策略
            this.setMovementStrategy({
                type: 'maintainDistance',
                params: {
                    minDistance: 50,
                    maxDistance: 100,
                    speedMultiplier: 0.5
                }
            });
        }
    }

    enter(): void {
        this.alertDuration = 0;
        this.lastPlayerPosition = null;
        
        // 觸發警戒動畫或音效
        this.monster.playAnimation('alert');
    }

    exit(): void {
        this.lastPlayerPosition = null;
    }

    update(deltaTime: number, playerPosition: { x: number; y: number }): void {
        this.alertDuration += deltaTime;

        // 只有在最小警戒時間過後才檢查是否轉換到追擊狀態
        if (this.alertDuration >= this.minAlertDuration && this.monster.canSeePlayer(playerPosition)) {
            // 轉換到追擊狀態
            this.stateMachine.changeState(MonsterStateType.CHASE);
            return;
        }

        // 設定搜索目標為最後已知的玩家位置
        if (!this.lastPlayerPosition) {
            this.lastPlayerPosition = { x: playerPosition.x, y: playerPosition.y };
        }

        // 調用父類更新方法，處理移動策略
        // 將最後已知位置作為目標傳遞給移動策略
        const targetPosition = this.lastPlayerPosition || playerPosition;
        super.update(deltaTime, targetPosition);

        // 警戒時間結束，返回漫遊狀態
        if (this.alertDuration >= this.maxAlertDuration) {
            this.stateMachine.changeState(MonsterStateType.WANDERING);
        }
    }

    handleDamage(sourcePosition: { x: number; y: number }): void {
        // 受到攻擊時立即轉換到追擊狀態
        this.lastPlayerPosition = sourcePosition;
        this.stateMachine.changeState(MonsterStateType.CHASE);
    }
}