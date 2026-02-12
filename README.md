# 現代貪食蛇遊戲 (Modern Snake Game)

這是一個使用 Node.js 後端與原生 HTML5/Canvas 前端開發的現代風格貪食蛇遊戲。

## 功能特色
- **3 種難度關卡**：
    1. 簡單：速度慢，無障礙。
    2. 中等：速度中等，少量隨機障礙。
    3. 困難：速度快，大量隨機障礙。
- **排行榜系統**：紀錄並顯示前 50 名高分玩家。
- **現代介面**：簡約風格設計，流暢的體驗。

## 安裝與執行

### 1. 安裝相依套件
請確保您已安裝 Node.js，然後在專案根目錄執行：

```bash
npm install
```

這將會安裝 `express`, `body-parser` 和 `cors`。

### 2. 啟動伺服器
執行以下指令來啟動後端伺服器：

```bash
npm start
```
或者
```bash
node server.js
```

伺服器將會在 `http://localhost:3000` 啟動。

### 3. 開始遊戲
打開瀏覽器並前往 `http://localhost:3000` 即可開始遊玩。

## 專案結構
- `server.js`: Node.js 後端伺服器。
- `public/`: 前端靜態檔案 (HTML, CSS, JS)。
- `data/leaderboard.json`: 儲存排行榜資料的 JSON 檔案。
