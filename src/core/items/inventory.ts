// 物品欄系統 - 負責管理角色的物品和金錢
import { Item } from './item';
import { Equipment } from './equipment';
import { Consumable } from './consumable';
import { Material } from './material';
import { EquipmentSlot } from '../data/dataloader';

// 物品類型分類定義
export type ItemGroup = 'all' | 'equipment' | 'consumable' | 'material';

// 物品欄事件類型
export type InventoryEventType = 'add' | 'remove' | 'use' | 'gold_change' | 'full';

// 物品欄事件介面
export interface InventoryEvent {
    type: InventoryEventType;
    item?: Item;
    quantity?: number;
    gold?: number;
}

// 物品欄事件監聽器類型
export type InventoryEventListener = (event: InventoryEvent) => void;

/**
 * 物品欄類別 - 管理角色的物品和金錢
 */
export class Inventory {
    private _items: Item[] = [];                     // 所有物品列表
    private _gold: number = 0;                       // 持有的金錢
    private _capacity: number = 30;                  // 物品欄容量上限
    private _eventListeners: InventoryEventListener[] = []; // 事件監聽器列表

    /**
     * 建立一個新的物品欄
     * @param capacity 物品欄容量上限
     * @param initialGold 初始金錢
     */
    constructor(capacity: number = 30, initialGold: number = 0) {
        this._capacity = capacity;
        this._gold = Math.max(0, initialGold);
    }

    // 基本屬性的 getter
    get items(): readonly Item[] {
        return [...this._items]; // 返回物品列表的複製
    }

    get gold(): number {
        return this._gold;
    }

    get capacity(): number {
        return this._capacity;
    }

    get remainingSpace(): number {
        return this._capacity - this._items.length;
    }

    get isFull(): boolean {
        return this._items.length >= this._capacity;
    }

    // 金錢管理
    /**
     * 設定金錢數量
     * @param value 新的金錢數量
     */
    set gold(value: number) {
        const oldGold = this._gold;
        this._gold = Math.max(0, value); // 確保金錢不為負數
        
        // 觸發金錢變更事件
        if (oldGold !== this._gold) {
            this.triggerEvent({
                type: 'gold_change',
                gold: this._gold
            });
        }
    }

    /**
     * 增加金錢
     * @param amount 增加的金錢數量
     * @returns 增加後的總金錢數量
     */
    addGold(amount: number): number {
        if (amount <= 0) return this._gold;
        this.gold = this._gold + amount;
        return this._gold;
    }

    /**
     * 減少金錢
     * @param amount 減少的金錢數量
     * @returns 減少後的總金錢數量，如果金錢不足則返回原金錢數量
     */
    removeGold(amount: number): number {
        if (amount <= 0) return this._gold;
        if (this._gold < amount) {
            console.warn('金錢不足，無法扣除');
            return this._gold;
        }
        this.gold = this._gold - amount;
        return this._gold;
    }

    /**
     * 檢查是否有足夠的金錢
     * @param amount 所需金錢數量
     * @returns 是否有足夠的金錢
     */
    hasEnoughGold(amount: number): boolean {
        return this._gold >= amount;
    }

    // 物品管理
    /**
     * 檢查是否可以添加物品
     * @param item 要添加的物品
     * @param quantity 數量
     * @returns 是否可以添加
     */
    canAddItem(item: Item, quantity: number = 1): boolean {
        if (quantity <= 0) return false;
        
        // 如果物品可堆疊，檢查是否有同類物品可以堆疊
        if (item.stackable) {
            const existingItem = this.findStackableItem(item);
            if (existingItem) {
                return true; // 可以堆疊到現有物品上
            }
        }
        
        // 如果沒有可堆疊物品或物品不可堆疊，檢查是否有足夠空間
        return this.remainingSpace >= (item.stackable ? 1 : quantity);
    }

    /**
     * 添加物品到物品欄
     * @param item 要添加的物品
     * @param quantity 數量
     * @returns 是否成功添加
     */
    addItem(item: Item, quantity: number = 1): boolean {
        if (quantity <= 0) return false;
        
        // 檢查物品是否可堆疊
        if (item.stackable) {
            // 查找相同的可堆疊物品
            const existingItem = this.findStackableItem(item);
            if (existingItem) {
                // 堆疊到現有物品上
                existingItem.quantity += quantity;
                
                // 觸發添加物品事件
                this.triggerEvent({
                    type: 'add',
                    item: existingItem,
                    quantity: quantity
                });
                
                return true;
            }
        }
        
        // 如果沒有可堆疊物品或物品不可堆疊
        // 檢查物品欄是否有足夠空間
        const slotsNeeded = item.stackable ? 1 : quantity;
        if (this.remainingSpace < slotsNeeded) {
            console.warn('物品欄空間不足');
            
            // 觸發物品欄已滿事件
            this.triggerEvent({
                type: 'full'
            });
            
            return false;
        }
        
        // 物品不可堆疊或沒有找到可堆疊的物品，創建新的物品條目
        if (item.stackable) {
            // 設置數量並添加到物品欄
            item.quantity = quantity;
            this._items.push(item);
            
            // 觸發添加物品事件
            this.triggerEvent({
                type: 'add',
                item: item,
                quantity: quantity
            });
            
            return true;
        } else {
            // 不可堆疊物品，需要添加多個單獨的物品
            let addedCount = 0;
            for (let i = 0; i < quantity && this.remainingSpace > 0; i++) {
                // 克隆物品以創建獨立實例
                const itemClone = item.clone();
                itemClone.quantity = 1;
                this._items.push(itemClone);
                addedCount++;
            }
            
            if (addedCount > 0) {
                // 觸發添加物品事件
                this.triggerEvent({
                    type: 'add',
                    item: item,
                    quantity: addedCount
                });
                
                if (addedCount < quantity) {
                    console.warn(`由於空間限制，只添加了 ${addedCount}/${quantity} 個物品`);
                    
                    // 觸發物品欄已滿事件
                    this.triggerEvent({
                        type: 'full'
                    });
                }
                
                return true;
            }
            
            return false;
        }
    }

    /**
     * 根據索引移除物品
     * @param index 物品在物品欄中的索引
     * @param quantity 要移除的數量
     * @returns 是否成功移除
     */
    removeItemAt(index: number, quantity: number = 1): boolean {
        if (index < 0 || index >= this._items.length) {
            console.warn('物品索引超出範圍');
            return false;
        }
        
        const item = this._items[index];
        if (quantity <= 0 || quantity > item.quantity) {
            console.warn('移除數量無效');
            return false;
        }
        
        // 減少物品數量
        if (item.quantity > quantity) {
            item.quantity -= quantity;
            
            // 觸發移除物品事件
            this.triggerEvent({
                type: 'remove',
                item: item,
                quantity: quantity
            });
            
            return true;
        } else {
            // 完全移除物品
            const removedItem = this._items.splice(index, 1)[0];
            
            // 觸發移除物品事件
            this.triggerEvent({
                type: 'remove',
                item: removedItem,
                quantity: removedItem.quantity
            });
            
            return true;
        }
    }

    /**
     * 移除特定物品
     * @param item 要移除的物品實例
     * @param quantity 要移除的數量
     * @returns 是否成功移除
     */
    removeItem(item: Item, quantity: number = 1): boolean {
        const index = this._items.indexOf(item);
        if (index === -1) {
            console.warn('物品不在物品欄中');
            return false;
        }
        
        return this.removeItemAt(index, quantity);
    }

    /**
     * 移除特定ID的物品
     * @param itemId 要移除的物品ID
     * @param quantity 要移除的數量
     * @returns 是否成功移除
     */
    removeItemById(itemId: string, quantity: number = 1): boolean {
        if (quantity <= 0) return false;
        
        // 查找所有匹配ID的物品
        const matchedIndices = this._items
            .map((item, index) => item.id === itemId ? index : -1)
            .filter(index => index !== -1);
        
        if (matchedIndices.length === 0) {
            console.warn(`找不到ID為 ${itemId} 的物品`);
            return false;
        }
        
        let remainingQuantity = quantity;
        let success = false;
        
        // 從後往前移除，避免索引變化問題
        for (let i = matchedIndices.length - 1; i >= 0 && remainingQuantity > 0; i--) {
            const index = matchedIndices[i];
            const item = this._items[index];
            
            if (item.quantity <= remainingQuantity) {
                // 完全移除此物品
                const removedQuantity = item.quantity;
                this._items.splice(index, 1);
                remainingQuantity -= removedQuantity;
                
                // 觸發移除物品事件
                this.triggerEvent({
                    type: 'remove',
                    item: item,
                    quantity: removedQuantity
                });
                
                success = true;
            } else {
                // 部分移除
                item.quantity -= remainingQuantity;
                
                // 觸發移除物品事件
                this.triggerEvent({
                    type: 'remove',
                    item: item,
                    quantity: remainingQuantity
                });
                
                remainingQuantity = 0;
                success = true;
            }
        }
        
        return success;
    }

    /**
     * 使用物品
     * @param index 物品在物品欄中的索引
     * @returns 是否成功使用
     */
    useItemAt(index: number): boolean {
        if (index < 0 || index >= this._items.length) {
            console.warn('物品索引超出範圍');
            return false;
        }
        
        const item = this._items[index];
        const useResult = item.use();
        
        if (useResult) {
            // 觸發使用物品事件
            this.triggerEvent({
                type: 'use',
                item: item,
                quantity: 1
            });
            
            // 如果使用後數量為0，從物品欄移除
            if (item.quantity <= 0) {
                this._items.splice(index, 1);
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * 使用特定物品
     * @param item 要使用的物品實例
     * @returns 是否成功使用
     */
    useItem(item: Item): boolean {
        const index = this._items.indexOf(item);
        if (index === -1) {
            console.warn('物品不在物品欄中');
            return false;
        }
        
        return this.useItemAt(index);
    }

    // 物品查詢與過濾
    /**
     * 查找與指定物品可堆疊的物品
     * @param item 要查找的物品
     * @returns 可堆疊的物品實例，如果沒找到則返回null
     */
    findStackableItem(item: Item): Item | null {
        if (!item.stackable) return null;
        
        // 查找相同ID的可堆疊物品
        return this._items.find(existingItem => 
            existingItem.id === item.id && 
            existingItem.stackable &&
            existingItem.quantity < 99  // 確保未達到堆疊上限
        ) || null;
    }

    /**
     * 獲取特定類型的物品
     * @param group 物品分組
     * @returns 過濾後的物品列表
     */
    getItemsByGroup(group: ItemGroup = 'all'): Item[] {
        switch (group) {
            case 'equipment':
                return this._items.filter(item => item instanceof Equipment);
            case 'consumable':
                return this._items.filter(item => item instanceof Consumable);
            case 'material':
                return this._items.filter(item => item instanceof Material);
            case 'all':
            default:
                return [...this._items];
        }
    }

    /**
     * 根據物品ID獲取物品實例
     * @param itemId 物品ID
     * @returns 物品實例列表
     */
    getItemsById(itemId: string): Item[] {
        return this._items.filter(item => item.id === itemId);
    }

    /**
     * 獲取特定槽位的裝備
     * @param slot 裝備槽位
     * @returns 符合槽位的裝備列表
     */
    getEquipmentBySlot(slot: EquipmentSlot): Equipment[] {
        return this._items
            .filter(item => item instanceof Equipment && (item as Equipment).isSlot(slot))
            .map(item => item as Equipment);
    }

    /**
     * 計算物品欄中特定物品的總數量
     * @param itemId 物品ID
     * @returns 總數量
     */
    countItem(itemId: string): number {
        return this._items
            .filter(item => item.id === itemId)
            .reduce((total, item) => total + item.quantity, 0);
    }

    /**
     * 檢查是否擁有足夠數量的物品
     * @param itemId 物品ID
     * @param quantity 所需數量
     * @returns 是否擁有足夠數量
     */
    hasItem(itemId: string, quantity: number = 1): boolean {
        return this.countItem(itemId) >= quantity;
    }

    /**
     * 獲取所有物品
     * @returns 所有物品的列表
     */
    getAllItems(): Item[] {
        return [...this._items]; // 返回所有物品的複製
    }

    // 物品欄管理
    /**
     * 清空整個物品欄
     */
    clear(): void {
        // 保存舊物品列表以觸發事件
        const oldItems = [...this._items];
        
        // 清空物品列表
        this._items = [];
        
        // 為每個移除的物品觸發事件
        for (const item of oldItems) {
            this.triggerEvent({
                type: 'remove',
                item: item,
                quantity: item.quantity
            });
        }
    }

    /**
     * 排序物品欄
     * @param compareFn 自定義排序函數
     */
    sort(compareFn?: (a: Item, b: Item) => number): void {
        if (compareFn) {
            this._items.sort(compareFn);
        } else {
            // 默認排序：裝備 > 消耗品 > 材料，然後按照ID排序
            this._items.sort((a, b) => {
                // 首先按類型排序
                const typeOrder = {
                    'equipment': 0,
                    'consumable': 1,
                    'material': 2
                };
                
                const aTypeOrder = typeOrder[a.type] || 999;
                const bTypeOrder = typeOrder[b.type] || 999;
                
                const typeDiff = aTypeOrder - bTypeOrder;
                if (typeDiff !== 0) return typeDiff;
                
                // 然後按ID排序
                return a.id.localeCompare(b.id);
            });
        }
    }

    /**
     * 擴展物品欄容量
     * @param additionalCapacity 增加的容量
     * @returns 擴展後的總容量
     */
    expand(additionalCapacity: number): number {
        if (additionalCapacity <= 0) return this._capacity;
        this._capacity += additionalCapacity;
        return this._capacity;
    }

    // 事件系統
    /**
     * 添加事件監聽器
     * @param listener 事件監聽器函數
     */
    addEventListener(listener: InventoryEventListener): void {
        if (!this._eventListeners.includes(listener)) {
            this._eventListeners.push(listener);
        }
    }

    /**
     * 移除事件監聽器
     * @param listener 要移除的事件監聽器函數
     */
    removeEventListener(listener: InventoryEventListener): void {
        const index = this._eventListeners.indexOf(listener);
        if (index !== -1) {
            this._eventListeners.splice(index, 1);
        }
    }

    /**
     * 觸發物品欄事件
     * @param event 事件對象
     */
    private triggerEvent(event: InventoryEvent): void {
        for (const listener of this._eventListeners) {
            try {
                listener(event);
            } catch (error) {
                console.error('物品欄事件處理器發生錯誤:', error);
            }
        }
    }

    // 調試方法
    /**
     * 獲取物品欄的摘要信息
     * @returns 摘要字符串
     */
    getSummary(): string {
        return `物品欄: ${this._items.length}/${this._capacity} 物品, ${this._gold} 金幣`;
    }

    /**
     * 獲取物品欄的詳細信息
     * @returns 詳細字符串
     */
    getDetailedInfo(): string {
        let info = this.getSummary() + '\n';
        
        // 按物品類型分組
        const equipments = this.getItemsByGroup('equipment');
        const consumables = this.getItemsByGroup('consumable');
        const materials = this.getItemsByGroup('material');
        
        if (equipments.length > 0) {
            info += '\n裝備:\n';
            equipments.forEach((item, index) => {
                info += `${index + 1}. ${item.toString()}\n`;
            });
        }
        
        if (consumables.length > 0) {
            info += '\n消耗品:\n';
            consumables.forEach((item, index) => {
                info += `${index + 1}. ${item.toString()}\n`;
            });
        }
        
        if (materials.length > 0) {
            info += '\n材料:\n';
            materials.forEach((item, index) => {
                info += `${index + 1}. ${item.toString()}\n`;
            });
        }
        
        return info;
    }
}
