// 裝備工廠 - 負責創建裝備物品實例
import { Equipment } from './equipment';
import { 
    type EquipmentData, 
    dataLoader, 
    ItemRarity, 
    StatType,
} from '../data/dataloader';

// 裝備工廠類別 - 單例模式
export class EquipmentFactory {
    private static instance: EquipmentFactory;

    private constructor() {
        // 確保數據加載器已經初始化
        dataLoader.loadAllData().catch(error => {
            console.error("初始化裝備工廠時無法加載數據:", error);
        });
    }

    // 獲取單例實例
    public static getInstance(): EquipmentFactory {
        if (!EquipmentFactory.instance) {
            EquipmentFactory.instance = new EquipmentFactory();
        }
        return EquipmentFactory.instance;
    }

    // 根據裝備ID創建裝備實例
    public createEquipmentById(id: string, quantity: number = 1): Equipment | null {
        const equipmentData = dataLoader.getEquipmentDataById(id);
        if (!equipmentData) {
            console.error(`找不到ID為 ${id} 的裝備數據`);
            return null;
        }

        const equipment = this.createEquipment(equipmentData);
        if (equipment) {
            equipment.quantity = quantity;
        }
        return equipment;
    }

    // 根據裝備數據創建裝備實例
    public createEquipment(data: EquipmentData): Equipment {
        return new Equipment(data);
    }

    // 批量創建裝備
    public createEquipments(equipments: { id: string, quantity: number }[]): Equipment[] {
        const result: Equipment[] = [];
        
        for (const equipmentInfo of equipments) {
            const equipment = this.createEquipmentById(equipmentInfo.id, equipmentInfo.quantity);
            if (equipment) {
                result.push(equipment);
            }
        }
        
        return result;
    }    // 獲取所有可用的裝備數據
    public getAllEquipmentsData(): EquipmentData[] {
        return dataLoader.getAllEquipmentData();
    }

    // 複製一個已有的裝備實例
    public cloneEquipment(equipment: Equipment): Equipment {
        return equipment.clone() as Equipment;
    }

    // 獲取裝備時動態計算其稀有度和屬性
    public generateEquipment(baseEquipId: string, luckBonus: number = 0): Equipment | null {
        // 獲取基礎裝備數據
        const baseEquipData = dataLoader.getEquipmentDataById(baseEquipId);
        if (!baseEquipData) {
            console.error(`找不到ID為 ${baseEquipId} 的裝備數據`);
            return null;
        }
        
        // 複製數據以避免修改原始數據
        const newEquipData: EquipmentData = { ...baseEquipData };
        newEquipData.bonusStats = { ...baseEquipData.bonusStats };
        
        // 動態決定稀有度
        const rarity = this.determineRarity(luckBonus);
        newEquipData.rarity = rarity;
        
        // 根據稀有度調整屬性和強化上限
        this.adjustStatsByRarity(newEquipData);
        
        // 創建並返回裝備實例
        const equipment = this.createEquipment(newEquipData);
        console.log(`生成了${this.getRarityDisplay(rarity)}裝備: ${equipment.name}`);
        return equipment;
    }
    
    // 決定裝備稀有度（考慮幸運加成）
    private determineRarity(luckBonus: number = 0): ItemRarity {
        // 幸運加成增加稀有物品出現的幾率（每點提升約1%）
        // 基本權重
        const weights = {
            [ItemRarity.INFERIOR]: 40,
            [ItemRarity.COMMON]: 60,
            [ItemRarity.RARE]: 40,
            [ItemRarity.EPIC]: 20,
            [ItemRarity.LEGENDARY]: 10
        };
        
        // 應用幸運加成（提高稀有和以上稀有度的權重）
        weights[ItemRarity.RARE] += luckBonus * 0.5;
        weights[ItemRarity.EPIC] += luckBonus * 0.3;
        weights[ItemRarity.LEGENDARY] += luckBonus * 0.2;
        
        // 計算總權重
        let totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        
        // 隨機選擇
        let randomValue = Math.random() * totalWeight;
        let cumulativeWeight = 0;
        
        for (const [rarity, weight] of Object.entries(weights)) {
            cumulativeWeight += weight;
            if (randomValue <= cumulativeWeight) {
                return rarity as ItemRarity;
            }
        }
        
        // 預設為普通，雖然正常情況不應該執行到這裡
        return ItemRarity.COMMON;
    }
    
    // 根據稀有度調整裝備屬性
    private adjustStatsByRarity(equipData: EquipmentData): void {
        // 獲取稀有度相關的調整參數
        const adjustments = this.getRarityAdjustments(equipData.rarity);
        
        // 調整裝備強化上限
        const baseEnhanceLimit = equipData.enhanceLimit;
        const enhanceLimitAdjustment = this.getRandomInt(
            adjustments.enhanceMin,
            adjustments.enhanceMax
        );
        
        // 確保強化上限不會低於0
        equipData.enhanceLimit = Math.max(0, baseEnhanceLimit + enhanceLimitAdjustment);
          // 調整裝備屬性值
        for (const statKey in equipData.bonusStats) {
            const typedStatKey = statKey as StatType;
            const currentValue = equipData.bonusStats[typedStatKey] || 0;
            
            // 根據稀有度計算屬性值浮動
            const statMultiplier = adjustments.statMin + (Math.random() * (adjustments.statMax - adjustments.statMin));
            
            // 應用屬性值調整，對於小數值屬性進行特殊處理
            if (typedStatKey === StatType.CRIT_RATE || currentValue < 1) {
                // 對於爆擊率等小數值屬性，保留3位小數而不四捨五入為整數
                equipData.bonusStats[typedStatKey] = parseFloat((currentValue * statMultiplier).toFixed(3));
            } else {
                equipData.bonusStats[typedStatKey] = Math.round(currentValue * statMultiplier);
            }
        }
    }
    
    // 獲取稀有度對應的調整參數
    private getRarityAdjustments(rarity: ItemRarity): {
        statMin: number;
        statMax: number;
        enhanceMin: number;
        enhanceMax: number;
        displayColor: string;
    } 
    {
        switch (rarity) {
            case ItemRarity.INFERIOR:
                return {
                    statMin: 0.8,
                    statMax: 1.0,
                    enhanceMin: -3,
                    enhanceMax: 0,
                    displayColor: '#808080' // 灰色
                };
            case ItemRarity.COMMON:
                return {
                    statMin: 1.0,
                    statMax: 1.2,
                    enhanceMin: -1,
                    enhanceMax: 1,
                    displayColor: '#FFFFFF' // 白色
                };
            case ItemRarity.RARE:
                return {
                    statMin: 1.1,
                    statMax: 1.3,
                    enhanceMin: 0,
                    enhanceMax: 2,
                    displayColor: '#0070DD' // 藍色
                };
            case ItemRarity.EPIC:
                return {
                    statMin: 1.2,
                    statMax: 1.4,
                    enhanceMin: 1,
                    enhanceMax: 3,
                    displayColor: '#A335EE' // 紫色
                };
            case ItemRarity.LEGENDARY:
                return {
                    statMin: 1.5,
                    statMax: 2.0,
                    enhanceMin: 3,
                    enhanceMax: 5,
                    displayColor: '#FFD700' // 金色
                };
            default:
                return {
                    statMin: 1.0,
                    statMax: 1.0,
                    enhanceMin: 0,
                    enhanceMax: 0,
                    displayColor: '#FFFFFF' // 白色
                };
        }
    }
    
    // 獲取稀有度的顯示文本（帶顏色）
    private getRarityDisplay(rarity: ItemRarity): string {
        switch (rarity) {
            case ItemRarity.INFERIOR:
                return '【劣等】';
            case ItemRarity.COMMON:
                return '【普通】';
            case ItemRarity.RARE:
                return '【稀有】';
            case ItemRarity.EPIC:
                return '【史詩】';
            case ItemRarity.LEGENDARY:
                return '【傳奇】';
            default:
                return '';
        }
    }
    
    // 輔助方法：獲取指定範圍內的隨機整數
    private getRandomInt(min: number, max: number): number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // 創建隨機裝備（按稀有度）
    public createRandomEquipment(minLevel: number = 1, maxLevel: number = 100): Equipment | null {
        const allEquipments = this.getAllEquipmentsData().filter(equip => 
            equip.levelRequirement >= minLevel && 
            equip.levelRequirement <= maxLevel
        );
        
        if (allEquipments.length === 0) {
            console.warn(`找不到等級範圍在 ${minLevel}-${maxLevel} 的裝備`);
            return null;
        }
        
        // 隨機選擇一個裝備
        const randomIndex = Math.floor(Math.random() * allEquipments.length);
        return this.createEquipment(allEquipments[randomIndex]);
    }

    // 根據槽位和等級範圍創建裝備
    public createEquipmentBySlot(slot: string, minLevel: number = 1, maxLevel: number = 100): Equipment | null {
        // 過濾出符合條件的裝備
        const filteredEquipments = this.getAllEquipmentsData().filter(equip => 
            equip.slot === slot && 
            equip.levelRequirement >= minLevel && 
            equip.levelRequirement <= maxLevel
        );
        
        if (filteredEquipments.length === 0) {
            console.warn(`找不到槽位為 ${slot} 且等級範圍在 ${minLevel}-${maxLevel} 的裝備`);
            return null;
        }
        
        // 隨機選擇一個裝備
        const randomIndex = Math.floor(Math.random() * filteredEquipments.length);
        return this.createEquipment(filteredEquipments[randomIndex]);
    }
}

// 導出裝備工廠實例
export const equipmentFactory = EquipmentFactory.getInstance();
