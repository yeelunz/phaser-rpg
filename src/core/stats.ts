// 基礎角色能力值統計系統
import { StatType } from './data/dataloader';

export class Stats {
    // 裝備加成相關
    private equipmentBonuses: Partial<Record<StatType, number>> = {};
    
    // 基礎屬性（白板屬性）
    private Level: number = 1;

    private baseHP: number = 100;
    private baseEnergy: number = 100;
    private basePhysicalAttack: number = 10;
    private basePhysicalDefense: number = 10;
    private baseMagicAttack: number = 10;
    private baseMagicDefense: number = 10;
    private baseAccuracy: number = 100;
    private baseEvasion: number = 5;
    private basePhysicalPenetration: number = 10;
    private baseMagicPenetration: number = 10;
    private baseAbsoluteDamageReduction: number = 0; // 絕對減傷 (%)
    private baseMagicDamageBonus: number = 0; // 魔法傷害 (%)    
    private basePhysicalDamageBonus: number = 0; // 物理傷害 (%)
    private baseDefenseIgnore: number = 0; // 無視敵方防禦力 (%)
    private baseMoveSpeed: number = 300;
    private baseCritRate: number = 0.05; // 爆擊率 (小數，0.05 = 5%)
    private baseDamageStability: number = 300; // 傷害穩定值
    private baseVulnerability: number = 0; // 易傷 (%)
    private baseResistance: number = 0; // 抗性 (%)
    private baseEnergyRecovery: number = 100; // 能量回復速度

    // 當前狀態
    private currentHP: number;
    private currentEnergy: number;
    private currentExp: number;

    /**
     * 建構子
     */
    constructor() {
        // 初始化當前值為最大值
        this.currentHP = this.getMaxHP();
        this.currentEnergy = this.getMaxEnergy();
        this.currentExp = 0;
        
        // 初始化裝備加成
        this.resetEquipmentBonuses();
    }

    // 更新裝備加成
    updateEquipmentBonuses(bonuses: Partial<Record<StatType, number>>): void {
        // 重置所有裝備加成
        this.resetEquipmentBonuses();
        
        // 應用新的裝備加成
        this.equipmentBonuses = { ...bonuses };
        
        // 確保當前值不超過最大值
        this.setCurrentHP(this.currentHP);
        this.setCurrentEnergy(this.currentEnergy);
    }
    
    // 重置所有裝備加成
    resetEquipmentBonuses(): void {
        this.equipmentBonuses = {};
    }

    // 為了保持向後兼容
    resetBonuses(): void {
        // 清空所有裝備加成
        this.resetEquipmentBonuses();
    }

    // 為了保持向後兼容
    applyEquipmentBonuses(equipment: any): void {
        if (!equipment || !equipment.bonusStats) {
            return;
        }
        
        const bonusesMap: Partial<Record<StatType, number>> = {};
        const statsSource = equipment.bonusStats;
        
        // 將裝備加成轉換為 StatType 映射
        if (statsSource.hp) bonusesMap[StatType.HP] = parseFloat(statsSource.hp);
        if (statsSource.energy) bonusesMap[StatType.ENERGY] = parseFloat(statsSource.energy);
        if (statsSource.physicalAttack) bonusesMap[StatType.PHYSICAL_ATTACK] = parseFloat(statsSource.physicalAttack);
        if (statsSource.physicalDefense) bonusesMap[StatType.PHYSICAL_DEFENSE] = parseFloat(statsSource.physicalDefense);
        if (statsSource.magicAttack) bonusesMap[StatType.MAGIC_ATTACK] = parseFloat(statsSource.magicAttack);
        if (statsSource.magicDefense) bonusesMap[StatType.MAGIC_DEFENSE] = parseFloat(statsSource.magicDefense);
        if (statsSource.accuracy) bonusesMap[StatType.ACCURACY] = parseFloat(statsSource.accuracy);
        if (statsSource.evasion) bonusesMap[StatType.EVASION] = parseFloat(statsSource.evasion);
        if (statsSource.physicalPenetration) bonusesMap[StatType.PHYSICAL_PENETRATION] = parseFloat(statsSource.physicalPenetration);
        if (statsSource.magicPenetration) bonusesMap[StatType.MAGIC_PENETRATION] = parseFloat(statsSource.magicPenetration);
        if (statsSource.absoluteDamageReduction) bonusesMap[StatType.ABSOLUTE_DAMAGE_REDUCTION] = parseFloat(statsSource.absoluteDamageReduction);
        if (statsSource.magicDamageBonus) bonusesMap[StatType.MAGIC_DAMAGE_BONUS] = parseFloat(statsSource.magicDamageBonus);
        if (statsSource.physicalDamageBonus) bonusesMap[StatType.PHYSICAL_DAMAGE_BONUS] = parseFloat(statsSource.physicalDamageBonus);
        if (statsSource.defenseIgnore) bonusesMap[StatType.DEFENSE_IGNORE] = parseFloat(statsSource.defenseIgnore);
        if (statsSource.moveSpeed) bonusesMap[StatType.MOVE_SPEED] = parseFloat(statsSource.moveSpeed);
        if (statsSource.critRate) bonusesMap[StatType.CRIT_RATE] = parseFloat(statsSource.critRate);
        if (statsSource.damageStability) bonusesMap[StatType.DAMAGE_STABILITY] = parseFloat(statsSource.damageStability);
        if (statsSource.vulnerability) bonusesMap[StatType.VULNERABILITY] = parseFloat(statsSource.vulnerability);
        if (statsSource.resistance) bonusesMap[StatType.RESISTANCE] = parseFloat(statsSource.resistance);
        if (statsSource.energyRecovery) bonusesMap[StatType.ENERGY_RECOVERY] = parseFloat(statsSource.energyRecovery);
        
        // 將現有的裝備加成與新的加成合併
        const updatedBonuses: Partial<Record<StatType, number>> = {...this.equipmentBonuses};
        for (const [statType, value] of Object.entries(bonusesMap)) {
            const stat = statType as StatType;
            updatedBonuses[stat] = (updatedBonuses[stat] || 0) + value;
        }
        
        // 更新裝備加成
        this.updateEquipmentBonuses(updatedBonuses);
    }

    // 獲取裝備加成值
    getEquipHP(): number {
        return this.equipmentBonuses[StatType.HP] || 0;
    }

    getEquipEnergy(): number {
        return this.equipmentBonuses[StatType.ENERGY] || 0;
    }

    getEquipPhysicalAttack(): number {
        return this.equipmentBonuses[StatType.PHYSICAL_ATTACK] || 0;
    }

    getEquipPhysicalDefense(): number {
        return this.equipmentBonuses[StatType.PHYSICAL_DEFENSE] || 0;
    }

    getEquipMagicAttack(): number {
        return this.equipmentBonuses[StatType.MAGIC_ATTACK] || 0;
    }

    getEquipMagicDefense(): number {
        return this.equipmentBonuses[StatType.MAGIC_DEFENSE] || 0;
    }

    getEquipAccuracy(): number {
        return this.equipmentBonuses[StatType.ACCURACY] || 0;
    }

    getEquipEvasion(): number {
        return this.equipmentBonuses[StatType.EVASION] || 0;
    }

    getEquipPhysicalPenetration(): number {
        return this.equipmentBonuses[StatType.PHYSICAL_PENETRATION] || 0;
    }

    getEquipMagicPenetration(): number {
        return this.equipmentBonuses[StatType.MAGIC_PENETRATION] || 0;
    }

    getEquipAbsoluteDamageReduction(): number {
        return this.equipmentBonuses[StatType.ABSOLUTE_DAMAGE_REDUCTION] || 0;
    }

    getEquipMagicDamageBonus(): number {
        return this.equipmentBonuses[StatType.MAGIC_DAMAGE_BONUS] || 0;
    }

    getEquipPhysicalDamageBonus(): number {
        return this.equipmentBonuses[StatType.PHYSICAL_DAMAGE_BONUS] || 0;
    }

    getEquipDefenseIgnore(): number {
        return this.equipmentBonuses[StatType.DEFENSE_IGNORE] || 0;
    }

    getEquipMoveSpeed(): number {
        return this.equipmentBonuses[StatType.MOVE_SPEED] || 0;
    }

    getEquipCritRate(): number {
        return this.equipmentBonuses[StatType.CRIT_RATE] || 0;
    }

    getEquipDamageStability(): number {
        return this.equipmentBonuses[StatType.DAMAGE_STABILITY] || 0;
    }

    getEquipVulnerability(): number {
        return this.equipmentBonuses[StatType.VULNERABILITY] || 0;
    }

    getEquipResistance(): number {
        return this.equipmentBonuses[StatType.RESISTANCE] || 0;
    }

    getEquipEnergyRecovery(): number {
        return this.equipmentBonuses[StatType.ENERGY_RECOVERY] || 0;
    }

    // 計算最終能力值的方法
    getMaxHP(): number {
        const result = this.baseHP + this.getEquipHP();
        return result;
    }

    getMaxEnergy(): number {
        return this.baseEnergy + this.getEquipEnergy();
    }

    getPhysicalAttack(): number {
        return this.basePhysicalAttack + this.getEquipPhysicalAttack();
    }

    getPhysicalDefense(): number {
        return this.basePhysicalDefense + this.getEquipPhysicalDefense();
    }

    getMagicAttack(): number {
        return this.baseMagicAttack + this.getEquipMagicAttack();
    }

    getMagicDefense(): number {
        return this.baseMagicDefense + this.getEquipMagicDefense();
    }

    getAccuracy(): number {
        return this.baseAccuracy + this.getEquipAccuracy();
    }

    getEvasion(): number {
        return this.baseEvasion + this.getEquipEvasion();
    }

    getPhysicalPenetration(): number {
        return this.basePhysicalPenetration + this.getEquipPhysicalPenetration();
    }

    getMagicPenetration(): number {
        return this.baseMagicPenetration + this.getEquipMagicPenetration();
    }

    getAbsoluteDamageReduction(): number {
        return this.baseAbsoluteDamageReduction + this.getEquipAbsoluteDamageReduction();
    }

    getMagicDamageBonus(): number {
        return this.baseMagicDamageBonus + this.getEquipMagicDamageBonus();
    }

    getPhysicalDamageBonus(): number {
        return this.basePhysicalDamageBonus + this.getEquipPhysicalDamageBonus();
    }

    getDefenseIgnore(): number {
        return this.baseDefenseIgnore + this.getEquipDefenseIgnore();
    }

    getMoveSpeed(): number {
        return this.baseMoveSpeed + this.getEquipMoveSpeed();
    }

    getCritRate(): number {
        return this.baseCritRate + this.getEquipCritRate();
    }

    getDamageStability(): number {
        return this.baseDamageStability + this.getEquipDamageStability();
    }

    // 爆擊傷害是由傷害穩定值計算得出
    getCritDamage(): number {
        const stabilityValue = this.getDamageStability();
        return Math.log10(10 + 10 * Math.log10(stabilityValue));
    }

    getVulnerability(): number {
        return this.baseVulnerability + this.getEquipVulnerability();
    }

    getResistance(): number {
        return this.baseResistance + this.getEquipResistance();
    }

    getEnergyRecovery(): number {
        return this.baseEnergyRecovery + this.getEquipEnergyRecovery();
    }

    // 獲取當前等級
    getLevel(): number {
        return this.Level;
    }

    // 獲取當前經驗值
    getCurrentExp(): number {
        return this.currentExp;
    }

    // 獲取升級所需經驗值
    getMaxExp(): number {
        return this.calculateExpToNextLevel(this.Level);
    }

    // 計算指定等級升級所需的經驗
    public calculateExpToNextLevel(level: number = this.Level): number {
        let baseExp = 50; // LV1 到 LV2 需要 50 經驗

        for (let i = 1; i < level; i++) {
            // 計算增長倍率
            let growthRate = 1.1; // 基本增長 10%

            // 如果下一級是5的倍數，增加 50%
            if ((i + 1) % 5 === 0) {
                growthRate += 0.5;
            }
            // 如果下一級是10的倍數，增加 100%
            else if ((i + 1) % 10 === 0) {
                growthRate += 1.0;
            }

            // 應用增長率
            baseExp = Math.floor(baseExp * growthRate);
        }

        return baseExp;
    }    // 消耗能量值
    consumeEnergy(amount: number): void {
        this.currentEnergy = Math.max(0, this.currentEnergy - amount);
    }

    // 增加經驗值，如果達到升級條件則升級
    addExp(amount: number): boolean {
        this.currentExp += amount;

        // 檢查是否達到升級條件
        if (this.currentExp >= this.getMaxExp()) {
            // 扣除升級所需經驗，多餘的累積到下一級
            this.currentExp -= this.getMaxExp();
            this.Level++;
            return true; // 返回升級狀態
        }

        return false; // 沒有升級
    }

    // 直接設置等級
    setLevel(level: number): void {
        if (level > 0) {
            this.Level = level;
            // 重設當前經驗值
            this.currentExp = 0;
        }
    }

    // 取得當前值
    getCurrentHP(): number {
        return this.currentHP;
    }

    getCurrentEnergy(): number {
        return this.currentEnergy;
    }

    // 取得基礎值（用於顯示白板屬性）
    getBaseHP(): number {
        return this.baseHP;
    }

    getBaseEnergy(): number {
        return this.baseEnergy;
    }

    getBasePhysicalAttack(): number {
        return this.basePhysicalAttack;
    }

    getBasePhysicalDefense(): number {
        return this.basePhysicalDefense;
    }

    getBaseMagicAttack(): number {
        return this.baseMagicAttack;
    }

    getBaseMagicDefense(): number {
        return this.baseMagicDefense;
    }

    getBaseAccuracy(): number {
        return this.baseAccuracy;
    }

    getBaseEvasion(): number {
        return this.baseEvasion;
    }

    getBasePhysicalPenetration(): number {
        return this.basePhysicalPenetration;
    }

    getBaseMagicPenetration(): number {
        return this.baseMagicPenetration;
    }

    getBaseAbsoluteDamageReduction(): number {
        return this.baseAbsoluteDamageReduction;
    }

    getBaseMagicDamageBonus(): number {
        return this.baseMagicDamageBonus;
    }

    getBasePhysicalDamageBonus(): number {
        return this.basePhysicalDamageBonus;
    }

    getBaseDefenseIgnore(): number {
        return this.baseDefenseIgnore;
    }

    getBaseMoveSpeed(): number {
        return this.baseMoveSpeed;
    }

    getBaseCritRate(): number {
        return this.baseCritRate;
    }

    getBaseDamageStability(): number {
        return this.baseDamageStability;
    }

    getBaseVulnerability(): number {
        return this.baseVulnerability;
    }

    getBaseResistance(): number {
        return this.baseResistance;
    }

    getBaseEnergyRecovery(): number {
        return this.baseEnergyRecovery;
    }

    // 設置基礎屬性值（主要用於初始化怪物屬性）
    setBaseHP(value: number): void {
        this.baseHP = value;
        this.resetHP(); // 重設當前HP為最大值
    }

    setBaseEnergy(value: number): void {
        this.baseEnergy = value;
        this.resetEnergy(); // 重設當前能量為最大值
    }

    setBasePhysicalAttack(value: number): void {
        this.basePhysicalAttack = value;
    }

    setBasePhysicalDefense(value: number): void {
        this.basePhysicalDefense = value;
    }

    setBaseMagicAttack(value: number): void {
        this.baseMagicAttack = value;
    }

    setBaseMagicDefense(value: number): void {
        this.baseMagicDefense = value;
    }

    setBaseAccuracy(value: number): void {
        this.baseAccuracy = value;
    }

    setBaseEvasion(value: number): void {
        this.baseEvasion = value;
    }

    setBasePhysicalPenetration(value: number): void {
        this.basePhysicalPenetration = value;
    }

    setBaseMagicPenetration(value: number): void {
        this.baseMagicPenetration = value;
    }

    setBaseAbsoluteDamageReduction(value: number): void {
        this.baseAbsoluteDamageReduction = value;
    }

    setBaseMagicDamageBonus(value: number): void {
        this.baseMagicDamageBonus = value;
    }

    setBasePhysicalDamageBonus(value: number): void {
        this.basePhysicalDamageBonus = value;
    }

    setBaseDefenseIgnore(value: number): void {
        this.baseDefenseIgnore = value;
    }

    setBaseMoveSpeed(value: number): void {
        this.baseMoveSpeed = value;
    }

    setBaseCritRate(value: number): void {
        this.baseCritRate = value;
    }

    setBaseDamageStability(value: number): void {
        this.baseDamageStability = value;
    }

    setBaseVulnerability(value: number): void {
        this.baseVulnerability = value;
    }

    setBaseResistance(value: number): void {
        this.baseResistance = value;
    }

    setBaseEnergyRecovery(value: number): void {
        this.baseEnergyRecovery = value;
    }

    // 設置當前HP和能量
    setCurrentHP(value: number): void {
        this.currentHP = Math.max(0, Math.min(value, this.getMaxHP()));
    }

    setCurrentEnergy(value: number): void {
        this.currentEnergy = Math.max(0, Math.min(value, this.getMaxEnergy()));
    }
    
    // 增加能量回復的方法
    recoverEnergy(deltaTime: number): void {
        // 能量恢復速度100代表每秒恢復1點能量
        // 計算每毫秒應該恢復的能量
        const recoveryRate = this.getEnergyRecovery() / 100; // 轉換為每秒恢復點數
        const energyToRecover = recoveryRate * (deltaTime / 1000); // 轉換為以毫秒為單位
        
        // 增加當前能量，但不超過最大值
        if (this.currentEnergy < this.getMaxEnergy()) {
            this.currentEnergy = Math.min(this.currentEnergy + energyToRecover, this.getMaxEnergy());
        }
    }

    // 重置HP到最大值
    resetHP(): void {
        this.currentHP = this.getMaxHP();
    }

    // 重置能量到最大值
    resetEnergy(): void {
        this.currentEnergy = this.getMaxEnergy();
    }

    // 受到傷害
    takeDamage(damage: number): void {
        this.currentHP = Math.max(0, this.currentHP - damage);
    }

    // 治療生命值
    heal(amount: number): void {
        this.currentHP = Math.min(this.getMaxHP(), this.currentHP + amount);
    }

    // 使用能量
    useEnergy(amount: number): boolean {
        if (this.currentEnergy >= amount) {
            this.currentEnergy -= amount;
            return true;
        }
        return false;
    }

    // 恢復能量 (用於怪物能量回復邏輯)
    regenerateEnergy(delta: number): void {
        if (this.baseEnergyRecovery <= 0) return; // 如果基礎能量回復為0或負數，則不進行回復

        const recoveryPerSecond = this.baseEnergyRecovery / 100;
        const recoveryAmount = recoveryPerSecond * (delta / 1000);
        this.currentEnergy = Math.min(this.getMaxEnergy(), this.currentEnergy + recoveryAmount);
    }
}