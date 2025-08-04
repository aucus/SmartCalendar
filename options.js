// DOM 요소들
const geminiApiKeyInput = document.getElementById('geminiApiKey');
const toggleGeminiKeyBtn = document.getElementById('toggleGeminiKey');
const testGeminiKeyBtn = document.getElementById('testGeminiKey');
const authGoogleBtn = document.getElementById('authGoogle');
const revokeGoogleBtn = document.getElementById('revokeGoogle');

const saveSettingsBtn = document.getElementById('saveSettings');
const statusContainer = document.getElementById('statusContainer');

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    setupEventListeners();
});

// 설정 로드
async function loadSettings() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
        
        if (response) {
            geminiApiKeyInput.value = response.geminiApiKey || '';
        }
        
        showStatus('설정을 불러왔습니다.', 'success');
    } catch (error) {
        console.error('설정 로드 오류:', error);
        showStatus('설정 로드에 실패했습니다.', 'error');
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // Gemini API 키 토글
    toggleGeminiKeyBtn.addEventListener('click', () => {
        const type = geminiApiKeyInput.type === 'password' ? 'text' : 'password';
        geminiApiKeyInput.type = type;
        
        // 아이콘 변경
        const icon = toggleGeminiKeyBtn.querySelector('svg');
        if (type === 'text') {
            icon.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
            `;
        } else {
            icon.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            `;
        }
    });



    // Gemini API 키 테스트
    testGeminiKeyBtn.addEventListener('click', async () => {
        const apiKey = geminiApiKeyInput.value.trim();
        
        if (!apiKey) {
            showStatus('API 키를 입력해주세요.', 'error');
            return;
        }
        
        testGeminiKeyBtn.disabled = true;
        testGeminiKeyBtn.textContent = '테스트 중...';
        
        try {
            const response = await testGeminiAPI(apiKey);
            if (response.success) {
                showStatus('API 키가 유효합니다!', 'success');
            } else {
                showStatus('API 키가 유효하지 않습니다.', 'error');
            }
        } catch (error) {
            showStatus('API 키 테스트에 실패했습니다.', 'error');
        } finally {
            testGeminiKeyBtn.disabled = false;
            testGeminiKeyBtn.textContent = 'API 키 테스트';
        }
    });



    // Google 인증
    authGoogleBtn.addEventListener('click', async () => {
        try {
            await authenticateGoogle();
        } catch (error) {
            showStatus('Google 인증에 실패했습니다.', 'error');
        }
    });

    // Google 토큰 상태 확인
    revokeGoogleBtn.addEventListener('click', async () => {
        try {
            await checkGoogleTokenStatus();
        } catch (error) {
            showStatus('토큰 상태 확인에 실패했습니다.', 'error');
        }
    });

    // Google 인증 해제
    revokeGoogleBtn.addEventListener('click', async () => {
        try {
            await revokeGoogleAuth();
            showStatus('Google 인증이 해제되었습니다.', 'success');
        } catch (error) {
            showStatus('인증 해제에 실패했습니다.', 'error');
        }
    });





    // 설정 저장
    saveSettingsBtn.addEventListener('click', async () => {
        const settings = {
            selectedLLM: 'gemini',
            geminiApiKey: geminiApiKeyInput.value.trim(),
            isFirstRun: false
        };
        
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'saveSettings',
                settings: settings
            });
            
            if (response.success) {
                showStatus('설정이 저장되었습니다!', 'success');
            } else {
                showStatus('설정 저장에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('설정 저장 오류:', error);
            showStatus('설정 저장에 실패했습니다.', 'error');
        }
    });
}

// Gemini API 테스트
async function testGeminiAPI(apiKey) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: 'Hello, this is a test message.'
                    }]
                }],
                generationConfig: {
                    maxOutputTokens: 10
                }
            })
        });
        
        return { success: response.ok };
    } catch (error) {
        return { success: false, error: error.message };
    }
}



// Google 인증
async function authenticateGoogle() {
    try {
        // OAuth Client ID (manifest.json에서 가져옴)
        const clientId = '459605052348-895rov4828rv37j0g8cd2d63l1lo4ou0.apps.googleusercontent.com';
        
        // Chrome Identity API를 사용한 OAuth 인증
        const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${chrome.identity.getRedirectURL()}&scope=https://www.googleapis.com/auth/calendar&response_type=token`;
        
        const responseUrl = await new Promise((resolve, reject) => {
            chrome.identity.launchWebAuthFlow({
                url: authUrl,
                interactive: true
            }, (redirectUrl) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(redirectUrl);
                }
            });
        });
        
        // 액세스 토큰 추출
        const urlParams = new URLSearchParams(responseUrl.split('#')[1]);
        const accessToken = urlParams.get('access_token');
        
        if (accessToken) {
            // 토큰 저장
            await chrome.storage.local.set({ googleAccessToken: accessToken });
            showStatus('Google 인증이 완료되었습니다!', 'success');
        } else {
            throw new Error('액세스 토큰을 가져올 수 없습니다.');
        }
    } catch (error) {
        console.error('Google 인증 오류:', error);
        throw error;
    }
}

// Google 토큰 상태 확인
async function checkGoogleTokenStatus() {
    try {
        const { googleAccessToken, googleRefreshToken } = await chrome.storage.local.get(['googleAccessToken', 'googleRefreshToken']);
        
        if (!googleAccessToken) {
            showStatus('Google 인증이 필요합니다.', 'error');
            return;
        }
        
        // 토큰 유효성 검사
        const response = await chrome.runtime.sendMessage({
            action: 'validateGoogleToken',
            accessToken: googleAccessToken,
            refreshToken: googleRefreshToken
        });
        
        if (response && response.success) {
            showStatus('Google 토큰이 유효합니다!', 'success');
        } else {
            showStatus('Google 토큰이 만료되었습니다. 다시 인증해주세요.', 'error');
        }
    } catch (error) {
        console.error('토큰 상태 확인 오류:', error);
        showStatus('토큰 상태 확인에 실패했습니다.', 'error');
    }
}

// Google 인증 해제
async function revokeGoogleAuth() {
    try {
        await chrome.storage.local.remove(['googleAccessToken', 'googleRefreshToken']);
        return { success: true };
    } catch (error) {
        throw error;
    }
}







// Toast 메시지 표시
function showStatus(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toastDiv = document.createElement('div');
    
    toastDiv.className = `toast-message toast-${type} fade-in`;
    toastDiv.textContent = message;
    
    toastContainer.appendChild(toastDiv);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        if (toastDiv.parentNode) {
            toastDiv.parentNode.removeChild(toastDiv);
        }
    }, 3000);
} 