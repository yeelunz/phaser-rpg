 // 傷害計算系統
// 包含了計算遊戲中各種傷害的方法
// filepath: c:\Users\asas1\OneDrive\Desktop\phaserRpg\src\core\combat\damageSystem.ts

import { Stats } from '../stats';

// 傷害類型枚舉
export enum DamageType {
    PHYSICAL = 'physical',  // 物理傷害
    MAGICAL = 'magical',    // 魔法傷害
    MIXED = 'mixed'         // 混合傷害
}

// 傷害結果接口
export interface DamageResult {
    isMiss: boolean;            // 是否未命中
    isCritical: boolean;        // 是否暴擊
    physicalDamage: number;     // 物理傷害部分
    magicalDamage: number;      // 魔法傷害部分
    totalDamage: number;        // 總傷害
    damageSources: string[];    // 傷害來源描述
}

// 技能或攻擊的傷害定義
export interface AttackDefinition {
    damageType: DamageType;                  // 傷害類型
    damageMultiplier: number;                // 基礎傷害倍率
    additionalEffects?: AdditionalEffect[];  // 附加效果
    skillName?: string;                      // 技能名稱 (可選)
}

// 附加效果接口
export interface AdditionalEffect {
    type: string;           // 效果類型
    chance: number;         // 觸發機率 (0-1)
    value: number;          // 效果數值
    duration?: number;      // 持續時間 (如果適用)
}

export class DamageSystem {
    
    /**
     * 計算傷害
     * @param attacker 攻擊者的能力值統計
     * @param defender 防禦者的能力值統計
     * @param attack 攻擊/技能定義
     * @returns 傷害結果
     */
    public static calculateDamage(
        attacker: Stats, 
        defender: Stats, 
        attack: AttackDefinition
    ): DamageResult {
        // 初始化傷害結果
        const result: DamageResult = {
            isMiss: false,
            isCritical: false,
            physicalDamage: 0,
            magicalDamage: 0,
            totalDamage: 0,
            damageSources: []
        };
        
        // 第1步：命中判定
        if (!this.isHit(attacker, defender)) {
            result.isMiss = true;
            result.damageSources.push("攻擊未命中");
            return result;
        }
        
        // 判定傷害類型
        switch (attack.damageType) {
            case DamageType.PHYSICAL:
                this.calculatePhysicalDamage(attacker, defender, attack, result);
                break;
                
            case DamageType.MAGICAL:
                this.calculateMagicalDamage(attacker, defender, attack, result);
                break;
                
            case DamageType.MIXED:
                this.calculateMixedDamage(attacker, defender, attack, result);
                break;
                
            default:
                console.error(`未知傷害類型: ${attack.damageType}`);
        }
        
        // 計算總傷害
        result.totalDamage = result.physicalDamage + result.magicalDamage;
        
        return result;
    }
    
    /**
     * 命中判定
     * @param attacker 攻擊者
     * @param defender 防禦者
     * @returns 是否命中
     */
    private static isHit(attacker: Stats, defender: Stats): boolean {
        // 命中率 (%) = SQRT(我方命中值 / (我方命中值 + 敵方迴避值)) * 100
        const hitRate = Math.sqrt(attacker.getAccuracy() / (attacker.getAccuracy() + defender.getEvasion())) * 100;
        
        // 產生1-100的隨機數
        const roll = Math.random() * 100;
        
        return roll <= hitRate;
    }
    
    /**
     * 計算物理傷害
     */
    private static calculatePhysicalDamage(
        attacker: Stats, 
        defender: Stats,
        attack: AttackDefinition,
        result: DamageResult
    ): void {
        // 3.1 基礎傷害
        const baseDamage = attacker.getPhysicalAttack() * attack.damageMultiplier;
        result.damageSources.push(`基礎物理傷害: ${attacker.getPhysicalAttack()} * ${attack.damageMultiplier} = ${baseDamage.toFixed(2)}`);
        
        // 3.2 初階減傷係數
        const effectiveDefense = defender.getPhysicalDefense() * (1 - attacker.getDefenseIgnore() / 100);
        const initialDamageReductionCoeff = effectiveDefense / (300 + effectiveDefense + attacker.getPhysicalPenetration());
        result.damageSources.push(`物理防禦: ${defender.getPhysicalDefense()} * (1 - ${attacker.getDefenseIgnore() / 100}) = ${effectiveDefense.toFixed(2)}`);
        result.damageSources.push(`初階減傷系數: ${initialDamageReductionCoeff.toFixed(4)}`);
        
        // 3.3 特殊防禦調整(目前留空，這裡是擴展點)
        const specialDefenseAdjustment = 1 - (0 * (1 - attacker.getDefenseIgnore() / 100));
        const finalDamageMultiplier = 1 - (initialDamageReductionCoeff / Math.max(0.0001, specialDefenseAdjustment));
        result.damageSources.push(`最終傷害系數: ${finalDamageMultiplier.toFixed(4)}`);
        
        // 3.6 判定是否爆擊
        result.isCritical = this.isCriticalHit(attacker);
        
        // 3.5 傷害浮動計算
        const fluctuationCoeff = this.calculateDamageFluctuation(attacker);
        result.damageSources.push(`傷害浮動系數: ${fluctuationCoeff.toFixed(4)}`);
        
        // 4. 最終傷害計算
        let damage = baseDamage * finalDamageMultiplier * fluctuationCoeff;
        
        if (result.isCritical) {
            const critDamage = attacker.getCritDamage();
            damage *= critDamage;
            result.damageSources.push(`爆擊! 爆擊傷害倍率: ${critDamage.toFixed(2)}`);
        }
        
        // 應用絕對減傷
        damage *= (1 - defender.getAbsoluteDamageReduction() / 100);
        // 應用傷害增加
        damage *= (1 + attacker.getPhysicalDamageBonus() / 100);
        // 應用易傷
        damage *= (1 + defender.getVulnerability() / 100);
        
        result.physicalDamage = Math.max(1, Math.floor(damage)); // 最低傷害為1
        result.damageSources.push(`最終物理傷害: ${result.physicalDamage}`);
    }
    
    /**
     * 計算魔法傷害
     */
    private static calculateMagicalDamage(
        attacker: Stats, 
        defender: Stats,
        attack: AttackDefinition,
        result: DamageResult
    ): void {
        // 3.1 基礎傷害
        const baseDamage = attacker.getMagicAttack() * attack.damageMultiplier;
        result.damageSources.push(`基礎魔法傷害: ${attacker.getMagicAttack()} * ${attack.damageMultiplier} = ${baseDamage.toFixed(2)}`);
        
        // 3.2 初階減傷係數
        const effectiveDefense = defender.getMagicDefense() * (1 - attacker.getDefenseIgnore() / 100);
        const initialDamageReductionCoeff = effectiveDefense / (300 + effectiveDefense + attacker.getMagicPenetration());
        result.damageSources.push(`魔法防禦: ${defender.getMagicDefense()} * (1 - ${attacker.getDefenseIgnore() / 100}) = ${effectiveDefense.toFixed(2)}`);
        result.damageSources.push(`初階減傷系數: ${initialDamageReductionCoeff.toFixed(4)}`);
        
        // 3.3 特殊防禦調整(目前留空，這裡是擴展點)
        const specialDefenseAdjustment = 1 - (0 * (1 - attacker.getDefenseIgnore() / 100));
        const finalDamageMultiplier = 1 - (initialDamageReductionCoeff / Math.max(0.0001, specialDefenseAdjustment));
        result.damageSources.push(`最終傷害系數: ${finalDamageMultiplier.toFixed(4)}`);
        
        // 3.6 判定是否爆擊
        result.isCritical = this.isCriticalHit(attacker);
        
        // 3.5 傷害浮動計算
        const fluctuationCoeff = this.calculateDamageFluctuation(attacker);
        result.damageSources.push(`傷害浮動系數: ${fluctuationCoeff.toFixed(4)}`);
        
        // 4. 最終傷害計算
        let damage = baseDamage * finalDamageMultiplier * fluctuationCoeff;
        
        if (result.isCritical) {
            const critDamage = attacker.getCritDamage();
            damage *= critDamage;
            result.damageSources.push(`爆擊! 爆擊傷害倍率: ${critDamage.toFixed(2)}`);
        }
        
        // 應用絕對減傷
        damage *= (1 - defender.getAbsoluteDamageReduction() / 100);
        // 應用傷害增加
        damage *= (1 + attacker.getMagicDamageBonus() / 100);
        // 應用易傷
        damage *= (1 + defender.getVulnerability() / 100);
        
        result.magicalDamage = Math.max(1, Math.floor(damage)); // 最低傷害為1
        result.damageSources.push(`最終魔法傷害: ${result.magicalDamage}`);
    }
    
    /**
     * 計算混合傷害 - 會打兩次獨立傷害
     */
    private static calculateMixedDamage(
        attacker: Stats, 
        defender: Stats,
        attack: AttackDefinition,
        result: DamageResult
    ): void {
        // 混合傷害 = 0.55*物理 + 0.55*魔法
        const mixedMultiplier = 0.55;
        
        // 創建物理和魔法攻擊定義 (使用原始倍率的55%)
        const physicalAttack: AttackDefinition = {
            damageType: DamageType.PHYSICAL,
            damageMultiplier: attack.damageMultiplier * mixedMultiplier,
            skillName: attack.skillName ? `${attack.skillName} (物理部分)` : undefined
        };
        
        const magicalAttack: AttackDefinition = {
            damageType: DamageType.MAGICAL,
            damageMultiplier: attack.damageMultiplier * mixedMultiplier,
            skillName: attack.skillName ? `${attack.skillName} (魔法部分)` : undefined
        };
        
        // 計算物理部分
        this.calculatePhysicalDamage(attacker, defender, physicalAttack, result);
        
        // 計算魔法部分 (注意：魔法部分可能有單獨的爆擊判定)
        const isCriticalBeforeRoll = result.isCritical; // 保存物理爆擊結果
        this.calculateMagicalDamage(attacker, defender, magicalAttack, result);
        
        // 更新爆擊狀態 (如果物理或魔法任一部分爆擊，整體視為爆擊)
        result.isCritical = isCriticalBeforeRoll || result.isCritical;
        
        // 最終傷害已經在各自計算中累加到result中
        result.damageSources.push(`混合傷害總和: ${result.totalDamage}`);
    }
    
    /**
     * 判定是否爆擊
     */
    private static isCriticalHit(attacker: Stats): boolean {
        // 爆擊率轉為小數 (0-1)
        const critRate = attacker.getCritRate();
        return Math.random() < critRate;
    }
    
    /**
     * 計算傷害浮動係數
     */
    private static calculateDamageFluctuation(attacker: Stats): number {
        const damageStability = attacker.getDamageStability();
        
        // 確保傷害穩定值足夠高，以便計算有效
        const effectiveStability = Math.max(10, damageStability);
        
        // 浮動上限基礎
        const highBoundBase = Math.log10(Math.sqrt(10 * Math.sqrt(effectiveStability)));
        
        // 下限浮動率因子
        const logValue = Math.log10(effectiveStability);
        const lowBoundFactor = Math.sqrt(1 - (1 / Math.max(1, logValue)));
        
        // 浮動下限係數
        const lowBoundCoeff = lowBoundFactor * highBoundBase;
        
        // 浮動上限係數
        const highBoundCoeff = highBoundBase;
        
        // 在下限和上限之間隨機選取一個值
        return lowBoundCoeff + Math.random() * (highBoundCoeff - lowBoundCoeff);
    }
    
    /**
     * 應用傷害到目標
     * @param target 目標的能力值統計
     * @param damageResult 傷害結果
     * @returns 目標是否死亡
     */
    public static applyDamage(target: Stats, damageResult: DamageResult): boolean {
        if (damageResult.isMiss) {
            return false; // 未命中不造成傷害
        }
        
        // 應用總傷害
        target.takeDamage(damageResult.totalDamage);
        
        // 檢查目標是否死亡
        return target.getCurrentHP() <= 0;
    }
}
