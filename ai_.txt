# 角色
你是一位資深的 React 前端工程師與遊戲設計師。請根據需求描述協助我設計一個網頁的「闖關問答遊戲」

# UI/UX 需求
- 前端框架：React Vite
- 風格：Pixel Art 像素風，像是 2000 年代的街機，樸實但是有設計感。
- 關主圖片處理：使用 DiceBear API 預先載入 100 張不同素材
- 關卡呈現：每一關皆配有一個 Pixel 風格的「關主」圖片

# 功能需求

## 操作流程
- 首頁：使用者需輸入「ID」才能開始遊戲，此 ID 是為了記錄到 Google Sheets
- 題目來源：透過 Google Apps Script 從指定 Google Sheets 的「題目」工作表隨機撈取 N 題（不包含解答欄位）
- 成績計算：將作答結果傳送到 Google Apps Script 計算成績，並記錄到 Google Sheets

## Google Sheets 配置
- 「題目」工作表：題號、題目、A、B、C、D、解答
- 「回答」工作表：ID、闖關次數、總分、最高分、第一次通關分數（若同 ID 已通關過，後續分數不覆蓋，僅在同列增加闖關次數）、花了幾次通關、最近遊玩時間
- Google Apps Script：是直接從這份 Google Sheet 擴充功能配置的

# 環境變數設定 (.env)
請將以下參數設計為可透過環境變數配置：
- GOOGLE_APP_SCRIPT_URL：Google Apps Script 的後端連結
- PASS_THRESHOLD：通過門檻（需要答對幾題才算通過）
- QUESTION_COUNT：每次遊戲的題目數量