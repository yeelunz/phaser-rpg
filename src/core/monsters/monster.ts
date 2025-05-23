// 怪物類別 - 遊戲中的怪物實體
import { Stats } from '../stats';
import { type MonsterData, type MonsterDrop, MonsterCategory, MovementPattern, AttackPattern } from '../data/dataloader';

export class Monster {
    private id: string;  // 怪物類型 ID
    private instanceId: string; // 怪物實例唯一 ID
    private name: string;
    private stats: Stats;
    private category: MonsterCategory;
    private movementPattern: MovementPattern | null;
    private attackPattern: AttackPattern | null;
    private complexBehaviorId: string | null;
    private experienceYield: number;
    private isSolid: boolean;
    private sprite: string | null;
    private collisionBox: { width: number, height: number };
    private hitBox: { width: number, height: number };
    private icon: string;
    private drops: MonsterDrop[];
    private goldDrop: number;
    
    // 額外遊戲相關屬性
    private isActive: boolean = false;
    private isAlive: boolean = true;
    private x: number = 0;
    private y: number = 0;
    private direction: number = 0; // 朝向 (角度)
    private speed: number = 0;
    private currentState: MonsterState = MonsterState.IDLE;
    private target: any = null; // 目標對象 (通常是玩家)
    private detectionRange: number = 200; // 偵測範圍

    constructor(data: MonsterData) {
        this.id = data.id;  // 保存怪物類型ID
        this.instanceId = data.id + '_' + Date.now() + '_' + Math.floor(Math.random() * 10000); // 生成唯一實例ID
        this.name = data.name;
        this.category = data.category;
        this.movementPattern = data.movementPattern;
        this.attackPattern = data.attackPattern;
        this.complexBehaviorId = data.complexBehaviorId;
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
    }    // 初始化怪物能力值
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
        
        // 根據怪物數據初始化偵測範圍
        this.detectionRange = baseStats.moveSpeed * 2; // 根據移動速度調整偵測範圍
        
        // 怪物一開始設定為滿血滿能量
        this.stats.resetHP();
        this.stats.resetEnergy();
    }    // 取得怪物ID (返回原始的怪物類型ID，保持與舊程式碼的兼容性)
    getId(): string {
        return this.id;
    }
    
    // 取得怪物的唯一實例ID
    getInstanceId(): string {
        return this.instanceId;
    }

    // 取得怪物名稱
    getName(): string {
        return this.name;
    }

    // 獲取怪物的類型 ID (怪物種類)
    public getId(): string {
        return this.id;
    }
    
    // 獲取怪物的實例 ID (唯一識別碼)
    public getInstanceId(): string {
        return this.instanceId;
    }
    
    // 根據怪物名稱獲取一個識別碼 (用於調試)
    public getName(): string {
        return this.name;
    }

    // 取得怪物類別
    getCategory(): MonsterCategory {
        return this.category;
    }

    // 取得怪物能力值
    getStats(): Stats {
        return this.stats;
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
    }

    // 取得怪物位置
    getPosition(): { x: number, y: number } {
        return { x: this.x, y: this.y };
    }

    // 設定怪物位置
    setPosition(x: number, y: number): void {
        this.x = x;
        this.y = y;
    }

    // 取得怪物是否存活
    isAliveStatus(): boolean {
        return this.isAlive;
    }

    // 更新怪物狀態
    update(delta: number, playerPosition?: { x: number, y: number }): void {
        if (!this.isAlive || !this.isActive) return;

        // 根據移動模式更新怪物行為
        if (playerPosition) {
            this.updateBehavior(delta, playerPosition);
        }

        // 更新能量回復
        this.stats.regenerateEnergy(delta);
    }

    // 處理怪物受傷
    takeDamage(damage: number): boolean {
        if (!this.isAlive) return false;

        // 應用傷害到怪物
        this.stats.takeDamage(damage);

        // 檢查怪物是否死亡
        if (this.stats.getCurrentHP() <= 0) {
            this.die();
            return true;
        }

        return false;
    }

    // 處理怪物死亡
    die(): void {
        this.isAlive = false;
        this.currentState = MonsterState.DEAD;
    }
    
    // 重置怪物狀態
    reset(): void {
        this.isAlive = true;
        this.isActive = false;
        this.stats.resetHP();
        this.stats.resetEnergy();
        this.currentState = MonsterState.IDLE;
        this.target = null;
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

    // 更新怪物行為    
     private updateBehavior(delta: number, playerPosition: { x: number, y: number }): void {
        const distance = this.distanceToTarget(playerPosition);
        
        // 如果存在複雜行為ID，則使用自定義行為處理器
        if (this.complexBehaviorId) {
            this.handleComplexBehavior(delta, playerPosition, distance);
            return;
        }

        // 基於移動模式處理行為
        switch(this.movementPattern) {
            case MovementPattern.STATIONARY:
                this.handleStationaryBehavior(delta, playerPosition, distance);
                break;
            case MovementPattern.PATROL:
                this.handlePatrolBehavior(delta, playerPosition, distance);
                break;
            case MovementPattern.PATROL_AND_CHASE:
                this.handlePatrolAndChaseBehavior(delta, playerPosition, distance);
                break;
            case MovementPattern.AGGRESSIVE_CHASE:
                this.handleAggressiveChaseBehavior(delta, playerPosition, distance);
                break;
            case MovementPattern.RANDOM:
                this.handleRandomBehavior(delta, playerPosition, distance);
                break;
            default:
                // 默認行為
                this.handleStationaryBehavior(delta, playerPosition, distance);
        }

        // 處理攻擊行為
        this.handleAttackBehavior(delta, playerPosition, distance);
    }
    private handleStationaryBehavior(_delta: number, playerPosition: { x: number, y: number }, distance: number): void {
        // 靜止不動，但可以轉向面對玩家
        if (distance < this.detectionRange) {
            this.faceTarget(playerPosition);
        }
    }

    // 巡邏行為處理
    private handlePatrolBehavior(_delta: number, _playerPosition: { x: number, y: number }, _distance: number): void {
        // 簡單巡邏行為實現 (實際遊戲中可能需要路徑點等)
        // 當前僅為占位實現
    }

    // 巡邏並追擊行為處理
    private handlePatrolAndChaseBehavior(delta: number, playerPosition: { x: number, y: number }, distance: number): void {
        if (distance < this.detectionRange) {
            this.chaseTarget(delta, playerPosition);
        } else {
            this.handlePatrolBehavior(delta, playerPosition, distance);
        }
    }

    // 主動追擊行為處理
    private handleAggressiveChaseBehavior(delta: number, playerPosition: { x: number, y: number }, distance: number): void {
        // 主動追擊玩家，Detection Range 更大
        const aggressiveRange = this.detectionRange * 1.5;
        if (distance < aggressiveRange) {
            this.chaseTarget(delta, playerPosition);
        }
    }

    // 隨機行為處理
    private handleRandomBehavior(_delta: number, _playerPosition: { x: number, y: number }, _distance: number): void {
        // 隨機移動實現
        // 當前僅為占位實現
    }

    // 複雜行為處理
    private handleComplexBehavior(_delta: number, _playerPosition: { x: number, y: number }, _distance: number): void {
        // 此處將處理特殊行為，通常在遊戲邏輯中根據 complexBehaviorId 單獨實現
        console.log(`怪物 ${this.name} 使用複雜行為 ${this.complexBehaviorId}`);
    }    // 攻擊行為處理
    private handleAttackBehavior(_delta: number, playerPosition: { x: number, y: number }, distance: number): void {
        if (!this.attackPattern) return;

        // 定義每種攻擊模式的攻擊範圍
        const attackRanges: Record<AttackPattern, number> = {
            [AttackPattern.MELEE]: 50,
            [AttackPattern.RANGED]: 300,
            [AttackPattern.AREA_OF_EFFECT]: 150,
            [AttackPattern.CHARGE]: 200,
            [AttackPattern.SUMMON]: 400
        };

        const attackRange = attackRanges[this.attackPattern] || 50;

        // 如果玩家在攻擊範圍內，進行攻擊
        if (distance <= attackRange) {
            this.performAttack(playerPosition);
        }
    }

    // 執行攻擊
    private performAttack(targetPosition: { x: number, y: number }): void {
        if (!this.attackPattern) return;

        // 面向目標
        this.faceTarget(targetPosition);

        // 根據攻擊模式執行不同攻擊
        switch(this.attackPattern) {
            case AttackPattern.MELEE:
                this.performMeleeAttack();
                break;
            case AttackPattern.RANGED:
                this.performRangedAttack(targetPosition);
                break;
            case AttackPattern.AREA_OF_EFFECT:
                this.performAreaAttack();
                break;
            case AttackPattern.CHARGE:
                this.performChargeAttack(targetPosition);
                break;
            case AttackPattern.SUMMON:
                this.performSummonAttack();
                break;
        }
    }

    // 追擊目標
    private chaseTarget(delta: number, targetPosition: { x: number, y: number }): void {
        // 面向目標
        this.faceTarget(targetPosition);

        // 計算移動方向
        const dx = targetPosition.x - this.x;
        const dy = targetPosition.y - this.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length > 0) {
            const normalizedDx = dx / length;
            const normalizedDy = dy / length;
            
            // 使用怪物的移動速度
            const moveSpeed = this.stats.getMoveSpeed() / 100; // 移動速度是百分比
            const speedFactor = delta * moveSpeed;
            
            // 更新位置
            this.x += normalizedDx * speedFactor;
            this.y += normalizedDy * speedFactor;
        }
    }

    // 面向目標
    private faceTarget(targetPosition: { x: number, y: number }): void {
        const dx = targetPosition.x - this.x;
        const dy = targetPosition.y - this.y;
        this.direction = Math.atan2(dy, dx) * (180 / Math.PI);
    }    // 近戰攻擊
    private performMeleeAttack(): void {
        this.currentState = MonsterState.ATTACKING;
        // 近戰攻擊邏輯，實際遊戲中會創建碰撞體等
    }

    // 遠程攻擊
    private performRangedAttack(targetPosition: { x: number, y: number }): void {
        this.currentState = MonsterState.ATTACKING;
        // 遠程攻擊邏輯，實際遊戲中會創建投射物等
        console.log(`怪物 ${this.name} 向 (${targetPosition.x}, ${targetPosition.y}) 方向發射遠程攻擊`);
    }

    // 範圍攻擊
    private performAreaAttack(): void {
        this.currentState = MonsterState.ATTACKING;
        // 範圍攻擊邏輯，實際遊戲中會創建AOE攻擊區域等
    }

    // 衝鋒攻擊
    private performChargeAttack(targetPosition: { x: number, y: number }): void {
        this.currentState = MonsterState.CHARGING;
        // 衝鋒攻擊邏輯，實際遊戲中會讓怪物快速移動到目標位置
        console.log(`怪物 ${this.name} 向 (${targetPosition.x}, ${targetPosition.y}) 方向衝鋒`);
    }

    // 召喚攻擊
    private performSummonAttack(): void {
        this.currentState = MonsterState.SUMMONING;
        // 召喚攻擊邏輯，實際遊戲中會生成小怪等
    }

    // 克隆此怪物實例
    clone(): Monster {
        // 使用現有的數據創建一個新的怪物
        // 注意：克隆時會自動生成新的 instanceId
        const monsterData: MonsterData = {
            id: this.id, // 使用原始怪物的類型ID
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
            movementPattern: this.movementPattern,
            attackPattern: this.attackPattern,
            complexBehaviorId: this.complexBehaviorId,
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

// 怪物狀態枚舉
export enum MonsterState {
    IDLE = 'idle',
    PATROL = 'patrol',
    CHASE = 'chase',
    ATTACKING = 'attacking',
    CHARGING = 'charging',
    SUMMONING = 'summoning',
    HURT = 'hurt',
    DEAD = 'dead'
}
