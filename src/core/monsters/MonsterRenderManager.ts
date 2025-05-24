import { IMonsterEntity } from './IMonsterEntity';

/**
 * 怪物渲染管理器
 * 負責處理怪物精靈的視覺更新，包括平滑移動、旋轉動畫等
 */
export class MonsterRenderManager {
    private static instance: MonsterRenderManager | null = null;

    private constructor() {}

    public static getInstance(): MonsterRenderManager {
        if (!MonsterRenderManager.instance) {
            MonsterRenderManager.instance = new MonsterRenderManager();
        }
        return MonsterRenderManager.instance;
    }

    /**
     * 更新單個怪物的視覺表現
     * @param monster 怪物實體
     * @param sprite 怪物精靈
     * @param collisionBox 碰撞箱精靈
     * @param hitbox 命中箱精靈
     * @param delta 時間增量
     */
    public updateMonsterVisuals(
        monster: IMonsterEntity,
        sprite: Phaser.GameObjects.Sprite,
        collisionBox: Phaser.Physics.Arcade.Sprite,
        hitbox: Phaser.Physics.Arcade.Sprite | undefined,
        delta: number
    ): void {
        // 獲取怪物邏輯位置
        const position = monster.getPosition();
        
        // 實現平滑移動，結合時間跟蹤和小幅波動來模擬更自然的移動
        const currentX = sprite.x;
        const currentY = sprite.y;
        const targetX = position.x;
        const targetY = position.y;
        
        // 如果距離太近，則直接設置
        const minDistance = 1;
        const dx = targetX - currentX;
        const dy = targetY - currentY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > minDistance) {
            this.applySmoothMovement(monster, sprite, dx, dy, distance, delta);
            this.updateCollisionBoxes(sprite, collisionBox, hitbox);
            this.applyRotationAnimation(monster, sprite, dx, dy);
        } else {
            this.setDirectPosition(sprite, collisionBox, hitbox, targetX, targetY);
        }
    }

    /**
     * 應用平滑移動
     */
    private applySmoothMovement(
        monster: IMonsterEntity,
        sprite: Phaser.GameObjects.Sprite,
        dx: number,
        dy: number,
        distance: number,
        delta: number
    ): void {
        // 為每個怪物存儲移動時間因子
        let movementTime = monster.getTempData('movementTime') || 0;
        movementTime = (movementTime + delta * 0.001) % 10; // 累積時間，每10秒重置一次
        monster.setTempData('movementTime', movementTime);
        
        // 計算基本移動速度，距離越遠移動越快，但有上限
        const baseSpeed = Math.min(0.12, distance * 0.015);
        
        // 加入隨時間微小波動，模擬更加自然的移動步態
        const speedVariation = Math.sin(movementTime * 2.5) * 0.02; // 微小的正弦波動
        const speed = baseSpeed + speedVariation;
        
        // 使用線性插值 (LERP) 來平滑移動
        sprite.x += dx * speed;
        sprite.y += dy * speed;
    }

    /**
     * 更新碰撞箱位置
     */
    private updateCollisionBoxes(
        sprite: Phaser.GameObjects.Sprite,
        collisionBox: Phaser.Physics.Arcade.Sprite,
        hitbox: Phaser.Physics.Arcade.Sprite | undefined
    ): void {
        // 更新碰撞箱
        collisionBox.setPosition(sprite.x, sprite.y);
        
        // 更新命中箱
        if (hitbox) {
            hitbox.setPosition(sprite.x, sprite.y);
        }
    }

    /**
     * 應用旋轉動畫
     */
    private applyRotationAnimation(
        monster: IMonsterEntity,
        sprite: Phaser.GameObjects.Sprite,
        dx: number,
        dy: number
    ): void {
        // 如果怪物正在移動，增加旋轉動畫
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            // 計算目標旋轉角度
            const targetRotation = Math.atan2(dy, dx);
            
            // 獲取當前旋轉角度
            let currentRotation = sprite.rotation;
            
            // 確保角度差在 -PI 到 PI 之間
            let angleDiff = targetRotation - currentRotation;
            if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            // 平滑旋轉 (角速度與時間及角度差成比例)
            const rotationSpeed = 0.08;
            sprite.rotation += angleDiff * rotationSpeed;
            
            // 加入輕微的搖擺效果，模擬移動中的自然姿態變化
            const movementTime = monster.getTempData('movementTime') || 0;
            const swayAmount = 0.03; // 輕微的搖擺幅度
            const swayOffset = Math.sin(movementTime * 6) * swayAmount;
            
            // 應用搖擺到旋轉角度
            sprite.rotation += swayOffset;
        }
    }

    /**
     * 直接設置位置（當距離很小時）
     */
    private setDirectPosition(
        sprite: Phaser.GameObjects.Sprite,
        collisionBox: Phaser.Physics.Arcade.Sprite,
        hitbox: Phaser.Physics.Arcade.Sprite | undefined,
        targetX: number,
        targetY: number
    ): void {
        // 直接設置位置
        sprite.setPosition(targetX, targetY);
        collisionBox.setPosition(targetX, targetY);
        
        if (hitbox) {
            hitbox.setPosition(targetX, targetY);
        }
    }

    /**
     * 批量更新多個怪物的視覺表現
     * @param monsters 怪物實體陣列
     * @param monsterSprites 怪物精靈映射
     * @param monsterCollisionBoxes 碰撞箱映射
     * @param monsterHitboxes 命中箱映射
     * @param delta 時間增量
     */
    public updateAllMonsterVisuals(
        monsters: IMonsterEntity[],
        monsterSprites: Map<string, Phaser.GameObjects.Sprite>,
        monsterCollisionBoxes: Map<string, Phaser.Physics.Arcade.Sprite>,
        monsterHitboxes: Map<string, Phaser.Physics.Arcade.Sprite>,
        delta: number
    ): void {
        monsters.forEach(monster => {
            if (!monster) return;

            // 獲取怪物實例ID
            const instanceId = monster.getInstanceId ? monster.getInstanceId() : monster.getId();
            
            // 獲取怪物的精靈和碰撞箱
            const sprite = monsterSprites.get(instanceId);
            const collisionBox = monsterCollisionBoxes.get(instanceId);
            const hitbox = monsterHitboxes.get(instanceId);

            if (sprite && collisionBox) {
                this.updateMonsterVisuals(monster, sprite, collisionBox, hitbox, delta);
            }
        });
    }
}
