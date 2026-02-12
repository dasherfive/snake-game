# Change summary: 實作了包含後端排行榜與前端遊戲邏輯的貪食蛇遊戲。
本次審查針對現有的 `server.js` 與 `game.js` 檔案進行，主要發現了後端寫入檔案的競態條件（Race Condition）與前端障礙物生成的公平性問題。

## File: server.js
### L52: [HIGH] 檔案讀寫存在競態條件 (Race Condition)
使用非同步的 `readFile` 後接 `writeFile` 會導致並發請求時資料被覆蓋。Node.js 是單執行緒的，應利用此特性將資料快取在記憶體中同步更新，再寫入檔案。

Suggested change:
```javascript
// 在伺服器啟動時先載入資料到記憶體
let leaderboardCache = [];
try {
    if (fs.existsSync(DATA_FILE)) {
        leaderboardCache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
} catch (e) { leaderboardCache = []; }

// 修改 POST 處理邏輯
app.post('/api/leaderboard', (req, res) => {
    // ... 驗證輸入 ...

    const newEntry = {
        name: name.substring(0, 20),
        score,
        level,
        date: new Date().toISOString().split('T')[0]
    };

    // 同步更新記憶體中的資料，避免競態條件
    leaderboardCache.push(newEntry);
    leaderboardCache.sort((a, b) => b.score - a.score);
    if (leaderboardCache.length > 50) {
        leaderboardCache = leaderboardCache.slice(0, 50);
    }

    // 非同步寫入檔案以持久化
    fs.writeFile(DATA_FILE, JSON.stringify(leaderboardCache, null, 2), (writeErr) => {
        if (writeErr) console.error(writeErr);
        // 即使寫入失敗，記憶體中仍有最新資料
    });

    res.status(201).json({ message: 'Score saved successfully.', entry: newEntry });
});
```

### L50: [MEDIUM] 輸入驗證不足
僅檢查了 `name` 是否存在和 `score` 是否為數字，未檢查 `name` 是否為純空白字元，也未限制 `score` 必須為正整數，這可能導致排行榜被無效數據污染。

Suggested change:
```javascript
    const { name, score, level } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0 || 
        typeof score !== 'number' || score < 0) {
        return res.status(400).json({ error: 'Invalid data provided.' });
    }
```

## File: public/game.js
### L396: [MEDIUM] 升級時障礙物可能生成於蛇頭前方
`isOccupied` 函式雖然檢查了蛇身，但使用了針對 Level 1 硬編碼的「安全區」。當玩家在 Level 2 或 3 升級時，蛇可能在地圖任何位置，新生成的障礙物可能直接出現在蛇頭行進方向，導致不可避免的死亡。

Suggested change:
```javascript
    function isOccupied(pos) {
        // ... existing checks ...

        // 動態安全區：確保蛇頭周圍（特別是前方）不生成障礙物
        const head = gameState.snake[0];
        if (head) {
             const dist = Math.abs(pos.x - head.x) + Math.abs(pos.y - head.y);
             if (dist <= 3) return true; // 蛇頭周圍 3 格內不生成
        }
        
        // Remove old hardcoded safe zone or keep it only for initial spawn
        // if (pos.y === 10 && pos.x >= 3 && pos.x <= 8) return true;

        return false;
    }
```
