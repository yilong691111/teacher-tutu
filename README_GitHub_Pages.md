# 塗塗老師 Teacher Tutu 官方網站 — GitHub Pages 版

這個版本不需要租用主機、不需要 Python、不需要資料庫。

## 1. 第一次發布到 GitHub Pages
1. 登入 GitHub，建立一個新的 repository，例如 `teacher-tutu`。
2. 將這個資料夾內的所有檔案上傳到 repository 根目錄。
3. Repository → **Settings** → **Pages**。
4. Build and deployment 選 **Deploy from a branch**。
5. Branch 選 `main`，Folder 選 `/ (root)`，按 **Save**。
6. GitHub 會提供公開網址，通常是：`https://你的帳號.github.io/teacher-tutu/`。

## 2. 平常如何更新網站
1. 在自己電腦直接開啟 `admin.html`。
2. 編輯作品、公告或網站設定。
3. 到「匯入／匯出」按 **下載 site-data.js**。
4. 在 GitHub repository 開啟 `data/site-data.js`，用下載的新檔案覆蓋它。
5. Commit changes。
6. GitHub Pages 會自動更新網站。

## 3. 新作品圖片如何處理
後台新增圖片時會自動縮放並轉成 WEBP，然後嵌入 `site-data.js`，所以不需要另外上傳圖片檔。

如果未來圖片非常多，建議改成「圖片放 assets/works、後台只管理路徑」模式，以減少 site-data.js 大小。

## 4. 換電腦
- 先從 GitHub 下載目前的 `data/site-data.js`。
- 開啟 `admin.html` →「匯入／匯出」→ 匯入該檔。
- 即可接續管理。

## 5. 備份
在後台按 **下載完整備份 JSON**。這是最簡單的內容備份方式。

## 6. LINE 貼圖商店
網站已設定：
https://store.line.me/stickershop/author/5947333/zh-Hant

## 重要說明
`admin.html` 是「本機內容編輯器」，不是能直接寫入 GitHub 的線上後台。這樣才能做到完全不需要伺服器。真正發布的動作，是將匯出的 `site-data.js` Commit 到 GitHub。


## 3.0 強化功能
- 作品支援分類、系列、搜尋與排序。
- 可收藏、分享作品，作品視窗可左右切換。
- 後台新增草稿預覽與發布前檢查。
- 新增 Open Graph、結構化資料、Web App Manifest。
