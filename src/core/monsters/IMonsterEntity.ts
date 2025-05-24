import { Stats } from '../stats';
import { MonsterCategory } from '../data/dataloader';
import { MonsterStateType } from './behaviors/MonsterStateType';

/**
 * 怪物實體接口
 * 定義所有怪物必須實現的方法和屬性
 */
export interface IMonsterEntity {
    // 基本屬性
    getId(): string;
    getInstanceId(): string;
    getName(): string;
    getCategory(): MonsterCategory;
    getStats(): Stats;
    
    // 位置和移動
    getPosition(): { x: number; y: number };
    setPosition(x: number, y: number): void;
    setVelocity(x: number, y: number): void;
    getSpeed(): number;
    getRotation(): number;
    setRotation(angle: number): void;
    
    // 狀態管理
    isAliveStatus(): boolean;
    getCurrentState(): MonsterStateType;
    setCurrentState(state: MonsterStateType): void;
    
    // 戰鬥相關
    takeDamage(damage: number, damageType: 'physical' | 'magic' | 'true', sourcePosition: { x: number; y: number }): void;
    applyKnockback(velocityX: number, velocityY: number, duration: number): void;
    setInvulnerable(invulnerable: boolean): void;
    getHitRadius?(): number;
    
    // 動畫和視覺效果
    playAnimation(animationKey: string): void;
    setAlpha(alpha: number): void;
    setScale(scale: number): void;
    
    // 場景和遊戲對象
    getScene(): any;
    getMonsterType(): string;
      // 目標檢測
    canSeePlayer(playerPosition: { x: number; y: number }): boolean;
    
    // 面向目標
    faceTarget(targetPosition: { x: number; y: number }): void;
    
    // 遊戲屬性獲取器
    x: number;
    y: number;
    
    // 臨時數據存儲（用於技能效果）
    setTempData(key: string, value: any): void;
    getTempData(key: string): any;
    removeTempData(key: string): void;
}