import { Scene } from 'phaser';
import { Monster } from '../core/monsters/monster';
import { ProjectileDebugRenderer } from './projectileDebugRenderer';

/**
 * Debug 渲染器 - 用於視覺化碰撞框、觸發區域等
 */
export class DebugRenderer {
    private scene: Scene;
    private graphics: Phaser.GameObjects.Graphics;
    
    // 是否啟用各種渲染選項
    private showCollisionBoxes: boolean = false; // 顯示接觸傷害觸發框 (紅色)
    private showPhysicsBoxes: boolean = false;   // 顯示實際物理碰撞框 (藍色)
    private showHitBoxes: boolean = false;       // 顯示打擊框 (綠色)
    
    // 透明度設置
    private boxOpacity: number = 0.3; // 30% 不透明度
    private outlineOpacity: number = 0.7; // 70% 不透明度

    // 投射物除錯渲染器
    private projectileRenderer: ProjectileDebugRenderer;

    constructor(scene: Scene) {
        this.scene = scene;
        this.graphics = scene.add.graphics();
        
        // 預設設置圖形的深度，確保在精靈之上
        this.graphics.setDepth(1000);
        
        // 初始化投射物除錯渲染器
        this.projectileRenderer = new ProjectileDebugRenderer(scene);
    }
    
    /**
     * 開關碰撞框顯示
     */
    public toggleCollisionBoxes(): boolean {
        this.showCollisionBoxes = !this.showCollisionBoxes;
        return this.showCollisionBoxes;
    }
    
    /**
     * 開關物理碰撞框顯示
     */
    public togglePhysicsBoxes(): boolean {
        this.showPhysicsBoxes = !this.showPhysicsBoxes;
        return this.showPhysicsBoxes;
    }
    
    /**
     * 開關打擊框顯示
     */
    public toggleHitBoxes(): boolean {
        this.showHitBoxes = !this.showHitBoxes;
        return this.showHitBoxes;
    }
    
    /**
     * 開關所有框顯示
     */
    public toggleAllBoxes(show: boolean): void {
        this.showCollisionBoxes = show;
        this.showPhysicsBoxes = show;
        this.showHitBoxes = show;
    }
    
    /**
     * 開關投射物碰撞框顯示
     */
    public toggleProjectileHitboxes(): boolean {
        return this.projectileRenderer.toggleProjectileHitboxes();
    }
    
    /**
     * 開關投射物搜索範圍顯示
     */
    public toggleSearchRanges(): boolean {
        return this.projectileRenderer.toggleSearchRanges();
    }
    
    /**
     * 開關所有投射物顯示
     */
    public toggleAllProjectileDisplays(show: boolean): void {
        this.projectileRenderer.toggleAllDisplays(show);
    }
    
    /**
     * 渲染所有啟用的顯示框
     * @param monsters 怪物對象列表
     * @param monsterEntities 遊戲中的怪物實體
     */
    public render(monsters: Monster[], monsterEntities: { sprite: Phaser.GameObjects.Sprite, monster: Monster, isTriggerOnly?: boolean }[]): void {
        // 清除先前的繪製
        this.graphics.clear();
        
        // 如果沒有啟用任何顯示，則直接返回
        if (!this.showCollisionBoxes && !this.showPhysicsBoxes && !this.showHitBoxes) {
            return;
        }

        
        // 為每個怪物渲染框
        monsterEntities.forEach(entity => {
            const monster = entity.monster;
            const sprite = entity.sprite;
              // 獲取精靈的世界座標
            const x = sprite.x;
            const y = sprite.y;
            
              // 繪製接觸傷害檢測框 (紅色) - 這是觸發區域
            if (this.showCollisionBoxes && entity.isTriggerOnly === true) {

                this.drawBox(
                    x, 
                    y, 
                    monster.getCollisionBox().width, // 使用JSON中定義的原始碰撞框大小作為紅框
                    monster.getCollisionBox().height,
                    0xFF0000, // 紅色
                     // 自定義透明度，讓紅框更容易被看到
                );
            }
            
            // 繪製實際物理碰撞框 (藍色) - 這是阻止玩家移動的區域
            if (this.showPhysicsBoxes && !entity.isTriggerOnly && monster.isSolidObject()) {

                // 使用 body 尺寸
                this.drawBox(
                    x, 
                    y, 
                    monster.getCollisionBox().width * 0.8, // 這是實際物理碰撞框 (原始的80%)
                    monster.getCollisionBox().height * 0.8,
                    0x0000FF // 藍色
                );
            }
            
            // 繪製打擊框 (綠色) - 這是玩家攻擊時的判定區域
            if (this.showHitBoxes) {

                this.drawBox(
                    x, 
                    y, 
                    monster.getHitBox().width,
                    monster.getHitBox().height,
                    0x00FF00 // 綠色
                );
            }
        });
    }
    
    /**
     * 渲染投射物除錯視覺化
     */
    public renderProjectiles(projectiles: Map<string, any>): void {
        this.projectileRenderer.render(projectiles);
    }
    
    /**
     * 繪製一個具有填充和邊框的框
     */
    private drawBox(x: number, y: number, width: number, height: number, color: number): void {
        // 繪製填充矩形
        this.graphics.fillStyle(color, this.boxOpacity);
        this.graphics.fillRect(x - width / 2, y - height / 2, width, height);
        
        // 繪製邊框
        this.graphics.lineStyle(2, color, this.outlineOpacity);
        this.graphics.strokeRect(x - width / 2, y - height / 2, width, height);
    }
    
    /**
     * 銷毀渲染器
     */
    public destroy(): void {
        if (this.graphics) {
            this.graphics.destroy();
        }
        
        if (this.projectileRenderer) {
            this.projectileRenderer.destroy();
        }
    }
}
