import { IMonsterBehavior } from '../IMonsterBehavior';
import { MonsterStateType } from '../MonsterStateType';
import { BehaviorLoader, IBehaviorRegistration } from './BehaviorLoader';

/**
 * 哥布林遊蕩者行為註冊器
 * 這個行為使哥布林只進行遊蕩，用於測試移動系統
 */
class GoblinWandererBehaviorRegistration implements IBehaviorRegistration {
    behaviorId = 'goblin_wanderer';

    createBehavior(): IMonsterBehavior {        console.debug('[GoblinWandererBehavior] 建立哥布林遊蕩者行為配置');
        return {
            behaviorId: 'goblin_wanderer',
            detectionRange: 120, // 設置合理的偵測範圍，讓玩家可以看到偵測框
              states: {
                // 遊蕩模式：隨機遊蕩，無技能                
                [MonsterStateType.WANDERING]: {
                    skillPool: null, // 無技能
                    movementStrategy: {
                        type: 'randomWander',
                        params: {
                            changeDirectionTime: Math.floor(2000 + Math.random() * 1500), // 變化方向的間隔時間
                            speed: 0.08 + Math.random() * 0.05, // 讓每個哥布林速度略有不同
                            maxDistance: 800 + Math.random() * 80, // 遊蕩範圍個體差異化
                            idleChance: 0.3, // 閒置的機率
                            idleTime: Math.floor(1500 + Math.random() * 1500) // 閒置時間也有變化
                        }
                    }
                },
                
                // 警戒模式：立即返回遊蕩狀態
                [MonsterStateType.ALERT]: {
                    skillPool: null,
                    duration: 2000, // 極短時間，立即轉回遊蕩模式
                    minDuration: 300, // 最小警戒時間（新增）
                    movementStrategy: {
                        type: 'stationary',
                        params: {}
                    }
                },
                
                // 追擊模式：不應該進入此狀態，但為了安全設置為返回遊蕩
                [MonsterStateType.CHASE]: {
                    skillPool: null,
                    movementStrategy: {
                        type: 'randomWander',
                        params: {
                            changeDirectionTime: Math.floor(2000 + Math.random() * 1500), // 變化方向的間隔時間
                            speed: 0.08 + Math.random() * 0.05, // 讓每個哥布林速度略有不同
                            maxDistance: 800 + Math.random() * 80, // 遊蕩範圍個體差異化
                            idleChance: 0.3, // 閒置的機率
                            idleTime: Math.floor(1500 + Math.random() * 1500) // 閒置時間也有變化
                        }
                    }
                }
            }
        };
    }
}

console.debug('[GoblinWandererBehavior] 準備註冊哥布林遊蕩者行為');

// 自動註冊哥布林遊蕩者行為
BehaviorLoader.registerBehavior(new GoblinWandererBehaviorRegistration());

console.debug('[GoblinWandererBehavior] 哥布林遊蕩者行為已註冊完成');
