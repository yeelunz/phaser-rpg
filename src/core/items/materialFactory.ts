// 材料工廠 - 負責創建材料物品實例
import { Material } from './material';
import { type MaterialData, dataLoader } from '../data/dataloader';

// 材料工廠類別 - 單例模式
export class MaterialFactory {
    private static instance: MaterialFactory;

    private constructor() {
        // 確保數據加載器已經初始化
        dataLoader.loadAllData().catch(error => {
            console.error("初始化材料工廠時無法加載數據:", error);
        });
    }

    // 獲取單例實例
    public static getInstance(): MaterialFactory {
        if (!MaterialFactory.instance) {
            MaterialFactory.instance = new MaterialFactory();
        }
        return MaterialFactory.instance;
    }

    // 根據材料ID創建材料實例
    public createMaterialById(id: string, quantity: number = 1): Material | null {
        const materialData = dataLoader.getMaterialDataById(id);
        if (!materialData) {
            console.error(`找不到ID為 ${id} 的材料數據`);
            return null;
        }

        const material = this.createMaterial(materialData);
        if (material) {
            material.quantity = quantity;
        }
        return material;
    }

    // 根據材料數據創建材料實例
    public createMaterial(data: MaterialData): Material {
        return new Material(data);
    }

    // 批量創建材料
    public createMaterials(materials: { id: string, quantity: number }[]): Material[] {
        const result: Material[] = [];
        
        for (const materialInfo of materials) {
            const material = this.createMaterialById(materialInfo.id, materialInfo.quantity);
            if (material) {
                result.push(material);
            }
        }
        
        return result;
    }

    // 獲取所有可用的材料數據
    public getAllMaterialsData(): MaterialData[] {
        return dataLoader.getAllMaterialData();
    }

    // 複製一個已有的材料實例
    public cloneMaterial(material: Material): Material {
        return material.clone();
    }
}

// 導出材料工廠實例
export const materialFactory = MaterialFactory.getInstance();
