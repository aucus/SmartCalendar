// 클립보드 텍스트를 저장할 변수
let clipboardText = '';

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('SmartCalendar Content Script 초기화 (클립보드 전용)');
    setupClipboardMonitoring();
});

// 클립보드 모니터링 설정
function setupClipboardMonitoring() {
    console.log('클립보드 모니터링 설정');
    
    // 클립보드 변경 이벤트 리스너
    document.addEventListener('copy', handleClipboardChange);
    document.addEventListener('cut', handleClipboardChange);
    document.addEventListener('paste', handleClipboardChange);
}

// 클립보드 변경 처리
function handleClipboardChange(event) {
    console.log('클립보드 변경 감지:', event.type);
    
    // 클립보드 변경 시 텍스트 저장
    setTimeout(async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text && text.trim()) {
                clipboardText = text.trim();
                console.log('클립보드 텍스트 업데이트:', clipboardText);
            }
        } catch (error) {
            // 클립보드 접근 권한이 없는 경우 무시
            console.log('클립보드 접근 권한 없음:', error.message);
        }
    }, 100);
}

// 팝업에서 클립보드 텍스트 요청 시 응답
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('팝업에서 메시지 수신:', request.action);
    
    if (request.action === 'getClipboardText') {
        // 클립보드 텍스트 요청
        console.log('클립보드 텍스트 요청, 반환:', clipboardText);
        sendResponse({ text: clipboardText });
        return true;
    }
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    console.log('SmartCalendar Content Script 정리');
    clipboardText = '';
});

// 클립보드 텍스트를 강제로 업데이트하는 함수 (외부에서 호출 가능)
function updateClipboardText(text) {
    clipboardText = text;
    console.log('클립보드 텍스트 강제 업데이트:', text);
}

// 전역 함수로 노출 (디버깅용)
window.SmartCalendar = {
    getClipboardText: () => clipboardText,
    updateClipboardText: updateClipboardText
}; 