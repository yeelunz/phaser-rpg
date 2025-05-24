import { MonsterSkill } from '../MonsterSkill';
import { IMonsterEntity } from '../../../IMonsterEntity';
import { ForwardAreaSkillParams } from '../params/ForwardAreaSkillParams';

// 導入投射物系統相關類
import { SkillProjectile } from '../../../../skills/skillProjectile';
import { StaticMovementBehavior } from '../../../../skills/projectile/projectileMovement';
import { StandardDamageBehavior } from '../../../../skills/projectile/projectileBehaviors';
import { TimeDestructionCondition } from '../../../../skills/projectile/destructionConditions';
import { CollisionBoxType, SkillDamageType, SkillProjectileCategory } from '../../../../skills/types';
import { 
    EntityType, 
    RectangleSearchArea, 
    CircleSearchArea, 
    EntitySearchFilter, 
    SearchAreaShape 
} from '../../../../combat/entitySearchSystem';

/**
 * 前方區域攻擊技能模板
 * 在怪物前方指定區域造成傷害，使用投射物系統
 */
export class ForwardAreaAttack extends MonsterSkill {
    // 前方區域特定屬性
    public readonly areaType: 'circle' | 'rectangle';
    public readonly offsetDistance: number;
    public readonly radius?: number;
    public readonly width?: number;
    public readonly height?: number;
    public readonly persistTime: number;
    public readonly showWarning: boolean;
    public readonly visualEffectKey: string | null;
    public readonly soundEffectKey: string | null;

    constructor(params: ForwardAreaSkillParams) {
        super(params);
        
        this.areaType = params.areaType;
        this.offsetDistance = params.offsetDistance;
        this.radius = params.radius;
        this.width = params.width;
        this.height = params.height;
        this.persistTime = params.persistTime || 0;
        this.showWarning = params.showWarning || false;
        this.visualEffectKey = params.visualEffectKey || null;
        this.soundEffectKey = params.soundEffectKey || null;
    }

    async execute(monster: IMonsterEntity, target?: { x: number; y: number }): Promise<void> {
        // 開始施法時間處理
        await this.handleCastTimes(
            () => this.onPreCast(monster, target),
            () => this.onPostCast(monster)
        );

        // 計算攻擊區域位置和方向
        const attackPosition = this.calculateAttackPosition(monster, target);

        // 顯示警告效果
        let warningIndicator = null;
        if (this.showWarning) {
            warningIndicator = this.showWarningEffect(monster, attackPosition);
            
            // 等待警告時間
            await this.delay(300);
            
            // 隱藏警告效果
            this.hideWarningEffect(warningIndicator);
        }

        // 創建前方區域攻擊投射物
        this.createForwardAreaProjectile(monster, attackPosition);

        // 啟動冷卻
        this.startCooldown();
    }

    private onPreCast(monster: IMonsterEntity, target?: { x: number; y: number }): void {
        // 面向目標或保持當前朝向
        if (target) {
            const monsterPos = monster.getPosition();
            const angle = Math.atan2(target.y - monsterPos.y, target.x - monsterPos.x);
            monster.setRotation(angle);
        }
        
        // 停止移動
        monster.setVelocity(0, 0);
        
        // 播放準備動畫
        monster.playAnimation('forward_charge');
    }

    private onPostCast(monster: IMonsterEntity): void {
        // 播放攻擊動畫
        monster.playAnimation('forward_attack');
    }

    /**
     * 計算攻擊區域的位置和角度
     */
    private calculateAttackPosition(monster: IMonsterEntity, target?: { x: number; y: number }): { 
        x: number; 
        y: number; 
        angle: number; 
    } {
        const monsterPos = monster.getPosition();
        
        // 計算攻擊方向
        let attackAngle: number;
        if (target) {
            attackAngle = Math.atan2(target.y - monsterPos.y, target.x - monsterPos.x);
        } else {
            attackAngle = monster.getRotation();
        }
        
        // 計算偏移位置
        const offsetX = Math.cos(attackAngle) * this.offsetDistance;
        const offsetY = Math.sin(attackAngle) * this.offsetDistance;
        
        return {
            x: monsterPos.x + offsetX,
            y: monsterPos.y + offsetY,
            angle: attackAngle
        };
    }

    /**
     * 顯示攻擊警告效果
     */
    private showWarningEffect(monster: IMonsterEntity, attackPos: { x: number; y: number; angle: number }): any {
        const scene = monster.getScene();
        
        // 根據區域類型創建不同形狀的警告
        let warningGraphics;
        
        if (this.areaType === 'circle' && this.radius) {
            // 圓形警告
            warningGraphics = scene.add.circle(
                attackPos.x, 
                attackPos.y, 
                this.radius, 
                0xff0000, 
                0.3
            );
        } 
        else if (this.areaType === 'rectangle' && this.width && this.height) {
            // 矩形警告
            warningGraphics = scene.add.rectangle(
                attackPos.x, 
                attackPos.y, 
                this.width, 
                this.height, 
                0xff0000, 
                0.3
            );
            
            // 設置旋轉
            warningGraphics.setRotation(attackPos.angle);
        }
        
        // 添加閃爍動畫
        if (warningGraphics) {
            scene.tweens.add({
                targets: warningGraphics,
                alpha: { from: 0.1, to: 0.4 },
                yoyo: true,
                repeat: 2,
                duration: 100,
                ease: 'Linear'
            });
        }
        
        return warningGraphics;
    }

    /**
     * 隱藏警告效果
     */
    private hideWarningEffect(warningGraphics: any): void {
        if (warningGraphics && warningGraphics.destroy) {
            warningGraphics.destroy();
        }
    }

    /**
     * 創建前方區域攻擊投射物
     */
    private createForwardAreaProjectile(
        monster: IMonsterEntity, 
        attackPos: { x: number; y: number; angle: number }
    ): void {
        const scene = monster.getScene();
        
        // 檢查投射物管理器
        if (!scene || !scene.registry || !scene.registry.has('projectileManager')) {
            console.error('[ForwardAreaAttack] 無法找到投射物管理器');
            return;
        }
        
        const projectileManager = scene.registry.get('projectileManager');
        
        // 生成唯一ID
        const projectileId = `forwardArea_${monster.getId()}_${Date.now()}`;
        
        // 創建投射物數據
        const projectileData = {
            id: projectileId,
            name: '前方區域攻擊',
            animationType: 'forward_area_effect',
            category: SkillProjectileCategory.AREA,
            damageType: this.damageType as SkillDamageType,
            spriteScale: 1.0,
            position: { x: attackPos.x, y: attackPos.y },
            collisionType: this.areaType === 'circle' ? CollisionBoxType.CIRCLE : CollisionBoxType.RECTANGLE,
            radius: this.radius,
            width: this.width,
            height: this.height,
            attributes: {
                skillId: 'monster_forward_area_attack',
                skillLevel: 1,
                damageMultiplier: this.damageMultiplier,
                angle: attackPos.angle * (180 / Math.PI) // 轉換為角度
            }
        };
        
        // 創建技能投射物實例
        const areaProjectile = new SkillProjectile(projectileData);
        
        // 設置源實體ID
        areaProjectile.setSourceEntityId(monster.getId());
        
        // 創建靜態位置行為
        const staticMovement = new StaticMovementBehavior();
        
        // 創建傷害行為
        const damageBehavior = new StandardDamageBehavior(
            this.damageMultiplier,     // 傷害倍率
            this.damageTicks,          // 傷害次數
            100,                       // 傷害間隔 (毫秒)
            99,                        // 最大目標數 (區域攻擊可能影響多個目標)
            this.damageType            // 傷害類型
        );
        
        // 設置搜索過濾器
        const searchFilter: EntitySearchFilter = {
            entityTypes: [EntityType.PLAYER], // 搜索玩家
            area: this.createSearchArea(attackPos)
        };
        
        areaProjectile.setSearchFilter(searchFilter);
        
        // 設置銷毀條件
        const effectDuration = this.persistTime > 0 ? this.persistTime : 500;
        const destroyCondition = new TimeDestructionCondition(effectDuration);
        
        // 添加所有行為
        areaProjectile.addBehavior(damageBehavior);
        areaProjectile.setMovementBehavior(staticMovement);
        areaProjectile.setDestructionCondition(destroyCondition);
        
        // 註冊到投射物管理系統
        projectileManager.addProjectile(areaProjectile);
        
        // 播放視覺效果
        this.playAreaEffects(monster, attackPos);
    }
    
    /**
     * 創建搜索區域
     */
    private createSearchArea(attackPos: { x: number; y: number; angle: number }): CircleSearchArea | RectangleSearchArea {
        if (this.areaType === 'circle' && this.radius) {
            return {
                type: SearchAreaShape.CIRCLE,
                radius: this.radius
            } as CircleSearchArea;
        } 
        else if (this.areaType === 'rectangle' && this.width && this.height) {
            return {
                type: SearchAreaShape.RECTANGLE,
                width: this.width,
                height: this.height,
                angle: attackPos.angle // 角度（弧度）
            } as RectangleSearchArea;
        }
        
        // 默認創建一個小圓形區域
        return {
            type: SearchAreaShape.CIRCLE,
            radius: 10
        } as CircleSearchArea;
    }

    /**
     * 播放區域效果
     */
    private playAreaEffects(monster: IMonsterEntity, attackPos: { x: number; y: number; angle: number }): void {
        const scene = monster.getScene();
        
        // 播放視覺效果
        if (this.visualEffectKey) {
            const effect = scene.add.sprite(attackPos.x, attackPos.y, this.visualEffectKey);
            effect.setRotation(attackPos.angle);
            effect.play(this.visualEffectKey);
            
            // 設置自動銷毀
            setTimeout(() => {
                effect.destroy();
            }, this.persistTime > 0 ? this.persistTime : 500);
        }
        else {
            // 默認效果
            this.createDefaultAreaEffect(scene, attackPos);
        }
        
        // 播放音效
        if (this.soundEffectKey) {
            scene.sound.play(this.soundEffectKey, {
                volume: 0.5,
                detune: Math.random() * 100 - 50
            });
        }
    }

    /**
     * 創建默認區域效果
     */
    private createDefaultAreaEffect(scene: any, attackPos: { x: number; y: number; angle: number }): void {
        if (this.areaType === 'circle' && this.radius) {
            // 圓形波紋效果
            const circle1 = scene.add.circle(attackPos.x, attackPos.y, this.radius * 0.5, 0xaa3333, 0.6);
            const circle2 = scene.add.circle(attackPos.x, attackPos.y, this.radius, 0xaa3333, 0.3);
            
            scene.tweens.add({
                targets: [circle1, circle2],
                alpha: 0,
                scale: { from: 1, to: 1.3 },
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    circle1.destroy();
                    circle2.destroy();
                }
            });
        }
        else if (this.areaType === 'rectangle' && this.width && this.height) {
            // 矩形波動效果
            const rect = scene.add.rectangle(attackPos.x, attackPos.y, this.width, this.height, 0xaa3333, 0.5);
            rect.setRotation(attackPos.angle);
            
            scene.tweens.add({
                targets: rect,
                alpha: 0,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 500,
                ease: 'Power2',
                onComplete: () => rect.destroy()
            });
        }
    }
}
