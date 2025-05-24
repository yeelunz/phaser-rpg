
/**
 * 怪物行為定義入口點
 * 
 * 導入此文件將自動註冊所有怪物行為定義
 * 只需要在這裡導入新的行為定義文件，就會自動註冊
 */

// 導入行為定義 - 這會觸發自動註冊
import './stone_guardian_behavior';
import './goblin_wanderer_behavior';

// 如果有新的怪物行為，只需要在這裡添加導入：
// import './new_monster_behavior';
// import './another_monster_behavior';

import { BehaviorLoader } from './BehaviorLoader';

// 初始化所有行為
export function initializeBehaviors(): void {
    // 初始化所有已註冊的行為配置
    BehaviorLoader.initializeBehaviors();
    
    console.log('所有行為定義已初始化');
}

// 導出行為加載器
export { BehaviorLoader };
