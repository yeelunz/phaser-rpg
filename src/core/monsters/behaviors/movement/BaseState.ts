import { IMonsterEntity } from '../../IMonsterEntity';
import { MonsterStateType } from '../MonsterStateType';
import { SkillPool } from '../skills/SkillPool';
import { IMovementStrategy } from './IMovementStrategy';
import { MovementStrategyFactory } from './MovementStrategyFactory';
import { IMovementStrategyConfig } from '../IMonsterBehavior';

// 避免循環依賴，使用前向聲明
interface MonsterStateMachine {
    changeState(newStateKey: MonsterStateType): void;
}

/**
 * 抽象基礎狀態類
 * 所有具體狀態類必須繼承此類
 */
export abstract class BaseState {
    protected monster: IMonsterEntity;
    protected stateMachine: MonsterStateMachine;
    protected skillPool: SkillPool | null = null;
    protected movementStrategy: IMovementStrategy | null = null;
    
    // 狀態類型
    abstract get type(): MonsterStateType;
    
    constructor(monster: IMonsterEntity, stateMachine: MonsterStateMachine) {
        this.monster = monster;
        this.stateMachine = stateMachine;
    }
    
    /**
     * 設置技能池
     */
    setSkillPool(skillPool: SkillPool | null): void {
        this.skillPool = skillPool;
    }
    
    /**
     * 設置移動策略
     */
    setMovementStrategy(strategyConfig: IMovementStrategyConfig | null): void {
        if (!strategyConfig) {
            this.movementStrategy = null;
            return;
        }
        
        this.movementStrategy = MovementStrategyFactory.create(
            strategyConfig.type, 
            strategyConfig.params
        );
    }
    
    /**
     * 進入狀態時調用
     */
    enter(): void {
        // 基礎實現，子類可以覆蓋
    }
    
    /**
     * 退出狀態時調用
     */
    exit(): void {
        // 基礎實現，子類可以覆蓋
    }
    
    /**
     * 狀態更新邏輯
     */
    update(delta: number, playerPosition?: { x: number, y: number }): void {
        // 執行移動策略
        if (this.movementStrategy && playerPosition) {
            this.movementStrategy.move(this.monster, delta, playerPosition);
        }
        
        // 執行技能
        if (this.skillPool && playerPosition) {
            this.skillPool.update(this.monster, delta, playerPosition);
        }
    }
    
    /**
     * 處理受傷事件
     */
    handleDamage?(sourcePosition: { x: number, y: number }): void;
}
