# QA 系統 - 後端設定教學

## 步驟 1：準備 Google Sheet
1. 開啟 [Google Sheets (試算表)](https://sheets.google.com/create)。
2. 將試算表命名 (例如："QA 系統資料庫")。
3. 在 **第一列 (Row 1)**，請嚴格按照以下順序填入標題 (英文)：
    - **A**: `ID`
    - **B**: `Status`
    - **C**: `Module`
    - **D**: `Function`
    - **E**: `Code`
    - **F**: `Url`
    - **G**: `Reporter`
    - **H**: `Description`
    - **I**: `Fixer`
    - **J**: `FixNote`
    - **K**: `Timestamp` (回報時間)
    - **L**: `FixTime` (修正時間)

## 步驟 2：加入程式碼
1. 在試算表中，點選上方選單的 **「擴充功能」 (Extensions)** > **「Apps Script」**。
2. 刪除編輯器中原本的所有程式碼。
3. 複製專案中提供的 `Code.gs` 檔案內容，並貼上。
4. 按下 `Ctrl + S` 存檔，專案名稱可命名為 "QA Backend"。

## 步驟 3：部署為 Web App
1. 點選右上角的藍色 **「部署」 (Deploy)** 按鈕 > **「新增部署」 (New deployment)**。
2. 點選 **「選取類型」** (齒輪圖示) -> **「網頁應用程式」 (Web app)**。
3. 填寫以下資訊：
    - **說明 (Description)**: "API v1" (可選)
    - **執行身分 (Execute as)**: **"我" (Me)** (您的 Email)
    - **誰可以存取 (Who has access)**: **"任何人" (Anyone)** (這點非常重要！否則前端無法寫入資料)。
4. 點選 **「部署」 (Deploy)**。
5. 複製顯示的 **「網頁應用程式網址」 (Web app URL)** (網址結尾通常是 `/exec`)。

## 步驟 4：設定前端
1. 打開專案資料夾中的 `.env` 檔案。
2. 將網址貼上：
   ```properties
   VITE_GOOGLE_APP_SCRIPT_URL=https://script.google.com/macros/s/......./exec
   ```
3. 完成！

## 步驟 5：部署至 GitHub Pages (可選)
1. **建立儲存庫 (Repo)**
    - 在 GitHub 建立一個新的 Repository。
    - 將本機專案上傳 (Push) 到該 Repo。

2. **設定環境變數 (Secrets)**
    - 進入 Repo 的 **Settings** > **Secrets and variables** > **Actions**。
    - 點選 **New repository secret**。
    - Name: `VITE_GOOGLE_APP_SCRIPT_URL`
    - Value: (貼上您的 Google Web App 網址)
    - 點選 **Add secret**。

3. **設定 GitHub Actions**
    - 點選 **Actions** 分頁。
    - 選擇 **New workflow** > **set up a workflow yourself**。
    - 貼上以下 YAML 設定檔內容，並儲存 (Commit)：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run build
        env:
          VITE_GOOGLE_APP_SCRIPT_URL: ${{ secrets.VITE_GOOGLE_APP_SCRIPT_URL }}
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

4. **完成**
    - 幾分鐘後，您的網頁就會自動部署到 `https://您的帳號.github.io/專案名稱/`。

---

## 附錄：測試資料範例 (10筆)
您可以將以下表格內容直接複製並貼上到 Google Sheet 的 **A2** 儲存格 (A2:K11)，即可立即看到測試資料：

| ID | Status | Module | Function | Code | Url | Reporter | Description | Fixer | FixNote | Timestamp |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1001 | New | 其他管理 | 供應者評鑑 | P020208 | http://erp.test/p1 | 張小美 | 評分表列印時，版面跑版，右邊被切掉。 | | | 2024/05/20 09:30:15 |
| 1002 | Fixed | 其他管理 | 評鑑結果查詢 | P020302 | http://erp.test/p2 | 李大同 | 匯出的 Excel 報表標題全是亂碼。 | 陳工程 | 已修正編碼為 UTF-8，測試 OK。 | 2024/05/20 10:15:20 |
| 1003 | New | 人事系統 | 加班申請 | P030101 | http://erp.test/p3 | 王五 | 選取「假日加班」時，時數計算錯誤 (應為 1.5 倍)。 | | | 2024/05/21 14:00:00 |
| 1004 | Closed | 人事系統 | 薪資結算 | P030405 | http://erp.test/p4 | 趙六 | 按下結算按鈕出現 "Error 500" 錯誤。 | 陳工程 | 資料庫連線異常，已重啟服務解決。 | 2024/05/22 11:20:30 |
| 1005 | New | 業務管理 | 訂單建立 | P040101 | http://erp.test/p5 | 張小美 | 客戶名稱無法輸入中文，只能打英文。 | | | 2024/05/22 16:45:10 |
| 1006 | Fixed | 業務管理 | 業績報表 | P040202 | http://erp.test/p6 | 李大同 | 圖表顯示的月份順序錯誤 (12月跑去最前面)。 | 林開發 | 修正 SQL 排序邏輯 (Order By)。 | 2024/05/23 09:50:55 |
| 1007 | New | 採購模組 | 請購單 | P050101 | http://erp.test/p7 | 王五 | 物料編號 P999 帶不出品名，顯示為 undefined。 | | | 2024/05/23 13:10:00 |
| 1008 | New | 手機版 | 首頁看板 | M010101 | http://m.erp.test | 趙六 | 在 iPhone Safari 上，導航列無法收合，擋住內容。 | | | 2024/05/24 10:30:25 |
| 1009 | Fixed | 倉庫管理 | 盤點單 | P060202 | http://erp.test/p8 | 張小美 | 按鈕顏色太淡，跟背景色融為一體，看不清楚。 | 網頁美編 | 已將按鈕改為深藍色 (#0000AA)。 | 2024/05/24 15:40:40 |
| 1010 | Closed | 系統核心 | 登入頁面 | S000001 | http://erp.test/login | 李大同 | 輸入密碼時希望有「顯示密碼」的小眼睛圖示。 | 林開發 | 需求駁回：資安考量，暫不開放。 | 2024/05/25 08:20:15 |
