
// 地圖和地圖對象的介面定義
export interface MapObject {
    id: string;      // 該地圖中該物件唯一的識別碼
    type: string;    // 物件類型，如 decoration 等
    graph: string;   // 告訴renderer它在地圖中會被渲染成什麼樣子
    solid: boolean;  // 用來決定這個物件是否會被碰撞
    x: number;       // 物件的中心x座標
    y: number;       // 物件的中心y座標
    width: number;   // 用來決定碰撞箱的寬度大小
    height: number;  // 用來決定碰撞箱的長度大小
    properties?: { [key: string]: any }; // 用於存儲額外的屬性
}

// 直接 export interface GameMap，讓其他檔案可以正確 import
export interface GameMap {
    id: string;
    name: string;
    width: number;
    height: number;
    tileSize: number;
    backgroundColor: string;
    grid: {
        visible: boolean;
        type: string;     // 格子類型（如 'grass', 'stone' 等）。舊版本內容的直接著色已經被廢棄，禁止使用
    };
    objects: MapObject[];
}

// 地圖管理器類
export class MapManager {
    private maps: Map<string, GameMap> = new Map();
    private currentMapId: string | null = 'town_square';
    
    // 加載地圖
    async loadMap(mapId: string): Promise<GameMap> {
        try {
            // 檢查地圖是否已經載入
            if (this.maps.has(mapId)) {
                const map = this.maps.get(mapId)!;
                this.currentMapId = mapId;
                return map;
            }
            
            // 從外部文件加載地圖
            const response = await fetch(`/assets/data/maps/${mapId}.json`);
            if (!response.ok) {
                throw new Error(`無法載入地圖：${mapId}`);
            }
            
            const mapData: GameMap = await response.json();
            this.maps.set(mapId, mapData);
            this.currentMapId = mapId;
            return mapData;
        } catch (error) {
            console.error(`載入地圖發生錯誤：${error}`);
            throw error;
        }
    }
    
    // 獲取當前地圖
    getCurrentMap(): GameMap | null {
        if (!this.currentMapId) return null;
        return this.maps.get(this.currentMapId) || null;
    }
    
    // 獲取地圖對象
    getMapObject(objectId: string): MapObject | null {
        const currentMap = this.getCurrentMap();
        if (!currentMap) return null;
        
        return currentMap.objects.find(obj => obj.id === objectId) || null;
    }
    
    // 查找玩家重生點
    getSpawnPoint(spawnId?: string): { x: number, y: number } | null {
        const currentMap = this.getCurrentMap();
        if (!currentMap) return null;
          // 如果指定了重生點ID
        if (spawnId) {
            const spawnPoint = currentMap.objects.find(
                obj => obj.type === 'spawn_point' && obj.id === spawnId
            );
            
            if (spawnPoint) {
                return { x: spawnPoint.x, y: spawnPoint.y };
            }
        }
        
        // 否則找預設重生點
        const defaultSpawn = currentMap.objects.find(
            obj => obj.type === 'spawn_point' && obj.id === 'player_spawn'
        );
        
        if (defaultSpawn) {
            return { x: defaultSpawn.x, y: defaultSpawn.y };
        }
        
        // 如果都找不到，就使用地圖中心
        return { 
            x: currentMap.width / 2, 
            y: currentMap.height / 2 
        };
    }
      // 檢查碰撞
    checkCollision(x: number, y: number, width: number, height: number): boolean {
        const currentMap = this.getCurrentMap();
        if (!currentMap) return false;
        
        // 檢查是否超出地圖邊界
        if (
            x < 0 ||
            y < 0 ||
            x + width > currentMap.width ||
            y + height > currentMap.height
        ) {
            return true; // 超出邊界視為碰撞
        }
          // 檢查是否與任何實體碰撞
        return currentMap.objects.some(obj => {
            // 如果物件不是實體或沒有設置尺寸，則忽略
            if (!obj.solid) return false;
            
            // 簡單的矩形碰撞檢測
            return (
                x < obj.x + obj.width / 2 &&
                x + width > obj.x - obj.width / 2 &&
                y < obj.y + obj.height / 2 &&
                y + height > obj.y - obj.height / 2
            );
        });
    }
    
    
}
