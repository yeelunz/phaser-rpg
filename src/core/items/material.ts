// 材料物品類
import { Item, ItemType } from './item';
import { type MaterialData } from '../data/dataloader';

export class Material extends Item {
    constructor(data: MaterialData) {
        super(data);
        // 確保類型正確
        if (this._type !== ItemType.MATERIAL) {
            console.warn(`材料項目 ${data.id} 的類型不正確，已自動修正`);
            this._type = ItemType.MATERIAL;
        }
    }

    // 實現抽象方法: 使用材料物品
    use(): boolean {
        // 材料通常不能直接使用，但可以被合成系統使用
        console.log(`材料 ${this._name} 不能直接使用。`);
        return false;
    }

    // 實現抽象方法: 複製材料物品
    clone(): Material {
        const clonedMaterial = new Material({
            id: this._id,
            name: this._name,
            description: this._description,
            type: this._type,
            icon: this._icon,
            stackable: this._stackable,
            value: this._value
        });
        
        // 複製數量
        clonedMaterial.quantity = this._quantity;
        
        return clonedMaterial;
    }

    // 檢查是否為材料
    isMaterial(): boolean {
        return true;
    }

    // 獲取材料數據的方法
    toJSON(): MaterialData {
        return {
            id: this._id,
            name: this._name,
            description: this._description,
            type: this._type,
            icon: this._icon,
            stackable: this._stackable,
            value: this._value
        };
    }
}
