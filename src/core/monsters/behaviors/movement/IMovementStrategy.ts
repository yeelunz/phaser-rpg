import { IMonsterEntity } from '../../IMonsterEntity';

/**
 * 怪物移動策略接口
 * 定義不同移動行為的抽象接口
 */
export interface IMovementStrategy {
    /**
     * 執行移動邏輯
     * @param entity 怪物實體
     * @param delta 時間間隔
     * @param targetPosition 目標位置（通常是玩家位置）
     */
    move(entity: IMonsterEntity, delta: number, targetPosition?: { x: number, y: number }): void;
    
    /**
     * 獲取移動策略的名稱
     */
    getName(): string;
    
    /**
     * 設置移動策略的參數
     * @param params 移動策略參數
     */
    setParams(params: any): void;
}
