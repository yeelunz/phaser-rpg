import { Equipment } from './equipment';
import { EquipmentSlot, WeaponRange, StatType } from '../data/dataloader';
import { Stats } from '../stats';
import { WeaponRestrictionType } from '../skills/types';
import { InventoryManager } from './inventory_manager';

/**
 * 裝備管理器類
 * 負責管理角色的裝備和相關屬性計算
 */
export class EquipmentManager {
    private stats: Stats | null = null;
    private inventoryManager: InventoryManager | null = null;
    private equippedItems: Map<EquipmentSlot, Equipment | null>;
    
    // 緩存當前武器類型，用於技能系統
    private currentWeaponType: WeaponRestrictionType = WeaponRestrictionType.ANY;
    
    /**
     * 建構子
     * @param stats 角色屬性引用 (可選)
     * @param inventoryManager 物品欄管理器引用（可選）
     */
    constructor(stats: Stats | null = null, inventoryManager: InventoryManager | null = null) {
        this.stats = stats;
        this.inventoryManager = inventoryManager;
        this.equippedItems = new Map<EquipmentSlot, Equipment | null>();
        
        // 初始化所有裝備槽位為空
        Object.values(EquipmentSlot).forEach(slot => {
            this.equippedItems.set(slot as EquipmentSlot, null);
        });
    }
    
    /**
     * 設置統計對象 - 用於更新裝備加成
     * @param stats 要關聯的統計對象
     */
    public setStats(stats: Stats | null): void {
        this.stats = stats;
        
        // 如果有有效的統計對象，立即更新裝備加成
        if (stats) {
            this.recalculateStats();
        }
    }
    
    /**
     * 裝備物品
     * @param equipment 要裝備的物品
     * @returns 是否成功裝備物品
     */
    public equipItem(equipment: Equipment): boolean {
        if (!equipment || !equipment.isEquipment()) {
            console.warn('無法裝備非裝備類型物品');
            return false;
        }
        
        const slot = equipment.slot;
        
        // 先移除該槽位的現有裝備
        this.unequipItem(slot);
        
        // 設置新裝備
        this.equippedItems.set(slot, equipment);
        
        // 更新武器類型（如果是武器裝備）
        if (slot === EquipmentSlot.WEAPON) {
            this.updateCurrentWeaponType(equipment);
        }
        
        // 更新裝備加成
        this.recalculateStats();
        
        console.log(`[eqipmanager]成功裝備 ${equipment.name} 到 ${slot} 槽位`);
        return true;
    }
    
    /**
     * 移除指定槽位的裝備
     * @param slot 裝備槽位
     * @returns 被移除的裝備，若槽位為空則返回null
     */
    public unequipItem(slot: EquipmentSlot): Equipment | null {
        const currentEquipment = this.equippedItems.get(slot) || null;
        
        if (currentEquipment) {
            // 移除裝備
            this.equippedItems.set(slot, null);
            
            // 如果是武器，設置當前武器類型為默認值
            if (slot === EquipmentSlot.WEAPON) {
                this.currentWeaponType = WeaponRestrictionType.ANY;
            }
            
            // 重新計算裝備加成
            this.recalculateStats();
            
            console.log(`從 ${slot} 槽位移除裝備 ${currentEquipment.name}`);
        }
        
        return currentEquipment;
    }
    
    /**
     * 重新計算所有裝備的加成效果
     */
    public recalculateStats(): void {
        // 如果沒有關聯的統計對象，則不進行計算
        if (!this.stats) {
            return;
        }
        
        // 計算所有裝備的總加成
        const totalBonuses = this.getTotalBonusStats();
        
        // 更新統計對象的裝備加成
        this.stats.updateEquipmentBonuses(totalBonuses);
    }
    
    /**
     * 獲取當前裝備在特定槽位的物品
     * @param slot 裝備槽位
     * @returns 該槽位的裝備，若槽位為空則返回null
     */
    public getEquipment(slot: EquipmentSlot): Equipment | null {
        return this.equippedItems.get(slot) || null;
    }
    
    /**
     * 獲取所有已裝備的物品
     * @returns 已裝備物品的映射表
     */
    public getAllEquipment(): Map<EquipmentSlot, Equipment | null> {
        return new Map(this.equippedItems);
    }
    
    /**
     * 獲取當前武器類型
     * @returns 當前武器類型
     */
    public getCurrentWeaponType(): WeaponRestrictionType {
        return this.currentWeaponType;
    }
    
    /**
     * 根據武器更新當前武器類型
     * @param weapon 武器裝備
     */
    private updateCurrentWeaponType(weapon: Equipment): void {
        if (!weapon.isWeapon()) {
            this.currentWeaponType = WeaponRestrictionType.ANY;
            return;
        }
        
        // 根據武器範圍設置武器類型
        const weaponRange = weapon.range;
        if (weaponRange) {
            switch (weaponRange) {
                case WeaponRange.MELEE:
                    this.currentWeaponType = WeaponRestrictionType.MELEE;
                    break;
                case WeaponRange.MEDIUM:
                    this.currentWeaponType = WeaponRestrictionType.MEDIUM;
                    break;
                case WeaponRange.LONG:
                    this.currentWeaponType = WeaponRestrictionType.RANGED;
                    break;
                default:
                    this.currentWeaponType = WeaponRestrictionType.ANY;
            }
        } else {
            // 默認為近戰武器
            this.currentWeaponType = WeaponRestrictionType.MELEE;
        }
        
        console.log(`更新當前武器類型: ${this.currentWeaponType}`);
    }
    
    /**
     * 檢查是否可以裝備指定物品
     * @param equipment 要檢查的裝備
     * @param characterLevel 角色等級
     * @returns 是否可以裝備
     */
    public canEquip(equipment: Equipment, characterLevel: number): boolean {
        // 檢查等級要求
        if (!equipment.meetsLevelRequirement(characterLevel)) {
            return false;
        }
        
        // 其他檢查邏輯可以在這裡添加
        // 例如：職業限制、特殊要求等
        
        return true;
    }
    
    /**
     * 獲取當前已裝備物品數量
     * @returns 已裝備物品數量
     */
    public getEquippedCount(): number {
        let count = 0;
        this.equippedItems.forEach(item => {
            if (item !== null) {
                count++;
            }
        });
        return count;
    }
    
    /**
     * 檢查是否有武器裝備
     * @returns 是否裝備了武器
     */
    public hasWeapon(): boolean {
        const weapon = this.equippedItems.get(EquipmentSlot.WEAPON);
        return weapon !== null && weapon !== undefined;
    }    /**
     * 從物品欄系統同步裝備狀態（已棄用）
     * 由於裝備現在只存在於裝備管理器中，此方法已無需使用
     * 保留此方法僅為向後兼容
     */
    public syncFromInventory(): void {
        // 此方法已棄用，不再需要從物品欄同步裝備
        // 因為裝備只存在於裝備管理器中
        console.log(`[EquipmentManager] 不再需要從物品欄同步裝備狀態`);
    }
    
    /**
     * 獲取所有裝備加成的總和
     * @returns 所有裝備加成的總和
     */
    public getTotalBonusStats(): Partial<Record<StatType, number>> {
        const totalStats: Partial<Record<StatType, number>> = {};
        
        // 遍歷所有裝備槽位
        for (const [_, equipment] of this.equippedItems.entries()) {
            if (equipment) {
                const bonusStats = equipment.bonusStats;
                
                // 合併每個裝備的加成
                for (const stat in bonusStats) {
                    const statType = stat as StatType;
                    totalStats[statType] = (totalStats[statType] || 0) + (bonusStats[statType] || 0);
                }
            }
        }
        
        return totalStats;
    }
    
    /**
     * 獲取所有裝備的HP加成總和
     * @returns HP加成總和
     */
    public getTotalBonusHP(): number {
        let total = 0;
        for (const [_, equipment] of this.equippedItems.entries()) {
            if (equipment) {
                total += equipment.getBonusHP();
            }
        }
        return total;
    }
    
    /**
     * 獲取所有裝備的能量加成總和
     * @returns 能量加成總和
     */
    public getTotalBonusEnergy(): number {
        let total = 0;
        for (const [_, equipment] of this.equippedItems.entries()) {
            if (equipment) {
                total += equipment.getBonusEnergy();
            }
        }
        return total;
    }
    
    /**
     * 獲取所有裝備的物理攻擊加成總和
     * @returns 物理攻擊加成總和
     */
    public getTotalBonusPhysicalAttack(): number {
        let total = 0;
        for (const [_, equipment] of this.equippedItems.entries()) {
            if (equipment) {
                total += equipment.getBonusPhysicalAttack();
            }
        }
        return total;
    }
    
    /**
     * 獲取所有裝備的物理防禦加成總和
     * @returns 物理防禦加成總和
     */
    public getTotalBonusPhysicalDefense(): number {
        let total = 0;
        for (const [_, equipment] of this.equippedItems.entries()) {
            if (equipment) {
                total += equipment.getBonusPhysicalDefense();
            }
        }
        return total;
    }
    
    /**
     * 獲取所有裝備的魔法攻擊加成總和
     * @returns 魔法攻擊加成總和
     */
    public getTotalBonusMagicAttack(): number {
        let total = 0;
        for (const [_, equipment] of this.equippedItems.entries()) {
            if (equipment) {
                total += equipment.getBonusMagicAttack();
            }
        }
        return total;
    }
    
    /**
     * 獲取所有裝備的魔法防禦加成總和
     * @returns 魔法防禦加成總和
     */
    public getTotalBonusMagicDefense(): number {
        let total = 0;
        for (const [_, equipment] of this.equippedItems.entries()) {
            if (equipment) {
                total += equipment.getBonusMagicDefense();
            }
        }
        return total;
    }
    
    /**
     * 獲取所有裝備的命中加成總和
     * @returns 命中加成總和
     */
    public getTotalBonusAccuracy(): number {
        let total = 0;
        for (const [_, equipment] of this.equippedItems.entries()) {
            if (equipment) {
                total += equipment.getBonusAccuracy();
            }
        }
        return total;
    }
    
    /**
     * 獲取所有裝備的閃避加成總和
     * @returns 閃避加成總和
     */
    public getTotalBonusEvasion(): number {
        let total = 0;
        for (const [_, equipment] of this.equippedItems.entries()) {
            if (equipment) {
                total += equipment.getBonusEvasion();
            }
        }
        return total;
    }
    
    /**
     * 獲取所有裝備的物理穿透加成總和
     * @returns 物理穿透加成總和
     */
    public getTotalBonusPhysicalPenetration(): number {
        let total = 0;
        for (const [_, equipment] of this.equippedItems.entries()) {
            if (equipment) {
                total += equipment.getBonusPhysicalPenetration();
            }
        }
        return total;
    }
    
    /**
     * 獲取所有裝備的魔法穿透加成總和
     * @returns 魔法穿透加成總和
     */
    public getTotalBonusMagicPenetration(): number {
        let total = 0;
        for (const [_, equipment] of this.equippedItems.entries()) {
            if (equipment) {
                total += equipment.getBonusMagicPenetration();
            }
        }
        return total;
    }
    
    /**
     * 獲取所有裝備的絕對減傷加成總和
     * @returns 絕對減傷加成總和
     */
    public getTotalBonusAbsoluteDamageReduction(): number {
        let total = 0;
        for (const [_, equipment] of this.equippedItems.entries()) {
            if (equipment) {
                total += equipment.getBonusAbsoluteDamageReduction();
            }
        }
        return total;
    }
    
    /**
     * 獲取所有裝備的魔法傷害加成總和
     * @returns 魔法傷害加成總和
     */
    public getTotalBonusMagicDamageBonus(): number {
        let total = 0;
        for (const [_, equipment] of this.equippedItems.entries()) {
            if (equipment) {
                total += equipment.getBonusMagicDamageBonus();
            }
        }
        return total;
    }
    
    /**
     * 獲取所有裝備的物理傷害加成總和
     * @returns 物理傷害加成總和
     */
    public getTotalBonusPhysicalDamageBonus(): number {
        let total = 0;
        for (const [_, equipment] of this.equippedItems.entries()) {
            if (equipment) {
                total += equipment.getBonusPhysicalDamageBonus();
            }
        }
        return total;
    }
    
    /**
     * 獲取所有裝備的防禦無視加成總和
     * @returns 防禦無視加成總和
     */
    public getTotalBonusDefenseIgnore(): number {
        let total = 0;
        for (const [_, equipment] of this.equippedItems.entries()) {
            if (equipment) {
                total += equipment.getBonusDefenseIgnore();
            }
        }
        return total;
    }
    
    /**
     * 獲取所有裝備的移動速度加成總和
     * @returns 移動速度加成總和
     */
    public getTotalBonusMoveSpeed(): number {
        let total = 0;
        for (const [_, equipment] of this.equippedItems.entries()) {
            if (equipment) {
                total += equipment.getBonusMoveSpeed();
            }
        }
        return total;
    }
    
    /**
     * 獲取所有裝備的爆擊率加成總和
     * @returns 爆擊率加成總和
     */
    public getTotalBonusCritRate(): number {
        let total = 0;
        for (const [_, equipment] of this.equippedItems.entries()) {
            if (equipment) {
                total += equipment.getBonusCritRate();
            }
        }
        return total;
    }
    
    /**
     * 獲取所有裝備的傷害穩定值加成總和
     * @returns 傷害穩定值加成總和
     */
    public getTotalBonusDamageStability(): number {
        let total = 0;
        for (const [_, equipment] of this.equippedItems.entries()) {
            if (equipment) {
                total += equipment.getBonusDamageStability();
            }
        }
        return total;
    }
    
    /**
     * 獲取所有裝備的易傷加成總和
     * @returns 易傷加成總和
     */
    public getTotalBonusVulnerability(): number {
        let total = 0;
        for (const [_, equipment] of this.equippedItems.entries()) {
            if (equipment) {
                total += equipment.getBonusVulnerability();
            }
        }
        return total;
    }
    
    /**
     * 獲取所有裝備的抗性加成總和
     * @returns 抗性加成總和
     */
    public getTotalBonusResistance(): number {
        let total = 0;
        for (const [_, equipment] of this.equippedItems.entries()) {
            if (equipment) {
                total += equipment.getBonusResistance();
            }
        }
        return total;
    }
    
    /**
     * 獲取所有裝備的能量回復加成總和
     * @returns 能量回復加成總和
     */
    public getTotalBonusEnergyRecovery(): number {
        let total = 0;
        for (const [_, equipment] of this.equippedItems.entries()) {
            if (equipment) {
                total += equipment.getBonusEnergyRecovery();
            }
        }
        return total;
    }

}