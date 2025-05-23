// 消耗品工廠 - 負責創建消耗品實例
import { Consumable } from './consumable';
import { type ConsumableData, dataLoader } from '../data/dataloader';

// 消耗品工廠類別 - 單例模式
export class ConsumableFactory {
    private static instance: ConsumableFactory;

    private constructor() {
        // 確保數據加載器已經初始化
        dataLoader.loadAllData().catch(error => {
            console.error("初始化消耗品工廠時無法加載數據:", error);
        });
    }

    // 獲取單例實例
    public static getInstance(): ConsumableFactory {
        if (!ConsumableFactory.instance) {
            ConsumableFactory.instance = new ConsumableFactory();
        }
        return ConsumableFactory.instance;
    }

    // 根據消耗品ID創建消耗品實例
    public createConsumableById(id: string, quantity: number = 1): Consumable | null {
        const consumableData = dataLoader.getConsumableDataById(id);
        if (!consumableData) {
            console.error(`找不到ID為 ${id} 的消耗品數據`);
            return null;
        }

        const consumable = this.createConsumable(consumableData);
        if (consumable) {
            consumable.quantity = quantity;
        }
        return consumable;
    }

    // 根據消耗品數據創建消耗品實例
    public createConsumable(data: ConsumableData): Consumable {
        return new Consumable(data);
    }

    // 批量創建消耗品
    public createConsumables(consumables: { id: string, quantity: number }[]): Consumable[] {
        const result: Consumable[] = [];
        
        for (const consumableInfo of consumables) {
            const consumable = this.createConsumableById(consumableInfo.id, consumableInfo.quantity);
            if (consumable) {
                result.push(consumable);
            }
        }
        
        return result;
    }

    // 獲取所有可用的消耗品數據
    public getAllConsumablesData(): ConsumableData[] {
        return dataLoader.getAllConsumableData();
    }

    // 複製一個已有的消耗品實例
    public cloneConsumable(consumable: Consumable): Consumable {
        return consumable.clone() as Consumable;
    }
}

// 導出消耗品工廠實例
export const consumableFactory = ConsumableFactory.getInstance();
