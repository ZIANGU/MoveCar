// 立即执行函数，避免全局变量污染
(() => {
    // DOM元素引用
    const elements = {
        notifyBtn: document.getElementById('notifyBtn'),
        messageInput: document.getElementById('messageInput'),
        messageTemplate: document.getElementById('messageTemplate'),
        urgencySelect: document.getElementById('urgencySelect'),
        callSlider: document.getElementById('callSlider'),
        callHandle: document.getElementById('callHandle'),
        callProgress: document.getElementById('callProgress'),
        historyToggle: document.getElementById('historyToggle'),
        historyList: document.getElementById('historyList'),
        historyCount: document.getElementById('historyCount'),
        toastContainer: document.getElementById('toastContainer'),
        themeBtns: document.querySelectorAll('.theme-btn')
    };

    // 状态管理
    const state = {
        lastNotifyTime: 0,
        isDragging: false,
        startX: 0,
        currentX: 0,
        maxProgress: 0,
        notificationHistory: JSON.parse(localStorage.getItem('notificationHistory') || '[]')
    };

    // 触觉反馈功能
    const hapticFeedback = {
        light: () => navigator.vibrate?.(10),
        medium: () => navigator.vibrate?.(30),
        heavy: () => navigator.vibrate?.([50, 50, 50]),
        success: () => navigator.vibrate?.([50, 30, 50, 30, 50])
    };

    // 主题设置功能
    function setTheme(theme) {
        document.body.className = theme;
        elements.themeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
        localStorage.setItem('theme', theme);
        hapticFeedback.light();
    }

    // Toast提示功能
    function showToast(message, type = 'loading') {
        const toastIcon = elements.toastContainer.querySelector('.toast-icon');
        const toastMessage = elements.toastContainer.querySelector('.toast-message');
        
        toastMessage.textContent = message;
        toastIcon.innerHTML = `<div class="toast-${type}"></div>`;
        elements.toastContainer.classList.add('show');
        
        if (type === 'error') hapticFeedback.heavy();
        if (type === 'success') hapticFeedback.medium();

        return new Promise(resolve => {
            if (type !== 'loading') {
                setTimeout(() => {
                    elements.toastContainer.classList.remove('show');
                    setTimeout(resolve, 300);
                }, 2000);
            } else {
                resolve();
            }
        });
    }

    // 更新历史记录显示
    function updateHistoryDisplay() {
        elements.historyCount.textContent = `${state.notificationHistory.length}条记录`;
        elements.historyList.innerHTML = state.notificationHistory.length === 0 
            ? '<div class="history-item">暂无通知记录</div>'
            : state.notificationHistory.map(notification => `
                <div class="history-item">
                    <div class="history-header">
                        <span class="history-message">${notification.message}</span>
                        <span class="history-badge ${notification.urgency}">${
                            notification.urgency === 'high' ? '非常紧急' :
                            notification.urgency === 'medium' ? '紧急' : '普通'
                        }</span>
                    </div>
                    <div class="history-time">
                        ${new Date(notification.timestamp).toLocaleString()}
                    </div>
                </div>
            `).join('');
    }

    // 通知车主功能
    async function notifyOwner() {
        const now = Date.now();
        if (now - state.lastNotifyTime < config.notification.cooldown) {
            const remaining = Math.ceil((config.notification.cooldown - (now - state.lastNotifyTime)) / 1000);
            await showToast(
                `请等待 ${Math.floor(remaining / 60)}分${remaining % 60}秒后再次通知`,
                'error'
            );
            return;
        }

        const message = elements.messageInput.value.trim() || config.notification.defaultMessage;
        const urgency = elements.urgencySelect.value || 'low';
        
        if (!urgency) {
            await showToast('请选择紧急程度', 'error');
            return;
        }
        
        hapticFeedback.medium();
        await showToast('正在通知车主...', 'loading');
        
        try {
            const response = await fetch(config.wxPusher.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appToken: config.wxPusher.appToken,
                    content: `[${urgency === 'high' ? '非常紧急' : urgency === 'medium' ? '紧急' : '普通'}] ${message}`,
                    contentType: 1,
                    uids: config.wxPusher.uids
                })
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            if (data.code === 1000) {
                const notification = {
                    id: Date.now().toString(),
                    message,
                    urgency,
                    timestamp: now
                };

                state.notificationHistory = [notification, ...state.notificationHistory].slice(0, 10);
                localStorage.setItem('notificationHistory', JSON.stringify(state.notificationHistory));
                updateHistoryDisplay();

                hapticFeedback.success();
                await showToast('已成功通知车主，请稍候！', 'success');
                state.lastNotifyTime = now;
                
                elements.messageInput.value = '';
                elements.messageTemplate.value = '';
            } else {
                throw new Error(data.msg || '未知错误');
            }
        } catch (error) {
            console.error('通知发送失败:', error);
            hapticFeedback.heavy();
            await showToast('发送失败，请检查网络后重试', 'error');
        }
    }

    // 滑块更新功能
    function updateSlider(clientX) {
        const rect = elements.callSlider.getBoundingClientRect();
        const maxX = rect.width - elements.callHandle.offsetWidth;
        state.currentX = Math.max(0, Math.min(maxX, clientX - rect.left - elements.callHandle.offsetWidth / 2));
        
        const progress = (state.currentX / maxX) * 100;
        
        if (progress > state.maxProgress) {
            state.maxProgress = progress;
            if (progress > 25 && progress < 90) {
                hapticFeedback.light();
            }
        }
        
        elements.callHandle.style.transform = `translateX(${state.currentX}px)`;
        elements.callProgress.style.width = `${progress}%`;

        if (progress > 90) {
            hapticFeedback.success();
            window.location.href = `tel:${config.phone}`;
            setTimeout(resetSlider, 300);
        }
    }

    // 重置滑块状态
    function resetSlider() {
        elements.callHandle.style.transform = 'translateX(0)';
        elements.callProgress.style.width = '0';
        state.currentX = 0;
        state.isDragging = false;
        state.maxProgress = 0;
        hapticFeedback.medium();
    }

    // 结束拖动处理
    function endDrag() {
        if (!state.isDragging) return;
        state.isDragging = false;
        elements.callHandle.style.transition = 'transform 0.3s';
        elements.callProgress.style.transition = 'width 0.3s';
        resetSlider();
    }

    // 初始化
    function init() {
        // 设置初始主题
        setTheme(localStorage.getItem('theme') || 'light');
        
        // 更新历史记录显示
        updateHistoryDisplay();

        // 绑定事件监听器
        elements.themeBtns.forEach(btn => {
            btn.addEventListener('click', () => setTheme(btn.dataset.theme));
        });

        elements.messageTemplate.addEventListener('change', (e) => {
            if (e.target.value) {
                elements.messageInput.value = e.target.value;
            }
        });

        elements.historyToggle.addEventListener('click', () => {
            elements.historyList.classList.toggle('show');
            hapticFeedback.light();
        });

        elements.notifyBtn.addEventListener('click', notifyOwner);

        // 触摸事件
        elements.callSlider.addEventListener('touchstart', (e) => {
            state.isDragging = true;
            state.startX = e.touches[0].clientX;
            elements.callHandle.style.transition = 'none';
            elements.callProgress.style.transition = 'none';
            hapticFeedback.light();
        }, { passive: true });

        elements.callSlider.addEventListener('touchmove', (e) => {
            if (!state.isDragging) return;
            e.preventDefault();
            updateSlider(e.touches[0].clientX);
        }, { passive: false });

        // 鼠标事件
        elements.callSlider.addEventListener('mousedown', (e) => {
            state.isDragging = true;
            state.startX = e.clientX;
            elements.callHandle.style.transition = 'none';
            elements.callProgress.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!state.isDragging) return;
            e.preventDefault();
            updateSlider(e.clientX);
        }, { passive: false });

        // 结束拖动事件
        ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(event => {
            document.addEventListener(event, endDrag, { passive: true });
        });

        document.addEventListener('touchmove', (e) => {
            if (state.isDragging) e.preventDefault();
        }, { passive: false });
    }

    // 启动应用
    init();
})();