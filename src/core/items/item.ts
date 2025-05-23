// 基礎物品類別
export const ItemType = {
    EQUIPMENT: 'equipment',
    MATERIAL: 'material',
    CONSUMABLE: 'consumable'
} as const;

// 創建類型
export type ItemType = typeof ItemType[keyof typeof ItemType];

// 物品基礎介面
export interface ItemData {
    id: string;
    name: string;
    description: string;
    type: ItemType;
    icon: string;
    stackable: boolean;
    value: number;
}

// 物品基礎類別
export abstract class Item {
    protected _id: string;
    protected _name: string;
    protected _description: string;
    protected _type: ItemType;
    protected _icon: string;
    protected _stackable: boolean;
    protected _value: number;
    protected _quantity: number = 1;

    constructor(data: ItemData) {
        this._id = data.id;
        this._name = data.name;
        this._description = data.description;
        this._type = data.type;
        this._icon = data.icon;
        this._stackable = data.stackable;
        this._value = data.value;
    }

    // 基本屬性的getter
    get id(): string {
        return this._id;
    }

    get name(): string {
        return this._name;
    }

    get description(): string {
        return this._description;
    }

    get type(): ItemType {
        return this._type;
    }

    get icon(): string {
        return this._icon;
    }

    get stackable(): boolean {
        return this._stackable;
    }

    get value(): number {
        return this._value;
    }

    get quantity(): number {
        return this._quantity;
    }

    set quantity(value: number) {
        // 如果物品可堆疊，最大堆疊數量為99
        if (this._stackable) {
            this._quantity = Math.min(Math.max(0, value), 99);
        } else {
            // 如果不可堆疊，數量最多為1
            this._quantity = Math.min(Math.max(0, value), 1);
        }
    }

    // 使用物品的抽象方法，由子類實現
    abstract use(): boolean;

    // 檢查物品是否為特定類型
    isType(type: ItemType): boolean {
        return this._type === type;
    }

    // 複製物品的抽象方法
    abstract clone(): Item;

    // 取得物品的總價值
    getTotalValue(): number {
        return this._value * this._quantity;
    }

    // 物品資訊的字串表示
    toString(): string {
        return `${this._name} (${this._quantity}) - ${this._description}`;
    }
}
