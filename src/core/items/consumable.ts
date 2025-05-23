// 消耗品物品類
import { Item, ItemType } from './item';
import { type ConsumableData, ConsumableEffectType, ConsumableAttribute } from '../data/dataloader';

export class Consumable extends Item {
    private _effectType: ConsumableEffectType;
    private _effectValue: number;
    private _duration?: number;
    private _attribute?: ConsumableAttribute;

    constructor(data: ConsumableData) {
        super(data);
        
        // 確保類型正確
        if (this._type !== ItemType.CONSUMABLE) {
            console.warn(`消耗品項目 ${data.id} 的類型不正確，已自動修正`);
            this._type = ItemType.CONSUMABLE;
        }
        
        // 設置消耗品特有屬性
        this._effectType = data.effectType;
        this._effectValue = data.value;
        this._duration = data.duration;
        this._attribute = data.attribute;
    }

    // 獲取消耗品特有屬性
    get effectType(): ConsumableEffectType {
        return this._effectType;
    }

    get effectValue(): number {
        return this._effectValue;
    }

    get duration(): number | undefined {
        return this._duration;
    }

    get attribute(): ConsumableAttribute | undefined {
        return this._attribute;
    }    // 實現抽象方法: 使用消耗品
    use(): boolean {
        if (this._quantity <= 0) {
            console.log(`無法使用 ${this._name}，數量不足。`);
            return false;
        }
        
        let useResult = false;
        
        switch (this._effectType) {
            case ConsumableEffectType.IMMEDIATE:
                useResult = this.applyImmediateEffect();
                break;
                
            case ConsumableEffectType.OVERTIME:
                useResult = this.applyOvertimeEffect();
                break;
                
            case ConsumableEffectType.SPECIAL:
                useResult = this.applySpecialEffect();
                break;
                
            default:
                console.warn(`未知的消耗品效果類型: ${this._effectType}`);
                return false;
        }
        
        // 如果成功使用，減少數量
        if (useResult) {
            this._quantity--;
            console.log(`使用了 ${this._name}，剩餘數量: ${this._quantity}`);
        }
        
        return useResult;
    }

    // 立即效果（恢復或傷害）
    private applyImmediateEffect(): boolean {
        if (!this._attribute) {
            console.warn(`消耗品 ${this._id} 缺少屬性設定`);
            return false;
        }
        
        console.log(`立即效果: ${this._attribute} ${this._effectValue}`);
        
        // 這裡應該與角色系統互動，應用實際效果
        // 例如: 如果是恢復效果，則增加目標生命值
        // 由於這部分需要與其他系統交互，這裡只是示意實現
        
        return true;
    }

    // 持續效果
    private applyOvertimeEffect(): boolean {
        if (!this._attribute || !this._duration) {
            console.warn(`消耗品 ${this._id} 缺少屬性或持續時間設定`);
            return false;
        }
        
        console.log(`持續效果: ${this._attribute} ${this._effectValue} 持續 ${this._duration} 秒`);
        
        // 這裡應該與角色系統互動，應用實際效果
        // 例如: 如果是持續恢復效果，則添加一個持續恢復的狀態效果
        // 由於這部分需要與其他系統交互，這裡只是示意實現
        
        return true;
    }

    // 特殊效果（需要特定代碼處理的效果）
    private applySpecialEffect(): boolean {
        console.log(`特殊效果: ${this._name}`);
        
        // 特殊效果需要根據具體物品ID或其他屬性進行不同處理
        // 這裡只是示意實現
        
        return true;
    }    // 實現抽象方法: 複製消耗品
    clone(): Item {
        const data: ConsumableData = {
            id: this._id,
            name: this._name,
            description: this._description,
            type: this._type,
            icon: this._icon,
            stackable: this._stackable,
            value: this._value,
            effectType: this._effectType
        };
        
        // 添加可選屬性
        if (this._duration !== undefined) {
            data.duration = this._duration;
        }
        
        if (this._attribute !== undefined) {
            data.attribute = this._attribute;
        }
        
        const clonedConsumable = new Consumable(data);
        clonedConsumable.quantity = this._quantity;
        
        return clonedConsumable;
    }

    // 檢查是否為消耗品
    isConsumable(): boolean {
        return true;
    }    // 獲取消耗品數據
    toJSON(): ConsumableData {
        const data: ConsumableData = {
            id: this._id,
            name: this._name,
            description: this._description,
            type: this._type,
            icon: this._icon,
            stackable: this._stackable,
            value: this._value,
            effectType: this._effectType
        };
        
        // 添加可選屬性
        if (this._duration !== undefined) {
            data.duration = this._duration;
        }
        
        if (this._attribute !== undefined) {
            data.attribute = this._attribute;
        }
        
        return data;
    }
}
