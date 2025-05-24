import { Scene } from 'phaser';
import { initializeBehaviors } from '../../core/monsters/behaviors/definitions';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  We loaded this image in our Boot Scene, so we can display it here
        this.add.image(512, 384, 'background');

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512-230, 384, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        //  Load the assets for the game
        this.load.setPath('assets');

        // 載入基本資源
        this.load.image('logo', 'logo.png');
        
        // 載入投射物相關資源
        this.createProjectileTextures();
        
        // **新增：創建地圖圖塊材質**
        this.createMapTileTextures();
        
        // 設置加載錯誤處理
        this.load.on('loaderror', (fileObj: Phaser.Loader.File) => {
            console.warn('加載錯誤: ', fileObj.key);
            
            // 對於紋理，創建臨時替代圖像
            if (fileObj.type === 'image') {
                this.createFallbackTexture(fileObj.key);
            }
        });
        
        // 載入玩家紋理
        // this.load.image('player', 'characters/player_base.png');
        // this.load.image('player_down', 'characters/player_down.png');
        // this.load.image('player_up', 'characters/player_up.png');
        // this.load.image('player_left', 'characters/player_left.png');
        // this.load.image('player_right', 'characters/player_right.png');
        
        // 建立透明紋理（用於碰撞箱等不可見元素）
        this.createTransparentTexture();

        // 載入地圖資源
        this.load.tilemapTiledJSON('town_square_map', 'data/maps/town_square.json');
        this.load.tilemapTiledJSON('sand_square_map', 'data/maps/sand_square.json');
        
        // 載入地圖圖塊集 (稍後需要根據實際地圖結構調整)
        this.load.image('terrain_tiles', 'tilemaps/terrain_tiles.png');
        
        // 載入物品數據
        this.load.json('consumable_data', 'data/items/consumable.json');
        this.load.json('equipment_data', 'data/items/equipment.json');
        this.load.json('material_data', 'data/items/material.json');
    }
    
    // **新增：創建地圖圖塊材質**
    private createMapTileTextures(): void {
        const tileSize = 32;

        // 創建地板圖塊 (綠色)
        const floorGraphics = this.add.graphics();
        floorGraphics.fillStyle(0x65a825); // 綠色草地
        floorGraphics.fillRect(0, 0, tileSize, tileSize);
        floorGraphics.lineStyle(1, 0x558022);
        floorGraphics.strokeRect(1, 1, tileSize - 2, tileSize - 2);
        floorGraphics.generateTexture('floor_tile', tileSize, tileSize);
        floorGraphics.destroy();

        // 創建牆壁圖塊 (灰色)
        const wallGraphics = this.add.graphics();
        wallGraphics.fillStyle(0x777777); // 灰色石牆
        wallGraphics.fillRect(0, 0, tileSize, tileSize);
        wallGraphics.lineStyle(1, 0x555555);
        wallGraphics.strokeRect(1, 1, tileSize - 2, tileSize - 2);
        // 添加一些紋理細節
        wallGraphics.lineStyle(1, 0x888888);
        wallGraphics.beginPath();
        wallGraphics.moveTo(0, 0);
        wallGraphics.lineTo(tileSize, tileSize);
        wallGraphics.moveTo(tileSize, 0);
        wallGraphics.lineTo(0, tileSize);
        wallGraphics.strokePath();
        wallGraphics.generateTexture('wall_tile', tileSize, tileSize);
        wallGraphics.destroy();

        console.log('[Preloader] 成功創建地圖圖塊材質');
    }
    
    // 創建臨時的替代紋理
    createFallbackTexture(key: string) {
        const colors: { [key: string]: number } = {
            'player': 0xFFFFFF,
            'player_down': 0x0000FF,
            'player_up': 0xFFFF00,
            'player_left': 0xFF0000,
            'player_right': 0x00FF00,
            'terrain_tiles': 0x888888,
            'floor_tile': 0x65a825,
            'wall_tile': 0x777777
        };
        
        // 創建一個臨時的圖形對象
        const graphics = this.add.graphics();
        graphics.fillStyle(colors[key] || 0xCCCCCC);
        
        if (key === 'terrain_tiles') {
            // 為地形圖塊創建一個簡單的網格紋理
            graphics.fillRect(0, 0, 128, 128);
            graphics.lineStyle(1, 0x000000);
            for (let i = 0; i < 128; i += 32) {
                graphics.moveTo(i, 0);
                graphics.lineTo(i, 128);
                graphics.moveTo(0, i);
                graphics.lineTo(128, i);
            }
            graphics.strokePath();
        } else if (key === 'floor_tile' || key === 'wall_tile') {
            // 為地圖圖塊創建簡單紋理
            graphics.fillRect(0, 0, 32, 32);
            graphics.lineStyle(1, 0x000000);
            graphics.strokeRect(0, 0, 32, 32);
        } else {
            // 為玩家創建一個簡單的方塊
            graphics.fillRect(0, 0, 32, 32);
            
            // 根據方向添加指示標記
            if (key === 'player_down') {
                graphics.fillStyle(0xFFFFFF);
                graphics.fillTriangle(16, 24, 8, 12, 24, 12);
            } else if (key === 'player_up') {
                graphics.fillStyle(0xFFFFFF);
                graphics.fillTriangle(16, 8, 8, 20, 24, 20);
            } else if (key === 'player_left') {
                graphics.fillStyle(0xFFFFFF);
                graphics.fillTriangle(8, 16, 24, 8, 24, 24);
            } else if (key === 'player_right') {
                graphics.fillStyle(0xFFFFFF);
                graphics.fillTriangle(24, 16, 8, 8, 8, 24);
            }
        }
        
        // 生成紋理並釋放圖形
        const size = (key === 'terrain_tiles') ? 128 : 32;
        graphics.generateTexture(key, size, size);
        graphics.destroy();
        
        console.log(`為 ${key} 創建了替代紋理`);
    }

    // 建立透明紋理
    createTransparentTexture() {
        // 創建一個1x1像素的透明紋理
        const graphics = this.add.graphics();
        graphics.fillStyle(0xFFFFFF, 0); // 白色但透明度為0
        graphics.fillRect(0, 0, 1, 1);
        graphics.generateTexture('transparent', 1, 1);
        graphics.destroy();
        
        console.log('創建了透明紋理 "transparent"');
    }

    // 創建投射物紋理
    private createProjectileTextures() {
        // 創建通用投射物佔位符
        const graphics = this.add.graphics();
        
        // 預設投射物 - 一個半透明的圓形
        graphics.clear();
        graphics.lineStyle(2, 0x00ffff);
        graphics.strokeCircle(16, 16, 16);
        graphics.generateTexture('projectile_placeholder', 32, 32);
        graphics.destroy();
        
        // 你可以在這裡添加更多特定類型的投射物紋理
    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        // 初始化怪物行為系統
        initializeBehaviors();

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('MainMenu');
    }
}