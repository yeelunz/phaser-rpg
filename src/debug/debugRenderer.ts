import { Scene } from 'phaser';
import { ProjectileDebugRenderer } from './projectileDebugRenderer';
import { MonsterDebugRenderer } from './monsterDebugRenderer';
import type { IMonsterEntity } from '../core/monsters/IMonsterEntity';

/**
 * Debug 渲染器 - 用於投射物和怪物除錯視覺化
 * 注意：怪物碰撞框/物理框/打擊框的渲染功能已移除，現在使用 Phaser 內建除錯功能
 */
export class DebugRenderer {
    // 投射物除錯渲染器
    private projectileRenderer: ProjectileDebugRenderer;
    // 怪物除錯渲染器
    private monsterRenderer: MonsterDebugRenderer;

    constructor(scene: Scene) {
        // 初始化投射物除錯渲染器
        this.projectileRenderer = new ProjectileDebugRenderer(scene);
        // 初始化怪物除錯渲染器
        this.monsterRenderer = new MonsterDebugRenderer(scene);
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
     * 開關怪物除錯資訊顯示
     */
    public toggleMonsterDebugInfo(): boolean {
        return this.monsterRenderer.toggleMonsterDebugInfo();
    }
    
    /**
     * 檢查怪物除錯是否啟用
     */
    public isMonsterDebugEnabled(): boolean {
        return this.monsterRenderer.isMonsterDebugEnabled();
    }
    
    /**
     * 渲染怪物實體 - 空實現，因為已移除怪物碰撞框渲染功能
     * @deprecated 此方法已棄用，怪物碰撞框現在使用 Phaser 內建除錯功能
     */
    public render(): void {
        // 空實現 - 怪物碰撞框渲染功能已移除
        // 請使用 Phaser 內建的除錯功能來顯示物理碰撞框
    }
      /**
     * 渲染投射物除錯視覺化
     */
    public renderProjectiles(projectiles: Map<string, any>): void {
        this.projectileRenderer.render(projectiles);
    }
    
    /**
     * 渲染怪物除錯視覺化
     */
    public renderMonsters(monsters: IMonsterEntity[]): void {
        this.monsterRenderer.render(monsters);
    }
    
    /**
     * 銷毀渲染器
     */
    public destroy(): void {
        if (this.projectileRenderer) {
            this.projectileRenderer.destroy();
        }
        if (this.monsterRenderer) {
            this.monsterRenderer.destroy();
        }
    }
    
    // 以下方法保留以維持向後兼容性，但已移除實際功能
    
    /**
     * @deprecated 此功能已移除，請使用 Phaser 內建除錯功能
     */
    public toggleCollisionBoxes(): boolean {
        console.warn('toggleCollisionBoxes() 已棄用：怪物碰撞框渲染功能已移除，請使用 Phaser 內建除錯功能');
        return false;
    }
    
    /**
     * @deprecated 此功能已移除，請使用 Phaser 內建除錯功能  
     */
    public togglePhysicsBoxes(): boolean {
        console.warn('togglePhysicsBoxes() 已棄用：怪物物理框渲染功能已移除，請使用 Phaser 內建除錯功能');
        return false;
    }
    
    /**
     * @deprecated 此功能已移除，請使用 Phaser 內建除錯功能
     */
    public toggleHitBoxes(): boolean {
        console.warn('toggleHitBoxes() 已棄用：怪物打擊框渲染功能已移除，請使用 Phaser 內建除錯功能');
        return false;
    }
      /**
     * @deprecated 此功能已移除，請使用 Phaser 內建除錯功能
     */
    public toggleAllBoxes(_show: boolean): void {
        console.warn('toggleAllBoxes() 已棄用：怪物碰撞框渲染功能已移除，請使用 Phaser 內建除錯功能');
    }
}
