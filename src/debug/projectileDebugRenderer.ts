import { Scene } from 'phaser';
import { SkillProjectile } from '../core/skills/skillProjectile';
import type { EntitySearchFilter } from '../core/combat/entitySearchSystem';

/**
 * 投射物除錯渲染器 - 用於視覺化投射物碰撞框和搜索範圍
 */
export class ProjectileDebugRenderer {
    private graphics: Phaser.GameObjects.Graphics;
    
    // 臨時文字元素的存儲陣列，用於每次渲染後清理
    private temporaryTexts: Phaser.GameObjects.Text[] = [];      // 渲染選項
    private showProjectileHitboxes: boolean = true;   // 顯示投射物碰撞框（默認啟用）
    private showSearchRanges: boolean = true;         // 顯示搜索範圍（默認啟用）
    
    // 顏色與透明度設置
    private searchRangeColor: number = 0xFFFF00;    // 黃色
    private boxOpacity: number = 0.3;              // 30% 不透明度
    private outlineOpacity: number = 0.7;          // 70% 不透明度
    private searchRangeOpacity: number = 0.15;     // 15% 不透明度
    private arrowColor: number = 0xFF00FF;         // 紫色，用於方向指示
    
    constructor(scene: Scene) {
        this.graphics = scene.add.graphics();
        
        // 設置圖形的深度，確保在大多數遊戲元素之上，但在UI之下
        this.graphics.setDepth(900);
    }
    
    /**
     * 開關投射物碰撞框顯示
     */
    public toggleProjectileHitboxes(): boolean {
        this.showProjectileHitboxes = !this.showProjectileHitboxes;
        return this.showProjectileHitboxes;
    }
    
    /**
     * 開關搜索範圍顯示
     */
    public toggleSearchRanges(): boolean {
        this.showSearchRanges = !this.showSearchRanges;
        return this.showSearchRanges;
    }
    
    /**
     * 開關所有顯示
     */
    public toggleAllDisplays(show: boolean): void {
        this.showProjectileHitboxes = show;
        this.showSearchRanges = show;
    }
    
    /**
     * 檢查渲染器是否啟用
     */
    public isAnyDisplayEnabled(): boolean {
        return this.showProjectileHitboxes || this.showSearchRanges;
    }
      /**
     * 渲染投射物碰撞框和搜索範圍
     * @param projectiles 活動中的投射物列表
     */
    public render(projectiles: Map<string, any>): void {
        // 清除先前的繪製
        this.graphics.clear();
        
        // 清除先前創建的臨時文字元素
        this.temporaryTexts.forEach(text => text.destroy());
        this.temporaryTexts = [];
        
        // 如果沒有啟用任何顯示，則直接返回
        if (!this.isAnyDisplayEnabled()) {
            return;
        }
        
        // 轉換 Map 為數組以便遍歷
        const projectileArray = Array.from(projectiles.values());
        
        for (const projectileData of projectileArray) {
            const projectile = projectileData.projectile;
            const sprite = projectileData.sprite;
            
            if (!projectile || !sprite) { // 確保 projectile 和 sprite 有效
                continue; 
            }
            
            // 獲取精靈的世界座標
            const x = sprite.x;
            const y = sprite.y;
            

            
            // 渲染搜索範圍
            if (this.showSearchRanges) {
                this.renderSearchRanges(projectile, x, y);
            }
            
            // 渲染方向箭頭
            if (this.showProjectileHitboxes || this.showSearchRanges) {
                this.renderDirectionArrow(projectile, x, y);
            }
        }
    }
      /**
     * 渲染搜索範圍
     */
    private renderSearchRanges(projectile: SkillProjectile, x: number, y: number): void {
        const searchFilter: EntitySearchFilter | null = projectile.getSearchFilter(); // 明確類型註解
        if (!searchFilter || !searchFilter.area) {
            return;
        }

        const searchArea = searchFilter.area;
          // 根據搜索區域類型繪製
        switch (searchArea.type) {
            case 'circle':
                const circleArea = searchArea as any; 
                if (typeof circleArea.radius === 'number') {
                    // 斬擊技能的 direction 是 Phaser 角度 (東=0, 南=90, 西=180, 北=270)
                    // 繪圖函式通常以 x 軸正方向 (東) 為 0 度
                    this.drawCircle(x, y, circleArea.radius, this.searchRangeColor, this.searchRangeOpacity);
                } else {
                    console.warn(`[DebugRenderer] Circle search area for projectile ${projectile.getId()} is missing radius.`);
                }
                break;            case 'rectangle':
                const rectArea = searchArea as any; 
                if (typeof rectArea.width === 'number' && typeof rectArea.height === 'number') {
                    // 獲取角度 - 統一使用度數
                    let angle = rectArea.angle !== undefined ? rectArea.angle : projectile.getAttribute('direction') as number || 0;
                    
                    this.drawBox(
                        x, 
                        y, 
                        rectArea.width, 
                        rectArea.height, 
                        this.searchRangeColor,
                        angle, 
                        this.searchRangeOpacity
                    );
                } else {
                    console.warn(`[DebugRenderer] Rectangle search area for projectile ${projectile.getId()} is missing width or height.`);
                }
                break;
            case 'line':
                const lineArea = searchArea as any;
                if (typeof lineArea.length === 'number') {
                    // 線形搜尋範圍的渲染
                    const lineWidth =  lineArea.width !== undefined ? lineArea.width : 0.05; // 預設線寬為 5
                    const lineAngle = lineArea.angle !== undefined ? lineArea.angle : projectile.getAttribute('direction') as number || 0;
                    
                    this.drawLine(
                        x,
                        y,
                        lineArea.length,
                        lineWidth,
                        lineAngle,
                        this.searchRangeColor,
                        this.searchRangeOpacity
                    );
                } else {
                    console.warn(`[DebugRenderer] Line search area for projectile ${projectile.getId()} is missing length.`);
                }
                break;
            case 'sector':
                const sectorArea = searchArea as any; 
                if (typeof sectorArea.radius === 'number' &&
                    typeof sectorArea.startAngle === 'number' &&
                    typeof sectorArea.endAngle === 'number') {
                    // 斬擊技能的 direction 是 Phaser 角度
                    // drawSector 的 startAngle 和 endAngle 應該是相對於 Phaser 角度系統的
                    // 如果 searchArea 中的角度是相對角度，需要疊加投射物的方向
                    const projectileDirection = projectile.getAttribute('direction') as number || 0;
                    const startAngle = projectileDirection + sectorArea.startAngle;
                    const endAngle = projectileDirection + sectorArea.endAngle;

                    this.drawSector(
                        x, 
                        y, 
                        sectorArea.radius, 
                        startAngle, 
                        endAngle, 
                        this.searchRangeColor,
                        this.searchRangeOpacity
                    );
                } else {
                    console.warn(`[DebugRenderer] Sector search area for projectile ${projectile.getId()} is missing radius, startAngle, or endAngle.`);
                }
                break;
            default:
                console.warn(`[DebugRenderer] Unknown search area type: ${(searchArea as any).type} for projectile ${projectile.getId()}`);
        }
    }

    /**
     * 繪製扇形搜索範圍
     */
    private drawSector(
        x: number, 
        y: number, 
        radius: number, 
        startAngle: number, 
        endAngle: number, 
        color: number, 
        fillOpacity: number = this.searchRangeOpacity
    ): void {
        this.graphics.fillStyle(color, fillOpacity);
        this.graphics.beginPath();
        this.graphics.moveTo(x, y);
        // Phaser 的 arc 方法使用弧度
        this.graphics.arc(
            x, 
            y, 
            radius, 
            Phaser.Math.DegToRad(startAngle), 
            Phaser.Math.DegToRad(endAngle), 
            false // anticlockwise
        );
        this.graphics.closePath();
        this.graphics.fillPath();

        this.graphics.lineStyle(2, color, this.outlineOpacity);
        this.graphics.beginPath();
        this.graphics.moveTo(x,y);
        this.graphics.arc(
            x,
            y,
            radius,
            Phaser.Math.DegToRad(startAngle),
            Phaser.Math.DegToRad(endAngle),
            false
        );
        // 連接到圓心形成扇形邊界
        this.graphics.lineTo(x + radius * Math.cos(Phaser.Math.DegToRad(endAngle)), y + radius * Math.sin(Phaser.Math.DegToRad(endAngle)));
        this.graphics.moveTo(x,y);
        this.graphics.lineTo(x + radius * Math.cos(Phaser.Math.DegToRad(startAngle)), y + radius * Math.sin(Phaser.Math.DegToRad(startAngle)));
        this.graphics.strokePath();
    }
    
    /**
     * 渲染方向箭頭
     */
    private renderDirectionArrow(projectile: SkillProjectile, x: number, y: number): void {
        const direction = projectile.getAttribute('direction') as number | undefined;
        
        if (typeof direction !== 'number') return;

        // 方向已經是 Phaser 角度 (東=0, 南=90, 西=180, 北=270)
        const angleRad = direction * Math.PI / 180; // 轉換為弧度
        const arrowLength = 30; // 箭頭長度
        const arrowEndX = x + Math.cos(angleRad) * arrowLength;
        const arrowEndY = y + Math.sin(angleRad) * arrowLength;

        this.graphics.lineStyle(2, this.arrowColor, this.outlineOpacity);
        this.graphics.beginPath();
        this.graphics.moveTo(x, y);
        this.graphics.lineTo(arrowEndX, arrowEndY);
        this.graphics.strokePath();
        
        // 繪製箭頭的頭部 (一個小三角形)
        const headLength = 8;
        const headAngle = Math.PI / 6; // 30 度

        const x1 = arrowEndX - headLength * Math.cos(angleRad - headAngle);
        const y1 = arrowEndY - headLength * Math.sin(angleRad - headAngle);
        const x2 = arrowEndX - headLength * Math.cos(angleRad + headAngle);
        const y2 = arrowEndY - headLength * Math.sin(angleRad + headAngle);

        this.graphics.fillStyle(this.arrowColor, this.outlineOpacity);
        this.graphics.beginPath();
        this.graphics.moveTo(arrowEndX, arrowEndY);
        this.graphics.lineTo(x1, y1);
        this.graphics.lineTo(x2, y2);
        this.graphics.closePath();
        this.graphics.fillPath();
    }
      /**
     * 繪製一個圓形
     */
    private drawCircle(
        x: number, 
        y: number, 
        radius: number, 
        color: number, 
        fillOpacity: number = this.boxOpacity
    ): void {
        // 繪製填充圓形
        this.graphics.fillStyle(color, fillOpacity);
        this.graphics.fillCircle(x, y, radius);
        
        // 繪製圓形邊框
        this.graphics.lineStyle(2, color, this.outlineOpacity);
        this.graphics.strokeCircle(x, y, radius);
    }
    
    /**
     * 繪製線形搜尋範圍
     */
    private drawLine(
        x: number,
        y: number,
        length: number,
        width: number,
        angle: number,
        color: number,
        fillOpacity: number = this.searchRangeOpacity
    ): void {
        // 保存當前變換
        this.graphics.save();
        
        // 移動到起點並旋轉
        this.graphics.translateCanvas(x, y);
        this.graphics.rotateCanvas(Phaser.Math.DegToRad(angle));
        
        // 繪製線條作為矩形（從起點向前延伸）
        this.graphics.fillStyle(color, fillOpacity);
        this.graphics.fillRect(0, -width / 2, length, width);
        
        // 繪製邊框
        this.graphics.lineStyle(2, color, this.outlineOpacity);
        this.graphics.strokeRect(0, -width / 2, length, width);
        
        // 恢復變換
        this.graphics.restore();
    }
    
    /**
     * 繪製一個具有填充和邊框的框
     */
    private drawBox(
        x: number, 
        y: number, 
        width: number, 
        height: number, 
        color: number,
        rotation: number = 0,
        fillOpacity: number = this.boxOpacity // 新增：fillOpacity 參數，預設為 this.boxOpacity
    ): void {
        // 保存當前變換
        this.graphics.save();
        
        // 移動到中心點並旋轉
        this.graphics.translateCanvas(x, y);
        if (rotation !== 0) {
            this.graphics.rotateCanvas(Phaser.Math.DegToRad(rotation)); // 確保使用弧度
        }
        
        // 繪製填充矩形
        this.graphics.fillStyle(color, fillOpacity); // 使用傳入的 fillOpacity
        this.graphics.fillRect(-width / 2, -height / 2, width, height);
        
        // 繪製邊框
        this.graphics.lineStyle(2, color, this.outlineOpacity);
        this.graphics.strokeRect(-width / 2, -height / 2, width, height);
        
        // 恢復變換
        this.graphics.restore();
    }
    
    /**
     * 設置圖形深度
     */
    public setDepth(depth: number): void {
        this.graphics.setDepth(depth);
    }    /**
     * 銷毀渲染器
     */
    public destroy(): void {
        // 清除所有臨時文字元素
        this.temporaryTexts.forEach(text => text.destroy());
        this.temporaryTexts = [];
        
        if (this.graphics) {
            this.graphics.destroy();
        }
    }
}
