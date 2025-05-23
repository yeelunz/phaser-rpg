// 地圖物件繪製工具
import type { GameMap } from '../core/mapManager';

// 預定義的網格樣式
const gridStyles: { [key: string]: (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void } = {
    grass: (ctx, x, y, size) => {
        // 基本草地底色
        ctx.fillStyle = '#8BBA9C';
        ctx.fillRect(x, y, size, size);
        
        // 隨機添加一些草的細節
        if (Math.random() > 0.7) {
            ctx.fillStyle = '#7BAB8D';
            const grassX = x + Math.random() * size * 0.8;
            const grassY = y + Math.random() * size * 0.8;
            const grassSize = size * 0.2;
            ctx.fillRect(grassX, grassY, grassSize, grassSize);
        }
    },
    stone: (ctx, x, y, size) => {
        // 石頭地面底色
        ctx.fillStyle = '#AAAAAA';
        ctx.fillRect(x, y, size, size);
        
        // 添加一些石頭紋理
        if (Math.random() > 0.6) {
            ctx.fillStyle = '#999999';
            const stoneX = x + Math.random() * size * 0.7;
            const stoneY = y + Math.random() * size * 0.7;
            const stoneSize = size * 0.3;
            ctx.beginPath();
            ctx.arc(stoneX, stoneY, stoneSize, 0, Math.PI * 2);
            ctx.fill();
        }
    },
    sand: (ctx, x, y, size) => {
        // 沙地底色
        ctx.fillStyle = '#E0C088';
        ctx.fillRect(x, y, size, size);
        
        // 沙地紋理
        if (Math.random() > 0.6) {
            ctx.fillStyle = '#D4B678';
            const dotX = x + Math.random() * size;
            const dotY = y + Math.random() * size;
            const dotSize = size * 0.1;
            ctx.beginPath();
            ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    // 可以添加更多地形類型
};

// 預定義的圖形和顏色映射表
const graphStyles: { [key: string]: { color: string, render: (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => void } } = {
    tree: {
        color: '#2E5245',
        render: (ctx, x, y, width, height) => {
            // 樹幹
            ctx.fillStyle = '#5E3023';
            ctx.fillRect(x - width / 6, y, width / 3, height / 2);
            
            // 樹冠
            ctx.fillStyle = '#2E5245';
            ctx.beginPath();
            ctx.arc(x, y - height / 4, width / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    },    bush: {
        color: '#3C694E',
        render: (ctx, x, y, width, height) => {
            ctx.fillStyle = '#3C694E';
            ctx.beginPath();
            ctx.ellipse(x, y, width / 2, height / 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    },    teleporter: {
        color: '#6A5ACD',
        render: (ctx, x, y, width, height) => {
            const size = Math.max(width, height) / 2; // 使用寬度和高度的最大值作為半徑
            
            // 繪製傳送門底部
            ctx.fillStyle = '#6A5ACD'; // 紫藍色
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
            
            // 繪製傳送門內部
            ctx.fillStyle = '#9370DB'; // 中等紫色
            ctx.beginPath();
            ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
            ctx.fill();
            
            // 添加閃爍效果
            const glowSize = (Math.sin(Date.now() * 0.005) + 1) * 5 + 5;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(x, y, size * 0.5 + glowSize, 0, Math.PI * 2);
            ctx.fill();
        }
    },
    // 這裡可以添加更多不同的圖形樣式
};

export function drawGrid(ctx: CanvasRenderingContext2D, map: GameMap, cameraX: number, cameraY: number): void {
    if (!map.grid.visible) return;
    
    const tileSize = map.tileSize;
    
    // 計算可見範圍
    const startX = Math.floor(cameraX / tileSize) * tileSize;
    const startY = Math.floor(cameraY / tileSize) * tileSize;
    const endX = Math.ceil((cameraX + ctx.canvas.width) / tileSize) * tileSize;
    const endY = Math.ceil((cameraY + ctx.canvas.height) / tileSize) * tileSize;
    
    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    
    // 選擇網格樣式
    const gridType = map.grid.type || 'grass';
    const gridStyle = gridStyles[gridType] || ((ctx, x, y, size) => {
        ctx.fillRect(x, y, size, size);
    });
    
    // 繪製可見網格
    for (let x = startX; x < endX; x += tileSize) {
        for (let y = startY; y < endY; y += tileSize) {
            gridStyle(ctx, x, y, tileSize);
        }
    }
    
    // 網格線（選配）
    if (tileSize > 20) {  // 只在網格夠大時繪製網格線
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        
        for (let x = startX; x < endX; x += tileSize) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }
        
        for (let y = startY; y < endY; y += tileSize) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
    }
    
    ctx.restore();
}

export function drawMapObjects(ctx: CanvasRenderingContext2D, map: GameMap, cameraX: number, cameraY: number): void {
    ctx.save();
    ctx.translate(-cameraX, -cameraY);

    // 繪製地圖中的所有物件
    for (const obj of map.objects) {
        // 跳過沒有圖形的物件或空間點
        if (obj.type === 'spawn_point') {
            continue;
        }

        const style = graphStyles[obj.graph] || {
            color: '#888',
            render: (ctx, x, y, width, height) => {
                ctx.fillStyle = '#888';
                ctx.fillRect(x - width / 2, y - height / 2, width, height);
            }
        };

        // 繪製物件
        style.render(
            ctx,
            obj.x,
            obj.y,
            obj.width,
            obj.height
        );
    }

    ctx.restore();
}
