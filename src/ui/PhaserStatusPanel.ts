import { Stats } from '../core/stats';
import { BasePanel } from './BasePanel';

// Define some Material Design 3 inspired colors (Dark Theme)
const MD3Colors = {
    surface: 0x1C1B1F,          // Dark Gray - Main background
    onSurface: 0xE6E1E5,        // Light Gray - Primary text
    onSurfaceVariant: 0xCAC4D0, // Medium Gray - Secondary text (labels)
    primary: 0xD0BCFF,          // Light Purple - Accent
    onPrimary: 0x381E72,        // Dark Purple - Text on primary
    primaryContainer: 0x4F378B,  // Medium Purple - Background for section titles
    onPrimaryContainer: 0xEADDFF,// Light Purple - Text on primary container
    outline: 0x938F99,          // Gray - Borders
    
    secondaryContainer: 0x3A3840, // Darker purple/gray for item backgrounds (adjusted for darker item feel)
    // secondaryContainer: 0x2C2A30, // Even darker if preferred
    
    // Semantic colors
    hpValue: 0xF2B8B5,          // Material Red tone
    energyValue: 0x94CCC3,      // Material Teal/Green tone
    expValue: 0xFFD8E4,         // Material Pink/Purple tone
    physicalValue: 0xFFB4AB,    // Material Warm tone (Orange/Red)
    magicValue: 0xA9C7FF,       // Material Cool tone (Blue)
    critValue: 0xFFB4AB,        // (Same as physical for impact)
    utilityValue: 0xBACBDB,     // Neutral/Utility tone (e.g., for penetration, speed)
    recoveryValue: 0x7ED09A,    // Greenish for recovery
};

const PANEL_TITLE_FONT_SIZE = '16px';
const SECTION_TITLE_FONT_SIZE = '20px';
const STAT_FONT_SIZE = '16px';

const ITEM_BG_HEIGHT = 30; // Visual height of the stat item's background
const SECTION_TITLE_BG_HEIGHT = 36; // Visual height of the section title's background
const ITEM_HORIZONTAL_PADDING = 16; // Padding left/right inside stat item / section title

export class PhaserStatusPanel extends BasePanel {
    private statTexts: Phaser.GameObjects.Text[] = [];
    private graphicsObjects: Phaser.GameObjects.Graphics[] = [];
    private stats: Stats;
    
    private internalPadding: number = 24;
    private itemSpacing: number = 8;     // Vertical spacing AFTER an item/title background
    private sectionSpacing: number = 16; // Extra vertical spacing AFTER a whole section of items
    private columnGutter: number = 24;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, stats: Stats) {
        super(scene, x, y, width, height, '角色狀態');
        this.stats = stats;

        if (!this.stats) {
            console.error("Stats object is undefined in PhaserStatusPanel constructor!");
            this.stats = new Stats();
        }
        this.initialize();
    }

    protected initializePanelContent(): void {
        if (!this.stats) {
            console.error("Stats object is undefined in initializePanelContent!");
            return;
        }

        this.graphicsObjects.forEach(g => g.destroy());
        this.graphicsObjects = [];
        this.statTexts.forEach(text => text.destroy());
        this.statTexts = [];

        if (this.background) {
            this.background.clear();
            this.background.fillStyle(MD3Colors.surface, 0.98);
            this.background.fillRoundedRect(0, 0, this.panelWidth, this.panelHeight, 28);
            this.background.fillStyle(MD3Colors.primaryContainer, 0.5);
            this.background.fillRoundedRect(0, 0, this.panelWidth, 12, { tl: 28, tr: 28, bl: 0, br: 0 });
            this.background.lineStyle(1.5, MD3Colors.outline, 0.6); // Thinner outline
            this.background.strokeRoundedRect(0, 0, this.panelWidth, this.panelHeight, 28);
        }

        if (this.titleText) {
            this.titleText.setPosition(this.internalPadding+20, this.internalPadding-8);
            this.titleText.setStyle({
                fontSize: PANEL_TITLE_FONT_SIZE,
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontStyle: 'bold',
                color: `#${MD3Colors.onSurface.toString(16)}`,
                padding: { top: 4, bottom: 8 }, // Adjust padding for balance
            });
            // Ensure titleText is on top of the panel accent bar
            this.bringToTop(this.titleText);
        }

        const columnWidth = (this.panelWidth - (2 * this.internalPadding) - this.columnGutter) / 2;
        const startX = this.internalPadding;
        const col2X = startX + columnWidth + this.columnGutter;
        
        const statLineHeight = ITEM_BG_HEIGHT + this.itemSpacing;
        const sectionTitleLineHeight = SECTION_TITLE_BG_HEIGHT + this.itemSpacing;

        let currentY = this.internalPadding + (this.titleText ? this.titleText.height : parseInt(PANEL_TITLE_FONT_SIZE) + 12) + this.itemSpacing;

        const createStatEntry = (
            parentX: number, 
            parentY: number, 
            label: string, 
            value: string | number, 
            valueColor: string = `#${MD3Colors.onSurface.toString(16)}`,
            itemWidth: number
        ): { height: number } => {
            
            const itemBg = this.scene.add.graphics({ x: parentX, y: parentY });
            itemBg.fillStyle(MD3Colors.secondaryContainer, 0.5); // More transparency for softer items
            itemBg.fillRoundedRect(0, 0, itemWidth, ITEM_BG_HEIGHT, 12);
            this.add(itemBg);
            this.graphicsObjects.push(itemBg);

            const labelText = this.scene.add.text(
                parentX + ITEM_HORIZONTAL_PADDING,
                parentY + ITEM_BG_HEIGHT / 2, // Y to vertical center of BG
                label,
                {
                    fontSize: STAT_FONT_SIZE,
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    color: `#${MD3Colors.onSurfaceVariant.toString(16)}`,
                }
            ).setOrigin(0, 0.5); // Origin to left-center
            
            const valueText = this.scene.add.text(
                parentX + itemWidth - ITEM_HORIZONTAL_PADDING, // X for right alignment
                parentY + ITEM_BG_HEIGHT / 2, // Y to vertical center of BG
                String(value),
                {
                    fontSize: STAT_FONT_SIZE,
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    color: valueColor,
                    fontStyle: 'bold',
                }
            ).setOrigin(1, 0.5); // Origin to right-center

            this.add(labelText);
            this.add(valueText);
            this.statTexts.push(labelText, valueText);
            return { height: statLineHeight }; // Total height consumed including spacing
        };

        const createSectionTitle = (title: string, x: number, y: number, width: number): { height: number } => {
            const titleBg = this.scene.add.graphics({ x: x, y: y });
            titleBg.fillStyle(MD3Colors.primaryContainer, 0.6); // Slightly more opaque title BG
            titleBg.fillRoundedRect(0, 0, width, SECTION_TITLE_BG_HEIGHT, 16);
            this.add(titleBg);
            this.graphicsObjects.push(titleBg);

            const titleObj = this.scene.add.text(
                x + ITEM_HORIZONTAL_PADDING, // Use consistent padding
                y + SECTION_TITLE_BG_HEIGHT / 2, // Y to vertical center of BG
                title,
                {
                    fontSize: SECTION_TITLE_FONT_SIZE,
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    color: `#${MD3Colors.onPrimaryContainer.toString(16)}`,
                    fontStyle: 'bold',
                }
            ).setOrigin(0, 0.5); // Origin to left-center
            this.add(titleObj);
            this.statTexts.push(titleObj);
            return { height: sectionTitleLineHeight }; // Total height consumed including spacing
        };

        // --- Basic Stats ---
        let section = createSectionTitle('基本屬性', startX, currentY, this.panelWidth - 2 * this.internalPadding);
        currentY += section.height;

        const basicStatsData = [
            { label: '等級', getValue: () => this.stats.getLevel ? this.stats.getLevel() : 1, color: `#${MD3Colors.onSurface.toString(16)}` },
            { label: '生命值', getValue: () => `${this.stats.getCurrentHP ? this.stats.getCurrentHP() : 0}/${this.stats.getMaxHP ? this.stats.getMaxHP() : 100}`, color: `#${MD3Colors.hpValue.toString(16)}` },
            { label: '能量', getValue: () => `${this.stats.getCurrentEnergy ? Math.floor(this.stats.getCurrentEnergy()) : 0}/${this.stats.getMaxEnergy ? Math.floor(this.stats.getMaxEnergy()) : 100}`, color: `#${MD3Colors.energyValue.toString(16)}` },
            { label: '經驗值', getValue: () => `${this.stats.getCurrentExp ? this.stats.getCurrentExp() : 0}/${this.stats.getMaxExp ? this.stats.getMaxExp() : 100}`, color: `#${MD3Colors.expValue.toString(16)}` }
        ];
        for (const stat of basicStatsData) {
            const entry = createStatEntry(startX, currentY, stat.label, stat.getValue(), stat.color, this.panelWidth - 2 * this.internalPadding);
            currentY += entry.height;
        }
        currentY += this.sectionSpacing - this.itemSpacing; // Add section spacing (itemSpacing already included in entry.height)

        // --- Combat Stats (Column 1) ---
        let col1CurrentY = currentY;
        section = createSectionTitle('戰鬥屬性', startX, col1CurrentY, columnWidth);
        col1CurrentY += section.height;

        const combatStatsPrimaryData = [
            { label: '物理攻擊', getValue: () => this.stats.getPhysicalAttack ? this.stats.getPhysicalAttack() : 10, color: `#${MD3Colors.physicalValue.toString(16)}` },
            { label: '物理防禦', getValue: () => this.stats.getPhysicalDefense ? this.stats.getPhysicalDefense() : 10, color: `#${MD3Colors.physicalValue.toString(16)}` },
            { label: '魔法攻擊', getValue: () => this.stats.getMagicAttack ? this.stats.getMagicAttack() : 10, color: `#${MD3Colors.magicValue.toString(16)}` },
            { label: '魔法防禦', getValue: () => this.stats.getMagicDefense ? this.stats.getMagicDefense() : 10, color: `#${MD3Colors.magicValue.toString(16)}` },
        ];
        for (const stat of combatStatsPrimaryData) {
            const entry = createStatEntry(startX, col1CurrentY, stat.label, stat.getValue(), stat.color, columnWidth);
            col1CurrentY += entry.height;
        }
        // col1CurrentY += this.itemSpacing; // No extra spacing, let items stack directly

        const combatStatsSecondaryData = [
            { label: '命中率', getValue: () => this.stats.getAccuracy ? Math.floor(this.stats.getAccuracy()) : 10, color: `#${MD3Colors.utilityValue.toString(16)}` },
            { label: '閃避率', getValue: () => this.stats.getEvasion ? Math.floor(this.stats.getEvasion()) : 5, color: `#${MD3Colors.utilityValue.toString(16)}` },
            { label: '暴擊率', getValue: () => `${this.stats.getCritRate ? (this.stats.getCritRate() * 100).toFixed(1) : 5}%`, color: `#${MD3Colors.critValue.toString(16)}` },
            { label: '暴擊傷害', getValue: () => `${this.stats.getCritDamage ? (this.stats.getCritDamage() * 100).toFixed(0) : 150}%`, color: `#${MD3Colors.critValue.toString(16)}` },
        ];
        for (const stat of combatStatsSecondaryData) {
            const entry = createStatEntry(startX, col1CurrentY, stat.label, stat.getValue(), stat.color, columnWidth);
            col1CurrentY += entry.height;
        }

        // --- Advanced Stats (Column 2) ---
        let col2CurrentY = currentY; 
        section = createSectionTitle('進階屬性', col2X, col2CurrentY, columnWidth);
        col2CurrentY += section.height;
        
        const advancedStatsData = [
            { label: '物理穿透', getValue: () => this.stats.getPhysicalPenetration ? this.stats.getPhysicalPenetration() : 0, color: `#${MD3Colors.physicalValue.toString(16)}` },
            { label: '魔法穿透', getValue: () => this.stats.getMagicPenetration ? this.stats.getMagicPenetration() : 0, color: `#${MD3Colors.magicValue.toString(16)}` },
            { label: '物理加成', getValue: () => `${this.stats.getPhysicalDamageBonus ? this.stats.getPhysicalDamageBonus() : 0}%`, color: `#${MD3Colors.physicalValue.toString(16)}` },
            { label: '魔法加成', getValue: () => `${this.stats.getMagicDamageBonus ? this.stats.getMagicDamageBonus() : 0}%`, color: `#${MD3Colors.magicValue.toString(16)}` },
            { label: '無視防禦', getValue: () => `${this.stats.getDefenseIgnore ? this.stats.getDefenseIgnore() : 0}%`, color: `#${MD3Colors.utilityValue.toString(16)}` },
            { label: '絕對減傷', getValue: () => `${this.stats.getAbsoluteDamageReduction ? this.stats.getAbsoluteDamageReduction() : 0}%`, color: `#${MD3Colors.utilityValue.toString(16)}` },
            { label: '移動速度', getValue: () => `${this.stats.getMoveSpeed ? this.stats.getMoveSpeed() : 100}%`, color: `#${MD3Colors.utilityValue.toString(16)}` },
            { label: '能量回復', getValue: () => `${this.stats.getEnergyRecovery ? this.stats.getEnergyRecovery() : 5}%/s`, color: `#${MD3Colors.recoveryValue.toString(16)}` }
        ];
        for (const stat of advancedStatsData) {
            const entry = createStatEntry(col2X, col2CurrentY, stat.label, stat.getValue(), stat.color, columnWidth);
            col2CurrentY += entry.height;
        }

        const requiredHeight = Math.max(col1CurrentY, col2CurrentY) + this.internalPadding - this.itemSpacing; // Remove last itemSpacing
        if (requiredHeight > this.panelHeight && this.background) {
            console.warn(`Content height (${requiredHeight}) exceeds panel height (${this.panelHeight}). Panel may need to be taller.`);
            // If BasePanel supports dynamic height:
            // this.resizePanel(this.panelWidth, requiredHeight); // Assuming a resizePanel method exists
        }
    }

    public updateStats(stats: Stats): void {
        this.stats = stats;

        if (!this.stats) {
            console.error("Stats object is undefined in updateStats!");
            return;
        }
        
        if (this.statTexts.length === 0) {
            console.warn("PhaserStatusPanel.updateStats called but no text elements found. Re-initializing.");
            this.initializePanelContent();
            if(this.statTexts.length === 0) {
                console.error("Re-initialization failed to create text elements in PhaserStatusPanel.");
                return;
            }
        }

        let textIndex = 0;

        const updateNextStatEntry = (value: string | number, valueColor?: string) => {
            // statTexts[textIndex] is the label, statTexts[textIndex + 1] is the value
            if (this.statTexts[textIndex + 1]) {
                this.statTexts[textIndex + 1].setText(String(value));
                if (valueColor) {
                    this.statTexts[textIndex + 1].setColor(valueColor);
                }
            } else {
                 console.warn(`Attempted to update non-existent text element at index ${textIndex + 1}`);
            }
            textIndex += 2; // Move past label and value to the next label (or section title)
        };
        
        const skipNextSectionTitle = () => {
            // statTexts[textIndex] is the section title
             if (!this.statTexts[textIndex]) {
                console.warn(`Attempted to skip non-existent section title at index ${textIndex}`);
            }
            textIndex += 1; // Move past section title to the first label of the next section
        };

        // --- Basic Stats ---
        skipNextSectionTitle(); 
        const basicStatsData = [ /* ... same as in initializePanelContent ... */ 
            { getValue: () => this.stats.getLevel(), color: `#${MD3Colors.onSurface.toString(16)}` },
            { getValue: () => `${this.stats.getCurrentHP()}/${this.stats.getMaxHP()}`, color: `#${MD3Colors.hpValue.toString(16)}` },
            { getValue: () => `${Math.floor(this.stats.getCurrentEnergy())}/${Math.floor(this.stats.getMaxEnergy())}`, color: `#${MD3Colors.energyValue.toString(16)}` },
            { getValue: () => `${this.stats.getCurrentExp()}/${this.stats.getMaxExp()}`, color: `#${MD3Colors.expValue.toString(16)}` }
        ];
        for (const stat of basicStatsData) updateNextStatEntry(stat.getValue(), stat.color);

        // --- Combat Stats (Column 1) ---
        skipNextSectionTitle(); 
        const combatStatsPrimaryData = [ /* ... same as in initializePanelContent ... */ 
            { getValue: () => this.stats.getPhysicalAttack(), color: `#${MD3Colors.physicalValue.toString(16)}` },
            { getValue: () => this.stats.getPhysicalDefense(), color: `#${MD3Colors.physicalValue.toString(16)}` },
            { getValue: () => this.stats.getMagicAttack(), color: `#${MD3Colors.magicValue.toString(16)}` },
            { getValue: () => this.stats.getMagicDefense(), color: `#${MD3Colors.magicValue.toString(16)}` },
        ];
        for (const stat of combatStatsPrimaryData) updateNextStatEntry(stat.getValue(), stat.color);
        
        const combatStatsSecondaryData = [ /* ... same as in initializePanelContent ... */ 
            { getValue: () => Math.floor(this.stats.getAccuracy()), color: `#${MD3Colors.utilityValue.toString(16)}` },
            { getValue: () => Math.floor(this.stats.getEvasion()), color: `#${MD3Colors.utilityValue.toString(16)}` },
            { getValue: () => `${(this.stats.getCritRate() * 100).toFixed(1)}%`, color: `#${MD3Colors.critValue.toString(16)}` },
            { getValue: () => `${(this.stats.getCritDamage() * 100).toFixed(0)}%`, color: `#${MD3Colors.critValue.toString(16)}` },
        ];
        for (const stat of combatStatsSecondaryData) updateNextStatEntry(stat.getValue(), stat.color);

        // --- Advanced Stats (Column 2) ---
        skipNextSectionTitle();
        const advancedStatsData = [ /* ... same as in initializePanelContent ... */ 
            { getValue: () => this.stats.getPhysicalPenetration(), color: `#${MD3Colors.physicalValue.toString(16)}` },
            { getValue: () => this.stats.getMagicPenetration(), color: `#${MD3Colors.magicValue.toString(16)}` },
            { getValue: () => `${this.stats.getPhysicalDamageBonus()}%`, color: `#${MD3Colors.physicalValue.toString(16)}` },
            { getValue: () => `${this.stats.getMagicDamageBonus()}%`, color: `#${MD3Colors.magicValue.toString(16)}` },
            { getValue: () => `${this.stats.getDefenseIgnore()}%`, color: `#${MD3Colors.utilityValue.toString(16)}` },
            { getValue: () => `${this.stats.getAbsoluteDamageReduction()}%`, color: `#${MD3Colors.utilityValue.toString(16)}` },
            { getValue: () => `${this.stats.getMoveSpeed()}%`, color: `#${MD3Colors.utilityValue.toString(16)}` },
            { getValue: () => `${this.stats.getEnergyRecovery()}%/s`, color: `#${MD3Colors.recoveryValue.toString(16)}` }
        ];
        for (const stat of advancedStatsData) updateNextStatEntry(stat.getValue(), stat.color);
    }
}