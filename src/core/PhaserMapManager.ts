import { MapManager, GameMap, MapObject } from './mapManager';

export class PhaserMapManager extends MapManager {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        super();
        this.scene = scene;
    }    /**
     * 從 Phaser 快取中載入地圖
     * @param mapId 地圖ID
     */
    async loadMapFromCache(mapId: string): Promise<GameMap> {
        try {
            // 檢查地圖是否已經載入到我們的緩存中
            if (this.maps.has(mapId)) {
                this.currentMapId = mapId;
                return this.maps.get(mapId)!;
            }

            // 從 Phaser 快取中獲取數據
            let mapData = this.scene.cache.json.get(`${mapId}_map`);
            
            // 如果找不到地圖數據，創建一個默認的
            if (!mapData) {
                console.warn(`找不到地圖數據: ${mapId}，創建默認地圖`);
                mapData = this.createDefaultMapData(mapId);
            }

            // 將 Phaser tilemap 數據轉換為我們的 GameMap 格式
            const gameMap: GameMap = this.convertTiledMapToGameMap(mapData, mapId);
            
            // 保存到我們的緩存中
            this.maps.set(mapId, gameMap);
            this.currentMapId = mapId;
            
            return gameMap;
        } catch (error) {
            console.error(`載入地圖發生錯誤：${error}`);
            
            // 創建一個備用地圖
            const defaultMap = this.createDefaultGameMap(mapId);
            this.maps.set(mapId, defaultMap);
            this.currentMapId = mapId;
            
            return defaultMap;
        }
    }
    
    /**
     * 創建默認的地圖數據
     */
    private createDefaultMapData(mapId: string): any {
        return {
            width: 30,
            height: 30,
            tilewidth: 32,
            tileheight: 32,
            layers: [
                {
                    name: "Ground",
                    type: "tilelayer",
                    width: 30,
                    height: 30,
                    data: Array(30 * 30).fill(1)
                },
                {
                    name: "Obstacles",
                    type: "tilelayer",
                    width: 30,
                    height: 30,
                    data: Array(30 * 30).fill(0)
                },
                {
                    name: "Objects",
                    type: "objectgroup",
                    objects: [
                        {
                            id: 1,
                            name: "player_spawn",
                            type: "spawn_point",
                            x: 480,
                            y: 480,
                            width: 32,
                            height: 32
                        }
                    ]
                }
            ],
            tilesets: [
                {
                    name: "terrain",
                    firstgid: 1
                }
            ]
        };
    }
    
    /**
     * 創建一個默認的 GameMap
     */
    private createDefaultGameMap(mapId: string): GameMap {
        return {
            id: mapId,
            name: `${mapId} (默認地圖)`,
            width: 960,  // 30 * 32
            height: 960, // 30 * 32
            tileSize: 32,
            backgroundColor: "#333333",
            grid: {
                visible: true,
                type: "default"
            },
            objects: [
                {
                    id: "player_spawn",
                    type: "spawn_point",
                    graph: "spawn",
                    solid: false,
                    x: 480,
                    y: 480,
                    width: 32,
                    height: 32
                }
            ]
        };
    }

    /**
     * 將 Tiled 地圖數據轉換為我們的 GameMap 格式
     */
    private convertTiledMapToGameMap(tiledData: any, mapId: string): GameMap {
        // 創建基本地圖數據
        const gameMap: GameMap = {
            id: mapId,
            name: tiledData.name || mapId,
            width: tiledData.width * tiledData.tilewidth,
            height: tiledData.height * tiledData.tileheight,
            tileSize: tiledData.tilewidth,
            backgroundColor: tiledData.backgroundcolor || "#000000",
            grid: {
                visible: true,
                type: "default"
            },
            objects: []
        };

        // 處理 Tiled 的物件層
        for (const layer of tiledData.layers || []) {
            if (layer.type === 'objectgroup') {
                for (const obj of layer.objects || []) {
                    // 將 Tiled 物件轉換為我們的 MapObject 格式
                    const mapObject: MapObject = {
                        id: obj.id.toString(),
                        type: obj.type || 'decoration',
                        graph: obj.name || 'default',
                        solid: obj.properties?.solid === true,
                        x: obj.x + (obj.width ? obj.width / 2 : 0),
                        y: obj.y + (obj.height ? obj.height / 2 : 0),
                        width: obj.width || 0,
                        height: obj.height || 0,
                        properties: obj.properties || {}
                    };

                    // 處理特殊物件類型
                    if (obj.type === 'teleporter') {
                        mapObject.properties = {
                            ...mapObject.properties,
                            targetMap: obj.properties?.targetMap || '',
                            targetX: obj.properties?.targetX || 0,
                            targetY: obj.properties?.targetY || 0,
                            spawnId: obj.properties?.spawnId || ''
                        };
                    }

                    gameMap.objects.push(mapObject);
                }
            }
        }

        return gameMap;
    }

    /**
     * 在 Phaser 場景中創建傳送門觸發區域
     */
    createTeleporterTriggers(teleporterGroup: Phaser.Physics.Arcade.Group): void {
        const currentMap = this.getCurrentMap();
        if (!currentMap) return;

        // 尋找所有傳送門物件
        const teleporters = currentMap.objects.filter(obj => obj.type === 'teleporter');

        // 為每個傳送門創建一個觸發區域
        teleporters.forEach(teleporter => {
            const trigger = this.scene.physics.add.sprite(
                teleporter.x,
                teleporter.y,
                'teleporter_trigger' // 一個透明的圖像，或是一個有視覺提示的圖像
            );
            
            // 設置觸發區域的大小
            trigger.setDisplaySize(teleporter.width || 32, teleporter.height || 32);
            
            // 將傳送門數據存儲到精靈中
            trigger.setData('teleporter', teleporter);
            trigger.setData('targetMap', teleporter.properties?.targetMap);
            trigger.setData('targetX', teleporter.properties?.targetX);
            trigger.setData('targetY', teleporter.properties?.targetY);
            trigger.setData('spawnId', teleporter.properties?.spawnId);
            
            // 將觸發區域添加到傳送門組
            teleporterGroup.add(trigger);
        });
    }
}
