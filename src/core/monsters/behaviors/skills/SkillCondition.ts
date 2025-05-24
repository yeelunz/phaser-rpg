import { MonsterStateType } from "../MonsterStateType";

// 技能使用條件的類型
export enum SkillConditionType {
    HP_THRESHOLD = 'hp_threshold',
    DISTANCE_TO_TARGET = 'distance_to_target',
    MONSTER_STATE_IS = 'monster_state_is',
    ENERGY_THRESHOLD = 'energy_threshold'
}

// 技能使用條件的結構
export interface SkillCondition {
    type: SkillConditionType;
    params: any; // 根據條件類型會有不同的參數結構
}

// HP 閾值條件的參數
export interface HpThresholdParams {
    threshold: number; // 0.0 到 1.0 之間的比例值
    operator: '<' | '>' | '<=' | '>=' | '=';
}

// 距離條件的參數
export interface DistanceConditionParams {
    distance: number; // 距離值
    operator: '<' | '>' | '<=' | '>=' | '=';
}

// 狀態條件的參數
export interface StateConditionParams {
    allowedStates: MonsterStateType[]; // 允許使用技能的狀態列表
}

// 能量閾值條件的參數
export interface EnergyThresholdParams {
    threshold: number; // 0.0 到 1.0 之間的比例值
    operator: '<' | '>' | '<=' | '>=' | '=';
}
