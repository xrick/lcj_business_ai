import json
import logging
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import numpy as np
from abc import ABC, abstractmethod

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 意圖明確度等級
class IntentClarityLevel(Enum):
    HIGH = "high"  # >80分
    MEDIUM = "medium"  # 50-80分
    LOW = "low"  # <50分

# 對話狀態
class ConversationState(Enum):
    INIT = "initialization"
    INTENT_ANALYSIS = "intent_analysis"
    CLARIFICATION = "clarification"
    RETRIEVAL = "retrieval"
    RESPONSE_GENERATION = "response_generation"
    FEEDBACK_COLLECTION = "feedback_collection"
    COMPLETED = "completed"

@dataclass
class Message:
    """對話訊息"""
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class IntentAnalysisResult:
    """意圖分析結果"""
    clarity_score: float  # 0-100
    main_intent: str
    key_entities: List[str]
    missing_info: List[str]
    ambiguities: List[str]
    suggested_strategy: str
    confidence_level: IntentClarityLevel

@dataclass
class ConversationContext:
    """對話上下文"""
    session_id: str
    messages: List[Message] = field(default_factory=list)
    current_state: ConversationState = ConversationState.INIT
    intent_analysis: Optional[IntentAnalysisResult] = None
    user_profile: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

class PromptTemplate:
    """提示詞模板管理器"""
    
    GENERAL_PROMPT = """您好！我是您的智能助理，專精於技術、商業、生活等多個領域，很高興為您服務。
請描述您的問題或需求，我會根據您的描述提供最合適的協助。
若需要更深入的協助，也歡迎您補充更多細節。

我可以幫助您：
- 技術問題解答與方案建議
- 商業策略分析與規劃
- 生活資訊查詢與建議
- 學習資源推薦與指導

請問有什麼可以幫助您的嗎？"""

    INTENT_ANALYSIS_PROMPT = """請分析以下對話內容：

{conversation}

請回答以下問題並以JSON格式返回：
1. 使用者的核心意圖為何？（main_intent）
2. 關鍵實體與概念有哪些？（key_entities，列表形式）
3. 查詢明確度評分（clarity_score，0-100分）
4. 缺少哪些關鍵資訊？（missing_info，列表形式）
5. 是否存在歧義或不一致？（ambiguities，列表形式）
6. 建議的互動策略（suggested_strategy）

評分標準：
- 關鍵詞覆蓋率 (30%)
- 語意一致性 (30%)
- 上下文完整性 (20%)
- 歧義檢測 (20%)"""

    CLARIFICATION_PROMPT = """基於使用者的查詢和分析結果，我們需要澄清以下資訊：

使用者查詢：{query}
缺失資訊：{missing_info}
歧義項目：{ambiguities}

請生成3-5個引導問題，幫助使用者澄清需求。問題應該：
1. 包含封閉式和開放式問題的組合
2. 採用漏斗式設計（先廣後細）
3. 提供範例選項
4. 友善且易於理解

請以JSON格式返回問題列表。"""

    RAG_RETRIEVAL_PROMPT = """基於以下明確的使用者意圖，請從知識庫中檢索相關資訊：

意圖：{intent}
關鍵實體：{entities}
上下文：{context}

檢索要求：
1. 相關性評分閾值：0.7
2. 返回前5個最相關結果
3. 包含資訊來源標註
4. 優先考慮最新資訊"""

    RESPONSE_GENERATION_PROMPT = """基於檢索結果和對話上下文，生成回應：

使用者查詢：{query}
檢索結果：{retrieval_results}
對話歷史：{conversation_history}

要求：
1. 準確總結相關資訊
2. 標註資訊來源
3. 提供延伸建議或相關問題
4. 保持友善專業的語氣
5. 結構清晰，易於理解"""

class IntentAnalyzer:
    """意圖分析器"""
    
    def analyze(self, conversation: List[Message]) -> IntentAnalysisResult:
        """分析對話意圖"""
        # 這裡應該調用實際的LLM進行分析
        # 為了演示，我們使用模擬實現
        
        last_user_message = next((msg for msg in reversed(conversation) if msg.role == "user"), None)
        if not last_user_message:
            return self._low_confidence_result()
        
        content = last_user_message.content.lower()
        
        # 簡單的規則基礎評分
        clarity_score = self._calculate_clarity_score(content)
        key_entities = self._extract_entities(content)
        missing_info = self._identify_missing_info(content)
        
        if clarity_score > 80:
            confidence_level = IntentClarityLevel.HIGH
            suggested_strategy = "direct_retrieval"
        elif clarity_score > 50:
            confidence_level = IntentClarityLevel.MEDIUM
            suggested_strategy = "guided_clarification"
        else:
            confidence_level = IntentClarityLevel.LOW
            suggested_strategy = "restart_conversation"
        
        return IntentAnalysisResult(
            clarity_score=clarity_score,
            main_intent=self._extract_main_intent(content),
            key_entities=key_entities,
            missing_info=missing_info,
            ambiguities=self._detect_ambiguities(content),
            suggested_strategy=suggested_strategy,
            confidence_level=confidence_level
        )
    
    def _calculate_clarity_score(self, content: str) -> float:
        """計算意圖明確度分數"""
        score = 50.0  # 基礎分數
        
        # 關鍵詞覆蓋率 (30%)
        keywords = ["想要", "需要", "請問", "如何", "什麼", "哪裡", "為什麼", "幫助"]
        keyword_score = sum(10 for kw in keywords if kw in content)
        score += min(keyword_score * 0.3, 30)
        
        # 語句長度 (20%)
        if 10 <= len(content) <= 100:
            score += 20
        elif len(content) > 100:
            score += 10
        
        # 具體性檢查 (20%)
        if any(word in content for word in ["具體", "詳細", "例如", "比如"]):
            score += 20
        
        return min(score, 100)
    
    def _extract_entities(self, content: str) -> List[str]:
        """提取關鍵實體"""
        # 簡化實現，實際應使用NER
        entities = []
        tech_terms = ["AI", "機器學習", "深度學習", "RAG", "LLM", "API"]
        for term in tech_terms:
            if term.lower() in content.lower():
                entities.append(term)
        return entities
    
    def _identify_missing_info(self, content: str) -> List[str]:
        """識別缺失資訊"""
        missing = []
        if "書" in content and not any(word in content for word in ["類型", "主題", "領域"]):
            missing.append("書籍類型或主題")
        if "推薦" in content and not any(word in content for word in ["用途", "目的", "需求"]):
            missing.append("使用目的或具體需求")
        return missing
    
    def _detect_ambiguities(self, content: str) -> List[str]:
        """檢測歧義"""
        ambiguities = []
        ambiguous_terms = ["好", "最新", "最佳", "推薦"]
        for term in ambiguous_terms:
            if term in content:
                ambiguities.append(f"'{term}'的具體標準不明確")
        return ambiguities
    
    def _extract_main_intent(self, content: str) -> str:
        """提取主要意圖"""
        if "推薦" in content:
            return "recommendation"
        elif "如何" in content or "怎麼" in content:
            return "how_to"
        elif "什麼是" in content or "解釋" in content:
            return "explanation"
        elif "比較" in content:
            return "comparison"
        else:
            return "general_query"
    
    def _low_confidence_result(self) -> IntentAnalysisResult:
        """低置信度預設結果"""
        return IntentAnalysisResult(
            clarity_score=0,
            main_intent="unknown",
            key_entities=[],
            missing_info=["使用者查詢"],
            ambiguities=[],
            suggested_strategy="restart_conversation",
            confidence_level=IntentClarityLevel.LOW
        )

class KnowledgeRetriever:
    """知識檢索器"""
    
    def __init__(self, knowledge_base: Optional[Dict[str, Any]] = None):
        self.knowledge_base = knowledge_base or self._init_mock_knowledge_base()
    
    def retrieve(self, query: str, entities: List[str], top_k: int = 5) -> List[Dict[str, Any]]:
        """檢索相關知識"""
        # 模擬檢索實現
        results = []
        
        # 基於實體匹配的簡單檢索
        for entity in entities:
            if entity.lower() in self.knowledge_base:
                results.append({
                    "content": self.knowledge_base[entity.lower()],
                    "source": f"Knowledge Base - {entity}",
                    "relevance_score": 0.9,
                    "timestamp": datetime.now().isoformat()
                })
        
        # 基於查詢的模糊匹配
        for key, value in self.knowledge_base.items():
            if key not in [e.lower() for e in entities] and key in query.lower():
                results.append({
                    "content": value,
                    "source": f"Knowledge Base - {key}",
                    "relevance_score": 0.7,
                    "timestamp": datetime.now().isoformat()
                })
        
        # 排序並返回前k個結果
        results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return results[:top_k]
    
    def _init_mock_knowledge_base(self) -> Dict[str, Any]:
        """初始化模擬知識庫"""
        return {
            "ai": "人工智慧（AI）是指由機器展現的智慧，特別是電腦系統對人類智慧的模擬。",
            "rag": "檢索增強生成（RAG）是一種結合檢索系統和生成模型的技術，用於提高回答的準確性。",
            "llm": "大型語言模型（LLM）是基於深度學習的自然語言處理模型，具有理解和生成人類語言的能力。",
            "機器學習": "機器學習是人工智慧的一個分支，使電腦系統能夠從數據中學習並改進性能。",
            "深度學習": "深度學習是機器學習的子領域，使用多層神經網路來學習數據的複雜模式。"
        }

class ResponseGenerator:
    """回應生成器"""
    
    def generate_response(self, 
                         query: str, 
                         retrieval_results: List[Dict[str, Any]], 
                         context: ConversationContext) -> str:
        """生成回應"""
        if not retrieval_results:
            return self._generate_no_results_response(query)
        
        # 構建回應
        response_parts = []
        
        # 開頭：重述理解
        response_parts.append(f"根據您的查詢：「{query}」")
        response_parts.append("\n我找到了以下相關資訊：\n")
        
        # 主體：檢索結果摘要
        for i, result in enumerate(retrieval_results[:3], 1):
            response_parts.append(f"{i}. {result['content']}")
            response_parts.append(f"   來源：{result['source']}\n")
        
        # 結尾：延伸建議
        response_parts.append("\n您可能還想了解：")
        suggestions = self._generate_suggestions(query, retrieval_results)
        for suggestion in suggestions:
            response_parts.append(f"- {suggestion}")
        
        response_parts.append("\n\n如需更詳細的資訊，請告訴我您具體想了解哪個方面。")
        
        return "\n".join(response_parts)
    
    def generate_clarification_questions(self, 
                                       missing_info: List[str], 
                                       ambiguities: List[str]) -> List[str]:
        """生成澄清問題"""
        questions = []
        
        # 基於缺失資訊生成問題
        for info in missing_info:
            if "類型" in info or "主題" in info:
                questions.append("請問您對哪個領域或主題特別感興趣？例如：技術、商業、文學等")
            elif "目的" in info or "需求" in info:
                questions.append("請問您希望達到什麼目標？是為了學習、工作還是個人興趣？")
        
        # 基於歧義生成問題
        for ambiguity in ambiguities:
            if "標準" in ambiguity:
                questions.append("請問您評判的具體標準是什麼？例如：實用性、創新性、易讀性等")
        
        # 添加通用引導問題
        if len(questions) < 3:
            questions.extend([
                "您能提供更多背景資訊嗎？",
                "有沒有具體的例子可以參考？",
                "您之前有過類似的經驗嗎？"
            ])
        
        return questions[:5]  # 最多返回5個問題
    
    def _generate_no_results_response(self, query: str) -> str:
        """生成無結果回應"""
        return f"""很抱歉，我暫時找不到與「{query}」直接相關的資訊。

這可能是因為：
1. 查詢內容過於專業或特定
2. 我的知識庫中暫無相關資料
3. 需要更多上下文才能準確理解

建議您：
- 嘗試使用不同的關鍵詞
- 提供更多背景資訊
- 將問題分解為更小的部分

請問您可以換個方式描述您的需求嗎？"""
    
    def _generate_suggestions(self, query: str, results: List[Dict[str, Any]]) -> List[str]:
        """生成延伸建議"""
        suggestions = []
        
        # 基於檢索結果生成建議
        if any("AI" in r["content"] or "人工智慧" in r["content"] for r in results):
            suggestions.append("AI在不同行業的應用案例")
            suggestions.append("AI技術的最新發展趨勢")
        
        if any("學習" in r["content"] for r in results):
            suggestions.append("相關的學習資源和課程推薦")
            suggestions.append("實踐項目和練習建議")
        
        # 通用建議
        suggestions.append("相關術語的詳細解釋")
        
        return suggestions[:3]

class LLMInterface(ABC):
    """LLM介面抽象類"""
    
    @abstractmethod
    def generate(self, prompt: str, **kwargs) -> str:
        """生成回應"""
        pass

class MockLLM(LLMInterface):
    """模擬LLM實現"""
    
    def generate(self, prompt: str, **kwargs) -> str:
        """模擬生成回應"""
        # 這裡應該調用實際的LLM API
        # 為了演示，返回預設回應
        if "分析以下對話內容" in prompt:
            return json.dumps({
                "main_intent": "information_seeking",
                "key_entities": ["AI", "技術"],
                "clarity_score": 85,
                "missing_info": [],
                "ambiguities": [],
                "suggested_strategy": "direct_retrieval"
            }, ensure_ascii=False)
        else:
            return "這是模擬的LLM回應。在實際應用中，這裡會調用真實的語言模型。"

class MultiRoundDialogueFramework:
    """多輪對話框架主類"""
    
    def __init__(self, llm: Optional[LLMInterface] = None):
        self.llm = llm or MockLLM()
        self.intent_analyzer = IntentAnalyzer()
        self.knowledge_retriever = KnowledgeRetriever()
        self.response_generator = ResponseGenerator()
        self.sessions: Dict[str, ConversationContext] = {}
        self.prompt_templates = PromptTemplate()
    
    def create_session(self, session_id: str) -> ConversationContext:
        """創建新對話會話"""
        context = ConversationContext(session_id=session_id)
        self.sessions[session_id] = context
        
        # 添加系統歡迎訊息
        welcome_message = Message(
            role="assistant",
            content=self.prompt_templates.GENERAL_PROMPT
        )
        context.messages.append(welcome_message)
        
        logger.info(f"Created new session: {session_id}")
        return context
    
    def process_user_input(self, session_id: str, user_input: str) -> str:
        """處理使用者輸入"""
        # 獲取或創建會話
        if session_id not in self.sessions:
            context = self.create_session(session_id)
        else:
            context = self.sessions[session_id]
        
        # 記錄使用者訊息
        user_message = Message(role="user", content=user_input)
        context.messages.append(user_message)
        
        # 根據當前狀態處理
        if context.current_state == ConversationState.INIT:
            return self._handle_initial_interaction(context)
        elif context.current_state == ConversationState.CLARIFICATION:
            return self._handle_clarification_response(context)
        else:
            return self._handle_continued_interaction(context)
    
    def _handle_initial_interaction(self, context: ConversationContext) -> str:
        """處理初始互動"""
        # 更新狀態
        context.current_state = ConversationState.INTENT_ANALYSIS
        
        # 分析意圖
        intent_result = self.intent_analyzer.analyze(context.messages)
        context.intent_analysis = intent_result
        
        logger.info(f"Intent analysis result: {intent_result}")
        
        # 根據意圖明確度決定路徑
        if intent_result.confidence_level == IntentClarityLevel.HIGH:
            return self._handle_high_confidence_path(context)
        elif intent_result.confidence_level == IntentClarityLevel.MEDIUM:
            return self._handle_clarification_path(context)
        else:
            return self._handle_low_confidence_path(context)
    
    def _handle_high_confidence_path(self, context: ConversationContext) -> str:
        """處理高置信度路徑"""
        context.current_state = ConversationState.RETRIEVAL
        
        # 獲取最後的使用者查詢
        last_user_query = next(msg.content for msg in reversed(context.messages) if msg.role == "user")
        
        # 執行知識檢索
        retrieval_results = self.knowledge_retriever.retrieve(
            query=last_user_query,
            entities=context.intent_analysis.key_entities
        )
        
        # 生成回應
        context.current_state = ConversationState.RESPONSE_GENERATION
        response = self.response_generator.generate_response(
            query=last_user_query,
            retrieval_results=retrieval_results,
            context=context
        )
        
        # 記錄助理回應
        assistant_message = Message(
            role="assistant",
            content=response,
            metadata={"retrieval_count": len(retrieval_results)}
        )
        context.messages.append(assistant_message)
        
        # 更新狀態
        context.current_state = ConversationState.FEEDBACK_COLLECTION
        
        return response
    
    def _handle_clarification_path(self, context: ConversationContext) -> str:
        """處理澄清路徑"""
        context.current_state = ConversationState.CLARIFICATION
        
        # 生成澄清問題
        questions = self.response_generator.generate_clarification_questions(
            missing_info=context.intent_analysis.missing_info,
            ambiguities=context.intent_analysis.ambiguities
        )
        
        # 構建澄清回應
        response_parts = ["為了更好地幫助您，我需要了解更多資訊：\n"]
        for i, question in enumerate(questions, 1):
            response_parts.append(f"{i}. {question}")
        response_parts.append("\n請選擇回答其中一個或多個問題，這將幫助我提供更準確的協助。")
        
        response = "\n".join(response_parts)
        
        # 記錄助理回應
        assistant_message = Message(
            role="assistant",
            content=response,
            metadata={"clarification_questions": questions}
        )
        context.messages.append(assistant_message)
        
        return response
    
    def _handle_clarification_response(self, context: ConversationContext) -> str:
        """處理使用者對澄清問題的回應"""
        # 重新分析意圖（包含新的補充資訊）
        intent_result = self.intent_analyzer.analyze(context.messages)
        context.intent_analysis = intent_result
        
        # 根據新的分析結果決定下一步
        if intent_result.confidence_level == IntentClarityLevel.HIGH:
            return self._handle_high_confidence_path(context)
        elif intent_result.confidence_level == IntentClarityLevel.MEDIUM:
            # 如果還需要澄清，繼續提問但調整策略
            return self._handle_refined_clarification(context)
        else:
            return self._handle_low_confidence_path(context)
    
    def _handle_refined_clarification(self, context: ConversationContext) -> str:
        """處理精化的澄清流程"""
        response = """感謝您的補充資訊。基於您的回答，我有了更好的理解。

讓我確認一下：
"""
        
        # 總結目前理解
        if context.intent_analysis.key_entities:
            response += f"- 您關注的主要內容：{', '.join(context.intent_analysis.key_entities)}\n"
        response += f"- 您的主要目的：{context.intent_analysis.main_intent}\n"
        
        response += "\n這樣理解正確嗎？如果正確，我將為您提供相關資訊。"
        
        # 記錄回應
        assistant_message = Message(role="assistant", content=response)
        context.messages.append(assistant_message)
        
        return response
    
    def _handle_low_confidence_path(self, context: ConversationContext) -> str:
        """處理低置信度路徑"""
        response = """很抱歉，我還不太理解您的需求。

讓我們重新開始。請您用一句話描述：
- 您想要解決什麼問題？
- 或者您想要了解什麼資訊？

例如：
- "我想了解如何開始學習人工智慧"
