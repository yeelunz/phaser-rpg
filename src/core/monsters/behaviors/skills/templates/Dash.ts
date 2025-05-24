import { MonsterSkill } from '../MonsterSkill';
import { IMonsterEntity } from '../../../IMonsterEntity';
import { DashSkillParams } from '../params/DashSkillParams';

/**
 * 衝刺攻擊技能模板
 * 怪物快速衝向目標並造成傷害
 */
export class Dash extends MonsterSkill {
    // 衝刺特定屬性
    public readonly distance: number;
    public readonly speed: number;
    public readonly damageAlongPath: boolean;
    public readonly stopOnHit: boolean;
    public readonly hitRadius: number;
    public readonly knockbackForce: number;
    public readonly phasesThroughWalls: boolean;
    public readonly chargeTime: number;
    public readonly endLag: number;
    public readonly trailEffect: boolean;
    public readonly impactDamageMultiplier: number;
    public readonly canChangeDirection: boolean;
    public readonly directionChangeWindow: number;
    public readonly visualEffectKey: string | null;
    public readonly soundEffectKey: string | null;
    public readonly impactSoundKey: string | null;

    // 運行時狀態
    private isDashing: boolean = false;
    private dashStartTime: number = 0;
    private originalPosition: { x: number; y: number } | null = null;
    private targetPosition: { x: number; y: number } | null = null;
    private hitTargets: Set<IMonsterEntity> = new Set();

    constructor(params: DashSkillParams) {
        super(params);
        
        this.distance = params.distance;
        this.speed = params.speed;
        this.damageAlongPath = params.damageAlongPath ?? true;
        this.stopOnHit = params.stopOnHit ?? false;
        this.hitRadius = params.hitRadius ?? 30;
        this.knockbackForce = params.knockbackForce ?? 300;
        this.phasesThroughWalls = params.phasesThroughWalls ?? false;
        this.chargeTime = params.chargeTime ?? 500;
        this.endLag = params.endLag ?? 200;
        this.trailEffect = params.trailEffect ?? true;
        this.impactDamageMultiplier = params.impactDamageMultiplier ?? 1.5;
        this.canChangeDirection = params.canChangeDirection ?? false;
        this.directionChangeWindow = params.directionChangeWindow ?? 200;
        this.visualEffectKey = params.visualEffectKey || null;
        this.soundEffectKey = params.soundEffectKey || null;
        this.impactSoundKey = params.impactSoundKey || null;
    }

    async execute(monster: IMonsterEntity, target?: { x: number; y: number }): Promise<void> {
        if (!target) {
            console.warn('Dash skill requires a target position');
            return;
        }

        // 重置狀態
        this.resetDashState();
        
        // 計算衝刺目標位置
        this.calculateDashTarget(monster, target);
        
        if (!this.targetPosition) {
            console.warn('Could not calculate valid dash target');
            return;
        }

        // 開始施法時間處理
        await this.handleCastTimes(
            () => this.onPreCast(monster),
            () => this.onPostCast(monster)
        );

        // 執行衝刺
        await this.performDash(monster);

        // 啟動冷卻
        this.startCooldown();
    }

    private resetDashState(): void {
        this.isDashing = false;
        this.dashStartTime = 0;
        this.originalPosition = null;
        this.targetPosition = null;
        this.hitTargets.clear();
    }

    private onPreCast(monster: IMonsterEntity): void {
        // 記錄原始位置
        this.originalPosition = { ...monster.getPosition() };
        
        // 停止移動
        monster.setVelocity(0, 0);
        
        // 面向目標
        if (this.targetPosition) {
            const angle = Math.atan2(
                this.targetPosition.y - this.originalPosition.y,
                this.targetPosition.x - this.originalPosition.x
            );
            monster.setRotation(angle);
        }
        
        // 播放蓄力動畫
        monster.playAnimation('dash_charge');
        
        // 蓄力效果
        this.playChargeEffect(monster);
    }

    private onPostCast(monster: IMonsterEntity): void {
        // 播放衝刺音效
        this.playDashSound(monster.getScene());
        
        // 播放衝刺動畫
        monster.playAnimation('dash_attack');
    }

    private calculateDashTarget(monster: IMonsterEntity, target: { x: number; y: number }): void {
        const monsterPos = monster.getPosition();
        
        // 計算方向
        const angle = Math.atan2(target.y - monsterPos.y, target.x - monsterPos.x);
        
        // 計算目標位置
        const targetX = monsterPos.x + Math.cos(angle) * this.distance;
        const targetY = monsterPos.y + Math.sin(angle) * this.distance;
        
        // 檢查是否需要調整目標位置（邊界、牆壁等）
        this.targetPosition = this.adjustTargetForObstacles(
            monster,
            { x: targetX, y: targetY },
            { x: monsterPos.x, y: monsterPos.y }
        );
    }

    private adjustTargetForObstacles(
        monster: IMonsterEntity,
        target: { x: number; y: number },
        start: { x: number; y: number }
    ): { x: number; y: number } {
        const scene = monster.getScene();
        
        // 檢查邊界
        const bounds = scene.physics?.world?.bounds;
        if (bounds) {
            target.x = Math.max(bounds.x, Math.min(bounds.x + bounds.width, target.x));
            target.y = Math.max(bounds.y, Math.min(bounds.y + bounds.height, target.y));
        }
        
        // 檢查牆壁（如果不能穿牆）
        if (!this.phasesThroughWalls && scene.checkWallCollision) {
            const collision = scene.checkWallCollision(start, target);
            if (collision) {
                // 調整到碰撞點前
                target = collision.adjustedTarget || target;
            }
        }
        
        return target;
    }

    private async performDash(monster: IMonsterEntity): Promise<void> {
        if (!this.targetPosition || !this.originalPosition) return;
        
        this.isDashing = true;
        this.dashStartTime = Date.now();
        
        const scene = monster.getScene();
        
        // 計算衝刺持續時間
        const dashDistance = Math.sqrt(
            Math.pow(this.targetPosition.x - this.originalPosition.x, 2) +
            Math.pow(this.targetPosition.y - this.originalPosition.y, 2)
        );
        const dashDuration = (dashDistance / this.speed) * 1000; // 轉換為毫秒
        
        // 創建拖尾效果
        let trailEffect: any = null;
        if (this.trailEffect) {
            trailEffect = this.createTrailEffect(monster);
        }
        
        // 創建衝刺動畫
        await this.animateDash(monster, dashDuration, trailEffect);
        
        // 結束衝刺
        this.isDashing = false;
        
        // 清理拖尾效果
        if (trailEffect) {
            this.destroyTrailEffect(trailEffect);
        }
        
        // 結束延遲
        if (this.endLag > 0) {
            monster.playAnimation('dash_recover');
            await this.delay(this.endLag);
        }
    }

    private playChargeEffect(monster: IMonsterEntity): void {
        const scene = monster.getScene();
        const monsterPos = monster.getPosition();
        
        // 蓄力光圈效果
        const chargeRing = scene.add.circle(monsterPos.x, monsterPos.y, 20, 0xff6600, 0.6);
        
        scene.tweens.add({
            targets: chargeRing,
            radius: 60,
            alpha: 0,
            duration: this.chargeTime,
            ease: 'Power2',
            onComplete: () => chargeRing.destroy()
        });
        
        // 能量聚集效果
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const particle = scene.add.circle(
                monsterPos.x + Math.cos(angle) * 80,
                monsterPos.y + Math.sin(angle) * 80,
                3,
                0xffaa00
            );
            
            scene.tweens.add({
                targets: particle,
                x: monsterPos.x,
                y: monsterPos.y,
                alpha: 0,
                duration: this.chargeTime,
                delay: i * 50,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }

    private playDashSound(scene: any): void {
        if (this.soundEffectKey) {
            scene.sound.play(this.soundEffectKey, {
                volume: 0.8,
                rate: 1.2 // 稍微加快播放速度增加急促感
            });
        }
    }

    private createTrailEffect(monster: IMonsterEntity): any {
        const scene = monster.getScene();
        const trailParticles: any[] = [];
        
        // 創建粒子發射器
        if (this.visualEffectKey) {
            const particles = scene.add.particles(monster.x, monster.y, this.visualEffectKey);
            return particles;
        } else {
            // 創建簡單的拖尾效果
            return {
                particles: trailParticles,
                update: (x: number, y: number) => {
                    // 添加拖尾粒子
                    const trail = scene.add.circle(x, y, 5, 0xffaa00, 0.8);
                    trailParticles.push(trail);
                    
                    scene.tweens.add({
                        targets: trail,
                        alpha: 0,
                        scale: 0,
                        duration: 200,
                        ease: 'Power1',
                        onComplete: () => {
                            trail.destroy();
                            const index = trailParticles.indexOf(trail);
                            if (index > -1) trailParticles.splice(index, 1);
                        }
                    });
                }
            };
        }
    }

    private async animateDash(monster: IMonsterEntity, duration: number, trailEffect: any): Promise<void> {
        return new Promise(resolve => {
            if (!this.targetPosition) {
                resolve();
                return;
            }
            
            const scene = monster.getScene();
            
            // 設置怪物為無敵狀態（防止在衝刺過程中被打斷）
            monster.setInvulnerable(true);
            
            // 創建移動動畫
            scene.tweens.add({
                targets: monster,
                x: this.targetPosition.x,
                y: this.targetPosition.y,
                duration: duration,
                ease: 'Power2',
                onUpdate: () => {
                    // 更新拖尾效果
                    if (trailEffect && trailEffect.update) {
                        trailEffect.update(monster.x, monster.y);
                    } else if (trailEffect && trailEffect.setPosition) {
                        trailEffect.setPosition(monster.x, monster.y);
                    }
                    
                    // 檢查衝刺過程中的碰撞
                    if (this.damageAlongPath) {
                        this.checkDashCollisions(monster);
                    }
                    
                    // 檢查方向改變（如果允許）
                    if (this.canChangeDirection) {
                        this.handleDirectionChange(monster);
                    }
                },
                onComplete: () => {
                    // 恢復正常狀態
                    monster.setInvulnerable(false);
                    
                    // 衝刺結束時的撞擊傷害
                    this.dealImpactDamage(monster);
                    
                    resolve();
                }
            });
        });
    }

    private checkDashCollisions(monster: IMonsterEntity): void {
        const scene = monster.getScene();
        const allEntities = scene.getAllEntities ? scene.getAllEntities() : [];
        const monsterPos = monster.getPosition();
        
        for (const entity of allEntities) {
            // 跳過自己和已經擊中的目標
            if (entity === monster || this.hitTargets.has(entity)) continue;
            
            const entityPos = entity.getPosition();
            const distance = Math.sqrt(
                Math.pow(monsterPos.x - entityPos.x, 2) +
                Math.pow(monsterPos.y - entityPos.y, 2)
            );
            
            if (distance <= this.hitRadius) {
                this.handleDashHit(monster, entity);
                
                if (this.stopOnHit) {
                    // 停止衝刺
                    this.stopDash(monster);
                    break;
                }
            }
        }
    }

    private handleDashHit(monster: IMonsterEntity, target: IMonsterEntity): void {
        // 記錄擊中目標
        this.hitTargets.add(target);
        
        // 計算傷害
        const baseDamage = monster.getStats().getAttackPower();
        let damage = baseDamage * this.damageMultiplier;
        
        // 處理防禦
        if (this.ignoreDefense < 1) {
            const defense = target.getStats().getDefense();
            const effectiveDefense = defense * (1 - this.ignoreDefense);
            damage = Math.max(1, damage - effectiveDefense);
        }
        
        // 造成傷害
        target.takeDamage(damage, this.damageType, monster.getPosition());
        
        // 擊退效果
        this.applyDashKnockback(monster, target);
        
        // 播放擊中效果
        this.playHitEffect(monster.getScene(), target.getPosition());
        
        // 播放撞擊音效
        if (this.impactSoundKey) {
            monster.getScene().sound.play(this.impactSoundKey, { volume: 0.6 });
        }
    }

    private applyDashKnockback(monster: IMonsterEntity, target: IMonsterEntity): void {
        const monsterPos = monster.getPosition();
        const targetPos = target.getPosition();
        
        // 擊退方向為衝刺方向
        const angle = Math.atan2(targetPos.y - monsterPos.y, targetPos.x - monsterPos.x);
        const knockbackVelX = Math.cos(angle) * this.knockbackForce;
        const knockbackVelY = Math.sin(angle) * this.knockbackForce;
        
        target.applyKnockback(knockbackVelX, knockbackVelY, 400);
    }

    private handleDirectionChange(monster: IMonsterEntity): void {
        // 簡化的方向改變邏輯
        const currentTime = Date.now();
        const elapsedTime = currentTime - this.dashStartTime;
        
        if (elapsedTime <= this.directionChangeWindow) {
            // 在允許的時間窗口內，可以微調方向追蹤最近的敵人
            const nearestEnemy = this.findNearestEnemy(monster);
            if (nearestEnemy) {
                const monsterPos = monster.getPosition();
                const enemyPos = nearestEnemy.getPosition();
                const distance = Math.sqrt(
                    Math.pow(enemyPos.x - monsterPos.x, 2) +
                    Math.pow(enemyPos.y - monsterPos.y, 2)
                );
                
                // 只有在足夠近的時候才改變方向
                if (distance <= 100) {
                    const angle = Math.atan2(enemyPos.y - monsterPos.y, enemyPos.x - monsterPos.x);
                    monster.setRotation(angle);
                    
                    // 微調目標位置
                    if (this.targetPosition) {
                        const remainingDistance = this.distance * 0.7; // 保留70%的衝刺距離
                        this.targetPosition.x = monsterPos.x + Math.cos(angle) * remainingDistance;
                        this.targetPosition.y = monsterPos.y + Math.sin(angle) * remainingDistance;
                    }
                }
            }
        }
    }

    private findNearestEnemy(monster: IMonsterEntity): IMonsterEntity | null {
        const scene = monster.getScene();
        const allEntities = scene.getAllEntities ? scene.getAllEntities() : [];
        const monsterPos = monster.getPosition();
        
        let nearestEnemy: IMonsterEntity | null = null;
        let nearestDistance = Infinity;
        
        for (const entity of allEntities) {
            if (entity === monster) continue;
            
            // 簡單的敵友判定（實際遊戲中可能更複雜）
            if (monster.getMonsterType() === entity.getMonsterType()) continue;
            
            const entityPos = entity.getPosition();
            const distance = Math.sqrt(
                Math.pow(entityPos.x - monsterPos.x, 2) +
                Math.pow(entityPos.y - monsterPos.y, 2)
            );
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestEnemy = entity;
            }
        }
        
        return nearestEnemy;
    }

    private stopDash(monster: IMonsterEntity): void {
        const scene = monster.getScene();
        
        // 停止所有相關的動畫
        scene.tweens.killTweensOf(monster);
        
        // 播放急停效果
        const monsterPos = monster.getPosition();
        const stopEffect = scene.add.circle(monsterPos.x, monsterPos.y, 20, 0xff0000, 0.8);
        
        scene.tweens.add({
            targets: stopEffect,
            radius: 50,
            alpha: 0,
            duration: 200,
            ease: 'Power2',
            onComplete: () => stopEffect.destroy()
        });
    }

    private dealImpactDamage(monster: IMonsterEntity): void {
        // 衝刺結束時的額外撞擊傷害
        const scene = monster.getScene();
        const allEntities = scene.getAllEntities ? scene.getAllEntities() : [];
        const monsterPos = monster.getPosition();
        
        const impactRadius = this.hitRadius * 1.2; // 撞擊範圍稍大於擊中範圍
        
        for (const entity of allEntities) {
            if (entity === monster) continue;
            
            const entityPos = entity.getPosition();
            const distance = Math.sqrt(
                Math.pow(monsterPos.x - entityPos.x, 2) +
                Math.pow(monsterPos.y - entityPos.y, 2)
            );
            
            if (distance <= impactRadius) {
                const baseDamage = monster.getStats().getAttackPower();
                const impactDamage = baseDamage * this.impactDamageMultiplier;
                
                entity.takeDamage(impactDamage, this.damageType, monsterPos);
                
                // 撞擊擊退
                const angle = Math.atan2(entityPos.y - monsterPos.y, entityPos.x - monsterPos.x);
                const impactKnockback = this.knockbackForce * 1.5;
                entity.applyKnockback(
                    Math.cos(angle) * impactKnockback,
                    Math.sin(angle) * impactKnockback,
                    500
                );
            }
        }
        
        // 撞擊視覺效果
        this.playImpactEffect(scene, monsterPos);
    }

    private playHitEffect(scene: any, position: { x: number; y: number }): void {
        // 擊中火花效果
        const spark = scene.add.circle(position.x, position.y, 12, 0xffff00);
        
        scene.tweens.add({
            targets: spark,
            alpha: 0,
            scale: 2.5,
            duration: 250,
            ease: 'Power2',
            onComplete: () => spark.destroy()
        });
        
        // 擊中粒子
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const particle = scene.add.circle(
                position.x,
                position.y,
                2,
                0xff8800
            );
            
            scene.tweens.add({
                targets: particle,
                x: position.x + Math.cos(angle) * 30,
                y: position.y + Math.sin(angle) * 30,
                alpha: 0,
                duration: 200,
                ease: 'Power1',
                onComplete: () => particle.destroy()
            });
        }
    }

    private playImpactEffect(scene: any, position: { x: number; y: number }): void {
        // 撞擊爆炸效果
        const explosion = scene.add.circle(position.x, position.y, 15, 0xff4400);
        
        scene.tweens.add({
            targets: explosion,
            radius: 80,
            alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => explosion.destroy()
        });
        
        // 衝擊波
        const shockwave = scene.add.circle(position.x, position.y, 60, 0xffffff, 0);
        shockwave.setStrokeStyle(4, 0xff4400);
        
        scene.tweens.add({
            targets: shockwave,
            radius: 120,
            alpha: 0,
            duration: 300,
            ease: 'Power1',
            onComplete: () => shockwave.destroy()
        });
    }

    private destroyTrailEffect(trailEffect: any): void {
        if (trailEffect) {
            if (trailEffect.destroy) {
                trailEffect.destroy();
            } else if (trailEffect.particles) {
                // 清理剩餘的拖尾粒子
                for (const particle of trailEffect.particles) {
                    if (particle && particle.destroy) {
                        particle.destroy();
                    }
                }
            }
        }
    }
}
