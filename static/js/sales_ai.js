// sales_rag_app/static/js/ai-chat.js (最終修復版)

let salesAIInitialized = false;

// Custom markdown table parser as fallback
function parseMarkdownTable(markdownText) {
    console.log('🔧 Using custom markdown table parser');
    console.log('📄 Input markdown text:', JSON.stringify(markdownText));
    
    try {
        const lines = markdownText.trim().split('\n');
        console.log('📝 Split into lines:', lines.length, 'lines:', lines);
        
        if (lines.length < 3) {
            console.log('❌ Not enough lines for a table (need at least 3)');
            return markdownText; // Not a table, return as-is
        }
        
        // Check if it looks like a table (contains | characters)
        const hasFirstLinePipe = lines[0].includes('|');
        const hasSecondLineSeparator = lines[1].includes('---');
        console.log('🔍 Table format check - First line has |:', hasFirstLinePipe, 'Second line has ---:', hasSecondLineSeparator);
        
        if (!hasFirstLinePipe || !hasSecondLineSeparator) {
            console.log('❌ Not a table format - missing required characters');
            return markdownText; // Not a table format
        }
        
        // Parse header
        const headerCells = lines[0].split('|').map(cell => cell.trim()).filter(cell => cell);
        console.log('📊 Header cells:', headerCells);
        
        // Skip separator line (lines[1])
        console.log('⏭️ Skipping separator line:', lines[1]);
        
        // Parse data rows
        const dataRows = [];
        for (let i = 2; i < lines.length; i++) {
            if (lines[i].includes('|')) {
                const rowCells = lines[i].split('|').map(cell => cell.trim()).filter(cell => cell);
                console.log(`📊 Row ${i-1} cells:`, rowCells);
                dataRows.push(rowCells);
            }
        }
        console.log('📋 Total data rows:', dataRows.length);
        
        // Generate HTML table
        let html = '<table>\n<thead>\n<tr>\n';
        headerCells.forEach((header, index) => {
            // Remove markdown bold formatting (**text**)
            const cleanHeader = header.replace(/\*\*(.*?)\*\*/g, '$1');
            console.log(`📝 Processing header ${index}: "${header}" -> "${cleanHeader}"`);
            html += `<th>${cleanHeader}</th>\n`;
        });
        html += '</tr>\n</thead>\n<tbody>\n';
        
        dataRows.forEach((row, rowIndex) => {
            html += '<tr>\n';
            row.forEach((cell, cellIndex) => {
                // Remove markdown bold formatting and handle other basic formatting
                const cleanCell = cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                console.log(`📝 Processing row ${rowIndex}, cell ${cellIndex}: "${cell}" -> "${cleanCell}"`);
                html += `<td>${cleanCell}</td>\n`;
            });
            html += '</tr>\n';
        });
        
        html += '</tbody>\n</table>';
        
        console.log('✅ Custom parser successfully converted table');
        console.log('🔧 Generated HTML:', html);
        return html;
    } catch (error) {
        console.error('❌ Custom markdown table parser failed:', error);
        console.error('📄 Failed on input:', markdownText);
        return markdownText; // Fallback to original text
    }
}

// Test function for markdown table conversion
function testMarkdownTableConversion() {
    console.log('🧪 Testing markdown table conversion...');
    
    // Sample markdown table similar to backend output
    const sampleMarkdown = `| **規格項目** | **AG958** | **APX958** |
| --- | --- | --- |
| **CPU** | Intel i7-12700H | AMD Ryzen 7 6800H |
| **GPU** | RTX 3060 | RTX 3070 |
| **Memory** | 16GB DDR5 | 32GB DDR5 |`;
    
    console.log('📄 Testing with sample markdown table:');
    console.log(sampleMarkdown);
    
    // Test marked.js with configuration
    try {
        console.log('🧪 Testing configured marked.js...');
        const markedResult = marked.parse(sampleMarkdown);
        console.log('✅ marked.js conversion successful');
        console.log('🔧 marked.js HTML result:', markedResult);
        
        // Check if result contains table elements
        const hasTable = markedResult.includes('<table>');
        const hasTh = markedResult.includes('<th>');
        const hasTd = markedResult.includes('<td>');
        
        console.log('🔍 Table element check - <table>:', hasTable, '<th>:', hasTh, '<td>:', hasTd);
        
        if (hasTable && hasTh && hasTd) {
            console.log('✅ marked.js produced proper table elements');
        } else {
            console.error('❌ marked.js did not produce proper table elements');
            console.log('📄 Raw HTML output:', markedResult);
        }
    } catch (error) {
        console.error('❌ marked.js conversion failed:', error);
    }
    
    // Test custom parser
    try {
        const customResult = parseMarkdownTable(sampleMarkdown);
        console.log('✅ Custom parser conversion completed');
        console.log('🔧 Custom parser HTML result:', customResult);
        
        if (customResult.includes('<table>') && customResult.includes('<th>') && customResult.includes('<td>')) {
            console.log('✅ Custom parser produced proper table elements');
        } else {
            console.warn('⚠️ Custom parser did not produce table elements (may be fallback text)');
        }
    } catch (error) {
        console.error('❌ Custom parser failed:', error);
    }
}

// Configure marked.js with GFM support
function configureMarkedJS() {
    if (typeof marked !== 'undefined') {
        // Configure marked with GitHub Flavored Markdown support
        marked.setOptions({
            gfm: true,        // Enable GitHub Flavored Markdown
            tables: true,     // Enable table support
            breaks: false,    // Disable GFM line breaks (optional)
            pedantic: false,  // Disable pedantic mode
            sanitize: false,  // Don't sanitize HTML (we trust our content)
            smartLists: true,
            smartypants: false
        });
        console.log('✅ marked.js configured with GFM table support');
        return true;
    }
    return false;
}

// Smart markdown renderer with fallback
function renderMarkdownContent(markdownText) {
    console.log('🎯 renderMarkdownContent called with:', typeof markdownText, 'length:', markdownText?.length);
    console.log('📄 Actual content received:', JSON.stringify(markdownText));
    
    if (!markdownText || typeof markdownText !== 'string') {
        console.log('❌ Invalid input - not a string or empty');
        return markdownText;
    }
    
    // Check if content contains table syntax
    const hasTable = markdownText.includes('|') && markdownText.includes('---');
    console.log('🔍 Table detection - Has | character:', markdownText.includes('|'), 'Has --- separator:', markdownText.includes('---'), 'Final result:', hasTable);
    
    if (!hasTable) {
        console.log('📝 No table detected, using marked.js for general markdown');
        // No table, use marked.js for other markdown or return as-is
        if (typeof marked !== 'undefined' && marked.parse) {
            return marked.parse(markdownText);
        }
        return markdownText.replace(/\n/g, '<br>');
    }
    
    // Content has table - try marked.js first
    if (typeof marked !== 'undefined' && marked.parse) {
        try {
            console.log('🧪 Trying marked.js table conversion...');
            const markedResult = marked.parse(markdownText);
            console.log('🔧 marked.js result:', markedResult);
            
            // Verify that marked.js actually created table elements
            const hasTableElement = markedResult.includes('<table>');
            const hasThElement = markedResult.includes('<th>');
            console.log('✅ marked.js validation - Has <table>:', hasTableElement, 'Has <th>:', hasThElement);
            
            if (hasTableElement && hasThElement) {
                console.log('✅ Using marked.js for table rendering');
                return markedResult;
            } else {
                console.warn('⚠️ marked.js did not create proper table, falling back to custom parser');
            }
        } catch (error) {
            console.error('❌ marked.js failed, falling back to custom parser:', error);
        }
    }
    
    // Fallback to custom parser for tables
    console.log('🔧 Using custom parser for table rendering');
    return parseMarkdownTable(markdownText);
}

function initSalesAI() {
    console.log('Initializing Sales AI view...');
    
    // Check if marked.js is loaded and configure it
    if (typeof marked !== 'undefined' && marked.parse) {
        console.log('✅ marked.js is loaded and available');
        configureMarkedJS();
        testMarkdownTableConversion();
    } else {
        console.error('❌ marked.js is not available - tables may not render correctly');
    }
    
    if (salesAIInitialized) {
        console.log('Sales AI already initialized, returning...');
        return;
    }
    
    salesAIInitialized = true;
    console.log('Setting up Sales AI event listeners (one-time)...');
    
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
        console.log("🚀 [renderMultiChatStart] 開始執行，content:", content);
        console.log("🚀 [renderMultiChatStart] container:", container);
        
        let html = `
            <div class="multichat-container">
                <h3>🎯 智能筆電推薦助手</h3>
                <p class="multichat-intro">${content.message || '我將通過幾個問題來了解您的需求，為您推薦最適合的筆電。'}</p>
                
                <!-- 自動啟動一次性問卷模式 -->
                <div class="auto-start-message">
                    <p class="loading-text">正在為您準備問卷，請稍候...</p>
                    <div class="loading-spinner"></div>
                </div>
                
                <div class="multichat-progress" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                    <span class="progress-text">步驟 1 / 7</span>
                </div>
                <div class="multichat-question-area" id="multichat-questions" style="display: none;">
                    <!-- 問題會動態加載到這裡 -->
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // 自動啟動表格模式（一次性問卷）
        console.log("📋 自動啟動表格模式");
        setTimeout(() => {
            startTableMode();
        }, 1000); // 1秒後自動啟動
        
        console.log("🏁 [renderMultiChatStart] 函數執行完成");
    }
    
    // 逐步模式已停用
    
    // 開始表格模式
    async function startTableMode() {
        console.log("📋 啟動表格模式，獲取所有問題...");
        
        try {
            const response = await fetch("/api/sales/chat-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    query: "請幫我一次性回答所有問題", 
                    service_name: "sales_assistant" 
                }),
            });

            if (!response.ok) throw new Error(`HTTP 錯誤！ 狀態: ${response.status}`);
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponseText = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                fullResponseText += chunk;

                const lines = fullResponseText.split('\n\n');
                
                for (let i = 0; i < lines.length - 1; i++) {
                    const line = lines[i];
                    if (line.startsWith('data: ')) {
                        const jsonDataString = line.substring(6);
                        if (jsonDataString) {
                            try {
                                const jsonData = JSON.parse(jsonDataString);
                                if (jsonData.type === 'multichat_all_questions') {
                                    // 創建新的消息容器並渲染表格問卷
                                    const newContainer = createMessageContainer('assistant');
                                    renderAllQuestionsForm(newContainer.querySelector('.message-content'), jsonData);
                                    return;
                                }
                            } catch (e) {
                                console.error("JSON 解析錯誤:", e);
                            }
                        }
                    }
                }
                fullResponseText = lines[lines.length - 1];
            }
            
        } catch (error) {
            console.error("啟動表格模式失敗:", error);
            alert(`啟動表格模式失敗: ${error.message}`);
        }
    }
    
    // 為特定容器啟動表格模式
    async function startTableModeForContainer(container) {
        console.log("📋 為特定容器啟動表格模式，獲取所有問題...");
        
        try {
            const response = await fetch("/api/sales/chat-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    query: "請幫我一次性回答所有問題", 
                    service_name: "sales_assistant" 
                }),
            });

            if (!response.ok) throw new Error(`HTTP 錯誤！ 狀態: ${response.status}`);
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponseText = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                fullResponseText += chunk;

                const lines = fullResponseText.split('\n\n');
                
                for (let i = 0; i < lines.length - 1; i++) {
                    const line = lines[i];
                    if (line.startsWith('data: ')) {
                        const jsonDataString = line.substring(6);
                        if (jsonDataString) {
                            try {
                                const jsonData = JSON.parse(jsonDataString);
                                if (jsonData.type === 'multichat_all_questions') {
                                    // 在指定容器中渲染表格問卷
                                    renderAllQuestionsForm(container, jsonData);
                                    return;
                                }
                            } catch (e) {
                                console.error("JSON 解析錯誤:", e);
                            }
                        }
                    }
                }
                fullResponseText = lines[lines.length - 1];
            }
            
        } catch (error) {
            console.error("為容器啟動表格模式失敗:", error);
            container.innerHTML = `<p style="color: red;">啟動問卷失敗: ${error.message}</p>`;
        }
    }

    function renderMultiChatQuestion(container, content) {
        console.log("渲染 MultiChat 問題", content);
        renderMultiChatQuestionInArea(content);
    }

    function renderMultiChatQuestionInArea(questionData) {
        console.log("📝 [renderMultiChatQuestionInArea] 開始渲染問題:", questionData);
        const questionsArea = document.getElementById('multichat-questions');
        if (!questionsArea) {
            console.error("❌ [renderMultiChatQuestionInArea] 找不到 multichat-questions 元素");
            return;
        }
        
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
        console.log("🎛️ [renderMultiChatQuestionInArea] 找到選項按鈕數量:", optionBtns.length);
        optionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const optionId = btn.dataset.optionId;
                handleMultiChatOptionSelected(optionId, current_step);
            });
        });
        console.log("✅ [renderMultiChatQuestionInArea] 問題渲染完成");
    }

    function renderMultiChatComplete(container, content) {
        console.log("MultiChat 完成", content);
        
        // 檢查是否為表格格式數據
        if (content.is_table_format && content.recommendations) {
            renderTableRecommendations(container, content);
        } else if (content.is_structured && content.recommendations && Array.isArray(content.recommendations)) {
            renderStructuredRecommendations(container, content);
        } else {
            // 回退到原始文字格式
            renderLegacyRecommendations(container, content);
        }
    }
    
    function renderTableRecommendations(container, content) {
        let html = `
            <div class="multichat-complete">
                <div class="analysis-header">
                    <h3>✅ 需求分析完成</h3>
                    <p class="complete-message">${content.message || '根據您的需求，我們為您推薦以下筆電：'}</p>
                </div>
                <div class="table-recommendations">
                    <div class="table-container recommendations-table-text">
                        ${renderMarkdownContent(content.recommendations)}
                    </div>
                </div>
                <div class="action-buttons">
                    <button class="restart-multichat-btn">🔄 重新分析需求</button>
                </div>
            </div>
        `;
        container.innerHTML = html;
        bindRestartButton(container);
    }
    
    function renderStructuredRecommendations(container, content) {
        // 數據驗證
        if (!content.recommendations || !Array.isArray(content.recommendations) || content.recommendations.length === 0) {
            console.warn("推薦數據無效，回退到傳統格式");
            renderLegacyRecommendations(container, content);
            return;
        }
        
        try {
            let html = `
                <div class="multichat-complete">
                    <div class="analysis-header">
                        <h3>✅ 需求分析完成</h3>
                        <div class="analysis-summary">
                            <h4>📊 綜合分析推薦</h4>
                            <p>${content.analysis_summary || '根據您的需求偏好，已為您精選出最適合的筆電機型。'}</p>
                        </div>
                    </div>
                    
                    <div class="recommendations-table-container">
                        <h4>🏆 推薦結果</h4>
                        <table class="recommendations-table">
                            <thead>
                                <tr>
                                    <th>排名</th>
                                    <th>機型名稱</th>
                                    <th>核心規格</th>
                                    <th>推薦原因</th>
                                    <th>匹配度</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            // 添加推薦機型行
            content.recommendations.forEach((rec, index) => {
                if (!rec || typeof rec !== 'object') {
                    console.warn(`推薦項目 ${index} 數據無效:`, rec);
                    return;
                }
                
                const rankClass = index === 0 ? 'rank-first' : index === 1 ? 'rank-second' : 'rank-third';
                const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
                
                // 安全的數據提取
                const modelName = rec.model_name || `機型 ${index + 1}`;
                const reason = rec.recommendation_reason || '推薦原因不詳';
                const score = rec.match_score || null;
                const specs = rec.key_specs || {};
                
                html += `
                    <tr class="recommendation-row ${rankClass}">
                        <td class="rank-cell">
                            <span class="rank-icon">${rankIcon}</span>
                            <span class="rank-number">${rec.rank || index + 1}</span>
                        </td>
                        <td class="model-cell">
                            <strong>${modelName}</strong>
                        </td>
                        <td class="specs-cell">
                            <div class="specs-list">
                                <div>💻 ${specs.cpu || 'N/A'}</div>
                                <div>🎮 ${specs.gpu || 'N/A'}</div>
                                <div>🧠 ${specs.memory || 'N/A'}</div>
                                <div>💾 ${specs.storage || 'N/A'}</div>
                            </div>
                        </td>
                        <td class="reason-cell">
                            ${reason}
                        </td>
                        <td class="score-cell">
                            <div class="score-badge">
                                <span class="score-number">${score || 'N/A'}</span>
                                ${score ? '<span class="score-percent">%</span>' : ''}
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="action-buttons">
                        <button class="restart-multichat-btn">🔄 重新分析需求</button>
                    </div>
                </div>
            `;
            
            container.innerHTML = html;
            bindRestartButton(container);
            
        } catch (error) {
            console.error("渲染結構化推薦時發生錯誤:", error);
            renderLegacyRecommendations(container, content);
        }
    }
    
    function renderLegacyRecommendations(container, content) {
        let html = `
            <div class="multichat-complete">
                <h3>✅ 需求分析完成</h3>
                <p class="complete-message">${content.message || '根據您的需求，我們為您找到了最適合的筆電推薦！'}</p>
                
                <div class="legacy-recommendations">
                    <div class="recommendations-text">
                        ${typeof content.recommendations === 'string' ? 
                          content.recommendations.replace(/\n/g, '<br>') : 
                          JSON.stringify(content.recommendations)}
                    </div>
                </div>
                
                <button class="restart-multichat-btn">🔄 重新分析需求</button>
            </div>
        `;
        
        container.innerHTML = html;
        bindRestartButton(container);
    }
    
    function bindRestartButton(container) {
        
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

    // ✨ 新增：一次性問卷渲染函數
    function renderAllQuestionsForm(container, content) {
        console.log("🚀 [renderAllQuestionsForm] 開始執行，content:", content);
        
        if (!content.questions || !Array.isArray(content.questions)) {
            console.error("❌ 無效的問題數據");
            container.innerHTML = "<p>問題數據載入失敗</p>";
            return;
        }
        
        let html = `
            <div class="multichat-all-container">
                <h3>🎯 筆電需求問卷</h3>
                <p class="multichat-intro">${content.message}</p>
                <div class="questions-progress">
                    <span class="progress-text">請回答以下 ${content.total_questions} 個問題</span>
                </div>
                <form id="all-questions-form" class="questions-table">
        `;
        
        // 為每個問題生成一列
        content.questions.forEach((questionData, index) => {
            html += `
                <div class="question-row" data-step="${questionData.step}" data-feature-id="${questionData.feature_id}">
                    <div class="question-cell">
                        <h4 class="question-title">${questionData.step}. ${questionData.question}</h4>
                    </div>
                    <div class="options-cell">
                        <div class="option-buttons-group" data-question-id="${questionData.feature_id}">
            `;
            
            // 為每個選項生成按鈕
            questionData.options.forEach((option, optIndex) => {
                html += `
                    <label class="option-button">
                        <input type="radio" name="${questionData.feature_id}" value="${option.option_id}" required>
                        <span class="option-content">
                            <span class="option-label">${option.label}</span>
                            <span class="option-description">${option.description}</span>
                        </span>
                    </label>
                `;
            });
            
            html += `
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </form>
                <div class="form-actions">
                    <button type="button" id="submit-all-answers-btn" class="submit-btn" disabled>
                        📝 提交所有回答並獲得推薦
                    </button>
                    <div class="validation-message" id="validation-message"></div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // 綁定事件處理器
        setupAllQuestionsFormHandlers();
        
        console.log("✅ [renderAllQuestionsForm] 問卷渲染完成");
    }
    
    // 設置問卷表單的事件處理器
    function setupAllQuestionsFormHandlers() {
        const form = document.getElementById('all-questions-form');
        const submitBtn = document.getElementById('submit-all-answers-btn');
        const validationMessage = document.getElementById('validation-message');
        
        if (!form || !submitBtn) {
            console.error("❌ 找不到表單元素");
            return;
        }
        
        // 監聽表單變化，啟用/禁用提交按鈕
        form.addEventListener('change', () => {
            const isValid = validateAllQuestionsForm();
            submitBtn.disabled = !isValid;
            updateValidationMessage(isValid);
        });
        
        // 提交按鈕點擊事件
        submitBtn.addEventListener('click', handleAllQuestionsSubmit);
        
        console.log("✅ 問卷事件處理器設置完成");
    }
    
    // 驗證所有問題是否已回答
    function validateAllQuestionsForm() {
        const form = document.getElementById('all-questions-form');
        if (!form) return false;
        
        const questionRows = form.querySelectorAll('.question-row');
        let answeredCount = 0;
        
        questionRows.forEach(row => {
            const featureId = row.dataset.featureId;
            const radioButtons = row.querySelectorAll(`input[name="${featureId}"]`);
            const isAnswered = Array.from(radioButtons).some(radio => radio.checked);
            
            if (isAnswered) {
                answeredCount++;
                row.classList.remove('unanswered');
                row.classList.add('answered');
            } else {
                row.classList.remove('answered');
                row.classList.add('unanswered');
            }
        });
        
        return answeredCount === questionRows.length;
    }
    
    // 更新驗證消息
    function updateValidationMessage(isValid) {
        const validationMessage = document.getElementById('validation-message');
        if (!validationMessage) return;
        
        if (isValid) {
            validationMessage.textContent = "✅ 所有問題已回答完畢，可以提交！";
            validationMessage.className = "validation-message success";
        } else {
            const form = document.getElementById('all-questions-form');
            const totalQuestions = form.querySelectorAll('.question-row').length;
            const answeredQuestions = form.querySelectorAll('.question-row.answered').length;
            
            validationMessage.textContent = `⏳ 還需回答 ${totalQuestions - answeredQuestions} 個問題`;
            validationMessage.className = "validation-message pending";
        }
    }
    
    // 處理所有問題提交
    async function handleAllQuestionsSubmit() {
        console.log("📤 開始提交所有問題的回答");
        
        const form = document.getElementById('all-questions-form');
        const submitBtn = document.getElementById('submit-all-answers-btn');
        
        if (!validateAllQuestionsForm()) {
            alert("請回答所有問題後再提交！");
            return;
        }
        
        // 收集所有答案
        const answers = {};
        const questionRows = form.querySelectorAll('.question-row');
        
        questionRows.forEach(row => {
            const featureId = row.dataset.featureId;
            const checkedRadio = row.querySelector(`input[name="${featureId}"]:checked`);
            if (checkedRadio) {
                answers[featureId] = checkedRadio.value;
            }
        });
        
        console.log("📋 收集到的答案:", answers);
        
        // 顯示提交狀態
        submitBtn.disabled = true;
        submitBtn.textContent = "⏳ 正在分析您的需求...";
        
        try {
            const response = await fetch('/api/sales/multichat-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    answers: answers,
                    service_name: 'sales_assistant'
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP錯誤！狀態: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('📨 後端回應:', result);
            
            // 根據回應類型處理結果
            if (result.type === 'multichat_complete') {
                // 在當前容器中顯示完成結果
                const currentContainer = document.querySelector('.multichat-all-container').parentElement;
                renderMultiChatAllComplete(currentContainer, result);
            } else if (result.type === 'error') {
                alert(`處理錯誤: ${result.message}`);
            }
            
        } catch (error) {
            console.error('❌ 提交失敗:', error);
            alert(`提交失敗: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "📝 提交所有回答並獲得推薦";
        }
    }
    
    // 渲染問卷完成結果
    function renderMultiChatAllComplete(container, content) {
        console.log("✅ 問卷完成，渲染結果", content);
        
        let html = `
            <div class="multichat-complete">
                <h3>🏆 需求分析完成</h3>
                <p class="complete-message">${content.message}</p>
        `;
        
        // 顯示用戶偏好總結
        if (content.preferences_summary) {
            html += `
                <div class="preferences-summary">
                    <h4>📋 您的需求偏好</h4>
                    <div class="preferences-list">
            `;
            
            Object.values(content.preferences_summary).forEach(pref => {
                html += `
                    <div class="preference-item">
                        <strong>${pref.feature_name}:</strong> ${pref.selected_option}
                        <small>${pref.description}</small>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        // 顯示推薦結果
        if (content.recommendations) {
            html += `
                <div class="recommendations">
                    <h4>🎯 推薦結果</h4>
                    <div class="recommendation-content">
                        ${typeof content.recommendations === 'string' ? 
                          renderMarkdownContent(content.recommendations) : 
                          JSON.stringify(content.recommendations)}
                    </div>
                </div>
            `;
        }
        
        html += `
            </div>
        `;
        
        container.innerHTML = html;
    }

    // 處理 MultiChat 選項選擇
    async function handleMultiChatOptionSelected(optionId, currentStep) {
        console.log(`用戶選擇了選項: ${optionId}, 當前步驟: ${currentStep}`);
        
        // 顯示加載狀態
        const questionsArea = document.getElementById('multichat-questions');
        if (questionsArea) {
            questionsArea.innerHTML = '<div class="loading">處理中...</div>';
        }
        
        // 獲取session_id（從多輪對話容器中獲取）
        const multichartContainer = document.querySelector('.multichat-container');
        let sessionId = null;
        if (multichartContainer && multichartContainer.dataset.sessionId) {
            sessionId = multichartContainer.dataset.sessionId;
        }
        
        if (!sessionId) {
            console.error("❌ 找不到 session_id");
            if (questionsArea) {
                questionsArea.innerHTML = '<div class="error">會話資訊遺失，請重新開始</div>';
            }
            return;
        }
        
        try {
            const response = await fetch('/api/sales/multichat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    user_choice: optionId,
                    user_input: "",
                    service_name: "sales_assistant"
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

        // ✨ 新增：處理 MultiChat 回應格式（現在直接切換到問卷模式）
        if (content.type === 'multichat_start') {
            console.log("🔥 檢測到 multichat_start，直接啟動問卷模式", content);
            // 顯示載入提示
            container.innerHTML = `
                <div class="auto-start-message">
                    <p class="loading-text">正在為您準備問卷，請稍候...</p>
                    <div class="loading-spinner"></div>
                </div>
            `;
            
            // 1秒後自動啟動表格模式
            setTimeout(() => {
                startTableModeForContainer(container);
            }, 1000);
            return;
        }
        if (content.type === 'multichat_all_questions') {
            console.log("🔥 檢測到 multichat_all_questions，準備渲染", content);
            if (typeof renderAllQuestionsForm === 'function') {
                console.log("✅ 開始執行 renderAllQuestionsForm");
                renderAllQuestionsForm(container, content);
                return;
            } else {
                console.error("❌ renderAllQuestionsForm 函數未定義");
                container.innerHTML = "<p>問卷功能載入中...</p>";
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
        
        console.log("📄 最終的 markdown 字串:", markdownString);
        console.log("⚠️ [renderMessageContent] 到達函數末尾，這不應該發生在 MultiChat 模式下！");
        
        if (!markdownString) {
            console.error("❌ markdown 字串為空，可能是數據解析問題");
            container.innerHTML = `
                <div class="error-message">
                    <h4>🔧 處理中...</h4>
                    <p>正在準備您的筆電推薦問卷，請稍候。</p>
                    <div class="loading-spinner"></div>
                </div>
            `;
        } else {
            // 使用智能 markdown 渲染器處理內容，支援 markdown table
            container.innerHTML = renderMarkdownContent(markdownString);
        }
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