import { IMonsterBehavior } from '../IMonsterBehavior';
import { MonsterStateType } from '../MonsterStateType';
import { BehaviorLoader, IBehaviorRegistration } from './BehaviorLoader';

/**
 * 石像守衛行為註冊器
 */
class StoneGuardianBehaviorRegistration implements IBehaviorRegistration {
    behaviorId = 'stone_guardian';

    createBehavior(): IMonsterBehavior {
        console.debug('[StoneGuardianBehavior] 建立石像守衛行為配置');
        return {
            behaviorId: 'stone_guardian',
            detectionRange: 100, // 100像素檢測範圍，基於碰撞箱
              states: {
                // 遊蕩模式：靜止不動，無技能
                [MonsterStateType.WANDERING]: {
                    skillPool: null, // 不執行任何動作
                    movementStrategy: {
                        type: 'stationary',
                        params: {}
                    }
                },
                
                // 警戒模式：自動轉換到追擊模式
                [MonsterStateType.ALERT]: {
                    skillPool: null,
                    duration: 1000, // 極短時間，立即轉換到追擊模式
                    minDuration: 300, // 最小警戒時間（新增）
                    movementStrategy: {
                        type: 'stationary',
                        params: {
                            faceTarget: true
                        }
                    }
                },
                
                // 追擊模式：使用AOE攻擊，移動緩慢
                [MonsterStateType.CHASE]: {
                    skillPool: BehaviorLoader.createSkillPool([
                        {
                            type: 'aoe',
                            params: {
                                name: '大地震擊',
                                maxCooldown: 5000, // 5秒冷卻
                                weight: 1.0,
                                radius: 120, // AOE範圍
                                damageMultiplier: 1.0, // 100%物理傷害
                                preCastTime: 100, // 0.1秒前搖
                                postCastTime: 500, // 0.5秒後搖
                                damageType: 'physical',
                                ignoreDefense: 0,
                                knockbackForce: 200,
                                penetration: false
                            }
                        }
                    ], 10000), // 10秒技能使用頻率
                    movementStrategy: {
                        type: 'chaseTarget',
                        params: {
                            speed: 50, // 緩慢移動
                            giveUpDistance: 200
                        }
                    }
                }
            }
        };
    }
}

console.debug('[StoneGuardianBehavior] 準備註冊石像守衛行為');

// 自動註冊石像守衛行為
BehaviorLoader.registerBehavior(new StoneGuardianBehaviorRegistration());

console.debug('[StoneGuardianBehavior] 石像守衛行為已註冊完成');
