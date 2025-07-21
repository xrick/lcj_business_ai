# ⚠️ 執行環境說明

**請務必於 conda 虛擬環境 `salseragenv` 下執行本專案，所有依賴（如 prettytable、langchain_community 等）也需安裝於此環境。**

啟動方式：
```bash
conda activate salseragenv
```

# 使用者輸入處理與答案產生流程（詳細分析）

---

## 1. 前端輸入與請求發送

- 使用者在網頁輸入框（`#userInput`）輸入問題，點擊送出按鈕（`#sendButton`）或按下 Enter。
- 前端 JavaScript（`static/js/sales_ai.js`）會呼叫 `sendMessage()`：
    - 取得輸入內容，若為空則不處理。
    - 呼叫 `/api/sales/chat-stream` API，POST 傳送 JSON：
      ```json
      { "query": "<使用者問題>", "service_name": "sales_assistant" }
      ```
    - 以 SSE（Server-Sent Events）流式接收回應，解析每段 `data: ...`，將 JSON 結果渲染於對話區。

---

## 2. 後端 API 路由處理

- FastAPI 路由（`api/sales_routes.py`）：
    - `/chat-stream` 端點接收 POST 請求，解析 JSON 取得 `query` 與 `service_name`。
    - 透過 `ServiceManager` 取得對應服務（預設為 `sales_assistant`）。
    - 呼叫該服務的 `chat_stream(query)`，以 `StreamingResponse` 回傳流式資料。

---

## 3. ServiceManager 動態服務管理

- `libs/service_manager.py`：
    - 啟動時自動載入 `services/` 目錄下所有服務（如 `sales_assistant`）。
    - 依名稱取得對應服務實例，供 API 路由調用。

---

## 4. SalesAssistantService 主流程

- `libs/services/sales_assistant/service.py`：
    - `chat_stream(query)` 為主入口，處理步驟如下：

### 步驟 1：解析查詢意圖
- 呼叫 `_parse_query_intent(query)`：
    - 判斷 query 是否包含特定型號（modelname）、系列（modeltype）、意圖（intent）等。
    - 依據關鍵字配置（`prompts/query_keywords.json`）自動判斷意圖。
    - 回傳 dict，包含 modelnames、modeltypes、intent、query_type。

### 步驟 2：依查詢類型取得資料
- 呼叫 `_get_data_by_query_type(query_intent)`：
    - 若為特定型號，查詢 DuckDB 取得規格資料。
    - 若為系列，查詢系列下所有型號資料。
    - 若查無資料，直接回傳「並無登記資料」訊息。

### 步驟 3：檢查資料可用性
- 呼叫 `_check_data_availability`，若無資料則回傳缺資料訊息。

### 步驟 4：組裝 Prompt 並呼叫 LLM
- 將查詢意圖、資料 context 組合進 prompt template。
- 呼叫 `self.llm_initializer.invoke(final_prompt)`，將 prompt 傳給 LLM。

### 步驟 5：解析 LLM 回應
- 嘗試解析 LLM 回傳的 JSON 格式內容。
- 若格式正確，進一步呼叫 `_process_llm_response_robust`：
    - 驗證 answer_summary 與 comparison_table 是否合理。
    - 若有缺失則自動 fallback 產生摘要或表格。
    - 最終格式化為標準 JSON 回傳。
- 若 LLM 回應格式錯誤，則自動 fallback 產生預設回應。

---

## 5. 回傳與前端渲染

- 後端以 SSE 格式逐段回傳 JSON 給前端。
- 前端解析每段 `data: ...`，渲染於對話區。
- 若有錯誤訊息，前端會顯示於訊息區。

---

## 6. 簡要流程圖

```mermaid
graph TD
A[使用者輸入] --> B[前端 sendMessage()]
B --> C[API /chat-stream]
C --> D[ServiceManager 取得服務]
D --> E[SalesAssistantService.chat_stream]
E --> F[解析查詢意圖]
F --> G[查詢資料庫]
G --> H[組裝 Prompt]
H --> I[呼叫 LLM]
I --> J[解析 LLM 回應]
J --> K[格式化 JSON]
K --> L[StreamingResponse 回傳]
L --> M[前端渲染]
```

---

> 本文件詳細說明了從使用者輸入到最終答案產生的完整技術流程，便於 debug 與系統理解。 