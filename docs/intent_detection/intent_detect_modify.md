# LLM 意圖偵測方案技術文件

## 概述

本文件詳述使用 LLM (Large Language Model) 進行用戶查詢意圖偵測的完整技術方案，目標是取代現有的關鍵字匹配機制，提供更精確和靈活的意圖識別能力。

## 背景問題

### 現有系統問題分析

當前系統在處理以下查詢時存在明顯缺陷：

1. **問題1**：「比較958系列哪款筆記型電腦更適合遊戲？」
   - 現象：只返回AHP958一個機型，推薦原因錯誤顯示「AGP958和AH958」
   - 根因：關鍵字匹配無法準確理解複合意圖（gaming + comparison）

2. **問題2**：「請比較839系列機型的電池續航力比較？」
   - 現象：觸發fallback機制，錯誤檢測為commercial/office意圖
   - 根因：battery + comparison複合意圖識別失敗

### 現有關鍵字匹配局限性

```python
# 現有方法存在的問題
for intent_name, intent_config in self.intent_keywords.items():
    keywords = intent_config.get("keywords", [])
    if any(keyword.lower() in query_lower for keyword in keywords):
        result["intent"] = intent_name
        break  # 只取第一個匹配，忽略複合意圖
```

**主要缺陷：**
- 無法理解語義上下文
- 無法處理複合意圖
- 語義歧義（如「處理器」vs「文書處理」）
- 缺乏信心度評估機制
- 優先級處理過於簡化

## LLM 意圖偵測方案

### 技術架構

```
用戶查詢 → LLM意圖偵測 → 結構化意圖數據 → 主查詢流程
    ↓              ↓                ↓            ↓
  原始文本    專用Prompt         JSON格式     增強上下文
```

### 核心優勢

1. **深度語義理解**：理解複雜查詢的真實意圖
2. **複合意圖支持**：同時識別多個意圖層次
3. **上下文感知**：根據查詢上下文動態調整
4. **信心度評估**：提供分析品質指標
5. **靈活擴展**：無需維護大量關鍵字規則

## Prompt 設計

### 意圖偵測 Prompt 模板

創建檔案：`libs/services/sales_assistant/prompts/intent_detection_prompt.txt`

```text
你是一個專業的筆電銷售意圖分析師。請分析用戶查詢的具體意圖，並返回標準JSON格式。

用戶查詢：{query}

### 系統資訊
可用機型系列：819, 839, 958
可用具體機型：AG958, AG958P, AG958V, APX958, AHP958, AKK839, ARB839, AB819-S: FP6, AMD819-S: FT6, AMD819: FT6, APX819: FP7R2, APX839, AHP819: FP7R2, AHP839, ARB819-S: FP7R2

### 分析要求
請仔細分析查詢內容，識別：
1. 查詢類型（具體機型、系列比較、一般查詢等）
2. 主要使用場景和需求
3. 比較類型和關注重點
4. 提及的機型系列或具體機型
5. 用戶的潛在使用情境

### 返回格式
請嚴格按照以下JSON格式返回，不要添加額外說明：

{
    "query_type": "model_type|specific_model|general|comparison",
    "primary_intent": "gaming|business|creation|battery|cpu|gpu|display|comparison|specifications|latest",
    "secondary_intents": ["intent1", "intent2"],
    "modeltypes": ["958", "839"],
    "modelnames": ["AHP958", "AG958"],
    "focus_areas": ["cpu", "gpu", "battery", "display", "memory", "storage"],
    "user_scenario": "gaming|office|creation|student|professional|general",
    "comparison_type": "series_comparison|model_comparison|feature_comparison|none",
    "confidence": 0.95,
    "reasoning": "分析用戶查詢的具體原因說明"
}

### 欄位說明
- **query_type**: 查詢的基本類型
- **primary_intent**: 主要意圖（權重最高）
- **secondary_intents**: 次要意圖列表
- **modeltypes**: 提及的機型系列
- **modelnames**: 提及的具體機型
- **focus_areas**: 關注的硬體規格重點
- **user_scenario**: 推測的使用情境
- **comparison_type**: 比較查詢的具體類型
- **confidence**: 分析信心度（0-1）
- **reasoning**: 分析邏輯的詳細說明

### 分析範例
範例1：「比較958系列哪款筆記型電腦更適合遊戲？」
→ query_type: "model_type", primary_intent: "gaming", secondary_intents: ["comparison"], comparison_type: "series_comparison"

範例2：「請比較839系列機型的電池續航力？」
→ query_type: "model_type", primary_intent: "battery", secondary_intents: ["comparison"], comparison_type: "feature_comparison"
```

## 實作方法

### 1. 核心意圖偵測方法

```python
def _parse_query_intent_with_llm(self, query: str) -> dict:
    """
    使用LLM進行精確的意圖偵測
    """
    try:
        # 載入意圖偵測prompt
        intent_prompt = self._load_prompt_template("prompts/intent_detection_prompt.txt")
        
        # 構建最終prompt
        final_prompt = intent_prompt.replace("{query}", query)
        
        logging.info(f"執行LLM意圖偵測，查詢: {query}")
        
        # 調用LLM
        response = self.llm_initializer.invoke(final_prompt)
        
        logging.info(f"LLM意圖偵測原始回應: {response}")
        
        # 解析JSON回應
        intent_result = self._parse_intent_json_response(response)
        
        logging.info(f"LLM意圖偵測結果: {intent_result}")
        
        return intent_result
        
    except Exception as e:
        logging.error(f"LLM意圖偵測失敗: {e}")
        # 降級到簡單關鍵字匹配
        return self._parse_query_intent_fallback(query)
```

### 2. JSON 回應解析方法

```python
def _parse_intent_json_response(self, response: str) -> dict:
    """
    解析LLM返回的意圖JSON，提供多層次容錯處理
    """
    try:
        # 提取JSON部分
        json_start = response.find("{")
        json_end = response.rfind("}")
        
        if json_start != -1 and json_end != -1:
            json_content = response[json_start:json_end+1]
            intent_data = json.loads(json_content)
            
            # 驗證必要欄位
            required_fields = ["query_type", "primary_intent", "confidence"]
            if all(field in intent_data for field in required_fields):
                # 數據清理和驗證
                validated_data = self._validate_intent_data(intent_data)
                return validated_data
                
    except json.JSONDecodeError as e:
        logging.error(f"JSON解析失敗: {e}")
        # 嘗試修復常見JSON格式問題
        fixed_json = self._fix_json_format(response)
        if fixed_json:
            try:
                return json.loads(fixed_json)
            except:
                pass
    except Exception as e:
        logging.error(f"意圖解析異常: {e}")
    
    # 返回默認結構
    return self._get_default_intent_structure()

def _validate_intent_data(self, intent_data: dict) -> dict:
    """
    驗證和清理意圖數據
    """
    # 驗證query_type
    valid_query_types = ["model_type", "specific_model", "general", "comparison"]
    if intent_data.get("query_type") not in valid_query_types:
        intent_data["query_type"] = "general"
    
    # 驗證primary_intent
    valid_intents = ["gaming", "business", "creation", "battery", "cpu", "gpu", 
                    "display", "comparison", "specifications", "latest"]
    if intent_data.get("primary_intent") not in valid_intents:
        intent_data["primary_intent"] = "general"
    
    # 驗證modeltypes
    valid_modeltypes = ["819", "839", "958"]
    modeltypes = intent_data.get("modeltypes", [])
    intent_data["modeltypes"] = [mt for mt in modeltypes if mt in valid_modeltypes]
    
    # 驗證confidence範圍
    confidence = intent_data.get("confidence", 0.0)
    intent_data["confidence"] = max(0.0, min(1.0, float(confidence)))
    
    return intent_data

def _get_default_intent_structure(self) -> dict:
    """
    返回默認的意圖結構
    """
    return {
        "query_type": "unknown",
        "primary_intent": "general",
        "secondary_intents": [],
        "modeltypes": [],
        "modelnames": [],
        "focus_areas": [],
        "user_scenario": "general",
        "comparison_type": "none",
        "confidence": 0.0,
        "reasoning": "解析失敗，使用默認值"
    }
```

### 3. 降級處理機制

```python
def _parse_query_intent_fallback(self, query: str) -> dict:
    """
    LLM意圖偵測失敗時的降級處理
    保持系統穩定性的簡化關鍵字匹配
    """
    try:
        # 簡化的關鍵字匹配邏輯
        result = self._get_default_intent_structure()
        
        # 基本機型系列檢測
        import re
        modeltypes = re.findall(r'\b(819|839|958)\b', query)
        if modeltypes:
            result["modeltypes"] = list(set(modeltypes))
            result["query_type"] = "model_type"
        
        # 基本意圖檢測
        if any(word in query for word in ["遊戲", "gaming", "電競"]):
            result["primary_intent"] = "gaming"
        elif any(word in query for word in ["電池", "續航", "battery"]):
            result["primary_intent"] = "battery"
        elif any(word in query for word in ["比較", "compare"]):
            result["primary_intent"] = "comparison"
        
        result["confidence"] = 0.3  # 低信心度標記
        result["reasoning"] = "LLM偵測失敗，使用簡化關鍵字匹配"
        
        return result
        
    except Exception as e:
        logging.error(f"降級處理也失敗: {e}")
        return self._get_default_intent_structure()
```

### 4. 主流程整合

```python
def _parse_query_intent(self, query: str) -> dict:
    """
    統一的查詢意圖解析入口點
    """
    # 直接使用LLM進行意圖偵測
    llm_intent = self._parse_query_intent_with_llm(query)
    
    # 轉換為現有系統相容的格式
    compatible_result = {
        "modelnames": llm_intent.get("modelnames", []),
        "modeltypes": llm_intent.get("modeltypes", []),
        "intent": llm_intent.get("primary_intent", "general"),
        "query_type": llm_intent.get("query_type", "unknown"),
        
        # 新增欄位，提供更豐富的意圖資訊
        "focus_areas": llm_intent.get("focus_areas", []),
        "user_scenario": llm_intent.get("user_scenario", "general"),
        "comparison_type": llm_intent.get("comparison_type", "none"),
        "confidence": llm_intent.get("confidence", 0.0),
        "reasoning": llm_intent.get("reasoning", ""),
        "secondary_intents": llm_intent.get("secondary_intents", [])
    }
    
    logging.info(f"統一意圖解析結果: {compatible_result}")
    return compatible_result
```

## JSON 格式定義

### 標準回應格式

```json
{
    "query_type": "model_type",
    "primary_intent": "gaming", 
    "secondary_intents": ["comparison", "specifications"],
    "modeltypes": ["958"],
    "modelnames": [],
    "focus_areas": ["gpu", "cpu", "memory"],
    "user_scenario": "gaming",
    "comparison_type": "series_comparison",
    "confidence": 0.95,
    "reasoning": "用戶明確提及958系列和遊戲需求，屬於系列內遊戲性能比較查詢"
}
```

### 欄位詳細說明

| 欄位 | 類型 | 說明 | 可能值 |
|-----|------|------|--------|
| `query_type` | string | 查詢基本類型 | model_type, specific_model, general, comparison |
| `primary_intent` | string | 主要意圖 | gaming, business, creation, battery, cpu, gpu, display, comparison, specifications, latest |
| `secondary_intents` | array | 次要意圖列表 | 同primary_intent的可能值 |
| `modeltypes` | array | 提及的機型系列 | ["819", "839", "958"] |
| `modelnames` | array | 提及的具體機型 | ["AHP958", "AG958", ...] |
| `focus_areas` | array | 關注的硬體規格 | ["cpu", "gpu", "battery", "display", "memory", "storage"] |
| `user_scenario` | string | 使用情境 | gaming, office, creation, student, professional, general |
| `comparison_type` | string | 比較類型 | series_comparison, model_comparison, feature_comparison, none |
| `confidence` | float | 信心度 | 0.0 - 1.0 |
| `reasoning` | string | 分析原因 | 詳細的分析邏輯說明 |

## 問題解決效果預期

### 問題1：958系列遊戲查詢

**輸入**：「比較958系列哪款筆記型電腦更適合遊戲？」

**預期LLM意圖分析**：
```json
{
    "query_type": "model_type",
    "primary_intent": "gaming",
    "secondary_intents": ["comparison"],
    "modeltypes": ["958"],
    "modelnames": [],
    "focus_areas": ["gpu", "cpu"],
    "user_scenario": "gaming",
    "comparison_type": "series_comparison",
    "confidence": 0.95,
    "reasoning": "用戶明確要求比較958系列機型的遊戲適用性，主要關注遊戲性能"
}
```

**改進效果**：
- 正確識別為系列比較 + 遊戲意圖
- 主查詢LLM會收到明確的gaming intent指導
- 避免回傳錯誤的機型名稱
- 確保比較所有958系列機型

### 問題2：839系列電池比較

**輸入**：「請比較839系列機型的電池續航力比較？」

**預期LLM意圖分析**：
```json
{
    "query_type": "model_type",
    "primary_intent": "battery",
    "secondary_intents": ["comparison"],
    "modeltypes": ["839"],
    "modelnames": [],
    "focus_areas": ["battery"],
    "user_scenario": "general",
    "comparison_type": "feature_comparison",
    "confidence": 0.90,
    "reasoning": "用戶要求比較839系列的電池續航力，屬於特定功能比較查詢"
}
```

**改進效果**：
- 準確識別battery + comparison複合意圖
- 避免錯誤觸發fallback機制
- 提供正確的電池比較結果
- 信心度評估幫助品質控制

## 整合方案

### 現有系統改動點

1. **新增檔案**：
   - `prompts/intent_detection_prompt.txt` - 意圖偵測專用prompt
   
2. **修改檔案**：
   - `service.py` - 新增LLM意圖偵測方法
   - `service.py` - 修改`_parse_query_intent`方法

3. **保持向下相容**：
   - 現有API介面不變
   - 現有意圖處理邏輯可以接收更豐富的意圖資訊
   - 提供降級機制確保系統穩定性

### 實施影響評估

**正面影響**：
- 意圖識別準確度大幅提升
- 支援複雜查詢和複合意圖
- 減少錯誤的fallback觸發
- 提供分析信心度評估

**潛在風險**：
- LLM調用增加回應時間（預估+200-500ms）
- LLM服務不穩定時需要降級處理
- 需要更多的日誌監控和錯誤處理

**緩解措施**：
- 實施robust的降級機制
- 增加快取策略減少重複LLM調用
- 建立完善的監控和報警機制

## 實施步驟

### 階段1：基礎建設（1-2天）
1. 創建`intent_detection_prompt.txt`
2. 實作`_parse_query_intent_with_llm`方法
3. 實作JSON解析和驗證邏輯
4. 實作降級處理機制

### 階段2：整合測試（1天）
1. 修改主`_parse_query_intent`方法
2. 進行單元測試和整合測試
3. 測試兩個問題案例的改進效果
4. 驗證降級機制的穩定性

### 階段3：優化監控（1天）
1. 增加詳細的日誌記錄
2. 建立意圖識別品質監控
3. 實施快取策略（如需要）
4. 部署到測試環境驗證

### 階段4：生產部署（1天）
1. 生產環境部署
2. 監控系統穩定性和性能
3. 收集用戶反饋
4. 根據需要進行微調

## 監控指標

### 關鍵指標
- **意圖識別準確率**：LLM vs 人工標註的準確度
- **回應時間影響**：LLM意圖偵測增加的延遲
- **降級觸發率**：LLM失敗需要降級的頻率
- **信心度分佈**：意圖識別信心度的統計分佈

### 監控方法
```python
# 在service.py中添加監控代碼
import time

def _parse_query_intent_with_llm(self, query: str) -> dict:
    start_time = time.time()
    try:
        # ... LLM意圖偵測邏輯 ...
        
        # 記錄成功指標
        duration = time.time() - start_time
        logging.info(f"LLM意圖偵測成功，耗時: {duration:.2f}s，信心度: {intent_result.get('confidence', 0)}")
        
        return intent_result
    except Exception as e:
        # 記錄失敗指標
        duration = time.time() - start_time
        logging.error(f"LLM意圖偵測失敗，耗時: {duration:.2f}s，錯誤: {e}")
        
        # 降級處理...
```

## 未來擴展

### 進階功能
1. **多輪對話意圖追蹤**：在對話過程中維護意圖上下文
2. **個人化意圖模型**：根據用戶歷史調整意圖識別
3. **意圖信心度自適應**：根據信心度動態調整處理策略
4. **A/B測試框架**：比較不同意圖識別策略的效果

### 技術優化
1. **意圖識別快取**：為相似查詢建立快取機制
2. **批量意圖處理**：支持多查詢批量意圖識別
3. **模型微調**：基於業務數據微調意圖識別模型
4. **實時學習**：從用戶反饋中持續改進意圖識別

---

*技術文件版本：1.0*  
*最後更新：2025-08-01*  
*負責團隊：Sales RAG System Development Team*