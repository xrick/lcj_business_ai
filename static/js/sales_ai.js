// sales_rag_app/static/js/ai-chat.js (最終修復版)

let salesAIInitialized = false;
function initSalesAI() {
    if (salesAIInitialized) return;
    salesAIInitialized = true;
    console.log('Initializing Sales AI...');
    
    // DOM 元素獲取
    const userInput = document.getElementById("userInput");
    const sendButton = document.getElementById("sendButton");
    const chatMessages = document.getElementById("chatMessages");
    
    if (!userInput || !sendButton || !chatMessages) {
        console.error('Required DOM elements not found for Sales AI');
        return;
    }

    async function sendMessage() {
        const query = userInput.value.trim();
        if (!query) return;

        appendMessage({ role: "user", content: query });
        userInput.value = "";
        toggleInput(true);

        const thinkingBubble = showThinkingIndicator();

        try {
            const response = await fetch("/api/sales/chat-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: query, service_name: "sales_assistant" }),
            });

            if (!response.ok) throw new Error(`HTTP 錯誤！ 狀態: ${response.status}`);
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            let assistantMessageContainer = null;
            let fullResponseText = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                fullResponseText += chunk;

                // 嘗試處理完整的 SSE 訊息
                const lines = fullResponseText.split('\n\n');
                
                for (let i = 0; i < lines.length -1; i++) {
                     const line = lines[i];
                     if (line.startsWith('data: ')) {
                        const jsonDataString = line.substring(6);
                        if (jsonDataString) {
                            if (thinkingBubble && document.body.contains(thinkingBubble)) {
                                 thinkingBubble.remove();
                            }
                            try {
                                const jsonData = JSON.parse(jsonDataString);
                                if (!assistantMessageContainer) {
                                    assistantMessageContainer = createMessageContainer('assistant');
                                }
                                renderMessageContent(assistantMessageContainer.querySelector('.message-content'), jsonData);
                            } catch (e) {
                                console.error("JSON 解析錯誤:", e, "Data:", jsonDataString);
                                if (assistantMessageContainer) {
                                    renderMessageContent(assistantMessageContainer.querySelector('.message-content'), { error: `回應格式錯誤: ${e.message}` });
                                }
                            }
                        }
                    }
                }
                // 保留不完整的訊息片段以供下次處理
                fullResponseText = lines[lines.length - 1];
            }
        } catch (error) {
            console.error("請求錯誤:", error);
            if(thinkingBubble && document.body.contains(thinkingBubble)) thinkingBubble.remove();
            appendMessage({ role: 'assistant', content: { error: `請求失敗: ${error.message}` } });
        } finally {
            toggleInput(false);
            userInput.focus();
        }
    }

    function createMessageContainer(role) {
        // ... (此函數與上一版相同，此處省略以保持簡潔)
        const messageContainer = document.createElement('div');
        messageContainer.className = `message-container ${role}`;
        messageContainer.dataset.role = role;
        const messageCard = document.createElement('div');
        messageCard.className = 'message-card';
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageCard.appendChild(messageContent);
        if (role === 'assistant') {
            const copyBtnTemplate = document.getElementById('copy-to-clipboard-template').innerHTML;
            messageCard.insertAdjacentHTML('beforeend', copyBtnTemplate);
            messageCard.querySelector('.copy-btn').addEventListener('click', () => {
                const content = messageContainer.assistantData;
                copyToClipboard(content);
            });
        }
        messageContainer.appendChild(messageCard);
        chatMessages.appendChild(messageContainer);
        return messageContainer;
    }

    function appendMessage(message) {
        // ... (此函數與上一版相同，此處省略以保持簡潔)
        const messageContainer = createMessageContainer(message.role);
        renderMessageContent(messageContainer.querySelector('.message-content'), message.content);
        if (message.role === 'assistant') {
             messageContainer.assistantData = message.content;
        }
        scrollToBottom();
    }
    
    // ✨ MultiChat 渲染函數（必須在 renderMessageContent 之前定義）
    function renderMultiChatStart(container, content) {
        console.log("開始 MultiChat 對話", content);
        
        let html = `
            <div class="multichat-container">
                <h3>🎯 智能筆電推薦助手</h3>
                <p class="multichat-intro">${content.message || '我將通過幾個問題來了解您的需求，為您推薦最適合的筆電。'}</p>
                <div class="multichat-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                    <span class="progress-text">步驟 1 / 7</span>
                </div>
                <div class="multichat-question-area" id="multichat-questions">
                    <!-- 問題會動態加載到這裡 -->
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // 開始第一個問題
        if (content.first_question) {
            setTimeout(() => {
                renderMultiChatQuestionInArea(content.first_question);
            }, 500);
        }
    }

    function renderMultiChatQuestion(container, content) {
        console.log("渲染 MultiChat 問題", content);
        renderMultiChatQuestionInArea(content);
    }

    function renderMultiChatQuestionInArea(questionData) {
        const questionsArea = document.getElementById('multichat-questions');
        if (!questionsArea) return;
        
        const { question, options, current_step, total_steps } = questionData;
        
        // 更新進度條
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');
        if (progressFill && progressText) {
            const progress = (current_step / total_steps) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `步驟 ${current_step} / ${total_steps}`;
        }
        
        let html = `
            <div class="multichat-question" data-step="${current_step}">
                <h4 class="question-title">${question}</h4>
                <div class="multichat-options">
        `;
        
        options.forEach((option, index) => {
            html += `
                <button class="multichat-option-btn" data-option-id="${option.option_id}">
                    <span class="option-label">${option.label}</span>
                    <span class="option-description">${option.description}</span>
                </button>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        questionsArea.innerHTML = html;
        
        // 綁定選項點擊事件
        const optionBtns = questionsArea.querySelectorAll('.multichat-option-btn');
        optionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const optionId = btn.dataset.optionId;
                handleMultiChatOptionSelected(optionId, current_step);
            });
        });
    }

    function renderMultiChatComplete(container, content) {
        console.log("MultiChat 完成", content);
        
        let html = `
            <div class="multichat-complete">
                <h3>✅ 需求分析完成</h3>
                <p class="complete-message">${content.message || '根據您的需求，我們為您找到了最適合的筆電推薦！'}</p>
        `;
        
        if (content.recommendations && content.recommendations.length > 0) {
            html += `
                <div class="recommendations">
                    <h4>🏆 推薦機型</h4>
                    <div class="recommendation-list">
            `;
            
            content.recommendations.forEach((rec, index) => {
                html += `
                    <div class="recommendation-item">
                        <h5>${rec.model_name}</h5>
                        <p class="rec-reason">${rec.reason}</p>
                        <div class="rec-specs">
                            <span>💻 ${rec.cpu || 'N/A'}</span>
                            <span>🎮 ${rec.gpu || 'N/A'}</span>
                            <span>🧠 ${rec.memory || 'N/A'}</span>
                            <span>💰 ${rec.price || 'N/A'}</span>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        html += `
                <button class="restart-multichat-btn">🔄 重新分析需求</button>
            </div>
        `;
        
        container.innerHTML = html;
        
        // 綁定重新開始按鈕
        const restartBtn = container.querySelector('.restart-multichat-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                // 觸發新的 MultiChat 流程
                userInput.value = "請幫我重新分析筆電需求";
                sendMessage();
            });
        }
    }

    // 處理 MultiChat 選項選擇
    async function handleMultiChatOptionSelected(optionId, currentStep) {
        console.log(`用戶選擇了選項: ${optionId}, 當前步驟: ${currentStep}`);
        
        // 顯示加載狀態
        const questionsArea = document.getElementById('multichat-questions');
        if (questionsArea) {
            questionsArea.innerHTML = '<div class="loading">處理中...</div>';
        }
        
        try {
            const response = await fetch('/api/sales/multichat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    option_id: optionId,
                    current_step: currentStep
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP錯誤！狀態: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('MultiChat API 回應:', result);
            
            // 根據回應類型處理
            if (result.type === 'multichat_question') {
                renderMultiChatQuestionInArea(result);
            } else if (result.type === 'multichat_complete') {
                const container = document.querySelector('#multichat-questions').closest('.multichat-container');
                if (container) {
                    renderMultiChatComplete(container, result);
                }
            }
            
        } catch (error) {
            console.error('MultiChat API 錯誤:', error);
            if (questionsArea) {
                questionsArea.innerHTML = `<div class="error">處理錯誤: ${error.message}</div>`;
            }
        }
    }
    
    // ✨✨✨ 全新的、更強健的渲染函數 ✨✨✨
    function renderMessageContent(container, content) {
        console.log("renderMessageContent 被調用，content:", content);
        
        if (!content) {
            container.innerHTML = "<p>收到空的回應。</p>";
            return;
        }
        if (typeof content === 'string') {
            container.innerHTML = content;
            return;
        }
        if (content.error) {
            container.innerHTML = `<p style="color: red;"><strong>錯誤：</strong> ${content.error}</p>`;
            return;
        }

        // ✨ 新增：處理 MultiChat 回應格式
        if (content.type === 'multichat_start') {
            console.log("檢測到 multichat_start，準備渲染");
            if (typeof renderMultiChatStart === 'function') {
                renderMultiChatStart(container, content);
                return;
            } else {
                console.error("renderMultiChatStart 函數未定義");
                container.innerHTML = "<p>MultiChat 功能載入中...</p>";
                return;
            }
        }
        if (content.type === 'multichat_question') {
            console.log("檢測到 multichat_question，準備渲染");
            if (typeof renderMultiChatQuestion === 'function') {
                renderMultiChatQuestion(container, content);
                return;
            } else {
                console.error("renderMultiChatQuestion 函數未定義");
                container.innerHTML = "<p>MultiChat 功能載入中...</p>";
                return;
            }
        }
        if (content.type === 'multichat_complete') {
            console.log("檢測到 multichat_complete，準備渲染");
            if (typeof renderMultiChatComplete === 'function') {
                renderMultiChatComplete(container, content);
                return;
            } else {
                console.error("renderMultiChatComplete 函數未定義");
                container.innerHTML = "<p>MultiChat 功能載入中...</p>";
                return;
            }
        }

        let markdownString = "";

        // 1. 智慧處理 answer_summary
        if (content.answer_summary) {
            if (typeof content.answer_summary === 'string') {
                markdownString += `<div class="answer-summary">${content.answer_summary}</div>\n\n`;
            } else if (typeof content.answer_summary === 'object') {
                // 處理字典格式的 answer_summary
                if (content.answer_summary['主要差异']) {
                    // 從主要差异中提取信息
                    const differences = content.answer_summary['主要差异'];
                    if (Array.isArray(differences)) {
                        const summaryText = differences.map(item => {
                            if (typeof item === 'object' && item['方面']) {
                                // 處理 {方面: "...", AG958: "...", APX958: "..."} 格式
                                const aspect = item['方面'];
                                const values = Object.entries(item)
                                    .filter(([key]) => key !== '方面')
                                    .map(([model, value]) => `${model}: ${value}`)
                                    .join(' vs ');
                                return `- **${aspect}**: ${values}`;
                            } else if (typeof item === 'object' && item['特征']) {
                                // 處理 {特征: "...", ...} 格式
                                const values = Object.values(item).slice(1); // 跳過 '特征' 鍵
                                return `- **${item['特征']}**: ${values.join(' vs ')}`;
                            }
                            return `- ${JSON.stringify(item)}`;
                        }).join('\n');
                        markdownString += `<div class="answer-summary">**主要差異**:\n${summaryText}</div>\n\n`;
                    }
                } else {
                    // 其他字典格式的處理
                    const summaryText = Object.values(content.answer_summary).flat().map(item => {
                        if (typeof item === 'object') {
                            const values = Object.values(item);
                            return `- **${values[0]}**: ${values.slice(1).join(', ')}`;
                        }
                        return `- ${item}`;
                    }).join('\n');
                    if (summaryText) {
                        markdownString += `<div class="answer-summary">**主要差異**:\n${summaryText}</div>\n\n`;
                    }
                }
            }
        }
        
        // 2. 處理 comparison_table - 支持多種格式
        let tableData = content.comparison_table;
        console.log("tableData:", tableData, "類型:", typeof tableData, "是否為陣列:", Array.isArray(tableData));
        
        if (tableData) {
            markdownString += "### 詳細規格比較表：\n\n";
            
            // 檢查是否為標準的 list-of-dicts 格式
            if (Array.isArray(tableData) && tableData.length > 0) {
                console.log("檢測到標準 list-of-dicts 格式");
                // 標準格式：每個元素都是 {feature: "...", model1: "...", model2: "..."}
                markdownString += generateMarkdownTable(tableData);
            } else if (typeof tableData === 'object' && !Array.isArray(tableData)) {
                console.log("檢測到字典格式，開始轉換");
                // 字典格式：{feature: [...], model1: [...], model2: [...]}
                const convertedTable = convertDictToTable(tableData);
                console.log("轉換後的表格:", convertedTable);
                markdownString += generateMarkdownTable(convertedTable);
            } else {
                console.log("表格數據格式不支援:", tableData);
                markdownString += "表格數據格式不支援\n";
            }
        }

        // 3. 處理結論
        if (content.conclusion) {
            markdownString += `### 結論建議\n${content.conclusion}\n\n`;
        }
        
        console.log("最終的 markdown 字串:", markdownString);
        container.innerHTML = marked.parse(markdownString || "無法解析回應內容。");
        if (container.parentElement?.parentElement) {
             container.parentElement.parentElement.assistantData = content;
        }
    }

    /**
     * 將字典格式的表格轉換為標準的 list-of-dicts 格式
     * @param {Object} dictTable - 字典格式的表格數據
     * @returns {Array<Object>} - 轉換後的標準格式
     */
    function convertDictToTable(dictTable) {
        console.log("convertDictToTable 被調用，輸入:", dictTable);
        
        const keys = Object.keys(dictTable);
        console.log("字典鍵:", keys);
        
        if (keys.length === 0) return [];
        
        // 找到特徵名稱列表（通常是第一個鍵）
        const featureKey = keys[0];
        const features = dictTable[featureKey];
        const modelNames = keys.slice(1);
        
        console.log("特徵鍵:", featureKey, "特徵列表:", features, "模型名稱:", modelNames);
        
        if (!Array.isArray(features)) {
            console.log("特徵不是陣列，返回空陣列");
            return [];
        }
        
        const convertedTable = [];
        features.forEach((feature, index) => {
            const row = { feature: feature };
            modelNames.forEach(modelName => {
                if (Array.isArray(dictTable[modelName]) && index < dictTable[modelName].length) {
                    row[modelName] = dictTable[modelName][index];
                } else {
                    row[modelName] = 'N/A';
                }
            });
            convertedTable.push(row);
        });
        
        console.log("轉換結果:", convertedTable);
        return convertedTable;
    }

    /**
     * 根據長表格資料產生 Markdown 字串
     * @param {Array<Object>} table - 長表格陣列
     * @returns {string} - Markdown 表格字串
     */
    function generateMarkdownTable(table) {
        if (!table || table.length === 0) return "";
        
        const headers = Object.keys(table[0]);
        let markdown = `| ${headers.join(' | ')} |\n`;
        markdown += `|${headers.map(() => '---').join('|')}|\n`;

        table.forEach(row => {
            const rowData = headers.map(header => row[header] || 'N/A');
            markdown += `| ${rowData.join(' | ')} |\n`;
        });

        return markdown;
    }

    // --- 其他輔助函數 (showThinkingIndicator, toggleInput, scrollToBottom, copyToClipboard, Event Listeners) ---
    // 這些函數可以保留您現有的版本，或使用我上一回答中提供的版本，它們的功能是標準的。
    // 為求完整，此處提供簡化版。
    function showThinkingIndicator() {
        const existingIndicator = document.getElementById('thinking-indicator');
        if(existingIndicator) return existingIndicator;
        const container = document.createElement('div');
        container.id = 'thinking-indicator';
        container.className = 'message-container assistant';
        container.innerHTML = `<div class="message-card"><div class="message-content thinking-indicator"><div class="spinner"></div><span>AI 正在思考中...</span></div></div>`;
        chatMessages.appendChild(container);
        scrollToBottom();
        return container;
    }
    function toggleInput(disabled) {
        userInput.disabled = disabled;
        sendButton.disabled = disabled;
    }
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    function copyToClipboard(content) {
        // 簡單實現
        const textToCopy = JSON.stringify(content, null, 2);
        navigator.clipboard.writeText(textToCopy).then(() => alert("已複製 JSON 到剪貼簿！"));
    }

    userInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    sendButton.addEventListener("click", sendMessage);
    const presetButtons = document.querySelector('.preset-buttons');
    if (presetButtons) {
        presetButtons.addEventListener('click', (e) => {
            if (e.target.classList.contains('preset-btn')) {
                userInput.value = e.target.dataset.question;
                sendMessage();
            }
        });
    }
}

// Make initSalesAI available globally
window.initSalesAI = initSalesAI;