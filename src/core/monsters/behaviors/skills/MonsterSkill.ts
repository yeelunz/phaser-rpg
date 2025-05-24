import { IMonsterEntity } from "../../IMonsterEntity";
import { SkillCondition, SkillConditionType, HpThresholdParams, DistanceConditionParams, StateConditionParams, EnergyThresholdParams } from "./SkillCondition";
import { CommonSkillParams } from "./params/CommonSkillParams";

// 怪物技能的抽象基礎類別
export abstract class MonsterSkill {
    // 技能基本屬性
    public readonly name: string;
    public readonly maxCooldown: number;
    public readonly weight: number;
    public readonly conditions: SkillCondition[] | null;
    public readonly chainable: boolean;
    public readonly preCastTime: number;
    public readonly postCastTime: number;
    
    // 傷害相關屬性
    public readonly damageMultiplier: number;
    public readonly ignoreDefense: number;
    public readonly maxHpDamagePercent: number;
    public readonly damageType: 'physical' | 'magic' | 'mixed';
    public readonly damageTicks: number;
    
    // 運行時狀態
    public currentCooldown: number = 0;
    public isCasting: boolean = false;

    constructor(params: CommonSkillParams) {
        this.name = params.name;
        this.maxCooldown = params.maxCooldown;
        this.weight = params.weight;
        this.conditions = params.conditions || null;
        this.chainable = params.chainable || false;
        this.preCastTime = params.preCastTime || 0;
        this.postCastTime = params.postCastTime || 0;
        
        // 傷害相關參數
        this.damageMultiplier = params.damageMultiplier || 1.0;
        this.ignoreDefense = params.ignoreDefense || 0;
        this.maxHpDamagePercent = params.maxHpDamagePercent || 0;
        this.damageType = params.damageType || 'physical';
        this.damageTicks = params.damageTicks || 1;
    }

    // 檢查技能是否可以使用
    canUse(monster: IMonsterEntity, target?: { x: number; y: number }): boolean {
        // 檢查冷卻
        if (this.currentCooldown > 0) {
            return false;
        }

        // 檢查是否正在施法
        if (this.isCasting) {
            return false;
        }

        // 檢查所有條件
        if (this.conditions) {
            return this.evaluateConditions(monster, target);
        }

        return true;
    }

    // 評估技能使用條件
    private evaluateConditions(monster: IMonsterEntity, target?: { x: number; y: number }): boolean {
        if (!this.conditions) return true;

        for (const condition of this.conditions) {
            if (!this.evaluateCondition(condition, monster, target)) {
                return false;
            }
        }

        return true;
    }

    // 評估單個條件
    private evaluateCondition(condition: SkillCondition, monster: IMonsterEntity, target?: { x: number; y: number }): boolean {
        switch (condition.type) {
            case SkillConditionType.HP_THRESHOLD:
                return this.evaluateHpCondition(condition.params as HpThresholdParams, monster);
            
            case SkillConditionType.DISTANCE_TO_TARGET:
                return this.evaluateDistanceCondition(condition.params as DistanceConditionParams, monster, target);
            
            case SkillConditionType.MONSTER_STATE_IS:
                return this.evaluateStateCondition(condition.params as StateConditionParams, monster);
            
            case SkillConditionType.ENERGY_THRESHOLD:
                return this.evaluateEnergyCondition(condition.params as EnergyThresholdParams, monster);
            
            default:
                console.warn(`Unknown skill condition type: ${condition.type}`);
                return true; // 未知條件預設為通過
        }
    }

    private evaluateHpCondition(params: HpThresholdParams, monster: IMonsterEntity): boolean {
        const hpRatio = monster.getStats().getCurrentHP() / monster.getStats().getMaxHP();
        return this.compareValues(hpRatio, params.threshold, params.operator);
    }

    private evaluateDistanceCondition(params: DistanceConditionParams, monster: IMonsterEntity, target?: { x: number; y: number }): boolean {
        if (!target) return false;
        
        const monsterPos = monster.getPosition();
        const distance = Math.sqrt(
            Math.pow(target.x - monsterPos.x, 2) + Math.pow(target.y - monsterPos.y, 2)
        );
        
        return this.compareValues(distance, params.distance, params.operator);
    }

    private evaluateStateCondition(params: StateConditionParams, monster: IMonsterEntity): boolean {
        return params.allowedStates.includes(monster.getCurrentState());
    }

    private evaluateEnergyCondition(params: EnergyThresholdParams, monster: IMonsterEntity): boolean {
        const energyRatio = monster.getStats().getCurrentEnergy() / monster.getStats().getMaxEnergy();
        return this.compareValues(energyRatio, params.threshold, params.operator);
    }

    private compareValues(value: number, threshold: number, operator: '<' | '>' | '<=' | '>=' | '='): boolean {
        switch (operator) {
            case '<': return value < threshold;
            case '>': return value > threshold;
            case '<=': return value <= threshold;
            case '>=': return value >= threshold;
            case '=': return Math.abs(value - threshold) < 0.001; // 浮點數相等比較
            default: return false;
        }
    }

    // 更新技能冷卻
    updateCooldown(delta: number): void {
        if (this.currentCooldown > 0) {
            this.currentCooldown = Math.max(0, this.currentCooldown - delta);
        }
    }

    // 啟動技能冷卻
    startCooldown(): void {
        this.currentCooldown = this.maxCooldown;
    }

    // 抽象方法：執行技能效果
    abstract execute(monster: IMonsterEntity, target?: { x: number; y: number }): Promise<void>;

    // 輔助方法：處理前後搖
    protected async handleCastTimes(preCastCallback?: () => void, postCastCallback?: () => void): Promise<void> {
        this.isCasting = true;

        // 前搖
        if (this.preCastTime > 0) {
            if (preCastCallback) preCastCallback();
            await this.delay(this.preCastTime);
        }

        // 後搖
        if (this.postCastTime > 0) {
            if (postCastCallback) postCastCallback();
            await this.delay(this.postCastTime);
        }

        this.isCasting = false;
    }

    // 延遲輔助方法
    protected delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
