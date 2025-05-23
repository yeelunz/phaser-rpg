/**
 * 怪物碰撞處理器
 * 處理玩家與怪物之間的碰撞和接觸傷害
 * 
 * 實現功能：
 * 1. 怪物接觸傷害檢測 - 當玩家碰到怪物的碰撞框時，造成100%物理傷害
 * 2. 玩家無敵時間機制 - 受傷後短時間內不會再受到傷害
 * 3. 視覺反饋效果 - 受傷閃紅、無敵時閃爍
 */

import { EntityManager } from './entityManager';
import { SkillEventManager } from '../skills/skillEventManager';
import { SkillEventType } from '../skills/types';
import { DamageResult } from './damageSystem';

export class MonsterCollisionHandler {    
    private scene: Phaser.Scene;
    private entityManager: EntityManager;
    private skillEventManager: SkillEventManager;
    
    // 玩家受傷無敵時間 (毫秒)
    private playerInvulnerableTime: number = 1000; // 1秒鐘的無敵時間
    private playerLastDamageTime: number = 0;
    
    // 怪物碰撞傷害冷卻 (毫秒)
    private monsterDamageCooldowns: Map<string, number> = new Map();
    
    // 戰鬥音效
    private hitSounds: Phaser.Sound.BaseSound[] = [];
    private critSounds: Phaser.Sound.BaseSound[] = [];
    
    /**
     * 建構函數
     * @param scene Phaser遊戲場景
     */
    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.entityManager = EntityManager.getInstance();
        this.skillEventManager = SkillEventManager.getInstance();
        
        // 初始化戰鬥音效
        this.initSounds();
    }
    
    /**
     * 初始化音效
     */
    private initSounds(): void {
        // 假設有多個音效變化
        if (this.scene.sound.get('hit1')) this.hitSounds.push(this.scene.sound.get('hit1'));
        if (this.scene.sound.get('hit2')) this.hitSounds.push(this.scene.sound.get('hit2'));
        
        if (this.scene.sound.get('crit1')) this.critSounds.push(this.scene.sound.get('crit1'));
        if (this.scene.sound.get('crit2')) this.critSounds.push(this.scene.sound.get('crit2'));
    }
    
    /**
     * 設置碰撞檢測
     * @param playerSprite 玩家精靈
     * @param monsterSprites 怪物精靈和實體的配對數組
     */    
    public setupCollisions(
        playerSprite: Phaser.Physics.Arcade.Sprite, 
        monsterSprites: { sprite: Phaser.GameObjects.Sprite, monster: any, isTriggerOnly?: boolean, collisionBoxSprite?: Phaser.Physics.Arcade.Sprite }[] 
    ): void {
        console.log(`設置碰撞檢測，監控的怪物數量: ${monsterSprites.length}`);
        
        // 為每個怪物設置與玩家的碰撞檢測 (使用 overlap 而不是 collider)
        monsterSprites.forEach(monsterObj => {
            // 檢測怪物是否有效
            if (!monsterObj || !monsterObj.monster || !monsterObj.sprite) {
                console.warn('發現無效的怪物對象！');
                return;
            }
            
            console.log(`為怪物 ${monsterObj.monster.getName()} 設置觸發區域碰撞檢測 (ID: ${monsterObj.monster.getId()})`);
            
            // 優先使用 collisionBoxSprite 進行碰撞檢測（完整碰撞箱大小）
            // 如果 collisionBoxSprite 不存在，則退回使用主精靈
            const collisionSprite = monsterObj.collisionBoxSprite || monsterObj.sprite;
            
            // 確保精靈的物理體已啟用
            const body = collisionSprite.body as Phaser.Physics.Arcade.Body;
            if (!body || !body.enable) {
                console.warn(`怪物 ${monsterObj.monster.getName()} 的精靈沒有啟用物理體！`);
                return;
            }
            
            // 設置 overlap 檢測 - 使用玩家與怪物的碰撞箱進行檢測
            this.scene.physics.add.overlap(
                playerSprite,
                collisionSprite,
                (_player, _monster) => {
                    this.handlePlayerMonsterCollision(monsterObj);
                },
                // 不需要額外的碰撞條件檢查
                undefined,
                this
            );
        });
    }    
    
    /**
     * 處理玩家與怪物的碰撞
     */
    private handlePlayerMonsterCollision(monsterObj: { sprite: Phaser.GameObjects.Sprite, monster: any, collisionBoxSprite?: Phaser.Physics.Arcade.Sprite }): void {
        const currentTime = this.scene.time.now;
        const player = this.entityManager.getPlayer();
        
        if (!player) {
            console.warn('無法處理碰撞：未找到玩家實體');
            return;
        }
        
        // 檢查玩家無敵時間
        if (currentTime - this.playerLastDamageTime < this.playerInvulnerableTime) {
            return; // 玩家還處於無敵狀態
        }
          // 檢查怪物傷害冷卻 - 使用怪物實例ID而非怪物類型ID
        const monsterId = monsterObj.monster.getInstanceId ? monsterObj.monster.getInstanceId() : monsterObj.monster.getId();
        const lastDamageTime = this.monsterDamageCooldowns.get(monsterId) || 0;
        
        // 假設每個怪物有不同的攻擊冷卻時間 (這裡簡化為1秒)
        const cooldownTime = 1000; // 可以從怪物資料中獲取
        
        if (currentTime - lastDamageTime < cooldownTime) {
            return;
        }
        
        // 通過事件系統處理怪物接觸傷害
        this.processMonsterContactDamage(monsterObj.monster, player);
        
        // 執行擊退效果
        if (player.sprite) {
            this.knockbackPlayer(player.sprite, monsterObj.sprite);
        }
          // 更新冷卻時間 - 使用怪物實例ID
        this.monsterDamageCooldowns.set(monsterId, currentTime);
    }    
      /**
     * 處理怪物接觸傷害
     */
    private processMonsterContactDamage(monster: any, player: any): void {
        // 獲取怪物和玩家 ID
        const monsterId = monster.getInstanceId ? monster.getInstanceId() : monster.getId();
        const playerId = player.getId ? player.getId() : 'player';
        
        console.log(`處理怪物碰撞傷害事件: 怪物ID=${monsterId}, 玩家ID=${playerId}`);
        
        // 通過戰鬥事件系統處理傷害
        this.skillEventManager.dispatchEvent({
            type: SkillEventType.DAMAGE_DEALT,
            skillId: 'monster_contact_attack',
            skillLevel: 1,
            casterId: monsterId, // 使用實例ID而不是類型ID
            timestamp: Date.now(),
            data: {
                targetId: playerId,
                damageType: 'physical',
                damageMultiplier: 1.0, // 100% 物理傷害
                hitIndex: 0,
                totalHits: 1
            }
        });
        
        // 視覺反饋 - 玩家閃爍效果（表示受傷）
        this.playerDamageVisualEffect(player);
        
        // 更新玩家最後受傷時間（這會觸發無敵時間）
        this.playerLastDamageTime = this.scene.time.now;
        
        console.log(`玩家被怪物 ${monster.getName()} 碰觸，造成接觸傷害。無敵時間: ${this.playerInvulnerableTime}ms`);
    }
    
    /**
     * 擊退玩家
     */
    private knockbackPlayer(playerSprite: Phaser.Physics.Arcade.Sprite, monsterSprite: Phaser.GameObjects.Sprite): void {
        // 計算方向向量 (從怪物指向玩家)
        const dx = playerSprite.x - monsterSprite.x;
        const dy = playerSprite.y - monsterSprite.y;
        
        // 正規化向量
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0 && playerSprite.body) {
            const normalizedDx = dx / distance;
            const normalizedDy = dy / distance;
            
            // 設置玩家速度 (擊退)
            const knockbackSpeed = 300; // 擊退速度
            playerSprite.body.velocity.x = normalizedDx * knockbackSpeed;
            playerSprite.body.velocity.y = normalizedDy * knockbackSpeed;
            
            // 添加一個計時器來停止擊退效果
            this.scene.time.delayedCall(150, () => {
                // 檢查玩家是否存在移動狀態檢查的方法
                const player = this.entityManager.getPlayer();
                if (player && typeof player.isMoving === 'function' && !player.isMoving() && playerSprite.body) {
                    playerSprite.body.velocity.x = 0;
                    playerSprite.body.velocity.y = 0;
                }
            });
        }
    }
    
    /**
     * 播放傷害音效
     */
    public playDamageSound(damage: DamageResult): void {
        if (this.hitSounds.length === 0 && this.critSounds.length === 0) {
            return; // 沒有音效可播放
        }
        
        if (damage.isCritical && this.critSounds.length > 0) {
            // 隨機選擇一個暴擊音效
            const randomIndex = Math.floor(Math.random() * this.critSounds.length);
            this.critSounds[randomIndex].play();
        } else if (this.hitSounds.length > 0) {
            // 隨機選擇一個普通命中音效
            const randomIndex = Math.floor(Math.random() * this.hitSounds.length);
            this.hitSounds[randomIndex].play();
        }
    }
    
    /**
     * 創建玩家受傷的視覺效果（閃爍）
     */
    private playerDamageVisualEffect(player: any): void {
        if (!player.sprite) return;
        
        const sprite = player.sprite;
        const scene = this.scene;
        
        // 閃爍效果 - 透明度變化
        scene.tweens.add({
            targets: sprite,
            alpha: 0.4,
            duration: 100,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                sprite.alpha = 1; // 確保最後完全不透明
            }
        });
        
        // 短暫變紅表示受傷
        sprite.setTint(0xFF0000);
        
        // 一小段時間後恢復原本的顏色
        scene.time.delayedCall(200, () => {
            sprite.clearTint();
            
            // 在無敵時間內閃爍效果
            if (this.playerInvulnerableTime > 400) {
                this.createInvulnerabilityEffect(player, this.playerInvulnerableTime - 200);
            }
        });
    }
    
    /**
     * 創建玩家無敵時間的視覺效果
     */
    private createInvulnerabilityEffect(player: any, duration: number): void {
        if (!player.sprite) return;
        
        const sprite = player.sprite;
        const scene = this.scene;
        
        // 閃爍效果
        const flashInterval = 200; // 每次閃爍的間隔
        let flashCount = 0;
        const maxFlashCount = Math.floor(duration / flashInterval);
        
        // 創建一個定時器，定期改變透明度
        const flashEvent = scene.time.addEvent({
            delay: flashInterval / 2, // 每隔一半間隔時間切換透明度
            callback: () => {
                // 切換透明度 (在 1.0 和 0.3 之間)，使無敵狀態更加明顯
                sprite.alpha = sprite.alpha === 1.0 ? 0.3 : 1.0;
                flashCount++;
                
                // 當閃爍次數達到上限時，停止閃爍並恢復透明度
                if (flashCount >= maxFlashCount * 2) { // 乘以2因為每次閃爍需要兩次透明度變化
                    flashEvent.destroy();
                    sprite.alpha = 1.0;
                }
            },
            callbackScope: this,
            loop: true
        });
        
        // 當無敵時間結束時，確保玩家完全不透明
        scene.time.delayedCall(duration, () => {
            flashEvent.destroy();
            sprite.alpha = 1;
        });
    }

}

