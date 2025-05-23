/**
 * 物品系統匯出點
 * 統一匯出所有物品相關的類和接口
 */

// 基本物品類別
export { Item, ItemType } from './item';
export { Equipment } from './equipment';
export { Consumable } from './consumable';
export { Material } from './material';

// 物品工廠類別
export { EquipmentFactory } from './equipmentFactory';
export { ConsumableFactory } from './consumableFactory';
export { MaterialFactory } from './materialFactory';

// 物品欄和管理器
export { Inventory, InventoryEvent, InventoryEventListener } from './inventory';
export { InventoryManager } from './inventory_manager';
export { EquipmentManager } from './equipmentManager';
