# 臺灣超級鐵人三項排行榜

Taiwan Triathlon Leaderboard — 收錄臺灣選手的超鐵（226km）、半超鐵（113km）歷代成績，以及完成 KONA 的選手名單。

**線上網址：** <https://triathlontw.com/>

這是一個**純靜態、只有資料的**網站：沒有後端、沒有資料庫。每一個榜單就是 `public/data/` 底下的一個 JSON 檔，前端在執行期直接 fetch。新成績由選手透過網站上的 Google 表單（頁首「上傳成績」）回報，再由維護者手動合併進 JSON — 這個 repo 絕大多數的 commit 就是在做這件事。

所有介面文字都是繁體中文。

## 技術

React 19 + TypeScript（`strict`）+ Vite，部署在 GitHub Pages。沒有測試，但 `npm run build` 會先跑 `tsc -b`，所以型別錯誤會擋下 build。

## 指令

```bash
npm install
npm run dev        # 開發伺服器（Vite）
npm run typecheck  # tsc -b，不產出檔案
npm run build      # typecheck + 打包到 dist/
npm run preview    # 預覽 dist/
npm run lint       # eslint
npm run stamp      # 依 git 紀錄改寫各榜單的 lastUpdated（CI 會自動跑）
```

> TypeScript 刻意鎖在 6.x。TS 7（原生編譯器）雖已釋出，但 `typescript-eslint` 尚未支援，`npm run lint` 會直接失敗。等 typescript-eslint 支援 TS 7 再升。

## 常見維護：新增一筆成績

**新增選手 = 在該檔案的 `athletes` 陣列裡「任意位置」加一個物件。** 不需要排序、不需要重新編號，JSON 裡也沒有 `rank` 欄位 — 名次是前端算出來的。

複製一列現成的資料，貼上去改內容即可。每個檔案的每一列都帶**相同的九個 key、相同順序**：

```json
{
  "name": "張團畯",
  "totalTime": "8:18:20",
  "swimTime": "00:49:33",
  "bikeTime": "04:16:50",
  "runTime": "03:05:05",
  "raceName": "2024 普悠瑪",
  "t1": "00:06:52",
  "t2": "00:00:00",
  "verify": 0
}
```

（KONA 榜單多一個 `gender`，位置在 `raceName` 之後，值為 `"male"` / `"female"`。）

幾個規則：

- **不知道的值填 `""`，不要省略 key。** `t1: ""` 的顯示結果跟沒有 `t1` 一樣（`—`），所以資料不完整的列也不會壞掉。
- **`verify` 是維護者自己的記帳欄位，畫面上永遠不會顯示。** 新增時填 `0`，等到親自對過來源後手動改成 `1`。程式碼沒有任何地方讀它。
- **`lastUpdated` 不要手動改。** `scripts/stamp-updated.ts`（部署時以 `npm run stamp` 執行，在 build 之前）會用該資料檔最後一次 commit 的日期（`Asia/Taipei` 時區）覆蓋它。repo 裡的值只是裝飾用，本機想看正確的值就自己跑一次 `npm run stamp`。

時間格式接受 `H:MM:SS`、`MM:SS`，或純秒數（`"90"` 或 `90`）；其他寫法一律視為 `Infinity`，排到最後。

## 常見維護：新增一個榜單

1. 把 JSON 檔放進 `public/data/`。
2. 在 [src/App.tsx](src/App.tsx) 的 `BOARDS` 陣列加一行（分頁標籤 → 檔名）。

檔案本身的結構：

```json
{
  "title": "男子超級鐵人",
  "subtitle": "Distance (226km: Swim 3.8km / Bike 180km / Run 42.195km)",
  "category": "male",
  "distance": "full",
  "lastUpdated": "2026-08-05",
  "notes": ["以下賽事資訊可能有誤：..."],
  "athletes": []
}
```

`category` 是 `'male' | 'female' | 'KONA'`，`distance` 是 `'full' | 'half'`（KONA 榜單沒有）。`notes` 會顯示在表格下方的「備註」區塊。

## 專案結構

```
public/data/*.json     每個榜單一個檔，唯一的資料來源
src/App.tsx            BOARDS 陣列、分頁狀態、fetch
src/board.ts           衍生層：名次、T1+T2、時間轉秒數
src/types.ts           board JSON 形狀的單一事實來源
src/components/Leaderboard.tsx   整張表格：搜尋、排序、名次徽章、分組、備註
scripts/stamp-updated.ts         改寫 lastUpdated
```

### 資料契約

[src/types.ts](src/types.ts) 是榜單 JSON 形狀（`Board`、`Athlete`）的單一事實來源。**執行期沒有任何驗證** — fetch 回來的結果直接 cast 成 `Board`，所以壞掉的資料檔是執行期問題，不是編譯期問題。改資料格式時請手動讓 `src/types.ts` 跟 `public/data/*.json` 保持同步。

### 衍生層（`src/board.ts`）

`normalizeBoard` 在 fetch 之後跑**一次**（絕不在 render 或排序時跑），回傳一個 `ViewBoard`，每一列多帶：

- **`rank`** — 依 `totalTime` 由快到慢的名次。同時間共用名次，下一名跳號（1, 2, 2, 4）。沒有可用 `totalTime` 的列沉到最底並保持檔案順序。
- **`transitionTime`** — `t1 + t2` 合併成表格上唯一的 **T1+T2** 欄（兩者皆無時顯示 `—`）。JSON 裡兩個欄位仍然分開存。
- **`secs`** — 四個可排序欄位預先轉成秒數，排序時比數字，不再重新 parse 字串。

`secondsToTime` 未滿一小時印 `M:SS`，滿一小時印 `H:MM:SS` — 所以 `t1: "3:30"` + `t2: "2:40"` 會顯示成 `6:10`。

KONA 榜單（`category === 'KONA'`）是唯一的分支：依 `athletes[].gender` 拆成 女子／男子 兩組、保持檔案順序、名次取自各組內的位置。`normalizeBoard` 刻意不排序 KONA 的列、也不給 `rank` — 那是一份完賽名單，不是一場比賽。

### 排序

只有 **總成績 / 游泳 / 自行車 / 跑步** 可以排序 — 這四個就是 `SortField`，也正好是 `secs` 存的四個。排名、選手姓名、T1+T2、賽會名稱刻意不可點。點一次表頭循環 遞增 → 遞減 → 取消；取消就回到 `normalizeBoard` 的順序（也就是名次順序）。

`COL_COUNT` 是分組標題列的 `colSpan`，必須跟 `<th>` 的數量一致（目前 8 個：排名 / 選手姓名 / 總成績 / 游泳 / 自行車 / 跑步 / T1+T2 / 賽會名稱，手機與桌機相同）。

## 部署

push 到 `master` 會觸發 [.github/workflows/deploy.yml](.github/workflows/deploy.yml)，部署到 GitHub Pages。

### 相對 base path

`vite.config.ts` 設定 `base: './'`，所以同一份 build 在 `samuel3wang.github.io/triathlon-board/` 和自訂網域根目錄下都正確，兩者之間搬移不必重新 build。**絕對 base 會在網站搬家的瞬間弄壞每一個 asset** — 這個坑曾經花掉一整天。

因此任何執行期的 asset 或資料 fetch **都必須**經過 `import.meta.env.BASE_URL`（如 `App.tsx` 所做），它會編譯成 ``fetch(`./` + file)``，相對於當前頁面網址解析。寫成 `/data/...` 在子路徑下會 404。相對 base 唯一的要求是頁面網址結尾要有斜線 — GitHub Pages 會用 301 幫目錄網址補上，而這個 app 沒有 client-side router，不會出現巢狀路徑。

### 紅色的 deploy job 不代表網站沒更新

`actions/deploy-pages` 每 5 秒 poll 一次 Pages API，10 分鐘後放棄，而**這個上限改不掉** — action 內部用 `Math.min(input, 600000)` 夾住自己的 `timeout` input，調高會被無聲忽略。Pages 超過這個時間時，action 會報失敗並取消，但 GitHub 那邊往往幾分鐘後還是完成了，內容確實上線。（2026-08-06 有一次 job 在 14:26 失敗，14:29 就上線了。）

所以 `deploy-pages` 帶 `continue-on-error: true`，真正決定這次 run 成敗的是 **Confirm the site is serving this commit** 這一步：它最多 poll 線上網站 25 分鐘，在 hash 過的 JS bundle 裡找這次 run 的 short sha。紅色現在代表內容真的沒上線；綠色代表上線了，不管 action 鬧了多久脾氣。

手動檢查同一件事：

```bash
curl -sSI https://triathlontw.com/ | grep -i last-modified   # Pages 上次發佈的時間
```

注意 CDN 會快取 HTML 600 秒，所以兩種讀數都可能落後實際部署最多 10 分鐘。

### commit sha

頁尾印的是 `__COMMIT_SHA__`，由 `vite.config.ts` 的 `define` 從 `git rev-parse --short HEAD` 注入。想知道訪客實際跑的是哪個 commit 就看它：Pages CDN 快取 HTML 10 分鐘（`max-age=600`，不可設定），瀏覽器收到的東西可能落後 Environments → `github-pages` 顯示的 Active 版本。因為 sha 是包在 hash 過的 JS 裡面出貨的，它永遠不會跟周圍的 assets 對不上。

### 自訂網域

`public/CNAME`（內容 `triathlontw.com`）必須留在發佈的 artifact 裡 — 少了它，Pages 每次部署都會重新推導網域關聯，Settings 裡的 DNS 檢查就會反覆跳動。網域所有權驗證（`_github-pages-challenge-samuel3wang` TXT 紀錄）目前**尚未設定**。

部署時間變化：自訂網域設定前約 12 秒，2026-08-06 設定後變成 4–10 分鐘，之後穩定超過 10 分鐘的上限。

## 授權與資料

資料由社群回報並經人工整理，僅供參考。發現錯誤歡迎來信 <a22410570@yahoo.com.tw>。

## Reference

### Puyuma

[2026](https://www.sportsplits.com/races/puyuma-triathlon-day1-2026)
[2023](https://www.bravelog.tw/contest/rank/2023031801)
[2022](https://www.bravelog.tw/contest/rank/2022031901)
[2020](https://www.bravelog.tw/contest/list/2020101730)

### Challenge Taiwan

[2026](https://www.sportsplits.com/races/challenge-taiwan-day2-2026)
[2023](https://www.bravelog.tw/contest/rank/2023042201)
[2022](https://www.bravelog.tw/contest/rank/2022042301)
[2021](https://www.bravelog.tw/contest/rank/2021042471)
[2020](https://www.bravelog.tw/contest/list/2020101730)
[2015](https://sportstats.one/event/challenge-taiwan/leaderboard/25601)
[2024](https://sportstats.one/event/challenge-taiwan/leaderboard/12046)
