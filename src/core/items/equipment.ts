// 裝備物品類
import { Item, ItemType } from './item';
import { 
    type EquipmentData, 
    EquipmentSlot, 
    WeaponRange, 
    ItemRarity, 
    StatType 
} from '../data/dataloader';

export class Equipment extends Item {
    private _levelRequirement: number;
    private _bonusStats: Partial<Record<StatType, number>>;
    private _enhanceLimit: number;
    private _slot: EquipmentSlot;
    private _range?: WeaponRange;
    private _rarity: ItemRarity;
    private _attackSpeed: number;

    private _enhanceCount: number = 0;

    constructor(data: EquipmentData) {
        super(data);
        
        // 確保類型正確
        if (this._type !== ItemType.EQUIPMENT) {
            console.warn(`裝備項目 ${data.id} 的類型不正確，已自動修正`);
            this._type = ItemType.EQUIPMENT;
        }
        
        // 設置裝備特有屬性
        this._levelRequirement = data.levelRequirement;
        this._bonusStats = { ...data.bonusStats }; // 複製能力值加成對象
        this._enhanceLimit = data.enhanceLimit;        this._slot = data.slot;
        this._range = data.range; // 只有武器才會有範圍屬性
        this._attackSpeed = data.attackSpeed || 1.0; // 提供預設值 1.0
        this._rarity = data.rarity;
    }
    // 獲取裝備特有屬性

    get levelRequirement(): number {
        return this._levelRequirement;
    }

    get bonusStats(): Partial<Record<StatType, number>> {
        return { ...this._bonusStats }; // 返回複製，防止外部修改
    }

    get enhanceLimit(): number {
        return this._enhanceLimit;
    }

    get slot(): EquipmentSlot {
        return this._slot;
    }

    get range(): WeaponRange | undefined {
        return this._range;
    }
    get name(): string {
        return this._name;
    }

    get rarity(): ItemRarity {
        return this._rarity;
    }

    get attackSpeed(): number {
        return this._attackSpeed;
    }

    get enhanceCount(): number {
        return this._enhanceCount;
    }

    // 實現抽象方法: 使用裝備物品
    use(): boolean {
        // 裝備通常不能直接使用，而是需要裝備到角色身上
        console.log(`裝備 ${this._name} 不能直接使用，請裝備到角色身上。`);
        return false;
    }    // 實現抽象方法: 複製裝備物品
    clone(): Item {
        const equipData: EquipmentData = {
            id: this._id,
            name: this._name,
            description: this._description,
            type: this._type,
            icon: this._icon,
            stackable: this._stackable,
            value: this._value,
            levelRequirement: this._levelRequirement,
            bonusStats: { ...this._bonusStats },
            enhanceLimit: this._enhanceLimit,
            slot: this._slot,
            rarity: this._rarity,
            attackSpeed: this._attackSpeed
        };
        
        // 添加可選屬性
        if (this._range) {
            equipData.range = this._range;
        }
        
        const clonedEquipment = new Equipment(equipData);
        clonedEquipment.quantity = this._quantity;
        clonedEquipment._enhanceCount = this._enhanceCount;
        
        return clonedEquipment;
    }

    // 強化裝備
    enhance(): boolean {
        if (this._enhanceCount >= this._enhanceLimit) {
            console.log(`${this._name} 已達到強化上限 (${this._enhanceLimit})`);
            return false;
        }
        
        // 增加強化次數
        this._enhanceCount++;
        
        // 根據稀有度提升裝備能力值
        this.improveStats();
        
        console.log(`${this._name} 強化成功！當前強化等級: ${this._enhanceCount}/${this._enhanceLimit}`);
        return true;
    }

    // 根據稀有度和強化等級提升能力值
    private improveStats(): void {
        // 獲取增益係數（基於稀有度）
        const rarityBonus = this.getRarityBonus();
        
        // 對所有已有加成的能力值進行提升
        for (const statType in this._bonusStats) {
            const typedStatType = statType as StatType;
            const currentValue = this._bonusStats[typedStatType] || 0;
            
            // 根據稀有度和當前強化等級計算加成
            const enhancement = Math.max(1, Math.floor(currentValue * 0.05 * rarityBonus));
            this._bonusStats[typedStatType] = currentValue + enhancement;
        }
    }

    // 根據稀有度獲取加成係數
    private getRarityBonus(): number {
        switch (this._rarity) {
            case ItemRarity.INFERIOR:
                return 1.0;
            case ItemRarity.COMMON:
                return 1.2;
            case ItemRarity.RARE:
                return 1.5;
            case ItemRarity.EPIC:
                return 2.0;
            case ItemRarity.LEGENDARY:
                return 3.0;
            default:
                return 1.0;
        }
    }

    // 檢查是否為裝備
    isEquipment(): boolean {
        return true;
    }

    // 檢查是否為特定槽位的裝備
    isSlot(slot: EquipmentSlot): boolean {
        return this._slot === slot;
    }

    // 檢查是否為武器
    isWeapon(): boolean {
        return this._slot === EquipmentSlot.WEAPON;
    }

    // 檢查裝備是否符合等級要求
    meetsLevelRequirement(level: number): boolean {
        return level >= this._levelRequirement;
    }    // 獲取裝備名稱（包含強化等級和稀有度顏色）    
    getDisplayName(): string {
        let name = this._name;
        
        // 添加強化等級
        if (this._enhanceCount > 0) {
            name = `${name} +${this._enhanceCount}`;
        }
        
        return name;
    }
    
    // 獲取裝備稀有度的顏色代碼
    getRarityColor(): string {
        switch (this._rarity) {
            case ItemRarity.INFERIOR:
                return '#808080'; // 灰色
            case ItemRarity.COMMON:
                return '#FFFFFF'; // 白色
            case ItemRarity.RARE:
                return '#0070DD'; // 藍色
            case ItemRarity.EPIC:
                return '#A335EE'; // 紫色
            case ItemRarity.LEGENDARY:
                return '#FFD700'; // 金色
            default:
                return '#FFFFFF'; // 預設白色
        }
    }
    
    // 獲取稀有度的顯示文本
    getRarityText(): string {
        switch (this._rarity) {
            case ItemRarity.INFERIOR:
                return '劣等';
            case ItemRarity.COMMON:
                return '普通';
            case ItemRarity.RARE:
                return '稀有';
            case ItemRarity.EPIC:
                return '史詩';
            case ItemRarity.LEGENDARY:
                return '傳奇';
            default:
                return '未知';
        }
    }    // 獲取裝備數據
    toJSON(): EquipmentData {
        const data: EquipmentData = {
            id: this._id,
            name: this._name,
            description: this._description,
            type: this._type,
            icon: this._icon,
            stackable: this._stackable,
            value: this._value,
            levelRequirement: this._levelRequirement,
            bonusStats: { ...this._bonusStats },
            enhanceLimit: this._enhanceLimit,
            slot: this._slot,
            rarity: this._rarity,
            attackSpeed: this._attackSpeed
        };
        
        // 添加可選屬性
        if (this._range) {
            data.range = this._range;
        }
        
        return data;
    }

    // 獲取裝備加成值方法
    getBonusHP(): number {
        return this._bonusStats.hp || 0;
    }

    getBonusEnergy(): number {
        return this._bonusStats.energy || 0;
    }

    getBonusPhysicalAttack(): number {
        return this._bonusStats.physicalAttack || 0;
    }

    getBonusPhysicalDefense(): number {
        return this._bonusStats.physicalDefense || 0;
    }

    getBonusMagicAttack(): number {
        return this._bonusStats.magicAttack || 0;
    }

    getBonusMagicDefense(): number {
        return this._bonusStats.magicDefense || 0;
    }

    getBonusAccuracy(): number {
        return this._bonusStats.accuracy || 0;
    }

    getBonusEvasion(): number {
        return this._bonusStats.evasion || 0;
    }

    getBonusPhysicalPenetration(): number {
        return this._bonusStats.physicalPenetration || 0;
    }

    getBonusMagicPenetration(): number {
        return this._bonusStats.magicPenetration || 0;
    }

    getBonusAbsoluteDamageReduction(): number {
        return this._bonusStats.absoluteDamageReduction || 0;
    }

    getBonusMagicDamageBonus(): number {
        return this._bonusStats.magicDamageBonus || 0;
    }

    getBonusPhysicalDamageBonus(): number {
        return this._bonusStats.physicalDamageBonus || 0;
    }

    getBonusDefenseIgnore(): number {
        return this._bonusStats.defenseIgnore || 0;
    }

    getBonusMoveSpeed(): number {
        return this._bonusStats.moveSpeed || 0;
    }

    getBonusCritRate(): number {
        return this._bonusStats.critRate || 0;
    }

    getBonusDamageStability(): number {
        return this._bonusStats.damageStability || 0;
    }

    getBonusVulnerability(): number {
        return this._bonusStats.vulnerability || 0;
    }

    getBonusResistance(): number {
        return this._bonusStats.resistance || 0;
    }

    getBonusEnergyRecovery(): number {
        return this._bonusStats.energyRecovery || 0;
    }
}
