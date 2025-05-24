import { IMonsterEntity } from "../../IMonsterEntity";
import { MonsterSkill } from "./MonsterSkill";

// 技能池管理類別
export class SkillPool {
    private skills: MonsterSkill[] = [];
    private activationInterval: number; // 技能池啟用間隔 (毫秒)
    private currentIntervalTime: number = 0;

    constructor(activationInterval: number) {
        this.activationInterval = activationInterval;
    }

    // 添加技能到池中
    addSkill(skill: MonsterSkill): void {
        this.skills.push(skill);
    }

    // 移除技能
    removeSkill(skill: MonsterSkill): void {
        const index = this.skills.indexOf(skill);
        if (index > -1) {
            this.skills.splice(index, 1);
        }
    }

    // 清空技能池
    clearSkills(): void {
        this.skills = [];
    }

    // 更新技能池
    update(monster: IMonsterEntity, delta: number, target?: { x: number; y: number }): void {
        // 更新所有技能的冷卻
        this.skills.forEach(skill => skill.updateCooldown(delta));

        // 檢查是否正在施法，如果是則不嘗試使用新技能
        if (this.isAnyCasting()) {
            return;
        }

        // 累加間隔時間
        this.currentIntervalTime += delta;

        // 如果達到啟用間隔，嘗試使用技能
        if (this.currentIntervalTime >= this.activationInterval) {
            this.currentIntervalTime = 0;
            this.tryUseSkill(monster, target);
        }
    }

    // 檢查是否有技能正在施法
    private isAnyCasting(): boolean {
        return this.skills.some(skill => skill.isCasting);
    }

    // 嘗試使用技能
    private async tryUseSkill(monster: IMonsterEntity, target?: { x: number; y: number }): Promise<void> {
        // 篩選可用的技能
        const availableSkills = this.skills.filter(skill => skill.canUse(monster, target));
        
        if (availableSkills.length === 0) {
            return; // 沒有可用技能
        }

        // 根據權重選擇技能
        const selectedSkill = this.selectSkillByWeight(availableSkills);
        
        if (selectedSkill) {
            try {
                // 執行技能
                await selectedSkill.execute(monster, target);
                
                // 啟動冷卻
                selectedSkill.startCooldown();
                
                // 如果技能是可鏈接的，重置間隔時間以允許立即再次嘗試
                if (selectedSkill.chainable) {
                    this.currentIntervalTime = this.activationInterval; // 這樣下次 update 就會立即再次嘗試
                }
            } catch (error) {
                console.error(`執行怪物技能 ${selectedSkill.name} 時發生錯誤:`, error);
            }
        }
    }

    // 根據權重選擇技能
    private selectSkillByWeight(skills: MonsterSkill[]): MonsterSkill | null {
        if (skills.length === 0) return null;
        
        // 計算總權重
        const totalWeight = skills.reduce((sum, skill) => sum + skill.weight, 0);
        
        if (totalWeight <= 0) {
            // 如果總權重為0，隨機選擇一個
            return skills[Math.floor(Math.random() * skills.length)];
        }

        // 隨機值在 0 到 totalWeight 之間
        let randomValue = Math.random() * totalWeight;
        
        // 遍歷技能，找到對應的技能
        for (const skill of skills) {
            randomValue -= skill.weight;
            if (randomValue <= 0) {
                return skill;
            }
        }

        // 理論上不應該到達這裡，但以防萬一返回最後一個技能
        return skills[skills.length - 1];
    }

    // 重置間隔時間 (例如狀態切換時)
    resetInterval(): void {
        this.currentIntervalTime = 0;
    }

    // 獲取技能池中的技能數量
    getSkillCount(): number {
        return this.skills.length;
    }

    // 獲取所有技能 (用於調試或顯示)
    getSkills(): readonly MonsterSkill[] {
        return [...this.skills];
    }
}
