import { IMovementStrategy } from './IMovementStrategy';
import { StationaryMovement } from './StationaryMovement';
import { RandomWanderMovement } from './RandomWanderMovement';
import { PathPatrolMovement } from './PathPatrolMovement';
import { ChaseTargetMovement } from './ChaseTargetMovement';
import { MaintainDistanceMovement } from './MaintainDistanceMovement';

/**
 * 移動策略工廠
 * 負責創建不同類型的移動策略
 */
export class MovementStrategyFactory {
    // 移動策略緩存
    private static strategies: Map<string, IMovementStrategy> = new Map();
    
    /**
     * 創建移動策略
     * @param type 移動策略類型
     * @param params 移動策略參數
     * @returns 移動策略實例
     */
    static create(type: string, params?: any): IMovementStrategy {
        let strategy: IMovementStrategy;
        
        // 檢查緩存中是否已存在此策略
        if (this.strategies.has(type)) {
            strategy = this.strategies.get(type)!;
        } else {
            // 創建新的策略實例
            switch (type.toLowerCase()) {
                case 'stationary':
                    strategy = new StationaryMovement();
                    break;
                case 'randomwander':
                    strategy = new RandomWanderMovement();
                    break;
                case 'pathpatrol':
                    strategy = new PathPatrolMovement();
                    break;
                case 'chasetarget':
                    strategy = new ChaseTargetMovement();
                    break;
                case 'maintaindistance':
                    strategy = new MaintainDistanceMovement();
                    break;
                default:
                    console.warn(`未知的移動策略類型: ${type}，使用默認靜止策略`);
                    strategy = new StationaryMovement();
            }
            
            // 將新策略加入緩存
            this.strategies.set(type, strategy);
        }
        
        // 設置策略參數
        if (params) {
            strategy.setParams(params);
        }
        
        return strategy;
    }
    
    /**
     * 清理緩存
     */
    static clearCache(): void {
        this.strategies.clear();
    }
}
