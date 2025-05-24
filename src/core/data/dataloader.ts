// 數據加載器 - 負責從JSON檔案加載物品數據和怪物數據
import { type ItemData, ItemType } from '../items/item.ts';

// 怪物類別
export const MonsterCategory = {
    MONSTER: 'monster',
    ELITE: 'elite',
    BOSS: 'boss'
} as const;

export type MonsterCategory = typeof MonsterCategory[keyof typeof MonsterCategory];

// 怪物移動模式
export const MovementPattern = {
    STATIONARY: 'stationary',
    PATROL: 'patrol',
    PATROL_AND_CHASE: 'patrol_and_chase',
    AGGRESSIVE_CHASE: 'aggressive_chase',
    RANDOM: 'random'
} as const;

export type MovementPattern = typeof MovementPattern[keyof typeof MovementPattern];

// 怪物攻擊模式
export const AttackPattern = {
    MELEE: 'melee',
    RANGED: 'ranged',
    AREA_OF_EFFECT: 'aoe',
    CHARGE: 'charge',
    SUMMON: 'summon'
} as const;

export type AttackPattern = typeof AttackPattern[keyof typeof AttackPattern];

// 怪物掉落物
export interface MonsterDrop {
    itemId: string;
    quantity: number;
    chance: number;  // 掉落機率 (0-1)
}

// 怪物碰撞箱
export interface CollisionBox {
    width: number;
    height: number;
}

// 怪物基礎能力值
export interface MonsterStats {
    level: number;
    hp: number;
    energy: number;
    physicalAttack: number;
    physicalDefense: number;
    magicAttack: number;
    magicDefense: number;
    accuracy: number;
    evasion: number;
    physicalPenetration: number;
    magicPenetration: number;
    absoluteDamageReduction: number;
    magicDamageBonus: number;
    physicalDamageBonus: number;
    defenseIgnore: number;
    moveSpeed: number;
    critRate: number;
    damageStability: number;
    vulnerability: number;
    resistance: number;
    energyRecovery: number;
}

// 怪物數據介面
export interface MonsterData {
    id: string;
    name: string;
    baseStats: MonsterStats;
    category: MonsterCategory;
    
    // 舊行為系統 (將被移除)
    movementPattern?: MovementPattern | null;
    attackPattern?: AttackPattern | null;
    complexBehaviorId?: string | null;
    
    // 新行為系統
    behaviorId?: string;
    
    experienceYield: number;
    isSolid: boolean;
    sprite: string | null;
    collisionBox: CollisionBox;
    hitBox: CollisionBox;
    icon: string;
    drops: MonsterDrop[];
    goldDrop: number;
}

// 材料物品數據介面
export interface MaterialData extends ItemData {
    // 材料物品不需要額外屬性
}

// 消耗品數據介面
export interface ConsumableData extends ItemData {
    effectType: ConsumableEffectType;
    value: number;
    duration?: number;
    attribute?: ConsumableAttribute;
}

// 裝備數據介面
export interface EquipmentData extends ItemData {
    levelRequirement: number;
    bonusStats: Partial<Record<StatType, number>>;
    enhanceLimit: number;
    slot: EquipmentSlot;
    range?: WeaponRange;
    attackSpeed?: number
    rarity: ItemRarity;
}

// 消耗品效果類型
export const ConsumableEffectType = {
    IMMEDIATE: 'immediate',
    OVERTIME: 'overtime',
    SPECIAL: 'special'
} as const;

export type ConsumableEffectType = typeof ConsumableEffectType[keyof typeof ConsumableEffectType];

// 消耗品屬性類型
export const ConsumableAttribute = {
    HEAL: 'heal',
    DAMAGE: 'damage',
    BUFF: 'buff'
} as const;

export type ConsumableAttribute = typeof ConsumableAttribute[keyof typeof ConsumableAttribute];

// 裝備槽位類型
export const EquipmentSlot = {
    WEAPON: 'weapon',
    ARMOR: 'armor',
    SHOES: 'shoes',
    RING: 'ring',
    NECKLACE: 'necklace'
} as const;

export type EquipmentSlot = typeof EquipmentSlot[keyof typeof EquipmentSlot];

// 武器範圍類型
export const WeaponRange = {
    MELEE: 'melee',
    MEDIUM: 'medium',
    LONG: 'long'
} as const;

export type WeaponRange = typeof WeaponRange[keyof typeof WeaponRange];

// 物品稀有度
export const ItemRarity = {
    INFERIOR: 'inferior',  // 劣等
    COMMON: 'common',      // 普通
    RARE: 'rare',          // 稀有
    EPIC: 'epic',          // 史詩
    LEGENDARY: 'legendary' // 傳奇
} as const;

export type ItemRarity = typeof ItemRarity[keyof typeof ItemRarity];

// 定義能力值類型
export const StatType = {
    HP: 'hp',
    ENERGY: 'energy',
    PHYSICAL_ATTACK: 'physicalAttack',
    PHYSICAL_DEFENSE: 'physicalDefense',
    MAGIC_ATTACK: 'magicAttack',
    MAGIC_DEFENSE: 'magicDefense',
    ACCURACY: 'accuracy',
    EVASION: 'evasion',
    PHYSICAL_PENETRATION: 'physicalPenetration',
    MAGIC_PENETRATION: 'magicPenetration',
    ABSOLUTE_DAMAGE_REDUCTION: 'absoluteDamageReduction',
    MAGIC_DAMAGE_BONUS: 'magicDamageBonus',
    PHYSICAL_DAMAGE_BONUS: 'physicalDamageBonus',
    DEFENSE_IGNORE: 'defenseIgnore',
    MOVE_SPEED: 'moveSpeed',
    CRIT_RATE: 'critRate',
    DAMAGE_STABILITY: 'damageStability',
    VULNERABILITY: 'vulnerability',
    RESISTANCE: 'resistance',
    ENERGY_RECOVERY: 'energyRecovery'
} as const;

export type StatType = typeof StatType[keyof typeof StatType];

// 數據加載器類
export class DataLoader {
    private static instance: DataLoader;
    
    private materialData: MaterialData[] = [];
    private consumableData: ConsumableData[] = [];
    private equipmentData: EquipmentData[] = [];
    private monsterData: MonsterData[] = []; // 新增怪物數據集合
    private isLoaded: boolean = false;

    private constructor() {}

    // 獲取單例實例
    public static getInstance(): DataLoader {
        if (!DataLoader.instance) {
            DataLoader.instance = new DataLoader();
        }
        return DataLoader.instance;
    }

    // 加載所有數據
    public async loadAllData(): Promise<boolean> {
        if (this.isLoaded) {
            return true; // 已經加載過了，直接返回
        }

        try {
        // 並行加載所有數據
            const [materialsData, consumablesData, equipmentsData, monstersData] = await Promise.all([
                this.loadJSON<{items: MaterialData[]}>('/assets/data/items/material.json'),
                this.loadJSON<{items: ConsumableData[]}>('/assets/data/items/consumable.json'),
                this.loadJSON<{items: EquipmentData[]}>('/assets/data/items/equipment.json'),
                this.loadJSON<MonsterData[]>('/assets/data/monsters.json')
            ]);

            this.materialData = materialsData.items || [];
            this.consumableData = consumablesData.items || [];
            this.equipmentData = equipmentsData.items || [];
            this.monsterData = monstersData || [];
            
            this.isLoaded = true;
            console.log('所有數據加載完成');
            return true;
        } catch (error) {
            console.error('加載數據失敗:', error);
            return false;
        }    }

    // 通用JSON加載方法
    public async loadJSON<T>(path: string): Promise<T> {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`無法加載 ${path}: ${response.statusText}`);
        }
        return await response.json() as T;
    }

    // 根據ID獲取物品數據
    public getItemDataById(id: string): ItemData | null {
        // 檢查是否已加載數據
        if (!this.isLoaded) {
            console.warn('嘗試在數據加載前獲取物品數據');
            return null;
        }

        // 在各類型中查找對應ID的物品
        return this.getMaterialDataById(id) || 
               this.getConsumableDataById(id) || 
               this.getEquipmentDataById(id);
    }

    // 獲取所有材料數據
    public getAllMaterialData(): MaterialData[] {
        return [...this.materialData];
    }

    // 獲取所有消耗品數據
    public getAllConsumableData(): ConsumableData[] {
        return [...this.consumableData];
    }

    // 獲取所有裝備數據
    public getAllEquipmentData(): EquipmentData[] {
        return [...this.equipmentData];
    }

    // 獲取所有怪物數據
    public getAllMonsterData(): MonsterData[] {
        return [...this.monsterData];
    }

    // 根據ID獲取材料數據
    public getMaterialDataById(id: string): MaterialData | null {
        return this.materialData.find(item => item.id === id) || null;
    }

    // 根據ID獲取消耗品數據
    public getConsumableDataById(id: string): ConsumableData | null {
        return this.consumableData.find(item => item.id === id) || null;
    }

    // 根據ID獲取裝備數據
    public getEquipmentDataById(id: string): EquipmentData | null {
        return this.equipmentData.find(item => item.id === id) || null;
    }
    
    // 根據ID獲取怪物數據
    public getMonsterDataById(id: string): MonsterData | null {
        return this.monsterData.find(monster => monster.id === id) || null;
    }

    // 根據類別獲取怪物數據
    public getMonstersByCategory(category: MonsterCategory): MonsterData[] {
        return this.monsterData.filter(monster => monster.category === category);
    }
}

// 導出單例實例
export const dataLoader = DataLoader.getInstance();
