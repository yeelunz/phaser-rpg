import { Scene } from 'phaser';
import { IMonsterEntity } from '../core/monsters/IMonsterEntity';
import { MonsterStateType } from '../core/monsters/behaviors/MonsterStateType';

/**
 * 怪物除錯渲染器 - 用於顯示怪物debug資訊
 * 在每個怪物上方顯示一個小框，包含：
 * - 怪物當前模式/狀態
 * - 當前生命值/最大生命值
 * - 怪物唯一識別符（實體ID）
 */
export class MonsterDebugRenderer {
    private scene: Scene;
    private graphics: Phaser.GameObjects.Graphics;
    private debugTexts: Map<string, Phaser.GameObjects.Text> = new Map();
    private debugBoxes: Map<string, Phaser.GameObjects.Graphics> = new Map();
    
    // 顯示控制
    private showMonsterDebugInfo: boolean = true; // 默認顯示怪物debug資訊
    
    // 樣式設定
    private boxColor: number = 0x000000;        // 黑色背景
    private boxOpacity: number = 0.7;           // 70% 不透明度
    private textColor: string = '#FFFFFF';      // 白色文字
    private boxPadding: number = 4;             // 內邊距
    private boxOffsetY: number = -40;           // 在怪物上方的偏移
    private fontSize: number = 10;              // 字體大小
    
    constructor(scene: Scene) {
        this.scene = scene;
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(950); // 確保在大多數元素之上
    }
    
    /**
     * 開關怪物debug資訊顯示
     */
    public toggleMonsterDebugInfo(): boolean {
        this.showMonsterDebugInfo = !this.showMonsterDebugInfo;
        
        if (!this.showMonsterDebugInfo) {
            this.clearAllDebugInfo();
        }
        
        return this.showMonsterDebugInfo;
    }
    
    /**
     * 渲染所有怪物的debug資訊
     * @param monsters 活動中的怪物列表
     */
    public render(monsters: IMonsterEntity[]): void {
        if (!this.showMonsterDebugInfo) {
            this.clearAllDebugInfo();
            return;
        }
        
        // 清除舊的debug資訊
        this.clearAllDebugInfo();
        
        // 為每個怪物創建debug資訊
        for (const monster of monsters) {
            if (monster.isAliveStatus()) {
                this.renderMonsterDebugInfo(monster);
            }
        }
    }
    
    /**
     * 渲染單個怪物的debug資訊
     */
    private renderMonsterDebugInfo(monster: IMonsterEntity): void {
        const position = monster.getPosition();
        const monsterId = monster.getInstanceId();
        
        // 準備debug資訊文字
        const debugInfo = this.prepareDebugInfo(monster);
        
        // 創建文字元素
        const debugText = this.scene.add.text(
            position.x, 
            position.y + this.boxOffsetY, 
            debugInfo, 
            {
                fontSize: `${this.fontSize}px`,
                color: this.textColor,
                align: 'center',
                fontFamily: 'monospace'
            }
        );
        
        debugText.setOrigin(0.5, 0.5);
        debugText.setDepth(951); // 文字在背景框之上
        
        // 獲取文字邊界來計算背景框大小
        const textBounds = debugText.getBounds();
        const boxWidth = textBounds.width + this.boxPadding * 2;
        const boxHeight = textBounds.height + this.boxPadding * 2;
        
        // 創建背景框
        const debugBox = this.scene.add.graphics();
        debugBox.fillStyle(this.boxColor, this.boxOpacity);
        debugBox.fillRoundedRect(
            position.x - boxWidth / 2, 
            position.y + this.boxOffsetY - boxHeight / 2, 
            boxWidth, 
            boxHeight, 
            2 // 圓角半徑
        );
        debugBox.setDepth(950); // 背景框在文字之下
        
        // 存儲引用以便後續清理
        this.debugTexts.set(monsterId, debugText);
        this.debugBoxes.set(monsterId, debugBox);
    }
    
    /**
     * 準備怪物debug資訊文字
     */
    private prepareDebugInfo(monster: IMonsterEntity): string {
        const stats = monster.getStats();
        const currentHP = stats.getCurrentHP();
        const maxHP = stats.getMaxHP();
        const currentState = monster.getCurrentState();
        const instanceId = monster.getInstanceId();
        
        // 格式化狀態名稱（將枚舉值轉換為可讀形式）
        const stateDisplayName = this.formatStateName(currentState);
        
        // 構建debug資訊
        const lines = [
            `State: ${stateDisplayName}`,
            `HP: ${currentHP}/${maxHP}`,
            `ID: ${instanceId}` // 只顯示ID的最後部分
        ];
        
        return lines.join('\n');
    }
    
    /**
     * 格式化狀態名稱為可讀形式
     */
    private formatStateName(state: MonsterStateType): string {
        const stateNames: Record<MonsterStateType, string> = {
            [MonsterStateType.IDLE]: 'Idle',
            [MonsterStateType.WANDERING]: 'Wander',
            [MonsterStateType.ALERT]: 'Alert',
            [MonsterStateType.CHASE]: 'Chase',
            [MonsterStateType.ATTACKING]: 'Attack',
            [MonsterStateType.CHARGING]: 'Charge',
            [MonsterStateType.SUMMONING]: 'Summon',
            [MonsterStateType.HURT]: 'Hurt',
            [MonsterStateType.DEAD]: 'Dead'
        };
        
        return stateNames[state] || state;
    }
    
    /**
     * 清除所有debug資訊
     */
    private clearAllDebugInfo(): void {
        // 清除文字元素
        this.debugTexts.forEach(text => {
            if (text.active) {
                text.destroy();
            }
        });
        this.debugTexts.clear();
        
        // 清除背景框
        this.debugBoxes.forEach(box => {
            if (box.active) {
                box.destroy();
            }
        });
        this.debugBoxes.clear();
    }
    
    /**
     * 檢查是否啟用怪物debug資訊顯示
     */
    public isMonsterDebugEnabled(): boolean {
        return this.showMonsterDebugInfo;
    }
    
    /**
     * 設置debug資訊樣式
     */
    public setDebugStyle(options: {
        boxColor?: number;
        boxOpacity?: number;
        textColor?: string;
        fontSize?: number;
        boxOffsetY?: number;
    }): void {
        if (options.boxColor !== undefined) this.boxColor = options.boxColor;
        if (options.boxOpacity !== undefined) this.boxOpacity = options.boxOpacity;
        if (options.textColor !== undefined) this.textColor = options.textColor;
        if (options.fontSize !== undefined) this.fontSize = options.fontSize;
        if (options.boxOffsetY !== undefined) this.boxOffsetY = options.boxOffsetY;
    }
    
    /**
     * 銷毀渲染器
     */
    public destroy(): void {
        this.clearAllDebugInfo();
        
        if (this.graphics) {
            this.graphics.destroy();
        }
    }
}
