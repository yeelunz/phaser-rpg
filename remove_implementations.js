const fs = require('fs');
const path = require('path');

// 技能檔案路徑
const skillsFilePath = path.join(__dirname, 'public', 'assets', 'data', 'skills', 'skills.json');

// 讀取技能檔案
fs.readFile(skillsFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error('無法讀取技能檔案:', err);
    return;
  }

  try {
    // 解析 JSON
    const skills = JSON.parse(data);
    
    // 移除每個技能的 implementations 欄位
    for (const skill of skills) {
      if (skill.implementations) {
        delete skill.implementations;
      }
    }
    
    // 將更新後的數據寫回檔案
    fs.writeFile(skillsFilePath, JSON.stringify(skills, null, 2), 'utf8', (err) => {
      if (err) {
        console.error('無法寫入技能檔案:', err);
        return;
      }
      console.log('成功刪除 skills.json 中的 implementations 欄位');
    });
  } catch (parseErr) {
    console.error('解析 JSON 檔案時發生錯誤:', parseErr);
  }
});

// 檢查 ultimate_1.json (已經在之前修改了，這裡只是作為參考)
console.log('ultimate_1.json 已經被修改');
