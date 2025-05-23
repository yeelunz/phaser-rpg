import Phaser from "phaser";
import { Stats } from "../core/stats"; // Assuming this path is correct
import { SkillManager } from '../core/skills/skillManager';
import { Skill } from '../core/skills/skill';
import { PhaserSkillBar } from './PhaserSkillBar';

// --- M3-Inspired Color Palette (Dark Theme - Bar Focused) ---

// Text Colors (Phaser.Text uses # prefixed strings)
const M3_TEXT_ON_SURFACE = '#F5F5F5';         // Very light grey for high contrast text
const M3_TEXT_ON_SURFACE_VARIANT = '#BDBDBD'; // Medium grey for labels
const M3_TEXT_HEALTH_VALUE = '#FFAB91';       // Lighter, clear pastel red for health values
const M3_TEXT_ENERGY_VALUE = '#90CAF9';       // Lighter, clear pastel blue for energy values
const M3_TEXT_EXP_VALUE = '#A5D6A7';          // Lighter, clear pastel green for XP values
const M3_TEXT_LEVEL = '#FFEB3B';              // Brighter Yellow for Level text (was FFD700)

// Graphics Colors (Phaser.Graphics uses numeric hex)
// Surfaces & Outlines
const M3_GRAPHICS_SURFACE_CONTAINER_LOW = 0x212121; // Neutral dark grey (Material Black-ish)
const M3_GRAPHICS_SURFACE_CONTAINER = 0x2C2C2C;   // Slightly lighter neutral grey for level panel
const M3_GRAPHICS_OUTLINE = 0x333333;             // Subtle dark grey outline

// Health Bar (More vibrant fill, clear track)
const M3_GRAPHICS_HEALTH_FILL = 0xF44336;     // Vibrant Red (e.g., Material Red 500)
const M3_GRAPHICS_HEALTH_TRACK = 0x4E342E;    // Dark reddish-brown, provides contrast
// Energy Bar (Primary - More vibrant fill, clear track)
const M3_GRAPHICS_ENERGY_FILL = 0x2196F3;     // Vibrant Blue (e.g., Material Blue 500)
const M3_GRAPHICS_ENERGY_TRACK = 0x1A237E;    // Dark deep blue, provides contrast
// Experience Bar (Tertiary - More vibrant fill, clear track)
const M3_GRAPHICS_EXP_FILL = 0x4CAF50;        // Vibrant Green (e.g., Material Green 500)
const M3_GRAPHICS_EXP_TRACK = 0x2E4B30;       // Darker, but visible green track
// Skill Bar (Additional vibrant fill, clear track)
const M3_GRAPHICS_SKILL_FILL = 0xFF9800;      // Vibrant Orange (e.g., Material Orange 500)
const M3_GRAPHICS_SKILL_TRACK = 0x5D4037;     // Dark brown, provides contrast

// --- Font Styles ---
const FONT_FAMILY_MD = 'Roboto, Arial, sans-serif';

const BASE_LABEL_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: FONT_FAMILY_MD,
    fontSize: '12px', // M3 Body Small
    color: M3_TEXT_ON_SURFACE_VARIANT,
    align: 'left',
};

const BASE_VALUE_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: FONT_FAMILY_MD,
    fontSize: '14px', // M3 Body Medium
    align: 'right',
};

/**
 * PhaserHUD class for displaying game stats with a refined M3-inspired look.
 * Bars are the main visual subject. Level panel is left-aligned.
 */
export class PhaserHUD {
    private scene: Phaser.Scene;
    private playerStats: Stats;
    private skillManager: SkillManager | null = null; // 技能管理器

    private mainPanelBackground: Phaser.GameObjects.Graphics;
    private levelPanelBackground: Phaser.GameObjects.Graphics;

    private healthBar: Phaser.GameObjects.Graphics;
    private energyBar: Phaser.GameObjects.Graphics;
    private expBar: Phaser.GameObjects.Graphics;
    private skillBar: Phaser.GameObjects.Graphics;

    private healthLabelText: Phaser.GameObjects.Text;
    private energyLabelText: Phaser.GameObjects.Text;
    private expLabelText: Phaser.GameObjects.Text;
    private skillLabelText: Phaser.GameObjects.Text;

    private healthValueText: Phaser.GameObjects.Text;
    private energyValueText: Phaser.GameObjects.Text;
    private expValueText: Phaser.GameObjects.Text;
    private skillValueText: Phaser.GameObjects.Text;

    private levelText: Phaser.GameObjects.Text;
    
    // 技能槽列表 UI
    private skillBarUI: PhaserSkillBar | null = null;

    // --- Layout Constants ---
    private readonly HUD_X = 20;
    private readonly HUD_Y = 20;
    private readonly PANEL_PADDING = 16;
    private readonly ITEM_ROW_HEIGHT = 26; // Slightly more height for rows
    private readonly INTER_ITEM_SPACING = 10;
    
    private readonly LABEL_WIDTH = 60;
    private readonly BAR_LABEL_SPACING = 10;
    private readonly BAR_WIDTH = 120;
    private readonly BAR_HEIGHT = 10; // Current bar thickness
    private readonly BAR_CORNER_RADIUS = this.BAR_HEIGHT / 2;
    private readonly BAR_VALUE_SPACING = 10;
    private readonly VALUE_TEXT_APPROX_WIDTH = 55;

    private readonly PANEL_CORNER_RADIUS = 16;
    private readonly LEVEL_PANEL_HEIGHT = 38;
    private readonly MAIN_LEVEL_PANEL_SPACING = 10;

    private readonly mainPanelWidth: number;
    private readonly levelPanelWidth: number;
    private readonly levelPanelX: number; // Now specifically for left alignment

    private readonly hudDepth = 990;

    constructor(scene: Phaser.Scene, playerStats: Stats, skillManager: SkillManager) {
        this.scene = scene;
        this.playerStats = playerStats;
        this.skillManager = skillManager;

        this.mainPanelWidth = this.PANEL_PADDING * 2 + this.LABEL_WIDTH + this.BAR_LABEL_SPACING +
                              this.BAR_WIDTH + this.BAR_VALUE_SPACING + this.VALUE_TEXT_APPROX_WIDTH;
        
        // Level panel width calculation (approx 1/3 of main panel + some extra for text)
        this.levelPanelWidth = Math.floor(this.mainPanelWidth / 3) + 15;
        // Level panel is now left-aligned with the main HUD_X
        this.levelPanelX = this.HUD_X;

        this.createHUD();
        this.initializeSkillBar();
    }

    private createHUD(): void {
        const mainPanelHeight = (4 * this.ITEM_ROW_HEIGHT) + (3 * this.INTER_ITEM_SPACING) + (2 * this.PANEL_PADDING);
        
        this.mainPanelBackground = this.scene.add.graphics();
        this.mainPanelBackground.fillStyle(M3_GRAPHICS_SURFACE_CONTAINER_LOW, 0.92); // Slightly higher opacity
        this.mainPanelBackground.fillRoundedRect(
            this.HUD_X, this.HUD_Y,
            this.mainPanelWidth, mainPanelHeight,
            this.PANEL_CORNER_RADIUS
        );
        this.mainPanelBackground.lineStyle(1, M3_GRAPHICS_OUTLINE, 0.8);
        this.mainPanelBackground.strokeRoundedRect(
            this.HUD_X, this.HUD_Y,
            this.mainPanelWidth, mainPanelHeight,
            this.PANEL_CORNER_RADIUS
        );
        this.mainPanelBackground.setScrollFactor(0).setDepth(this.hudDepth - 1);

        const levelPanelY = this.HUD_Y + mainPanelHeight + this.MAIN_LEVEL_PANEL_SPACING;
        this.levelPanelBackground = this.scene.add.graphics();
        this.levelPanelBackground.fillStyle(M3_GRAPHICS_SURFACE_CONTAINER, 0.95);
        this.levelPanelBackground.fillRoundedRect(
            this.levelPanelX, levelPanelY, // Use calculated left-aligned X
            this.levelPanelWidth, this.LEVEL_PANEL_HEIGHT,
            this.PANEL_CORNER_RADIUS
        );
        this.levelPanelBackground.lineStyle(1, M3_GRAPHICS_OUTLINE, 0.8);
        this.levelPanelBackground.strokeRoundedRect(
            this.levelPanelX, levelPanelY,
            this.levelPanelWidth, this.LEVEL_PANEL_HEIGHT,
            this.PANEL_CORNER_RADIUS
        );
        this.levelPanelBackground.setScrollFactor(0).setDepth(this.hudDepth - 1);

        let currentItemY = this.HUD_Y + this.PANEL_PADDING + this.ITEM_ROW_HEIGHT / 2;
        const labelX = this.HUD_X + this.PANEL_PADDING;
        const barX = labelX + this.LABEL_WIDTH + this.BAR_LABEL_SPACING;
        const valueTextX = this.HUD_X + this.mainPanelWidth - this.PANEL_PADDING;

        this.healthLabelText = this.scene.add.text(labelX, currentItemY, "Health", BASE_LABEL_STYLE)
            .setOrigin(0, 0.5).setScrollFactor(0).setDepth(this.hudDepth + 1);
        this.healthBar = this.scene.add.graphics().setScrollFactor(0).setDepth(this.hudDepth);
        this.healthValueText = this.scene.add.text(valueTextX, currentItemY, "", { ...BASE_VALUE_STYLE, color: M3_TEXT_HEALTH_VALUE })
            .setOrigin(1, 0.5).setScrollFactor(0).setDepth(this.hudDepth + 1);
        currentItemY += this.ITEM_ROW_HEIGHT + this.INTER_ITEM_SPACING;

        this.energyLabelText = this.scene.add.text(labelX, currentItemY, "Energy", BASE_LABEL_STYLE)
            .setOrigin(0, 0.5).setScrollFactor(0).setDepth(this.hudDepth + 1);
        this.energyBar = this.scene.add.graphics().setScrollFactor(0).setDepth(this.hudDepth);
        this.energyValueText = this.scene.add.text(valueTextX, currentItemY, "", { ...BASE_VALUE_STYLE, color: M3_TEXT_ENERGY_VALUE })
            .setOrigin(1, 0.5).setScrollFactor(0).setDepth(this.hudDepth + 1);
        currentItemY += this.ITEM_ROW_HEIGHT + this.INTER_ITEM_SPACING;

        this.expLabelText = this.scene.add.text(labelX, currentItemY, "XP", BASE_LABEL_STYLE)
            .setOrigin(0, 0.5).setScrollFactor(0).setDepth(this.hudDepth + 1);
        this.expBar = this.scene.add.graphics().setScrollFactor(0).setDepth(this.hudDepth);
        this.expValueText = this.scene.add.text(valueTextX, currentItemY, "", { ...BASE_VALUE_STYLE, color: M3_TEXT_EXP_VALUE })
            .setOrigin(1, 0.5).setScrollFactor(0).setDepth(this.hudDepth + 1);
        currentItemY += this.ITEM_ROW_HEIGHT + this.INTER_ITEM_SPACING;

        this.skillLabelText = this.scene.add.text(labelX, currentItemY, "Skill", BASE_LABEL_STYLE)
            .setOrigin(0, 0.5).setScrollFactor(0).setDepth(this.hudDepth + 1);
        this.skillBar = this.scene.add.graphics().setScrollFactor(0).setDepth(this.hudDepth);
        this.skillValueText = this.scene.add.text(valueTextX, currentItemY, "", { ...BASE_VALUE_STYLE, color: M3_TEXT_ON_SURFACE })
            .setOrigin(1, 0.5).setScrollFactor(0).setDepth(this.hudDepth + 1);

        this.levelText = this.scene.add.text(
            this.levelPanelX + this.levelPanelWidth / 2, // Center text within the left-aligned panel
            levelPanelY + this.LEVEL_PANEL_HEIGHT / 2,
            "LV 1",
            {
                fontFamily: FONT_FAMILY_MD,
                fontSize: '16px',
                fontStyle: 'bold',
                color: M3_TEXT_LEVEL,
                align: 'center'
            }
        ).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(this.hudDepth + 2);

        this.updateHUD();
    }

    /**
     * 初始化技能槽列表
     */
    private initializeSkillBar(): void {
        if (!this.scene || !this.skillManager) return;
        
        const { width, height } = this.scene.scale;
        
        // 創建技能槽列表，置於屏幕中下方
        this.skillBarUI = new PhaserSkillBar(
            this.scene, 
            width/2.6 , 
            height - 60, 
            this.skillManager
        );
    }
    
    /**
     * 更新 HUD 與技能槽
     * @param stats 玩家屬性（可選）
     */
    public updateHUD(stats?: Stats): void {
        if (stats) this.playerStats = stats;
        if (!this.playerStats) return;

        // 更新主要 HUD 組件（生命值、能量等）
        let currentBarTopY = this.HUD_Y + this.PANEL_PADDING + (this.ITEM_ROW_HEIGHT - this.BAR_HEIGHT) / 2;
        const barX = this.HUD_X + this.PANEL_PADDING + this.LABEL_WIDTH + this.BAR_LABEL_SPACING;
        const barTrackOpacity = 0.7; // Opacity for bar tracks for good visibility

        // Health
        const hp = this.playerStats.getCurrentHP();
        const maxHp = this.playerStats.getMaxHP();
        const hpPercent = maxHp > 0 ? hp / maxHp : 0;
        this.healthBar.clear();
        this.healthBar.fillStyle(M3_GRAPHICS_HEALTH_TRACK, barTrackOpacity);
        this.healthBar.fillRoundedRect(barX, currentBarTopY, this.BAR_WIDTH, this.BAR_HEIGHT, this.BAR_CORNER_RADIUS);
        if (hpPercent > 0) {
            this.healthBar.fillStyle(M3_GRAPHICS_HEALTH_FILL, 1);
            this.healthBar.fillRoundedRect(barX, currentBarTopY, Math.max(this.BAR_HEIGHT, this.BAR_WIDTH * hpPercent), this.BAR_HEIGHT, this.BAR_CORNER_RADIUS);
        }
        this.healthValueText.setText(`${Math.floor(hp)}/${Math.floor(maxHp)}`);
        currentBarTopY += this.ITEM_ROW_HEIGHT + this.INTER_ITEM_SPACING;

        // Energy
        const energy = this.playerStats.getCurrentEnergy();
        const maxEnergy = this.playerStats.getMaxEnergy();
        const energyPercent = maxEnergy > 0 ? energy / maxEnergy : 0;
        this.energyBar.clear();
        this.energyBar.fillStyle(M3_GRAPHICS_ENERGY_TRACK, barTrackOpacity);
        this.energyBar.fillRoundedRect(barX, currentBarTopY, this.BAR_WIDTH, this.BAR_HEIGHT, this.BAR_CORNER_RADIUS);
        if (energyPercent > 0) {
            this.energyBar.fillStyle(M3_GRAPHICS_ENERGY_FILL, 1);
            this.energyBar.fillRoundedRect(barX, currentBarTopY, Math.max(this.BAR_HEIGHT, this.BAR_WIDTH * energyPercent), this.BAR_HEIGHT, this.BAR_CORNER_RADIUS);
        }
        this.energyValueText.setText(`${Math.floor(energy)}/${Math.floor(maxEnergy)}`);
        currentBarTopY += this.ITEM_ROW_HEIGHT + this.INTER_ITEM_SPACING;

        // Experience
        const exp = this.playerStats.getCurrentExp();
        const maxExp = this.playerStats.getMaxExp();
        const expPercent = maxExp > 0 ? exp / maxExp : 0;
        this.expBar.clear();
        this.expBar.fillStyle(M3_GRAPHICS_EXP_TRACK, barTrackOpacity); // Ensure XP track is visible
        this.expBar.fillRoundedRect(barX, currentBarTopY, this.BAR_WIDTH, this.BAR_HEIGHT, this.BAR_CORNER_RADIUS);
        if (expPercent > 0) {
            this.expBar.fillStyle(M3_GRAPHICS_EXP_FILL, 1);
            this.expBar.fillRoundedRect(barX, currentBarTopY, Math.max(this.BAR_HEIGHT, this.BAR_WIDTH * expPercent), this.BAR_HEIGHT, this.BAR_CORNER_RADIUS);
        }
        this.expValueText.setText(`${Math.floor(exp)}/${Math.floor(maxExp)}`);
        currentBarTopY += this.ITEM_ROW_HEIGHT + this.INTER_ITEM_SPACING;

        // Skill (使用通用槽位)
        this.skillBar.clear();
        this.skillBar.fillStyle(M3_GRAPHICS_SKILL_TRACK, barTrackOpacity);
        this.skillBar.fillRoundedRect(barX, currentBarTopY, this.BAR_WIDTH, this.BAR_HEIGHT, this.BAR_CORNER_RADIUS);
        // 技能欄不顯示百分比填充，改為顯示已啟用的槽位數
        if (this.skillManager) {
            const availableSlots = this.skillManager.getAvailableSkillSlots();
            const enabledSkills = this.skillManager.getEnabledSkills().filter(id => id !== '').length;
            this.skillValueText.setText(`${enabledSkills}/${availableSlots}`);
            
            // 根據已啟用技能數量填充部分槽條
            const skillPercent = availableSlots > 0 ? enabledSkills / availableSlots : 0;
            if (skillPercent > 0) {
                this.skillBar.fillStyle(M3_GRAPHICS_SKILL_FILL, 1);
                this.skillBar.fillRoundedRect(barX, currentBarTopY, Math.max(this.BAR_HEIGHT, this.BAR_WIDTH * skillPercent), this.BAR_HEIGHT, this.BAR_CORNER_RADIUS);
            }
        } else {
            this.skillValueText.setText('0/0');
        }

        // 更新等級顯示
        this.levelText.setText(`LV ${this.playerStats.getLevel()}`);
        
        // 更新技能槽列表
        if (this.skillBarUI) {
            this.skillBarUI.update();
        }
    }
    
    /**
     * 銷毀 HUD 資源
     */
    public destroy(): void {
        this.mainPanelBackground.destroy();
        this.levelPanelBackground.destroy();
        this.healthBar.destroy();
        this.energyBar.destroy();
        this.expBar.destroy();
        this.skillBar.destroy();
        this.healthLabelText.destroy();
        this.energyLabelText.destroy();
        this.expLabelText.destroy();
        this.skillLabelText.destroy();
        this.healthValueText.destroy();
        this.energyValueText.destroy();
        this.expValueText.destroy();
        this.skillValueText.destroy();
        this.levelText.destroy();
        
        // 銷毀技能槽列表
        if (this.skillBarUI) {
            this.skillBarUI.destroy();
        }
    }
}