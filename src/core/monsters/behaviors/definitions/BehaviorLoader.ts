import { IMonsterBehavior } from '../IMonsterBehavior';
import { IMonsterEntity } from '../../IMonsterEntity';
import { MonsterStateMachine } from '../MonsterStateMachine';
import { WanderingState } from '../states/WanderingState';
import { AlertState } from '../states/AlertState';
import { ChaseState } from '../states/ChaseState';
import { SkillPool } from '../skills/SkillPool';

/**
 * 行為定義註冊接口
 * 所有怪物行為定義都應該實現此接口
 */
export interface IBehaviorRegistration {
    behaviorId: string;
    createBehavior(): IMonsterBehavior;
}

/**
 * 行為定義加載器
 * 使用自動發現機制註冊怪物行為
 */
export class BehaviorLoader {
    // 行為配置註冊表
    private static behaviorConfigs: Map<string, IMonsterBehavior> = new Map();
    
    // 行為註冊器列表
    private static behaviorRegistrations: IBehaviorRegistration[] = [];    /**
     * 註冊行為定義
     */
    static registerBehavior(registration: IBehaviorRegistration): void {
        this.behaviorRegistrations.push(registration);
        console.log(`已註冊怪物行為: ${registration.behaviorId}`);
    }    /**
     * 初始化所有已註冊的行為配置
     */
    static initializeBehaviors(): void {
        console.log('開始初始化怪物行為配置...');
        
        for (const registration of this.behaviorRegistrations) {
            try {
                const behavior = registration.createBehavior();
                this.behaviorConfigs.set(registration.behaviorId, behavior);
                console.log(`成功載入行為配置: ${registration.behaviorId}`);
            } catch (error) {
                console.error(`載入行為配置失敗: ${registration.behaviorId}`, error);
            }
        }
        
        console.log(`行為配置初始化完成，共載入 ${this.behaviorConfigs.size} 個行為`);
    }    /**
     * 獲取行為配置
     */
    static getBehaviorConfig(behaviorId: string): IMonsterBehavior | null {
        return this.behaviorConfigs.get(behaviorId) || null;
    }    /**
     * 創建遊蕩狀態
     */
    static createWanderingState(monster: IMonsterEntity, stateMachine: MonsterStateMachine, config: IMonsterBehavior): WanderingState {
        return new WanderingState(monster, stateMachine, config);
    }    /**
     * 創建警戒狀態
     */
    static createAlertState(monster: IMonsterEntity, stateMachine: MonsterStateMachine, config?: IMonsterBehavior): AlertState {
        return new AlertState(monster, stateMachine, config);
    }

    /**
     * 創建追擊狀態
     */
    static createChaseState(monster: IMonsterEntity, stateMachine: MonsterStateMachine, config: IMonsterBehavior): ChaseState {
        return new ChaseState(monster, stateMachine, config);
    }    /**
     * 創建技能池（暫時簡化實現）
     */
    static createSkillPool(_skillConfigs: any[], _activationInterval: number): SkillPool | null {
        // 暫時返回null，因為技能模板還沒實現
        return null;
    }

    /**
     * 清理緩存
     */
    static clearCache(): void {
        this.behaviorConfigs.clear();
    }

    /**
     * 獲取所有已註冊的行為ID
     */
    static getRegisteredBehaviorIds(): string[] {
        return Array.from(this.behaviorConfigs.keys());
    }

    /**
     * 檢查行為是否已註冊
     */
    static hasBehavior(behaviorId: string): boolean {
        return this.behaviorConfigs.has(behaviorId);
    }
}
