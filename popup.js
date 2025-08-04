// DOM 요소들
const selectedTextContainer = document.getElementById('selectedTextContainer');
const selectedText = document.getElementById('selectedText');
const textSource = document.getElementById('textSource');
const noTextState = document.getElementById('noTextState');
const actionButtons = document.getElementById('actionButtons');
const loadingState = document.getElementById('loadingState');
const successMessage = document.getElementById('successMessage');
const successDesc = document.getElementById('successDesc');
const successDetails = document.getElementById('successDetails');
const successActions = document.getElementById('successActions');
const calendarBtn = document.getElementById('calendarBtn');


const settingsBtn = document.getElementById('settingsBtn');
const clipboardBtn = document.getElementById('clipboardBtn');

// 현재 선택된 텍스트와 소스
let currentSelectedText = '';
let currentTextSource = ''; // 'selection' 또는 'clipboard'

// 팝업 초기화
document.addEventListener('DOMContentLoaded', async () => {
    console.log('SmartCalendar 팝업 초기화');
    await initializePopup();
    setupEventListeners();
});

// 클립보드 권한 확인
async function checkClipboardPermission() {
    try {
        // 권한 상태 확인
        const permissionStatus = await navigator.permissions.query({ name: 'clipboard-read' });
        console.log('클립보드 권한 상태:', permissionStatus.state);
        
        if (permissionStatus.state === 'granted') {
            return true;
        } else if (permissionStatus.state === 'prompt') {
            // 권한 요청
            try {
                await navigator.clipboard.readText();
                return true;
            } catch (error) {
                console.log('클립보드 권한 요청 실패:', error);
                return false;
            }
        } else {
            return false;
        }
    } catch (error) {
        console.log('권한 확인 중 오류:', error);
        return false;
    }
}

// 팝업 초기화 함수 (클립보드 중심)
async function initializePopup() {
    try {
        console.log('팝업 초기화 시작');
        
        // 클립보드 권한 확인
        const hasPermission = await checkClipboardPermission();
        if (!hasPermission) {
            showPermissionRequiredState();
            return;
        }
        
        // 자동으로 클립보드에서 텍스트 가져오기 시도
        await readFromClipboard();
        
    } catch (error) {
        console.error('팝업 초기화 오류:', error);
        showNoTextState();
    }
}

// 권한 필요 상태 표시
function showPermissionRequiredState() {
    selectedTextContainer.classList.add('hidden');
    actionButtons.classList.add('hidden');
    textSource.classList.add('hidden');
    noTextState.classList.remove('hidden');
    noTextState.classList.add('fade-in');
    
    // 권한 요청 버튼 추가
    noTextState.innerHTML = `
        <div class="text-center">
            <svg class="w-8 h-8 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
            <h3 class="text-base font-medium text-gray-900 mb-2">클립보드 접근 권한 필요</h3>
            <p class="text-sm text-gray-500 mb-4">클립보드의 텍스트를 읽기 위해 권한이 필요합니다.</p>
            <button id="requestPermissionBtn" class="btn primary-btn">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                권한 허용하기
            </button>
        </div>
    `;
    
    // 권한 요청 버튼 이벤트 리스너 추가
    const requestBtn = document.getElementById('requestPermissionBtn');
    if (requestBtn) {
        requestBtn.addEventListener('click', handlePermissionRequest);
    }
}

// 권한 요청 처리
async function handlePermissionRequest() {
    try {
        console.log('클립보드 권한 요청 시작');
        
        // 권한 요청 버튼 비활성화
        const requestBtn = document.getElementById('requestPermissionBtn');
        if (requestBtn) {
            requestBtn.disabled = true;
            requestBtn.innerHTML = `
                <svg class="w-4 h-4 animate-spin mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                권한 요청 중...
            `;
        }
        
        // 클립보드 읽기 시도 (권한 요청)
        await navigator.clipboard.readText();
        
        console.log('클립보드 권한 획득 성공');
        showNotification('클립보드 권한이 허용 되었습니다', 'success');
        
        // 클립보드에서 텍스트 읽기 재시도
        await readFromClipboard();
        
    } catch (error) {
        console.error('클립보드 권한 요청 실패:', error);
        
        // 권한 요청 버튼 복원
        const requestBtn = document.getElementById('requestPermissionBtn');
        if (requestBtn) {
            requestBtn.disabled = false;
            requestBtn.innerHTML = `
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                권한 허용하기
            `;
        }
        
        showNotification('클립보드 접근 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.', 'error');
        
        // 수동 설정 안내
        noTextState.innerHTML = `
            <div class="text-center">
                <svg class="w-8 h-8 mx-auto mb-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
                <h3 class="text-base font-medium text-gray-900 mb-2">권한이 거부되었습니다</h3>
                <p class="text-sm text-gray-500 mb-4">수동으로 권한을 허용해주세요:</p>
                <div class="text-xs text-gray-400 text-left bg-gray-50 p-3 rounded mb-4">
                    <p class="mb-2"><strong>Chrome 설정 방법:</strong></p>
                    <ol class="list-decimal list-inside space-y-1">
                        <li>chrome://extensions/ 접속</li>
                        <li>SmartCalendar 확장 프로그램 찾기</li>
                        <li>"세부정보" 클릭</li>
                        <li>"사이트에 대한 권한" → "클립보드 읽기" 허용</li>
                    </ol>
                </div>
                <button id="retryPermissionBtn" class="btn secondary-btn">
                    다시 시도
                </button>
            </div>
        `;
        
        // 다시 시도 버튼 이벤트 리스너 추가
        const retryBtn = document.getElementById('retryPermissionBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                initializePopup();
            });
        }
    }
}

// 클립보드에서 텍스트 읽어오기 (개선된 버전)
async function readFromClipboard() {
    try {
        console.log('클립보드에서 텍스트 읽기 시작');
        
        // 권한 재확인
        const hasPermission = await checkClipboardPermission();
        if (!hasPermission) {
            showPermissionRequiredState();
            return;
        }
        
        clipboardBtn.disabled = true;
        clipboardBtn.innerHTML = `
            <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <span>읽는 중...</span>
        `;
        
        // 직접 클립보드에서 텍스트 읽기
        console.log('클립보드에서 텍스트 읽기 시도');
        const clipboardText = await navigator.clipboard.readText();
        console.log('클립보드 텍스트:', clipboardText);
        
        if (clipboardText && clipboardText.trim()) {
            currentSelectedText = clipboardText.trim();
            currentTextSource = 'clipboard';
            console.log('클립보드 텍스트 설정 완료:', currentSelectedText);
            showSelectedText(currentSelectedText, currentTextSource);
            resetClipboardButton();
        } else {
            console.log('클립보드에 텍스트 없음');
            showNoTextState();
            resetClipboardButton();
        }
    } catch (error) {
        console.error('클립보드 읽기 오류:', error);
        
        if (error.name === 'NotAllowedError') {
            showPermissionRequiredState();
        } else {
            showNotification('클립보드 읽기에 실패했습니다.', 'error');
            showNoTextState();
        }
        resetClipboardButton();
    }
}

// 클립보드 버튼 초기화
function resetClipboardButton() {
    clipboardBtn.disabled = false;
    clipboardBtn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
        </svg>
        <span>클립보드에서 텍스트 가져오기</span>
    `;
}

// 선택된 텍스트 표시
function showSelectedText(text, source) {
    if (text && text.length > 0) {
        selectedText.textContent = text.length > 100 ? text.substring(0, 100) + '...' : text;
        selectedTextContainer.classList.remove('hidden');
        noTextState.classList.add('hidden');
        actionButtons.classList.remove('hidden');
        actionButtons.classList.add('fade-in');
        
        // 텍스트 소스 표시
        textSource.textContent = source === 'clipboard' ? '클립보드에서 가져옴' : '텍스트 선택';
        textSource.className = `text-source ${source}`;
        textSource.classList.remove('hidden');
    } else {
        showNoTextState();
    }
}

// 텍스트가 선택되지 않은 상태 표시
function showNoTextState() {
    selectedTextContainer.classList.add('hidden');
    actionButtons.classList.add('hidden');
    textSource.classList.add('hidden');
    noTextState.classList.remove('hidden');
    noTextState.classList.add('fade-in');
}

// 로딩 상태 표시
function showLoading() {
    selectedTextContainer.classList.add('hidden');
    actionButtons.classList.add('hidden');
    noTextState.classList.add('hidden');
    textSource.classList.add('hidden');
    successMessage.classList.add('hidden');
    loadingState.classList.remove('hidden');
}

// 액션 버튼들 숨기기
function hideLoading() {
    loadingState.classList.add('hidden');
    if (currentSelectedText) {
        showSelectedText(currentSelectedText, currentTextSource);
    } else {
        showNoTextState();
    }
}

// 성공 메시지 표시
function showSuccessMessage(message, data = null) {
    selectedTextContainer.classList.add('hidden');
    actionButtons.classList.add('hidden');
    noTextState.classList.add('hidden');
    loadingState.classList.add('hidden');
    textSource.classList.add('hidden');
    
    successDesc.textContent = message;
    successDetails.innerHTML = '';
    successActions.innerHTML = '';
    
    // 데이터가 있으면 상세 정보 표시
    if (data) {
        if (data.eventId && data.htmlLink) {
            // 일정 등록 성공
            const detailsHTML = `
                <div class="detail-item">
                    <span class="detail-label">일정 제목:</span>
                    <span class="detail-value">${data.summary}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">시작 시간:</span>
                    <span class="detail-value">${new Date(data.startTime).toLocaleString('ko-KR')}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">종료 시간:</span>
                    <span class="detail-value">${new Date(data.endTime).toLocaleString('ko-KR')}</span>
                </div>
                ${data.location ? `
                <div class="detail-item">
                    <span class="detail-label">장소:</span>
                    <span class="detail-value">${data.location}</span>
                </div>
                ` : ''}
                ${data.description ? `
                <div class="detail-item">
                    <span class="detail-label">설명:</span>
                    <span class="detail-value">${data.description.length > 50 ? data.description.substring(0, 50) + '...' : data.description}</span>
                </div>
                ` : ''}
                ${data.isDuplicate ? `
                <div class="detail-item">
                    <span class="detail-label">알림:</span>
                    <span class="detail-value" style="color: #f59e0b;">동일한 제목의 일정이 이미 존재할 수 있습니다.</span>
                </div>
                ` : ''}
            `;
            successDetails.innerHTML = detailsHTML;
            
            // 액션 버튼들
            const actionsHTML = `
                <button class="action-btn primary-btn" data-action="openCalendar" data-link="${data.htmlLink}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    일정 보기
                </button>
                <button class="action-btn secondary-btn" data-action="restart">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
                    </svg>
                    다시 시작
                </button>
            `;
            successActions.innerHTML = actionsHTML;
        }
    }
    
    successMessage.classList.remove('hidden');
    successMessage.classList.add('fade-in');
    
    // 성공 메시지 버튼 이벤트 리스너 추가
    setupSuccessMessageListeners();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 일정 등록 버튼
    calendarBtn.addEventListener('click', async () => {
        if (!currentSelectedText) return;
        
        showLoading();
        try {
            await handleCalendarAction();
        } catch (error) {
            console.error('일정 등록 오류:', error);
            showError('일정 등록 중 오류가 발생했습니다.');
        } finally {
            hideLoading();
        }
    });





    // 클립보드 버튼
    clipboardBtn.addEventListener('click', readFromClipboard);

    // 설정 버튼
    settingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
}

// 일정 등록 처리
async function handleCalendarAction() {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'createCalendarEvent',
            text: currentSelectedText
        });
        
        if (response && response.success) {
            showSuccessMessage(response.message || '일정이 성공적으로 등록되었습니다!', response.data);
        } else {
            // 일정 정보 추출 실패 시 특별한 처리
            if (response?.error === 'extract_failed') {
                showExtractFailedDialog(response.message, response.details);
            } else {
                showError(response?.error || '일정 등록에 실패했습니다.');
            }
        }
    } catch (error) {
        console.error('일정 등록 메시지 전송 오류:', error);
        showError('백그라운드 스크립트와 연결할 수 없습니다. 확장 프로그램을 다시 로드해주세요.');
    }
}







// 일정 정보 추출 실패 다이얼로그 표시
function showExtractFailedDialog(message, details) {
    // 기존 다이얼로그가 있다면 제거
    const existingDialog = document.getElementById('extract-failed-dialog');
    if (existingDialog) {
        existingDialog.remove();
    }
    // 다이얼로그 생성 (SmartCalendar 스타일)
    const dialog = document.createElement('div');
    dialog.id = 'extract-failed-dialog';
    dialog.className = 'fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4';
    dialog.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-gray-100 animate-fade-in">
            <div class="flex flex-col items-center p-6">
                <div class="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 mb-3">
                    <svg class="w-7 h-7 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M6.938 19h10.124c1.54 0 2.502-1.667 1.732-2.5L13.732 5c-.77-.833-1.964-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                </div>
                <h3 class="text-base font-semibold text-gray-900 mb-2">일정 정보 추출 실패</h3>
                <div class="text-sm text-gray-700 text-center mb-2">${message}</div>
                <div class="selected-text text-center mb-4">${details}</div>
                <button id="extract-failed-confirm" class="button calendar-btn">확인</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
    // 확인 버튼 이벤트 리스너
    const confirmBtn = dialog.querySelector('#extract-failed-confirm');
    confirmBtn.addEventListener('click', () => {
        dialog.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            dialog.remove();
        }, 150);
    });
    // 배경 클릭 시 다이얼로그 닫기
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.classList.add('opacity-0', 'scale-95');
            setTimeout(() => {
                dialog.remove();
            }, 150);
        }
    });
    // ESC 키로 다이얼로그 닫기
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            dialog.classList.add('opacity-0', 'scale-95');
            setTimeout(() => {
                dialog.remove();
            }, 150);
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// 성공 메시지 표시
function showSuccess(message) {
    showNotification(message, 'success');
}

// 오류 메시지 표시
function showError(message) {
    showNotification(message, 'error');
}

// 알림 메시지 표시 (가독성 향상 스타일)
function showNotification(message, type = 'info') {
    // 기존 알림 제거
    const existingNotification = document.querySelector('.notification-toast');
    if (existingNotification) {
        existingNotification.remove();
    }

    // 새로운 알림 생성
    const notification = document.createElement('div');
    notification.className = 'notification-toast';

    // 가독성 높은 스타일 적용
    const baseClasses = [
        'fixed', 'bottom-6', 'left-1/2', 'transform', '-translate-x-1/2',
        'min-w-[240px]', 'max-w-xs', 'px-5', 'py-3', 'rounded-xl',
        'text-base', 'font-semibold', 'z-50', 'shadow-2xl', 'transition-all', 'duration-200',
        'flex', 'items-center', 'gap-3', 'border'
    ].join(' ');

    let icon = '';
    let colorClasses = '';
    if (type === 'success') {
        icon = `<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
        colorClasses = 'bg-green-50 border-green-200 text-green-800';
    } else if (type === 'error') {
        icon = `<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
        colorClasses = 'bg-red-50 border-red-200 text-red-800';
    } else {
        icon = `<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01"></path></svg>`;
        colorClasses = 'bg-blue-50 border-blue-200 text-blue-800';
    }

    notification.className = `notification-toast ${baseClasses} ${colorClasses}`;

    notification.innerHTML = `
        ${icon}
        <span class="whitespace-pre-line break-words flex-1">${message}</span>
    `;

    document.body.appendChild(notification);

    // 4초 후 자동 제거
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('opacity-0', 'translate-y-4');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 200);
        }
    }, 4000);
}



// 일정 보기
function openCalendarEvent(htmlLink) {
    chrome.tabs.create({ url: htmlLink });
}

// 성공 메시지 버튼 이벤트 리스너 설정
function setupSuccessMessageListeners() {
    // 기존 리스너 제거
    const existingButtons = successActions.querySelectorAll('button');
    existingButtons.forEach(button => {
        button.removeEventListener('click', handleSuccessButtonClick);
    });
    
    // 새로운 리스너 추가
    const buttons = successActions.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', handleSuccessButtonClick);
    });
}

// 성공 메시지 버튼 클릭 핸들러
function handleSuccessButtonClick(event) {
    const action = event.currentTarget.getAttribute('data-action');
    console.log('버튼 클릭됨:', action);
    
    switch (action) {
        case 'openCalendar':
            const link = event.currentTarget.getAttribute('data-link');
            console.log('일정 열기 시도:', link);
            openCalendarEvent(link);
            break;
        case 'restart':
            console.log('다시 시작');
            showSelectedText(currentSelectedText, currentTextSource);
            break;
        default:
            console.log('알 수 없는 액션:', action);
    }
}

// 성공 메시지 표시 (기존 함수 유지)
function showSuccess(message) {
    showNotification(message, 'success');
} 