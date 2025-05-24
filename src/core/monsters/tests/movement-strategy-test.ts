// 移動策略測試腳本
import { IMonsterBehavior } from '../behaviors/IMonsterBehavior';
import { MonsterStateType } from '../behaviors/MonsterStateType';
import { BehaviorLoader, IBehaviorRegistration } from '../behaviors/definitions/BehaviorLoader';

/**
 * 測試不同移動策略的怪物行為
 */
class MovementStrategyTestBehaviorRegistration implements IBehaviorRegistration {
    behaviorId = 'movement_strategy_test';

    createBehavior(): IMonsterBehavior {
        console.debug('[MovementStrategyTest] 創建移動策略測試行為');
        return {
            behaviorId: 'movement_strategy_test',
            detectionRange: 200, // 標準偵測範圍
            
            states: {
                // 遊蕩模式：使用隨機遊蕩策略
                [MonsterStateType.WANDERING]: {
                    skillPool: null,
                    movementStrategy: {
                        type: 'randomWander',
                        params: {
                            changeDirectionTime: 2000, // 2秒改變一次方向
                            speed: 70,                // 70% 基本速度
                            maxDistance: 250,         // 最大遊蕩距離
                            idleChance: 0.4,          // 40%機率進入閒置狀態
                            idleTime: 1500            // 閒置1.5秒
                        }
                    }
                },
                
                // 警戒模式：測試維持距離策略
                [MonsterStateType.ALERT]: {
                    skillPool: null,
                    duration: 3000, // 3秒警戒時間
                    lookAround: true,
                    movementStrategy: {
                        type: 'maintainDistance',
                        params: {
                            preferredDistance: 150, // 保持150像素距離
                            tolerance: 20,         // 20像素容差
                            circleTarget: true,    // 環繞目標移動
                            speed: 80              // 80% 基本速度
                        }
                    }
                },
                
                // 追擊模式：使用路徑巡邏策略（模擬特殊的追擊模式）
                [MonsterStateType.CHASE]: {
                    skillPool: null,
                    movementStrategy: {
                        type: 'pathPatrol',
                        params: {
                            // 動態生成路徑點
                            createDynamicPath: true,
                            // 每次更新時更新路徑點
                            updatePathInterval: 1000,
                            // 到達路徑點等待時間
                            waitTime: 500,
                            // 是否循環巡邏
                            loop: true,
                            // 移動速度
                            speed: 100
                        }
                    }
                }
            }
        };
    }
}

// 注冊測試行為
BehaviorLoader.registerBehavior(new MovementStrategyTestBehaviorRegistration());

/**
 * 蜘蛛怪物的測試行為：追擊時使用維持距離策略
 */
class SpiderMovementTestBehaviorRegistration implements IBehaviorRegistration {
    behaviorId = 'spider_movement_test';

    createBehavior(): IMonsterBehavior {
        console.debug('[SpiderMovementTest] 創建蜘蛛移動策略測試行為');
        return {
            behaviorId: 'spider_movement_test',
            detectionRange: 150, // 偵測範圍
            
            states: {
                // 遊蕩模式：使用靜止策略，偶爾移動
                [MonsterStateType.WANDERING]: {
                    skillPool: null,
                    movementStrategy: {
                        type: 'randomWander',
                        params: {
                            changeDirectionTime: 4000, // 4秒改變一次方向
                            speed: 40,                // 低速移動
                            maxDistance: 100,         // 小範圍遊蕩
                            idleChance: 0.7,          // 70%機率進入閒置
                            idleTime: 3000            // 閒置3秒
                        }
                    }
                },
                
                // 警戒模式：快速靠近
                [MonsterStateType.ALERT]: {
                    skillPool: null,
                    duration: 1000,
                    lookAround: false,
                    movementStrategy: {
                        type: 'chaseTarget',
                        params: {
                            speed: 120, // 快速移動
                            giveUpDistance: 250
                        }
                    }
                },
                
                // 追擊模式：保持距離並爬行環繞
                [MonsterStateType.CHASE]: {
                    skillPool: null,
                    movementStrategy: {
                        type: 'maintainDistance',
                        params: {
                            preferredDistance: 80,  // 保持80像素的攻擊距離
                            tolerance: 15,         // 15像素容差
                            circleTarget: true,    // 環繞目標
                            speed: 90              // 90% 基本速度
                        }
                    }
                }
            }
        };
    }
}

// 注冊蜘蛛測試行為
BehaviorLoader.registerBehavior(new SpiderMovementTestBehaviorRegistration());

console.log('[MovementStrategyTest] 移動策略測試行為已註冊完成');
