import { IMonsterEntity } from './IMonsterEntity';
import { MonsterData, MonsterDrop, MonsterCategory } from '../data/dataloader';
import { Stats } from '../stats';
import { MonsterStateMachine } from './behaviors/MonsterStateMachine';
import { MonsterStateType } from './behaviors/MonsterStateType';
import { BehaviorLoader } from './behaviors/definitions/BehaviorLoader';
import { IMonsterBehavior } from './behaviors/IMonsterBehavior';

/**
 * 怪物實體類 - 實現 IMonsterEntity 接口
 * 使用新的狀態機行為系統，支援多種技能和行為配置
 */
export class Monster implements IMonsterEntity {
    // 基本屬性
    private id: string;
    private instanceId: string;
    private name: string;
    private stats: Stats;
    private category: MonsterCategory;
    private behaviorId: string | null;
    private experienceYield: number;
    private isSolid: boolean;
    private sprite: string | null;
    private collisionBox: { width: number, height: number };
    private hitBox: { width: number, height: number };
    private icon: string;
    private drops: MonsterDrop[];
    private goldDrop: number;
    
    // 遊戲狀態屬性
    private isActive: boolean = false;
    private isAlive: boolean = true;
    private isInvulnerable: boolean = false;
    
    // 位置和移動相關
    public x: number = 0;
    public y: number = 0;
    private velocityX: number = 0;
    private velocityY: number = 0;
    private rotation: number = 0;
    private speed: number = 0;
    private currentState: MonsterStateType = MonsterStateType.WANDERING;
    private detectionRange: number = 200;
    
    // 新行為系統相關屬性
    private stateMachine: MonsterStateMachine | null = null;
    private tempData: Map<string, any> = new Map();
      // 視覺效果相關
    private scene: any = null;
    private _alpha: number = 1; // 改名為 _alpha，以避免未使用警告
    private _scale: number = 1; // 改名為 _scale，以避免未使用警告

    constructor(data: MonsterData) {
        this.id = data.id;
        this.instanceId = data.id + '_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        this.name = data.name;
        this.category = data.category;
        this.behaviorId = data.behaviorId || null;
        this.experienceYield = data.experienceYield;
        this.isSolid = data.isSolid;
        this.sprite = data.sprite;
        this.collisionBox = { ...data.collisionBox };
        this.hitBox = { ...data.hitBox };
        this.icon = data.icon;
        this.drops = [...data.drops];
        this.goldDrop = data.goldDrop;
        
        // 初始化能力值統計
        this.stats = new Stats();
        this.initializeStats(data);
        
        // 初始化新的狀態機行為系統
        if (this.behaviorId) {
            this.initializeStateMachine();
        }
    }
    
    // 初始化怪物能力值
    private initializeStats(data: MonsterData): void {
        const baseStats = data.baseStats;
        
        this.stats.setLevel(baseStats.level);
        this.stats.setBaseHP(baseStats.hp);
        this.stats.setBaseEnergy(baseStats.energy);
        this.stats.setBasePhysicalAttack(baseStats.physicalAttack);
        this.stats.setBasePhysicalDefense(baseStats.physicalDefense);
        this.stats.setBaseMagicAttack(baseStats.magicAttack);
        this.stats.setBaseMagicDefense(baseStats.magicDefense);
        this.stats.setBaseAccuracy(baseStats.accuracy);
        this.stats.setBaseEvasion(baseStats.evasion);
        this.stats.setBasePhysicalPenetration(baseStats.physicalPenetration);
        this.stats.setBaseMagicPenetration(baseStats.magicPenetration);
        this.stats.setBaseAbsoluteDamageReduction(baseStats.absoluteDamageReduction);
        this.stats.setBaseMagicDamageBonus(baseStats.magicDamageBonus);
        this.stats.setBasePhysicalDamageBonus(baseStats.physicalDamageBonus);
        this.stats.setBaseDefenseIgnore(baseStats.defenseIgnore);
        this.stats.setBaseMoveSpeed(baseStats.moveSpeed);
        this.stats.setBaseCritRate(baseStats.critRate);
        this.stats.setBaseDamageStability(baseStats.damageStability);
        this.stats.setBaseVulnerability(baseStats.vulnerability);
        this.stats.setBaseResistance(baseStats.resistance);
        this.stats.setBaseEnergyRecovery(baseStats.energyRecovery);
        
        // 設定基本移動速度
        this.speed = baseStats.moveSpeed;
        
        // 根據怪物數據初始化偵測範圍
        this.detectionRange = baseStats.moveSpeed * 2;
        
        // 怪物一開始設定為滿血滿能量
        this.stats.resetHP();
        this.stats.resetEnergy();
    }    // 初始化新的狀態機行為系統
    private initializeStateMachine(): void {
        if (!this.behaviorId) {
            console.debug(`[Monster] ${this.id}: 無行為ID，跳過狀態機初始化`);
            return;
        }

        console.debug(`[Monster] ${this.id}: 開始初始化狀態機，行為ID: ${this.behaviorId}`);

        try {
            // 建立狀態機
            this.stateMachine = new MonsterStateMachine(this);
            console.debug(`[Monster] ${this.id}: 狀態機已建立`);
              // 從行為載入器獲取行為設定
            const behaviorConfig = this.loadBehaviorConfig();
            
            if (!behaviorConfig) {
                console.error(`[Monster] ${this.id}: 找不到怪物行為配置: ${this.behaviorId}`);
                return;
            }
            console.debug(`[Monster] ${this.id}: 行為配置載入成功`);
            
            // 更新檢測範圍為行為配置中的值
            if (behaviorConfig.detectionRange !== undefined) {
                this.detectionRange = behaviorConfig.detectionRange;
                console.debug(`[Monster] ${this.id}: 檢測範圍更新為: ${this.detectionRange}`);
            }
            
            // 註冊所有狀態到狀態機
            this.registerStates(behaviorConfig);
            console.debug(`[Monster] ${this.id}: 狀態註冊完成`);
            
            // 設置初始狀態為遊蕩
            this.stateMachine.setInitialState(MonsterStateType.WANDERING);
            console.debug(`[Monster] ${this.id}: 初始狀態設置完成`);
            
        } catch (error) {
            console.error(`[Monster] ${this.id}: 初始化狀態機失敗:`, error);
        }
    }    // 註冊狀態到狀態機
    private registerStates(behaviorConfig: IMonsterBehavior): void {
        console.debug(`[Monster] ${this.id}: 開始註冊狀態`);
        
        // 註冊遊蕩狀態
        if (behaviorConfig.states[MonsterStateType.WANDERING]) {
            const wanderingState = BehaviorLoader.createWanderingState(this, this.stateMachine!, behaviorConfig);
            wanderingState.setSkillPool(behaviorConfig.states[MonsterStateType.WANDERING].skillPool);
            this.stateMachine!.registerState(wanderingState);
            console.debug(`[Monster] ${this.id}: 遊蕩狀態已註冊`);
        }        // 註冊警戒狀態
        if (behaviorConfig.states[MonsterStateType.ALERT]) {
            const alertState = BehaviorLoader.createAlertState(this, this.stateMachine!, behaviorConfig);
            alertState.setSkillPool(behaviorConfig.states[MonsterStateType.ALERT].skillPool);
            this.stateMachine!.registerState(alertState);
            console.debug(`[Monster] ${this.id}: 警戒狀態已註冊`);
        }

        // 註冊追擊狀態
        if (behaviorConfig.states[MonsterStateType.CHASE]) {
            const chaseState = BehaviorLoader.createChaseState(this, this.stateMachine!, behaviorConfig);
            chaseState.setSkillPool(behaviorConfig.states[MonsterStateType.CHASE].skillPool);
            this.stateMachine!.registerState(chaseState);
            console.debug(`[Monster] ${this.id}: 追擊狀態已註冊`);
        }
        
        console.debug(`[Monster] ${this.id}: 所有狀態註冊完成`);
    }// 從行為載入器獲取行為配置
    private loadBehaviorConfig() {
        if (!this.behaviorId) {
            return null;
        }

        try {
            return BehaviorLoader.getBehaviorConfig(this.behaviorId);
        } catch (error) {
            console.error(`載入行為配置失敗:`, error);
            return null;
        }
    }
    
    // ============= IMonsterEntity 接口實現 =============
    
    // 基本屬性獲取器
    getId(): string {
        return this.id;
    }
    
    getInstanceId(): string {
        return this.instanceId;
    }

    getName(): string {
        return this.name;
    }

    getCategory(): MonsterCategory {
        return this.category;
    }

    getStats(): Stats {
        return this.stats;
    }
    
    // 位置和移動相關
    getPosition(): { x: number, y: number } {
        return { x: this.x, y: this.y };
    }

    setPosition(x: number, y: number): void {
        this.x = x;
        this.y = y;
    }
    
    setVelocity(x: number, y: number): void {
        this.velocityX = x;
        this.velocityY = y;
    }
    
    getSpeed(): number {
        return this.speed;
    }
    
    getRotation(): number {
        return this.rotation;
    }
    
    setRotation(angle: number): void {
        this.rotation = angle;
    }

    // 狀態管理
    isAliveStatus(): boolean {
        return this.isAlive;
    }
    
    getCurrentState(): MonsterStateType {
        return this.currentState;
    }
    
    setCurrentState(state: MonsterStateType): void {
        this.currentState = state;
    }
      // 戰鬥相關方法
    takeDamage(damage: number, damageType: 'physical' | 'magic' | 'true' = 'physical', sourcePosition: { x: number; y: number }): void {
        if (!this.isAlive || this.isInvulnerable) return;

        // 根據傷害類型應用傷害修正
        let finalDamage = damage;
        if (damageType === 'physical') {
            // 應用物理傷害計算
            finalDamage = this.calculatePhysicalDamage(damage);
        } else if (damageType === 'magic') {
            // 應用魔法傷害計算
            finalDamage = this.calculateMagicDamage(damage);
        }
        // 'true' 類型傷害不受修正

        // 應用傷害到怪物
        this.stats.takeDamage(finalDamage);
        
        // 通知狀態機處理受傷事件
        if (this.stateMachine) {
            this.setCurrentState(MonsterStateType.HURT);
            this.stateMachine.handleDamaged(sourcePosition);
        } else {
            this.setCurrentState(MonsterStateType.HURT);
        }

        // 檢查怪物是否死亡
        if (this.stats.getCurrentHP() <= 0) {
            this.die();
        }
    }
    
    // 計算物理傷害
    private calculatePhysicalDamage(damage: number): number {
        const defense = this.stats.getPhysicalDefense();
        // 簡單的物理傷害計算公式
        return Math.max(1, damage - defense / 2);
    }
    
    // 計算魔法傷害
    private calculateMagicDamage(damage: number): number {
        const defense = this.stats.getMagicDefense();
        // 簡單的魔法傷害計算公式
        return Math.max(1, damage - defense / 3);
    }
    
    applyKnockback(velocityX: number, velocityY: number, duration: number): void {
        this.setVelocity(velocityX, velocityY);
        // 在實際遊戲中，這裡會設置一個計時器來恢復正常速度
        setTimeout(() => {
            this.setVelocity(0, 0);
        }, duration);
    }
    
    setInvulnerable(invulnerable: boolean): void {
        this.isInvulnerable = invulnerable;
    }
    
    getHitRadius(): number {
        return Math.max(this.hitBox.width, this.hitBox.height) / 2;
    }
      // 動畫和視覺效果
    playAnimation(animationKey: string): void {
        // 在實際遊戲中，這裡會播放對應的動畫
        console.log(`怪物 ${this.name} 播放動畫: ${animationKey}`);
    }
    
    setAlpha(alpha: number): void {
        this._alpha = Math.max(0, Math.min(1, alpha));
        // 在實際實現中會設置精靈的透明度
    }
    
    setScale(scale: number): void {
        this._scale = Math.max(0.1, scale);
        // 在實際實現中會設置精靈的縮放
    }
    
    // 場景和遊戲對象
    getScene(): any {
        return this.scene;
    }
    
    setScene(scene: any): void {
        this.scene = scene;
    }
    
    getMonsterType(): string {
        return this.id;
    }
      // 目標檢測 - 使用圓形框檢測替代距離計算
    canSeePlayer(playerPosition: { x: number; y: number }): boolean {
        // 使用 Phaser 的圓形幾何檢測，比距離計算更高效
        const detectionCircle = new Phaser.Geom.Circle(this.x, this.y, this.detectionRange);
        const playerPoint = new Phaser.Geom.Point(playerPosition.x, playerPosition.y);
        
        return Phaser.Geom.Circle.Contains(detectionCircle, playerPoint.x, playerPoint.y);
    }
    
    // 臨時數據存儲
    setTempData(key: string, value: any): void {
        this.tempData.set(key, value);
    }
    
    getTempData(key: string): any {
        return this.tempData.get(key);
    }
    
    removeTempData(key: string): void {
        this.tempData.delete(key);
    }
    
    // ============= 遊戲邏輯方法 =============
    
    // 面向目標
    faceTarget(targetPosition: { x: number, y: number }): void {
        const dx = targetPosition.x - this.x;
        const dy = targetPosition.y - this.y;
        this.rotation = Math.atan2(dy, dx);
    }
    
    // 執行技能的方法 (由狀態機系統調用)
    performSkill(skillId: string, targetPosition: { x: number, y: number }): void {
        console.log(`怪物 ${this.name} 使用技能 ${skillId} 攻擊目標 (${targetPosition.x}, ${targetPosition.y})`);
        
        // 在這裡可以調用投射物管理器或效果系統來實際執行技能效果
    }    // 更新怪物狀態
    update(delta: number, playerPosition?: { x: number, y: number }): void {
        if (!this.isAlive || !this.isActive) return;

        // 使用較小的速度更新，讓移動更平滑
        // 使用時間增量 (delta) 來確保在不同幀率下移動速度一致
        const timeScale = Math.min(delta / (1000/60), 2.0); // 基於60fps的標準化時間縮放，限制最大值
        this.x += this.velocityX * timeScale;
        this.y += this.velocityY * timeScale;

        // 更新能量回復
        this.stats.regenerateEnergy(delta);
        
        if (!playerPosition) return;
        
        // 如果使用新的行為系統
        if (this.stateMachine) {
            this.stateMachine.update(delta, playerPosition);
        }
    }

    // 處理怪物死亡
    die(): void {
        this.isAlive = false;
        this.setCurrentState(MonsterStateType.DEAD);
        this.setVelocity(0, 0);
    }
    
    // 重置怪物狀態
    reset(): void {
        this.isAlive = true;
        this.isActive = false;
        this.isInvulnerable = false;
        this.stats.resetHP();
        this.stats.resetEnergy();
        this.setCurrentState(MonsterStateType.WANDERING);
        this.setVelocity(0, 0);
        this.tempData.clear();
        
        // 重置狀態機
        if (this.stateMachine) {
            this.stateMachine.setInitialState(MonsterStateType.WANDERING);
        }
    }

    // 激活怪物
    activate(): void {
        this.isActive = true;
    }

    // 停用怪物
    deactivate(): void {
        this.isActive = false;
    }

    // 計算與目標的距離
    private distanceToTarget(targetPosition: { x: number, y: number }): number {
        const dx = targetPosition.x - this.x;
        const dy = targetPosition.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // 取得怪物經驗值獎勵
    getExperienceYield(): number {
        return this.experienceYield;
    }

    // 取得怪物是否為固體
    isSolidObject(): boolean {
        return this.isSolid;
    }

    // 取得怪物精靈圖
    getSprite(): string | null {
        return this.sprite;
    }

    // 取得怪物碰撞箱
    getCollisionBox(): { width: number, height: number } {
        return this.collisionBox;
    }

    // 取得怪物受擊碰撞箱
    getHitBox(): { width: number, height: number } {
        return this.hitBox;
    }

    // 取得怪物圖示
    getIcon(): string {
        return this.icon;
    }

    // 取得怪物掉落物
    getDrops(): MonsterDrop[] {
        return [...this.drops];
    }

    // 取得怪物金幣掉落量
    getGoldDrop(): number {
        return this.goldDrop;
    }

    // 處理掉落物
    generateDrops(): { items: { itemId: string, quantity: number }[], gold: number } {
        const droppedItems: { itemId: string, quantity: number }[] = [];
        let goldAmount = 0;

        // 處理物品掉落
        for (const drop of this.drops) {
            const roll = Math.random();
            if (roll <= drop.chance) {
                droppedItems.push({
                    itemId: drop.itemId,
                    quantity: drop.quantity
                });
            }
        }

        // 處理金幣掉落 (加入一些隨機性)
        const goldVariance = 0.2; // 20% 波動
        const minGold = Math.floor(this.goldDrop * (1 - goldVariance));
        const maxGold = Math.ceil(this.goldDrop * (1 + goldVariance));
        goldAmount = Math.floor(Math.random() * (maxGold - minGold + 1)) + minGold;

        return {
            items: droppedItems,
            gold: goldAmount
        };
    }    // 獲取透明度
    getAlpha(): number {
        return this._alpha;
    }
    
    // 獲取縮放
    getScale(): number {
        return this._scale;
    }

    // 克隆此怪物實例
    clone(): Monster {
        const monsterData: MonsterData = {
            id: this.id,
            name: this.name,
            baseStats: {
                level: this.stats.getLevel(),
                hp: this.stats.getBaseHP(),
                energy: this.stats.getBaseEnergy(),
                physicalAttack: this.stats.getBasePhysicalAttack(),
                physicalDefense: this.stats.getBasePhysicalDefense(),
                magicAttack: this.stats.getBaseMagicAttack(),
                magicDefense: this.stats.getBaseMagicDefense(),
                accuracy: this.stats.getBaseAccuracy(),
                evasion: this.stats.getBaseEvasion(),
                physicalPenetration: this.stats.getBasePhysicalPenetration(),
                magicPenetration: this.stats.getBaseMagicPenetration(),
                absoluteDamageReduction: this.stats.getBaseAbsoluteDamageReduction(),
                magicDamageBonus: this.stats.getBaseMagicDamageBonus(),
                physicalDamageBonus: this.stats.getBasePhysicalDamageBonus(),
                defenseIgnore: this.stats.getBaseDefenseIgnore(),
                moveSpeed: this.stats.getBaseMoveSpeed(),
                critRate: this.stats.getBaseCritRate(),
                damageStability: this.stats.getBaseDamageStability(),
                vulnerability: this.stats.getBaseVulnerability(),
                resistance: this.stats.getBaseResistance(),
                energyRecovery: this.stats.getBaseEnergyRecovery()
            },
            category: this.category,
            behaviorId: this.behaviorId || undefined,
            experienceYield: this.experienceYield,
            isSolid: this.isSolid,
            sprite: this.sprite,
            collisionBox: { ...this.collisionBox },
            hitBox: { ...this.hitBox },
            icon: this.icon,
            drops: [...this.drops],
            goldDrop: this.goldDrop
        };
        
        return new Monster(monsterData);
    }
}
