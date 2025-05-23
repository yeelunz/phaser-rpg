import Phaser from "phaser";
import { SkillManager } from "../core/skills/skillManager";
import { Skill } from "../core/skills/skill";

/**
 * 技能槽UI組件
 * 顯示啟用的技能及其冷卻狀態
 */
export class PhaserSkillBar {
    private scene: Phaser.Scene;
    private skillManager: SkillManager;
    
    // UI組件
    private container: Phaser.GameObjects.Container;
    private slotBackgrounds: Phaser.GameObjects.Rectangle[] = [];
    private slotIcons: Phaser.GameObjects.Text[] = [];
    private cooldownOverlays: Phaser.GameObjects.Graphics[] = [];
    private lockIcons: Phaser.GameObjects.Text[] = [];
    
    // 配置
    private readonly SLOT_SIZE = 50;
    private readonly SLOT_PADDING = 10;
    private readonly MAX_SLOTS = 5;
    
    /**
     * 建構子
     * @param scene Phaser場景
     * @param x X座標
     * @param y Y座標
     * @param skillManager 技能管理器
     */
    constructor(scene: Phaser.Scene, x: number, y: number, skillManager: SkillManager) {
        this.scene = scene;
        this.skillManager = skillManager;
        
        // 創建主容器
        this.container = scene.add.container(x, y);
        this.container.setScrollFactor(0); // 固定在屏幕上，不隨攝影機移動
        
        // 初始化槽位
        this.initializeSlots();
    }
    
    /**
     * 初始化技能槽
     */
    private initializeSlots(): void {
        for (let i = 0; i < this.MAX_SLOTS; i++) {
            // 計算槽位坐標
            const slotX = i * (this.SLOT_SIZE + this.SLOT_PADDING);
            
            // 創建槽位背景
            const bg = this.scene.add.rectangle(
                slotX, 0,
                this.SLOT_SIZE, this.SLOT_SIZE,
                0x333333
            );
            bg.setOrigin(0, 0);
            bg.setStrokeStyle(2, 0x666666);
            this.slotBackgrounds.push(bg);
            this.container.add(bg);
            
            // 創建技能圖標（初始為空）
            const icon = this.scene.add.text(
                slotX + this.SLOT_SIZE / 2,
                this.SLOT_SIZE / 2,
                '',
                { fontSize: '32px', color: '#ffffff' }
            );
            icon.setOrigin(0.5);
            this.slotIcons.push(icon);
            this.container.add(icon);
            
            // 創建冷卻覆蓋層
            const cooldown = this.scene.add.graphics();
            this.cooldownOverlays.push(cooldown);
            this.container.add(cooldown);
            
            // 創建鎖定圖標（用於顯示未解鎖的槽位）
            const lock = this.scene.add.text(
                slotX + this.SLOT_SIZE / 2,
                this.SLOT_SIZE / 2,
                '🔒',
                { fontSize: '24px', color: '#aaaaaa' }
            );
            lock.setOrigin(0.5);
            this.lockIcons.push(lock);
            this.container.add(lock);
        }
    }
    
    /**
     * 更新技能槽顯示
     */
    public update(): void {
        if (!this.skillManager) return;
        
        // 獲取可用的技能槽數量
        const availableSlots = this.skillManager.getAvailableSkillSlots();
        
        // 獲取已啟用的技能列表
        const enabledSkills = this.skillManager.getEnabledSkills();
        
        // 更新每個槽位
        for (let i = 0; i < this.MAX_SLOTS; i++) {
            // 檢查槽位是否可用
            const isAvailable = i < availableSlots;
            
            // 獲取槽位對應的技能ID
            const skillId = isAvailable && i < enabledSkills.length ? enabledSkills[i] : '';
            
            // 獲取技能實例
            const skill = skillId ? this.skillManager.getSkill(skillId) : null;
            
            // 更新槽位背景
            this.slotBackgrounds[i].setFillStyle(isAvailable ? 0x333333 : 0x222222);
            this.slotBackgrounds[i].setStrokeStyle(2, isAvailable ? 0x666666 : 0x444444);
            
            // 更新槽位圖標
            if (skill) {
                this.slotIcons[i].setText(skill.getIcon() || '❓');
                this.slotIcons[i].setVisible(true);
                
                // 更新冷卻覆蓋層
                this.updateCooldownOverlay(i, skill);
            } else {
                this.slotIcons[i].setVisible(false);
                this.cooldownOverlays[i].clear();
            }
            
            // 更新鎖定圖標
            this.lockIcons[i].setVisible(!isAvailable);
        }
    }
    
    /**
     * 更新冷卻覆蓋層
     * @param index 槽位索引
     * @param skill 技能實例
     */
    private updateCooldownOverlay(index: number, skill: Skill): void {
        const cooldown = this.cooldownOverlays[index];
        cooldown.clear();
        
        // 獲取技能的剩餘冷卻時間比例
        const cooldownRemaining = skill.getCooldownRemaining();
        const totalCooldown = skill.getCooldown();
        
        if (cooldownRemaining <= 0 || totalCooldown <= 0) {
            return; // 無冷卻，不顯示覆蓋層
        }
        
        // 計算冷卻百分比
        const percent = cooldownRemaining / totalCooldown;
        
        // 繪製半透明覆蓋層
        cooldown.fillStyle(0x000000, 0.6);
        
        // 使用扇形表示剩餘冷卻時間
        const centerX = this.slotBackgrounds[index].x + this.SLOT_SIZE / 2;
        const centerY = this.SLOT_SIZE / 2;
        
        // 計算終止角度（以弧度表示，2π表示完整圓）
        const endAngle = 2 * Math.PI * percent;
        
        // 繪製扇形
        cooldown.beginPath();
        cooldown.moveTo(centerX, centerY);
        cooldown.arc(centerX, centerY, this.SLOT_SIZE / 2, 0, endAngle, false);
        cooldown.lineTo(centerX, centerY);
        cooldown.closePath();
        cooldown.fillPath();
        
        // 如果有需要，添加冷卻時間文本
        // ...
    }
    
    /**
     * 設置可見性
     */
    public setVisible(visible: boolean): void {
        this.container.setVisible(visible);
    }
    
    /**
     * 銷毀組件
     */
    public destroy(): void {
        this.container.destroy();
    }
}
