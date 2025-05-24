# 移動策略系統使用指南

本文檔介紹如何在怪物行為配置中使用移動策略系統，使怪物有不同的移動方式。

## 概述

移動策略系統使用策略模式將移動邏輯從怪物狀態類中解耦出來。這使得我們可以為怪物配置不同的移動行為，而不需要修改怪物狀態類的代碼。

## 可用的移動策略

目前系統支持以下幾種移動策略：

1. **靜止策略 (StationaryMovement)**：
   - 怪物保持靜止，可以選擇是否面向目標
   
2. **隨機遊蕩策略 (RandomWanderMovement)**：
   - 怪物在指定範圍內隨機移動
   - 支持閒置狀態，怪物會停下來休息
   
3. **路徑巡邏策略 (PathPatrolMovement)**：
   - 怪物沿著指定路徑點移動
   - 支持抵達路徑點後等待
   - 可以選擇循環或單次巡邏
   
4. **追擊目標策略 (ChaseTargetMovement)**：
   - 怪物直接向目標移動
   - 可配置追擊速度和放棄追擊距離
   
5. **保持距離策略 (MaintainDistanceMovement)**：
   - 怪物與目標保持一定距離
   - 可以選擇環繞目標移動或保持固定距離

## 使用方法

在怪物行為配置中，每個狀態都可以配置一個移動策略：

```typescript
{
    behaviorId: 'example_monster',
    detectionRange: 200,
    states: {
        [MonsterStateType.WANDERING]: {                // 在遊蕩狀態使用隨機移動
            movementStrategy: {
                type: 'randomWander',
                params: {
                    changeDirectionTime: 3000, // 3秒改變一次方向
                    speed: 0.5,               // 基本速度的0.5倍
                    maxDistance: 200,         // 最大遊蕩距離
                    idleChance: 0.3,          // 30%機率進入閒置狀態
                    idleTime: 2000            // 閒置2秒
                }
            }
        },
        [MonsterStateType.ALERT]: {
            // 在警戒狀態使用靜止，但會面向玩家
            movementStrategy: {
                type: 'stationary',
                params: {
                    faceTarget: true          // 面向目標
                }
            }
        },
        [MonsterStateType.CHASE]: {
            // 在追擊狀態使用追擊目標策略
            movementStrategy: {
                type: 'chaseTarget',
                params: {
                    speed: 100,               // 移動速度（百分比）
                    giveUpDistance: 300       // 放棄追擊距離
                }
            }
        }
    }
}
```

## 移動策略參數

### 靜止策略 (StationaryMovement)
```typescript
{
    type: 'stationary',
    params: {
        faceTarget: boolean // 是否面向目標
    }
}
```

### 隨機遊蕩策略 (RandomWanderMovement)
```typescript
{
    type: 'randomWander',
    params: {
        changeDirectionTime: number, // 改變方向的時間間隔（毫秒）
        speed: number,              // 移動速度倍率（例如0.5為基本速度的一半）
        maxDistance: number,        // 最大遊蕩距離（像素）
        idleChance: number,         // 進入閒置狀態的機率（0-1）
        idleTime: number            // 閒置時間（毫秒）
    }
}
```

### 路徑巡邏策略 (PathPatrolMovement)
```typescript
{
    type: 'pathPatrol',
    params: {
        patrolPoints?: { x: number, y: number }[], // 巡邏路徑點
        waitTime: number,              // 到達路徑點後等待時間（毫秒）
        loop: boolean,                 // 是否循環巡邏
        speed: number,                 // 移動速度倍率（例如0.8為基本速度的0.8倍）
        createDynamicPath?: boolean,   // 是否動態創建路徑
        updatePathInterval?: number    // 動態路徑更新間隔（毫秒）
    }
}
```

### 追擊目標策略 (ChaseTargetMovement)
```typescript
{
    type: 'chaseTarget',
    params: {
        speed: number,            // 移動速度倍率（例如1.0為基本速度，1.2為基本速度的1.2倍）
        giveUpDistance: number,   // 放棄追擊距離（像素）
        stoppingDistance?: number // 停止靠近的距離（像素）
    }
}
```

### 保持距離策略 (MaintainDistanceMovement)
```typescript
{
    type: 'maintainDistance',
    params: {
        preferredDistance: number, // 理想距離（像素）
        tolerance: number,        // 容差範圍（像素）
        circleTarget: boolean,    // 是否環繞目標移動
        speed: number             // 移動速度倍率（例如0.9為基本速度的0.9倍）
    }
}
```

## 測試行為

系統提供了一些測試行為配置，可以用來測試不同的移動策略：

1. `movement_strategy_test` - 測試基本移動策略
2. `spider_movement_test` - 模擬蜘蛛的移動行為（保持距離並環繞玩家）

## 注意事項

1. 如果不指定移動策略，系統會使用默認策略（根據狀態類型）
2. 怪物實際移動速度 = 怪物基礎速度 * 移動策略速度百分比
3. 移動策略會在狀態的 `update` 方法中自動調用
