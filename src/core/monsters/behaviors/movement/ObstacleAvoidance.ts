import { IMonsterEntity } from '../../IMonsterEntity';

/**
 * 避障礙系統
 * 為怪物移動提供基本的障礙物避讓功能
 */
export interface ObstacleAvoidanceConfig {
    avoidanceDistance: number;  // 避障檢測距離
    avoidanceStrength: number;  // 避障力度
    probeCount: number;         // 探測射線數量
    enabled: boolean;           // 是否啟用避障
}

export class ObstacleAvoidance {
    private config: ObstacleAvoidanceConfig;
    private scene: any;

    constructor(scene: any, config: Partial<ObstacleAvoidanceConfig> = {}) {
        this.scene = scene;
        this.config = {
            avoidanceDistance: 50,
            avoidanceStrength: 1.0,
            probeCount: 5,
            enabled: true,
            ...config
        };
    }

    /**
     * 計算避障修正向量
     * @param entity 怪物實體
     * @param desiredVelocity 期望的移動向量
     * @returns 修正後的移動向量
     */
    public calculateAvoidance(
        entity: IMonsterEntity, 
        desiredVelocity: { x: number; y: number }
    ): { x: number; y: number } {
        if (!this.config.enabled || !this.scene?.physics?.world) {
            return desiredVelocity;
        }

        const position = entity.getPosition();
        const avoidanceForce = this.calculateAvoidanceForce(position, desiredVelocity);

        // 結合期望速度和避障力
        return {
            x: desiredVelocity.x + avoidanceForce.x * this.config.avoidanceStrength,
            y: desiredVelocity.y + avoidanceForce.y * this.config.avoidanceStrength
        };
    }

    /**
     * 計算避障力向量
     */
    private calculateAvoidanceForce(
        position: { x: number; y: number },
        velocity: { x: number; y: number }
    ): { x: number; y: number } {
        let avoidanceX = 0;
        let avoidanceY = 0;

        // 獲取移動方向
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        if (speed === 0) return { x: 0, y: 0 };

        const dirX = velocity.x / speed;
        const dirY = velocity.y / speed;

        // 創建多個探測射線
        for (let i = 0; i < this.config.probeCount; i++) {
            const angleOffset = (i - Math.floor(this.config.probeCount / 2)) * 0.5; // 扇形探測
            const probeAngle = Math.atan2(dirY, dirX) + angleOffset;
            
            const probeX = Math.cos(probeAngle);
            const probeY = Math.sin(probeAngle);

            // 檢測這個方向上的障礙物
            const obstacle = this.detectObstacle(position, probeX, probeY);
            
            if (obstacle) {
                // 計算避障力：距離越近，力度越大
                const distance = obstacle.distance;
                const avoidanceRatio = Math.max(0, 1 - distance / this.config.avoidanceDistance);
                
                // 避障方向：垂直於探測方向
                const avoidX = -probeY * avoidanceRatio;
                const avoidY = probeX * avoidanceRatio;
                
                avoidanceX += avoidX;
                avoidanceY += avoidY;
            }
        }

        return { x: avoidanceX, y: avoidanceY };
    }    /**
     * 檢測指定方向上的障礙物 (適用於 Phaser 3.90.0)
     */
    private detectObstacle(
        position: { x: number; y: number },
        dirX: number,
        dirY: number
    ): { distance: number } | null {
        // 這裡使用改進的障礙物檢測，兼容 Phaser 3.90.0
        // 1. 檢測地圖邊界
        // 2. 檢測固體物理物件（矩形障礙物）

        const probeLength = this.config.avoidanceDistance;
        const endX = position.x + dirX * probeLength;
        const endY = position.y + dirY * probeLength;
        
        let closestDistance = probeLength; // 初始化為最大探測距離

        // 檢測地圖邊界
        if (this.scene.physics?.world) {
            const worldBounds = this.scene.physics.world.bounds;
            const margin = 20; // 邊界緩衝區

            if (endX < worldBounds.x + margin || 
                endX > worldBounds.x + worldBounds.width - margin ||
                endY < worldBounds.y + margin || 
                endY > worldBounds.y + worldBounds.height - margin) {
                
                // 計算到邊界的距離
                const distanceToEdge = Math.min(
                    position.x - (worldBounds.x + margin),
                    (worldBounds.x + worldBounds.width - margin) - position.x,
                    position.y - (worldBounds.y + margin),
                    (worldBounds.y + worldBounds.height - margin) - position.y
                );

                if (distanceToEdge < closestDistance) {
                    closestDistance = Math.max(0, distanceToEdge);
                }
            }
        }

        // 使用 Phaser 3.90.0 的射線檢測方式
        // 首先創建射線
        const ray = new Phaser.Geom.Line(
            position.x, 
            position.y, 
            endX, 
            endY
        );

        // 檢查場景中所有的物理物體
        // 先檢查是否有 staticBodies 或 staticGroup
        if (this.scene.physics && this.scene.physics.world) {
            // 遍歷所有靜態物體
            const bodies = this.scene.physics.world.staticBodies;
            
            if (bodies && bodies.getChildren && typeof bodies.getChildren === 'function') {
                bodies.getChildren().forEach((body: any) => {
                    try {
                        // 安全檢查，確保 body 和 gameObject 存在
                        if (!body || !body.gameObject) return;
                        
                        const obstacle = body.gameObject;
                        
                        // 獲取障礙物的邊界
                        // 對於 Phaser 3.90.0，使用 getBounds 方法
                        let bounds;
                        if (typeof obstacle.getBounds === 'function') {
                            bounds = obstacle.getBounds();
                        } else if (body.x !== undefined && body.y !== undefined && 
                                  body.width !== undefined && body.height !== undefined) {
                            // 如果物體沒有 getBounds 方法，但有坐標和尺寸屬性
                            bounds = {
                                x: body.x - body.width / 2,
                                y: body.y - body.height / 2,
                                width: body.width,
                                height: body.height
                            };
                        }
                        
                        // 檢查是否存在有效的邊界
                        if (!bounds) return;
                        
                        // 創建矩形表示障礙物邊界
                        const rect = new Phaser.Geom.Rectangle(
                            bounds.x, 
                            bounds.y, 
                            bounds.width, 
                            bounds.height
                        );
                         
                        // 檢查線段與矩形是否相交
                        let intersects = false;
                        
                        // 首先嘗試使用 Phaser.Geom.Intersects.LineToRectangle
                        if (Phaser.Geom.Intersects && Phaser.Geom.Intersects.LineToRectangle) {
                            intersects = Phaser.Geom.Intersects.LineToRectangle(ray, rect);
                        } else {
                            // 手動檢查相交 - 簡化版
                            // 檢查射線起點或終點是否在矩形內
                            intersects = Phaser.Geom.Rectangle.Contains(rect, position.x, position.y) ||
                                        Phaser.Geom.Rectangle.Contains(rect, endX, endY);
                        }
                        
                        // 如果相交，估算到障礙物的距離
                        if (intersects) {
                            // 從位置到障礙物中心計算距離
                            const rectCenterX = rect.x + rect.width / 2;
                            const rectCenterY = rect.y + rect.height / 2;
                            
                            const dx = rectCenterX - position.x;
                            const dy = rectCenterY - position.y;
                            
                            // 計算到障礙物中心的距離
                            const distToCenter = Math.sqrt(dx * dx + dy * dy);
                            
                            // 考慮矩形的半徑
                            const rectRadius = Math.min(rect.width, rect.height) / 2;
                            const estimatedDistance = Math.max(0, distToCenter - rectRadius);
                            
                            // 更新最近距離
                            if (estimatedDistance < closestDistance) {
                                closestDistance = estimatedDistance;
                            }
                        }
                    } catch (error) {
                        // 安全處理任何錯誤
                        console.error('檢測障礙物時出錯:', error);
                    }
                });
            }
        }

        // 如果檢測到障礙物
        if (closestDistance < probeLength) {
            return { distance: closestDistance };
        }

        return null;
    }

    /**
     * 更新避障配置
     */
    public updateConfig(newConfig: Partial<ObstacleAvoidanceConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * 獲取當前配置
     */
    public getConfig(): ObstacleAvoidanceConfig {
        return { ...this.config };
    }
}
