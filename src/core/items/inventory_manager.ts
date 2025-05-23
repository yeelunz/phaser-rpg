// 物品欄管理器 - 負責集中管理所有物品欄實例
import { Inventory, InventoryEvent, InventoryEventListener} from './inventory';
import { Item, ItemType } from './item';
import { Equipment } from './equipment';
import { EquipmentManager } from './equipmentManager';
import { EquipmentSlot } from '../data/dataloader';
import { Stats } from '../stats';

// 如果沒有全局事件系統，則需要定義一個
declare global {
    interface Window {
        gameEvents?: Phaser.Events.EventEmitter;
        game?: any; // 遊戲實例
    }
}

/**
 * 物品欄管理器類別 - 集中管理遊戲中的物品欄
 * 包括玩家物品欄、臨時物品欄、商店物品欄等
 */
export class InventoryManager {
    private static _instance: InventoryManager;
    
    private _playerInventory: Inventory | null = null;        // 玩家主物品欄
    private _storageInventory: Inventory | null = null;       // 倉庫物品欄
    private _tempInventories: Map<string, Inventory> = new Map(); // 臨時物品欄（如商店、戰利品等）
    private _playerStats: Stats | null = null;  // 玩家能力值統計系統的引用
    
    /**
     * 私有建構子，防止直接創建實例
     */    private constructor() {
        // 初始化玩家物品欄
        this._playerInventory = new Inventory(30, 0);
        
        // 為玩家物品欄添加事件監聽
        this.setupInventoryListeners(this._playerInventory);
    }
    
    /**
     * 設置物品欄事件監聽器
     * @param inventory 要監聽的物品欄
     */    private setupInventoryListeners(inventory: Inventory): void {
        inventory.addEventListener((event) => {
            // 當物品欄發生任何變化時，觸發更新事件
            console.log(`物品欄事件: ${event.type}`, event);
            this.emitInventoryUpdated(inventory);
        });
    }
    
    /**
     * 獲取單例實例
     */
    public static getInstance(): InventoryManager {
        if (!InventoryManager._instance) {
            InventoryManager._instance = new InventoryManager();
        }
        return InventoryManager._instance;
    }
    
    /**
     * 獲取玩家物品欄     */
    get playerInventory(): Inventory {
        if (!this._playerInventory) {
            this._playerInventory = new Inventory(30, 0);
            // 為新創建的物品欄添加事件監聽
            this.setupInventoryListeners(this._playerInventory);
        }
        return this._playerInventory;
    }
    
    /**
     * 獲取倉庫物品欄
     */
    get storageInventory(): Inventory {
        if (!this._storageInventory) {
            this._storageInventory = new Inventory(100, 0);
        }
        return this._storageInventory;
    }
    
    /**
     * 設置玩家物品欄
     * @param inventory 新的玩家物品欄     */
    set playerInventory(inventory: Inventory) {
        this._playerInventory = inventory;
        // 為新設置的物品欄添加事件監聽
        this.setupInventoryListeners(this._playerInventory);
        // 觸發物品欄更新事件
        this.emitInventoryUpdated(this._playerInventory);
    }
    
    /**
     * 重置玩家物品欄
     * @param capacity 容量
     * @param initialGold 初始金錢     */
    resetPlayerInventory(capacity: number = 30, initialGold: number = 0): Inventory {
        this._playerInventory = new Inventory(capacity, initialGold);
        // 為新重置的物品欄添加事件監聽
        this.setupInventoryListeners(this._playerInventory);
        // 觸發物品欄更新事件
        this.emitInventoryUpdated(this._playerInventory);
        return this._playerInventory;
    }
    
    /**
     * 重置倉庫物品欄
     * @param capacity 容量
     */    resetStorageInventory(capacity: number = 100): Inventory {
        this._storageInventory = new Inventory(capacity, 0);
        // 觸發物品欄更新事件
        this.emitInventoryUpdated(this._storageInventory);
        return this._storageInventory;
    }
    
    /**
     * 創建臨時物品欄
     * @param id 物品欄ID
     * @param capacity 容量
     * @param initialGold 初始金錢
     * @returns 創建的臨時物品欄
     */
    createTempInventory(id: string, capacity: number = 30, initialGold: number = 0): Inventory {
        if (this._tempInventories.has(id)) {
            console.warn(`臨時物品欄 ${id} 已存在，將被覆蓋`);
        }        
        const inventory = new Inventory(capacity, initialGold);
        this._tempInventories.set(id, inventory);
        return inventory;
    }
    
    /**
     * 獲取臨時物品欄
     * @param id 物品欄ID
     * @returns 臨時物品欄，如果不存在則返回null
     */
    getTempInventory(id: string): Inventory | null {
        return this._tempInventories.get(id) || null;
    }
    
    /**
     * 刪除臨時物品欄
     * @param id 物品欄ID
     * @returns 是否成功刪除
     */
    removeTempInventory(id: string): boolean {
        return this._tempInventories.delete(id);
    }
    
    /**
     * 檢查臨時物品欄是否存在
     * @param id 物品欄ID
     * @returns 是否存在
     */
    hasTempInventory(id: string): boolean {
        return this._tempInventories.has(id);
    }
    
    /**
     * 獲取所有臨時物品欄ID
     * @returns 臨時物品欄ID列表
     */
    getTempInventoryIds(): string[] {
        return Array.from(this._tempInventories.keys());
    }
    
    /**
     * 清空所有臨時物品欄
     */
    clearAllTempInventories(): void {
        this._tempInventories.clear();
    }
    
    /**
     * 從一個物品欄移動物品到另一個物品欄
     * @param sourceInventory 源物品欄
     * @param targetInventory 目標物品欄
     * @param item 要移動的物品
     * @param quantity 數量
     * @returns 是否成功移動
     */
    moveItem(sourceInventory: Inventory, targetInventory: Inventory, item: Item, quantity: number = 1): boolean {
        if (quantity <= 0) return false;
        
        // 檢查源物品欄是否有此物品
        const sourceIndex = sourceInventory.items.indexOf(item);
        if (sourceIndex === -1) {
            console.warn('源物品欄中找不到指定物品');
            return false;
        }
        
        // 檢查源物品欄中的物品數量是否足夠
        const sourceItem = sourceInventory.items[sourceIndex];
        if (sourceItem.quantity < quantity) {
            console.warn('源物品欄中的物品數量不足');
            return false;
        }
        
        // 檢查目標物品欄是否有空間
        if (!targetInventory.canAddItem(item, quantity)) {
            console.warn('目標物品欄空間不足');
            return false;
        }
        
        // 從源物品欄移除物品
        const removeSuccess = sourceInventory.removeItem(item, quantity);
        if (!removeSuccess) {
            console.error('從源物品欄移除物品失敗');
            return false;
        }
        
        // 克隆物品，確保不會共享引用
        const itemClone = item.clone();
        itemClone.quantity = quantity;
          // 添加到目標物品欄
        const addSuccess = targetInventory.addItem(itemClone, quantity);
        if (!addSuccess) {
            // 如果添加失敗，將物品歸還給源物品欄
            sourceInventory.addItem(item, quantity);
            console.error('添加到目標物品欄失敗，已將物品歸還源物品欄');
            return false;
        }
        
        // 觸發物品欄更新事件
        if (sourceInventory === this._playerInventory) {
            this.emitInventoryUpdated(sourceInventory);
        }
        if (targetInventory === this._playerInventory) {
            this.emitInventoryUpdated(targetInventory);
        }
        
        return true;
    }
    
    /**
     * 從一個物品欄移動物品到另一個物品欄（通過物品ID）
     * @param sourceInventory 源物品欄
     * @param targetInventory 目標物品欄
     * @param itemId 要移動的物品ID
     * @param quantity 數量
     * @returns 是否成功移動
     */
    moveItemById(sourceInventory: Inventory, targetInventory: Inventory, itemId: string, quantity: number = 1): boolean {
        if (quantity <= 0) return false;
        
        // 在源物品欄中查找物品
        const sourceItems = sourceInventory.getItemsById(itemId);
        if (sourceItems.length === 0) {
            console.warn(`源物品欄中找不到ID為 ${itemId} 的物品`);
            return false;
        }
        
        // 檢查源物品欄中的物品總數量是否足夠
        const totalQuantity = sourceItems.reduce((sum, item) => sum + item.quantity, 0);
        if (totalQuantity < quantity) {
            console.warn(`源物品欄中ID為 ${itemId} 的物品數量不足`);
            return false;
        }
        
        // 獲取第一個物品作為模板
        const itemTemplate = sourceItems[0];
        
        // 檢查目標物品欄是否有空間
        const itemClone = itemTemplate.clone();
        if (!targetInventory.canAddItem(itemClone, quantity)) {
            console.warn('目標物品欄空間不足');
            return false;
        }
        
        // 從源物品欄移除物品
        const removeSuccess = sourceInventory.removeItemById(itemId, quantity);
        if (!removeSuccess) {
            console.error('從源物品欄移除物品失敗');
            return false;
        }
          // 添加到目標物品欄
        const addSuccess = targetInventory.addItem(itemClone, quantity);
        if (!addSuccess) {
            // 如果添加失敗，將物品歸還給源物品欄
            sourceInventory.addItem(itemTemplate, quantity);
            console.error('添加到目標物品欄失敗，已將物品歸還源物品欄');
            return false;
        }
        
        // 觸發物品欄更新事件
        if (sourceInventory === this._playerInventory) {
            this.emitInventoryUpdated(sourceInventory);
        }
        if (targetInventory === this._playerInventory) {
            this.emitInventoryUpdated(targetInventory);
        }
        
        return true;
    }
    
    /**
     * 批量移動物品
     * @param sourceInventory 源物品欄
     * @param targetInventory 目標物品欄
     * @param items 要移動的物品及其數量的列表
     * @returns 成功移動的物品數量
     */
    batchMoveItems(
        sourceInventory: Inventory, 
        targetInventory: Inventory, 
        items: {item: Item, quantity: number}[]
    ): number {
        if (!items || items.length === 0) return 0;
        
        let successCount = 0;
        
        for (const {item, quantity} of items) {
            if (this.moveItem(sourceInventory, targetInventory, item, quantity)) {
                successCount++;
            }
        }
        
        return successCount;
    }
    
    /**
     * 交換兩個物品欄中的物品
     * @param inventoryA 第一個物品欄
     * @param indexA 第一個物品的索引
     * @param inventoryB 第二個物品欄
     * @param indexB 第二個物品的索引
     * @returns 是否成功交換
     */
    swapItems(inventoryA: Inventory, indexA: number, inventoryB: Inventory, indexB: number): boolean {
        const itemsA = inventoryA.items;
        const itemsB = inventoryB.items;
        
        // 檢查索引是否有效
        if (indexA < 0 || indexA >= itemsA.length || indexB < 0 || indexB >= itemsB.length) {
            console.warn('物品索引超出範圍');
            return false;
        }
        
        const itemA = itemsA[indexA];
        const itemB = itemsB[indexB];
        
        // 移除物品
        const removeASuccess = inventoryA.removeItemAt(indexA, itemA.quantity);
        const removeBSuccess = inventoryB.removeItemAt(indexB, itemB.quantity);
        
        if (!removeASuccess || !removeBSuccess) {
            // 如果移除失敗，恢復原狀
            if (removeASuccess) inventoryA.addItem(itemA, itemA.quantity);
            if (removeBSuccess) inventoryB.addItem(itemB, itemB.quantity);
            return false;
        }
        
        // 互相添加物品
        const addASuccess = inventoryB.addItem(itemA, itemA.quantity);
        const addBSuccess = inventoryA.addItem(itemB, itemB.quantity);
          if (!addASuccess || !addBSuccess) {
            // 如果添加失敗，恢復原狀
            inventoryA.addItem(itemA, itemA.quantity);
            inventoryB.addItem(itemB, itemB.quantity);
            return false;
        }
        
        // 觸發物品欄更新事件
        if (inventoryA === this._playerInventory) {
            this.emitInventoryUpdated(inventoryA);
        }
        if (inventoryB === this._playerInventory) {
            this.emitInventoryUpdated(inventoryB);
        }
        
        return true;
    }
    
    /**
     * 創建商店物品欄
     * @param shopId 商店ID
     * @param items 商店物品列表
     * @param gold 商店資金
     * @returns 創建的商店物品欄
     */
    createShopInventory(shopId: string, items: Item[] = [], gold: number = 5000): Inventory {
        const shopInventoryId = `shop_${shopId}`;
        const shopInventory = this.createTempInventory(shopInventoryId, 100, gold);
        
        // 添加商店物品
        for (const item of items) {
            shopInventory.addItem(item, item.quantity);
        }
        
        return shopInventory;
    }
    
    /**
     * 獲取指定商店物品欄
     * @param shopId 商店ID
     * @returns 商店物品欄，如果不存在則返回null
     */
    getShopInventory(shopId: string): Inventory | null {
        const shopInventoryId = `shop_${shopId}`;
        return this.getTempInventory(shopInventoryId);
    }
    
    /**
     * 創建掉落物品欄
     * @param dropId 掉落ID
     * @param items 掉落物品列表
     * @returns 創建的掉落物品欄
     */
    createDropInventory(dropId: string, items: Item[] = []): Inventory {
        const dropInventoryId = `drop_${dropId}`;
        const dropInventory = this.createTempInventory(dropInventoryId, items.length);
        
        // 添加掉落物品
        for (const item of items) {
            dropInventory.addItem(item, item.quantity);
        }
        
        return dropInventory;
    }
      /**
     * 獲取指定掉落物品欄
     * @param dropId 掉落ID
     * @returns 掉落物品欄，如果不存在則返回null
     */
    getDropInventory(dropId: string): Inventory | null {
        const dropInventoryId = `drop_${dropId}`;
        return this.getTempInventory(dropInventoryId);
    }
    
    /**
     * 保存所有物品欄數據
     * @returns 序列化的物品欄數據
     */
    saveAllInventories(): any {
        const playerInv = this._playerInventory ? this.serializeInventory(this._playerInventory) : null;
        const storageInv = this._storageInventory ? this.serializeInventory(this._storageInventory) : null;
        
        const tempInvs: Record<string, any> = {};
        this._tempInventories.forEach((inv, id) => {
            tempInvs[id] = this.serializeInventory(inv);
        });
        
        return {
            playerInventory: playerInv,
            storageInventory: storageInv,
            tempInventories: tempInvs
        };
    }
    
    /**
     * 將物品欄序列化為可保存的數據
     * @param inventory 物品欄實例
     * @returns 序列化的物品欄數據
     */
    private serializeInventory(inventory: Inventory): any {
        return {
            capacity: inventory.capacity,
            gold: inventory.gold,
            items: inventory.items.map(item => ({
                id: item.id,
                quantity: item.quantity,
                type: item.type
                // 其他需要保存的物品屬性
            }))
        };
    }
    
    /**
     * 載入所有物品欄數據
     * @param data 序列化的物品欄數據
     */
    loadAllInventories(data: any): void {
        if (!data) return;
        
        // 載入玩家物品欄
        if (data.playerInventory) {
            this._playerInventory = this.deserializeInventory(data.playerInventory);
        }
        
        // 載入倉庫物品欄
        if (data.storageInventory) {
            this._storageInventory = this.deserializeInventory(data.storageInventory);
        }
        
        // 載入臨時物品欄
        if (data.tempInventories) {            for (const [id, invData] of Object.entries(data.tempInventories)) {
                this._tempInventories.set(id, this.deserializeInventory(invData as any));
            }
        }
        
        // 載入後觸發玩家物品欄更新事件
        if (this._playerInventory) {
            this.emitInventoryUpdated(this._playerInventory);
        }
    }
    
    /**
     * 從序列化數據創建物品欄
     * @param data 序列化的物品欄數據
     * @returns 物品欄實例
     */
    private deserializeInventory(data: any): Inventory {
        const inventory = new Inventory(data.capacity || 30, data.gold || 0);
          // TODO: 實作從資料創建物品的邏輯
        // 這裡需要使用 ItemFactory 或其他方式創建物品實例
        // 暫時略過，需要配合具體的物品創建系統實作
        
        // 為反序列化的物品欄添加事件監聽
        this.setupInventoryListeners(inventory);
        
        return inventory;
    }    /**
     * 重置所有物品欄
     */    resetAll(): void {
        this._playerInventory = new Inventory(30, 0);
        this._storageInventory = new Inventory(100, 0);
        this._tempInventories.clear();
        
        // 為重置後的物品欄添加事件監聽
        this.setupInventoryListeners(this._playerInventory);
        
        // 觸發玩家物品欄更新事件
        this.emitInventoryUpdated(this._playerInventory);
    }      /**
     * 獲取裝備槽位映射
     * @param equipmentManager 可選的裝備管理器
     * @returns 裝備槽位到裝備的映射
     */
    getEquipmentMap(equipmentManager?: EquipmentManager): Map<EquipmentSlot, Equipment | null> {
        // 如果提供了裝備管理器，則直接使用
        if (equipmentManager) {
            return equipmentManager.getAllEquipment();
        }
        
        // 如果找不到裝備管理器，則返回空的映射
        const emptyMap = new Map<EquipmentSlot, Equipment | null>();
        Object.values(EquipmentSlot).forEach(slot => {
            emptyMap.set(slot as EquipmentSlot, null);
        });
        
        return emptyMap;
    }    /**
     * 裝備物品
     * @param item 要裝備的物品
     * @param equipmentManager 必須提供的裝備管理器實例
     * @returns 是否成功裝備
     */    
    equipItem(item: Equipment, equipmentManager: EquipmentManager): boolean {
        // 檢查物品是否是裝備類型
        if (item.type !== ItemType.EQUIPMENT) {
            console.warn('尝试装备非装备物品');
            return false;
        }
        
        // 檢查是否提供了裝備管理器
        if (!equipmentManager) {
            console.error('未提供裝備管理器，無法裝備物品');
            return false;
        }
        
        // 將新裝備從物品欄移除
        this.playerInventory.removeItem(item);
        
        // 使用提供的 EquipmentManager 裝備物品
        const success = equipmentManager.equipItem(item);
        if (!success) {
            // 如果裝備失敗，將物品返回到物品欄
            this.playerInventory.addItem(item);
            return false;
        }
        
        console.log(`[InventoryManager] 成功裝備 ${item.name}`);
        
        // 觸發物品欄更新事件
        this.emitInventoryUpdated(this.playerInventory);
        
        return true;
    }    /**
     * 卸下裝備
     * @param slot 要卸下裝備的槽位
     * @param equipmentManager 必須提供的裝備管理器實例
     * @returns 是否成功卸下
     */
    unequipItem(slot: EquipmentSlot, equipmentManager: EquipmentManager): boolean {
        // 檢查是否提供了裝備管理器
        if (!equipmentManager) {
            console.error('未提供裝備管理器，無法卸下裝備');
            return false;
        }
        
        // 使用提供的 EquipmentManager 卸下裝備
        const removedEquipment = equipmentManager.unequipItem(slot);
        if (removedEquipment) {
            // 將卸下的裝備添加回玩家物品欄
            this.playerInventory.addItem(removedEquipment);
            
            // 觸發物品欄更新事件
            this.emitInventoryUpdated(this.playerInventory);
            
            console.log(`[InventoryManager] 成功卸下 ${slot} 槽位的裝備`);
            return true;
        }
        return false;
    }/**
     * 設置玩家狀態引用
     * @param stats 玩家狀態對象
     */
    setPlayerStats(stats: Stats): void {
        this._playerStats = stats;
    }

    /**
     * 獲取玩家狀態對象
     * @returns 玩家狀態對象
     */
    getPlayerStats(): Stats | null {
        return this._playerStats;
    }    /**
     * 獲取裝備 ID
     * 從裝備對象獲取對應的 ID
     * @param equipment 裝備對象
     * @returns 裝備 ID 字串
     */
    getEquipmentId(equipment: Equipment): string {
        return `${equipment.name}_${equipment.slot}`;
    }    /**
     * 同步裝備管理器
     * 將 InventoryManager 中的裝備同步到 EquipmentManager
     * @param equipmentManager 裝備管理器實例
     * @returns 是否成功同步
     */
    syncEquipmentManager(equipmentManager: EquipmentManager): boolean {
        if (!this._playerStats) {
            console.warn('無法找到玩家狀態對象，無法同步裝備管理器');
            return false;
        }
        
        // 如果沒有提供裝備管理器，則返回錯誤
        if (!equipmentManager) {
            console.warn('沒有提供裝備管理器實例，無法同步');
            return false;
        }
        
        // 確保裝備管理器使用的是當前的玩家狀態對象
        equipmentManager.setStats(this._playerStats);
        
        // 手動觸發裝備管理器重新計算加成
        equipmentManager.recalculateStats();
        
        console.log('[InventoryManager] 裝備管理器同步成功');
        
        return true;
    }
      /**
     * 觸發物品欄更新事件
     * @param inventory 更新的物品欄
     */
    private emitInventoryUpdated(inventory: Inventory): void {
        // 使用 window.gameEvents
        if (window.gameEvents) {
            console.log('使用 window.gameEvents 發射 inventoryUpdated 事件');
            window.gameEvents.emit('inventoryUpdated', inventory);
            return;
        }
        
        console.warn('無法找到事件發射器，物品欄更新事件未觸發');
    }

    /**
     * 註冊物品與裝備相關事件（原本在 Game.ts）
     * @param game Phaser.Game 實例
     * @param player Player 實例
     */
    public setupItemEvents(game: Phaser.Game, player: any): void {
        // 監聽裝備物品事件
        game.events.on('equipItem', (item: any) => {
            console.log(`Game 場景接收到裝備請求: ${item.name}`);
            // 裝備物品，使用 player 的 equipmentManager
            const success = this.equipItem(item, player.getEquipmentManager());
            if (success) {
                console.log(`成功裝備: ${item.name}`);
                player.updateStats();
                game.events.emit('playerStatsUpdated', player.getStats());
                game.events.emit('equipmentUpdated', this.getEquipmentMap(player.getEquipmentManager()));
                game.events.emit('inventoryUpdated', this.playerInventory);
                game.events.emit('showInventoryPanel');
            } else {
                console.warn(`裝備失敗: ${item.name}`);
            }
        });
        // 監聽丟棄物品事件
        game.events.on('dropItem', (item: any) => {
            console.log(`Game 場景接收到丟棄物品請求: ${item.name}`);
            this.playerInventory.removeItem(item);
            game.events.emit('inventoryUpdated', this.playerInventory);
            game.events.emit('showInventoryPanel');
        });
        // 監聽使用消耗品事件
        game.events.on('useConsumable', (item: any) => {
            console.log(`Game 場景接收到使用消耗品請求: ${item.name}`);
            this.playerInventory.useItem(item);
            player.updateStats();
            game.events.emit('playerStatsUpdated', player.getStats());
            game.events.emit('inventoryUpdated', this.playerInventory);
            game.events.emit('showInventoryPanel');
        });
        // 監聽卸下裝備事件
        game.events.on('unequipItem', (slot: any, equipment: any) => {
            console.log(`Game 場景接收到卸下裝備請求: ${equipment.name} 從槽位 ${slot}`);
            player.updateStats();
            game.events.emit('playerStatsUpdated', player.getStats());
            game.events.emit('equipmentUpdated', this.getEquipmentMap(player.getEquipmentManager()));
            game.events.emit('inventoryUpdated', this.playerInventory);
        });
    }
}
