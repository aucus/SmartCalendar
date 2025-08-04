// 모듈 클래스들 (Service Worker에서 직접 정의)

// 기본 LLM API 클래스
class BaseLLMAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async callAPI(prompt, options = {}) {
        throw new Error('callAPI 메서드를 구현해야 합니다.');
    }

    async extractCalendarInfo(text) {
        throw new Error('extractCalendarInfo 메서드를 구현해야 합니다.');
    }



    async generateSummary(text, maxLength = 200) {
        throw new Error('generateSummary 메서드를 구현해야 합니다.');
    }

    async analyzeCalendarText(text) {
        throw new Error('analyzeCalendarText 메서드를 구현해야 합니다.');
    }

    // 공통 유틸리티 메서드들
    extractJSONFromResponse(response) {
        try {
            console.log('=== JSON 추출 시도 ===');
            console.log('원본 응답 길이:', response.length);
            console.log('원본 응답:', response);
            
            // 0. 응답 정리 (앞뒤 공백, 불필요한 문자 제거)
            let cleanedResponse = response.trim();
            console.log('정리된 응답:', cleanedResponse);
            
            // 1. JSON 블록 찾기 (```json ... ```)
            const jsonBlockMatch = cleanedResponse.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonBlockMatch) {
                console.log('JSON 블록 발견:', jsonBlockMatch[1]);
                return JSON.parse(jsonBlockMatch[1]);
            }
            
            // 2. JSON 블록 찾기 (``` ... ```) - json 태그 없이
            const codeBlockMatch = cleanedResponse.match(/```\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
                const blockContent = codeBlockMatch[1].trim();
                console.log('코드 블록 발견:', blockContent);
                // 블록 내용이 JSON인지 확인
                if (blockContent.startsWith('{') && blockContent.endsWith('}')) {
                    return JSON.parse(blockContent);
                }
            }
            
            // 3. 중괄호로 둘러싸인 JSON 찾기 (가장 큰 것)
            const jsonMatches = cleanedResponse.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
            if (jsonMatches && jsonMatches.length > 0) {
                // 가장 긴 JSON 문자열 선택
                const longestJson = jsonMatches.reduce((a, b) => a.length > b.length ? a : b);
                console.log('중괄호 JSON 발견:', longestJson);
                return JSON.parse(longestJson);
            }
            
            // 4. 더 관대한 JSON 찾기
            const relaxedJsonMatch = cleanedResponse.match(/\{[\s\S]*?\}/);
            if (relaxedJsonMatch) {
                console.log('관대한 JSON 발견:', relaxedJsonMatch[0]);
                return JSON.parse(relaxedJsonMatch[0]);
            }
            
            // 5. 대괄호로 둘러싸인 JSON 배열 찾기
            const arrayMatch = cleanedResponse.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                console.log('배열 JSON 발견:', arrayMatch[0]);
                return JSON.parse(arrayMatch[0]);
            }
            
            // 6. 마지막 시도: 응답에서 JSON 부분만 추출
            const jsonStart = cleanedResponse.indexOf('{');
            const jsonEnd = cleanedResponse.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                const extractedJson = cleanedResponse.substring(jsonStart, jsonEnd + 1);
                console.log('JSON 부분 추출:', extractedJson);
                return JSON.parse(extractedJson);
            }
            
            console.warn('JSON 패턴을 찾을 수 없음');
            return null;
        } catch (error) {
            console.error('JSON 추출 실패:', error);
            console.log('추출 실패한 응답:', response);
            return null;
        }
    }

    extractTitleFromText(text) {
        try {
            // 첫 번째 줄이나 문장에서 제목 추출
            const lines = text.split('\n').filter(line => line.trim());
            if (lines.length > 0) {
                const firstLine = lines[0].trim();
                
                // 1. 콜론(:) 기준으로 제목 추출
                const colonMatch = firstLine.match(/^([^:]+):/);
                if (colonMatch && colonMatch[1]) {
                    const title = colonMatch[1].trim();
                    if (title.length >= 2 && title.length <= 30 && !this.isCommonWord(title)) {
                        return title;
                    }
                }
                
                // 2. 특정 키워드 패턴으로 제목 추출
                const keywordPatterns = [
                    /(팀\s*미팅)/i,
                    /(고객\s*상담)/i,
                    /(프로젝트\s*[가-힣a-zA-Z]+)/i,
                    /([가-힣a-zA-Z]+\s*미팅)/i,
                    /([가-힣a-zA-Z]+\s*회의)/i,
                    /([가-힣a-zA-Z]+\s*이벤트)/i,
                    /([가-힣a-zA-Z]+\s*배포)/i,
                    /([가-힣a-zA-Z]+\s*마감일)/i,
                    /(Zoom\s*미팅)/i,
                    /(Teams\s*미팅)/i
                ];
                
                for (const pattern of keywordPatterns) {
                    const match = firstLine.match(pattern);
                    if (match && match[1]) {
                        const title = match[1].trim();
                        if (title.length >= 2 && title.length <= 30) {
                            return title;
                        }
                    }
                }
                
                // 3. 첫 번째 의미있는 구문 추출 (20자 이내)
                const meaningfulMatch = firstLine.match(/^([가-힣a-zA-Z0-9\s\-\(\)]{2,20})/);
                if (meaningfulMatch && meaningfulMatch[1]) {
                    const title = meaningfulMatch[1].trim();
                    if (!this.isCommonWord(title) && !this.isTimeExpression(title)) {
                        return title;
                    }
                }
            }
            
            // 4. 키워드 기반 제목 생성
            const keywords = this.extractKeywords(text);
            if (keywords.length > 0) {
                // 의미있는 키워드만 선택
                const meaningfulKeywords = keywords.filter(keyword => 
                    !this.isCommonWord(keyword) && !this.isTimeExpression(keyword)
                );
                
                if (meaningfulKeywords.length > 0) {
                    return meaningfulKeywords.slice(0, 2).join(' ');
                }
            }
            
            return null;
        } catch (error) {
            console.error('제목 추출 실패:', error);
            return null;
        }
    }

    isTimeExpression(text) {
        const timePatterns = [
            /^\d{1,2}시/,
            /^\d{1,2}분/,
            /^오전/,
            /^오후/,
            /^내일/,
            /^오늘/,
            /^다음주/,
            /^\d{4}년/,
            /^\d{1,2}월/,
            /^\d{1,2}일/,
            /^월요일/,
            /^화요일/,
            /^수요일/,
            /^목요일/,
            /^금요일/,
            /^토요일/,
            /^일요일/
        ];
        
        return timePatterns.some(pattern => pattern.test(text));
    }

    cleanResponse(response) {
        try {
            // 앞뒤 공백 제거
            let cleaned = response.trim();
            
            // 마크다운 코드 블록 제거
            cleaned = cleaned.replace(/```[a-zA-Z]*\n?/g, '');
            
            // 불필요한 텍스트 제거
            cleaned = cleaned.replace(/^[^{]*({.*})[^}]*$/s, '$1');
            
            // 이스케이프 문자 정리
            cleaned = cleaned.replace(/\\"/g, '"');
            cleaned = cleaned.replace(/\\n/g, '\n');
            cleaned = cleaned.replace(/\\t/g, '\t');
            
            return cleaned;
        } catch (error) {
            console.error('응답 정리 실패:', error);
            return response;
        }
    }

    isCommonWord(word) {
        const commonWords = [
            '이', '그', '저', '이것', '그것', '저것',
            '있', '없', '하', '되', '보', '들', '것',
            '일', '때', '곳', '수', '말', '년', '월', '일',
            '시', '분', '초', '오전', '오후', '내일', '오늘',
            '회의', '미팅', '약속', '일정', '이벤트'
        ];
        return commonWords.includes(word.toLowerCase());
    }

    extractKeywords(text) {
        try {
            // 한국어 명사, 영어 단어 추출
            const koreanNouns = text.match(/[가-힣]{2,}/g) || [];
            const englishWords = text.match(/[a-zA-Z]{3,}/g) || [];
            
            // 숫자 포함 단어 추출
            const numberWords = text.match(/[가-힣a-zA-Z]*\d+[가-힣a-zA-Z]*/g) || [];
            
            // 모든 키워드 결합
            const allKeywords = [...koreanNouns, ...englishWords, ...numberWords];
            
            // 중복 제거 및 정렬
            const uniqueKeywords = [...new Set(allKeywords)];
            
            // 길이별로 정렬 (긴 단어 우선)
            uniqueKeywords.sort((a, b) => b.length - a.length);
            
            return uniqueKeywords.slice(0, 5); // 상위 5개 반환
        } catch (error) {
            console.error('키워드 추출 실패:', error);
            return [];
        }
    }

    mergeAndValidateAttendees(attendees1, attendees2) {
        try {
            // 두 배열을 병합
            const allAttendees = [...(attendees1 || []), ...(attendees2 || [])];
            
            // 중복 제거 및 유효성 검사
            const validEmails = new Set();
            const validAttendees = [];
            
            for (const attendee of allAttendees) {
                let email = '';
                
                // attendee가 문자열인 경우
                if (typeof attendee === 'string') {
                    email = attendee.trim();
                }
                // attendee가 객체인 경우
                else if (attendee && typeof attendee === 'object' && attendee.email) {
                    email = attendee.email.trim();
                }
                // attendee가 객체인 경우 (email 속성이 없는 경우)
                else if (attendee && typeof attendee === 'object') {
                    // 객체의 첫 번째 속성을 이메일로 간주
                    const firstKey = Object.keys(attendee)[0];
                    if (firstKey) {
                        email = attendee[firstKey].trim();
                    }
                }
                
                // 이메일 유효성 검사 및 중복 제거
                if (email && this.isValidEmail(email) && !validEmails.has(email.toLowerCase())) {
                    validEmails.add(email.toLowerCase());
                    validAttendees.push(email);
                    console.log('유효한 참석자 이메일 추가:', email);
                } else if (email) {
                    console.log('유효하지 않거나 중복된 이메일 제외:', email);
                }
            }
            
            console.log('병합된 유효한 참석자 수:', validAttendees.length);
            return validAttendees;
        } catch (error) {
            console.error('참석자 병합 오류:', error);
            return [];
        }
    }

    isValidEmail(email) {
        if (!email || typeof email !== 'string') {
            return false;
        }
        
        // 기본적인 이메일 형식 검사
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return false;
        }
        
        // 추가 검사: 도메인에 최소 2자 이상의 TLD가 있어야 함
        const parts = email.split('@');
        if (parts.length !== 2) {
            return false;
        }
        
        const domain = parts[1];
        const domainParts = domain.split('.');
        if (domainParts.length < 2) {
            return false;
        }
        
        // TLD가 최소 2자 이상이어야 함
        const tld = domainParts[domainParts.length - 1];
        if (tld.length < 2) {
            return false;
        }
        
        return true;
    }
}

class GeminiAPI extends BaseLLMAPI {
    constructor(apiKey) {
        super(apiKey);
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    }

    async callAPI(prompt, options = {}) {
        try {
            console.log('=== Gemini API 호출 시작 ===');
            console.log('API URL:', this.baseUrl);
            console.log('프롬프트 길이:', prompt.length);
            console.log('프롬프트 미리보기:', prompt.substring(0, 200) + '...');
            
            const requestBody = {
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: options.temperature || 0.7,
                    maxOutputTokens: options.maxTokens || 1000,
                }
            };
            
            console.log('요청 본문:', JSON.stringify(requestBody, null, 2));
            
            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            console.log('HTTP 응답 상태:', response.status, response.statusText);
            console.log('응답 헤더:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                console.error('HTTP 오류 응답 본문:', errorText);
                throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`);
            }

            const responseText = await response.text();
            console.log('=== 원본 응답 텍스트 ===');
            console.log(responseText);
            console.log('=== 원본 응답 텍스트 끝 ===');
            console.log('응답 텍스트 길이:', responseText.length);
            
            const data = JSON.parse(responseText);
            console.log('=== 파싱된 응답 데이터 ===');
            console.log(JSON.stringify(data, null, 2));
            console.log('=== 파싱된 응답 데이터 끝 ===');
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const text = data.candidates[0].content.parts[0].text;
                console.log('=== 추출된 텍스트 ===');
                console.log(text);
                console.log('=== 추출된 텍스트 끝 ===');
                console.log('텍스트 길이:', text.length);
                return text;
            } else {
                console.error('응답 구조 문제:', data);
                throw new Error('API 응답 형식이 올바르지 않습니다.');
            }
        } catch (error) {
            console.error('=== Gemini API 호출 오류 ===');
            console.error('오류 타입:', error.constructor.name);
            console.error('오류 메시지:', error.message);
            console.error('오류 스택:', error.stack);
            throw error;
        }
    }

    async extractCalendarInfo(text) {
        const prompt = `
다음 텍스트를 분석하여 캘린더에 저장할 일정 정보를 정확하게 추출해주세요.

텍스트: "${text}"

분석 요구사항:

1. 제목(title) 추출:
   - 텍스트의 맥락을 분석하여 가장 적절한 일정 제목을 추출하세요
   - 회의명, 미팅명, 약속명, 이벤트명 등이 있으면 그것을 우선 사용
   - 없으면 텍스트의 핵심 키워드를 조합하여 간결하고 명확한 제목 생성
   - 제목은 50자 이내로 작성하고, 일정의 성격을 명확히 표현

2. 날짜/시간 정보 분석:
   - 텍스트에서 명시된 날짜와 시간을 정확히 파악
   - "내일", "다음주 월요일", "오후 3시" 등의 상대적 표현을 현재 시간 기준으로 계산
   - 날짜만 있고 시간이 없는 경우: 오전 9시로 설정
   - 시간만 있고 날짜가 없는 경우: 오늘 날짜로 설정
   - 시작 시간과 종료 시간을 모두 추출 (종료 시간이 없으면 시작 시간 + 1시간)

3. 일정 내용 요약(description):
   - 텍스트를 캘린더에 저장할 내용으로 요약
   - 핵심 정보만 추출하여 간결하게 작성
   - 원본 텍스트의 중요한 세부사항 포함

4. 장소(location) 추출:
   - 회의실, 주소, 온라인 플랫폼, 건물명 등
   - 텍스트에서 장소 관련 정보가 있으면 추출

5. 참석자(attendees) 추출:
   - 이메일 주소나 이름으로 된 참석자 목록
   - "참석자:", "참가자:", "함께:" 등의 키워드 뒤에 오는 사람들

현재 시간: ${new Date().toISOString()}
현재 날짜: ${new Date().toLocaleDateString('ko-KR')}

중요: 반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트나 설명은 포함하지 마세요.

{
    "title": "일정 제목",
    "description": "일정 설명",
    "startDate": "YYYY-MM-DDTHH:MM:SS",
    "endDate": "YYYY-MM-DDTHH:MM:SS", 
    "location": "장소",
    "attendees": ["참석자1", "참석자2"],
    "reminder": "15분 전"
}

주의사항:
- 반드시 유효한 JSON 형식으로만 응답하세요
- 날짜/시간 형식은 ISO 8601 표준을 따르세요 (YYYY-MM-DDTHH:MM:SS)
- 시간대는 한국 시간(Asia/Seoul)을 기준으로 하세요
- 제목은 50자 이내로 간결하게 작성하세요
- 텍스트에 날짜/시간 정보가 없으면 현재 시간 기준으로 설정하세요
- JSON 외의 다른 텍스트는 절대 포함하지 마세요
- 마크다운 코드 블록(\`\`\`)을 사용하지 마세요
- 응답은 순수한 JSON 객체만 포함해야 합니다
`;

        try {
            const response = await this.callAPI(prompt, { temperature: 0.3 });
            console.log('Gemini API 원본 응답:', response);
            
            try {
                console.log('원본 응답:', response);
                const parsed = JSON.parse(response);
                console.log('JSON 파싱 성공:', parsed);
                return parsed;
            } catch (parseError) {
                console.error('JSON 파싱 실패:', parseError);
                console.log('파싱 실패한 응답:', response);
                
                // JSON 추출 시도
                const extractedJson = this.extractJSONFromResponse(response);
                if (extractedJson) {
                    console.log('JSON 추출 성공:', extractedJson);
                    return extractedJson;
                }
                
                // 응답 정리 후 재시도
                const cleanedResponse = this.cleanResponse(response);
                if (cleanedResponse !== response) {
                    console.log('응답 정리 후 재시도:', cleanedResponse);
                    try {
                        const parsedCleaned = JSON.parse(cleanedResponse);
                        console.log('정리된 응답 파싱 성공:', parsedCleaned);
                        return parsedCleaned;
                    } catch (cleanError) {
                        console.log('정리된 응답도 파싱 실패');
                    }
                }
                
                // 텍스트에서 제목 추출 시도
                const extractedTitle = this.extractTitleFromText(text);
                console.log('텍스트에서 추출한 제목:', extractedTitle);
                
                // 제목 추출 실패 시 오류 발생
                if (!extractedTitle) {
                    throw new Error('제공된 텍스트에서 일정 정보를 추출할 수 없습니다.');
                }
                
                return {
                    title: extractedTitle,
                    description: text,
                    startDate: new Date().toISOString(),
                    endDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                    location: '',
                    attendees: [],
                    reminder: ''
                };
            }
        } catch (error) {
            console.error('API 호출 실패:', error);
            throw new Error(`일정 정보 추출 실패: ${error.message}`);
        }
    }



    async generateSummary(text, maxLength = 200) {
        const prompt = `
다음 텍스트를 ${maxLength}자 이내로 요약해주세요.

텍스트: "${text}"

요구사항:
1. 핵심 내용만 추출
2. 명확하고 이해하기 쉽게 작성
3. ${maxLength}자 이내로 제한
4. 한국어로 작성
`;

        try {
            const response = await this.callAPI(prompt, { temperature: 0.3 });
            return response;
        } catch (error) {
            throw new Error(`요약 생성 실패: ${error.message}`);
        }
    }

    async analyzeCalendarText(text) {
        const prompt = `
다음 텍스트를 일정 관점에서 상세히 분석해주세요. JSON 형식으로만 응답해주세요.

텍스트: "${text}"

분석 요구사항:

1. 일정 유형 분석:
   - meeting: 회의/미팅
   - appointment: 약속/상담
   - event: 이벤트/행사
   - reminder: 알림/할일
   - deadline: 마감일/기한

2. 시간 정보 상세 분석:
   - 명시적 시간: "오후 3시", "14:30" 등
   - 상대적 시간: "내일", "다음주 월요일" 등
   - 기간: "3일간", "1주일" 등
   - 반복: "매주", "매일" 등

3. 참석자 정보:
   - 이메일 주소가 있는 경우에만 포함하세요
   - 이름만 있는 경우는 제외하세요 (Google Calendar API는 유효한 이메일만 허용)
   - 참석자 수 (정확한 숫자 또는 "여러 명" 등)

4. 장소 정보:
   - 구체적 주소
   - 건물/회의실명
   - 온라인 플랫폼 (Zoom, Teams 등)

5. 우선순위/중요도:
   - urgent: 긴급
   - important: 중요
   - normal: 일반
   - low: 낮음

현재 시간: ${new Date().toISOString()}
현재 날짜: ${new Date().toLocaleDateString('ko-KR')}

응답 형식 (JSON만):
{
    "eventType": "meeting|appointment|event|reminder|deadline",
    "timeAnalysis": {
        "explicitTime": "명시된 시간 정보",
        "relativeTime": "상대적 시간 표현",
        "duration": "기간 정보",
        "recurring": "반복 정보"
    },
    "participants": {
        "names": ["참석자1", "참석자2"],
        "count": "참석자 수",
        "emails": ["email1@example.com"]
    },
    "location": {
        "type": "physical|online|hybrid",
        "address": "구체적 주소",
        "room": "회의실/건물명",
        "platform": "온라인 플랫폼"
    },
    "priority": "urgent|important|normal|low",
    "confidence": 0.0-1.0
}

주의사항:
- 참석자 이메일은 유효한 이메일 주소만 포함하세요
- 이름만 있는 경우는 emails 배열에 포함하지 마세요
- description에는 줄바꿈(\\n)을 사용하여 가독성을 높이세요
- JSON 외의 다른 텍스트는 절대 포함하지 마세요
`;

        try {
            const response = await this.callAPI(prompt, { temperature: 0.3 });
            console.log('일정 분석 API 응답:', response);
            
            try {
                const parsed = JSON.parse(response);
                console.log('일정 분석 JSON 파싱 성공:', parsed);
                return parsed;
            } catch (parseError) {
                console.error('일정 분석 JSON 파싱 실패:', parseError);
                console.log('파싱 실패한 응답:', response);
                
                // JSON 추출 시도
                const extractedJson = this.extractJSONFromResponse(response);
                if (extractedJson) {
                    console.log('일정 분석 JSON 추출 성공:', extractedJson);
                    return extractedJson;
                }
                
                console.warn('JSON 추출도 실패, 기본값 사용');
                return {
                    eventType: 'meeting',
                    timeAnalysis: {},
                    participants: { names: [], count: 0, emails: [] },
                    location: { type: 'physical', address: '', room: '', platform: '' },
                    priority: 'normal',
                    confidence: 0.5
                };
            }
        } catch (error) {
            console.error('일정 분석 API 호출 실패:', error);
            throw new Error(`일정 분석 실패: ${error.message}`);
        }
    }
}





class GoogleCalendarAPI {
    constructor(accessToken) {
        this.accessToken = accessToken;
        this.baseUrl = 'https://www.googleapis.com/calendar/v3';
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        console.log('Google Calendar API 요청:', {
            url: url,
            method: options.method || 'GET',
            body: options.body ? JSON.parse(options.body) : null
        });
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (parseError) {
                const errorText = await response.text();
                errorData = { error: { message: errorText || response.statusText } };
            }
            
            console.error('Google Calendar API 오류 상세:', {
                status: response.status,
                statusText: response.statusText,
                url: url,
                method: options.method || 'GET',
                errorData: errorData,
                requestBody: options.body ? JSON.parse(options.body) : null
            });
            
            // 구체적인 오류 메시지 생성
            let errorMessage = `Google Calendar API 오류 (${response.status})`;
            if (errorData.error) {
                if (errorData.error.message) {
                    errorMessage += `: ${errorData.error.message}`;
                }
                if (errorData.error.details && errorData.error.details.length > 0) {
                    errorMessage += ` - ${errorData.error.details.map(d => d.message).join(', ')}`;
                }
            }
            
            if (response.status === 401) {
                throw new Error(`인증 오류 (401): 토큰이 만료되었거나 유효하지 않습니다. 설정에서 다시 인증해주세요.`);
            } else if (response.status === 403) {
                throw new Error(`권한 오류 (403): Google Calendar API에 대한 권한이 없습니다.`);
            } else {
                throw new Error(errorMessage);
            }
        }

        const responseData = await response.json();
        console.log('Google Calendar API 응답 성공:', responseData);
        return responseData;
    }

    async getPrimaryCalendar() {
        try {
            const calendars = await this.makeRequest('/users/me/calendarList');
            const primaryCalendar = calendars.items.find(cal => cal.primary);
            
            if (!primaryCalendar) {
                throw new Error('기본 캘린더를 찾을 수 없습니다.');
            }

            return primaryCalendar;
        } catch (error) {
            console.error('기본 캘린더 조회 오류:', error);
            throw error;
        }
    }

    formatEventData(calendarData) {
        const startDate = new Date(calendarData.startDate);
        const endDate = new Date(calendarData.endDate);

        // Description 포맷팅 개선
        const description = (calendarData.description && typeof calendarData.description === 'string') 
            ? this.improveDescriptionFormatting(calendarData.description.trim())
            : '';

        // 참석자 이메일 유효성 검사 및 필터링
        const validAttendees = this.filterValidAttendees(calendarData.attendees || []);

        return {
            summary: calendarData.title,
            description: description,
            start: {
                dateTime: startDate.toISOString(),
                timeZone: 'Asia/Seoul'
            },
            end: {
                dateTime: endDate.toISOString(),
                timeZone: 'Asia/Seoul'
            },
            location: calendarData.location,
            attendees: validAttendees,
            reminders: {
                useDefault: false,
                overrides: [
                    {
                        method: 'popup',
                        minutes: 15
                    }
                ]
            }
        };
    }

    // 참석자 이메일 유효성 검사 및 필터링
    filterValidAttendees(attendees) {
        if (!Array.isArray(attendees)) {
            console.log('참석자가 배열이 아님, 빈 배열 반환');
            return [];
        }

        const validAttendees = [];
        
        for (const attendee of attendees) {
            let email = '';
            
            // attendee가 문자열인 경우
            if (typeof attendee === 'string') {
                email = attendee.trim();
            }
            // attendee가 객체인 경우
            else if (attendee && typeof attendee === 'object' && attendee.email) {
                email = attendee.email.trim();
            }
            // attendee가 객체인 경우 (email 속성이 없는 경우)
            else if (attendee && typeof attendee === 'object') {
                // 객체의 첫 번째 속성을 이메일로 간주
                const firstKey = Object.keys(attendee)[0];
                if (firstKey) {
                    email = attendee[firstKey].trim();
                }
            }
            
            // 이메일 유효성 검사
            if (this.isValidEmail(email)) {
                validAttendees.push({ email });
                console.log('유효한 참석자 추가:', email);
            } else {
                console.log('유효하지 않은 이메일 제외:', email);
            }
        }
        
        console.log('필터링된 참석자 수:', validAttendees.length);
        return validAttendees;
    }

    // 이메일 유효성 검사
    isValidEmail(email) {
        if (!email || typeof email !== 'string') {
            return false;
        }
        
        // 기본적인 이메일 형식 검사
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return false;
        }
        
        // 추가 검사: 도메인에 최소 2자 이상의 TLD가 있어야 함
        const parts = email.split('@');
        if (parts.length !== 2) {
            return false;
        }
        
        const domain = parts[1];
        const domainParts = domain.split('.');
        if (domainParts.length < 2) {
            return false;
        }
        
        // TLD가 최소 2자 이상이어야 함
        const tld = domainParts[domainParts.length - 1];
        if (tld.length < 2) {
            return false;
        }
        
        return true;
    }

    // Description 포맷팅 개선
    improveDescriptionFormatting(description) {
        console.log('=== improveDescriptionFormatting 호출됨 ===');
        console.log('입력 description:', description);
        
        if (!description || typeof description !== 'string') {
            console.log('유효하지 않은 description, 원본 반환');
            return description;
        }

        let improved = description;
        
        // 1. 마침표(.) 뒤에 줄바꿈 추가 (문장 구분)
        improved = improved.replace(/\.\s+/g, '.\n');
        
        // 2. 하이픈(-) 처리 (날짜 형식은 유지, 다른 하이픈만 줄바꿈)
        // 날짜 형식 (YYYY-MM-DD)은 유지하고, 다른 하이픈만 줄바꿈
        improved = improved.replace(/([^\n])\s*-\s*([^\d])/g, '$1\n- $2');
        
        // 3. 콜론(:) 뒤에 줄바꿈 추가 (라벨 구분)
        improved = improved.replace(/:\s+/g, ':\n');
        
        // 4. 괄호 앞에 줄바꿈 추가
        improved = improved.replace(/([^\n])(\()/g, '$1\n$2');
        
        // 5. 쉼표 뒤에 줄바꿈 추가 (특정 패턴)
        improved = improved.replace(/(진행\))(,)/g, '$1\n$2');
        
        // 6. 연속된 줄바꿈 정리 (3개 이상을 2개로)
        improved = improved.replace(/\n\n\n+/g, '\n\n');
        
        // 7. 앞뒤 공백 제거
        improved = improved.trim();
        
        console.log('개선된 description:', improved);
        console.log('=== improveDescriptionFormatting 완료 ===');
        
        return improved;
    }

    async checkDuplicateEvent(calendarId, eventData) {
        try {
            const startTime = new Date(eventData.start.dateTime);
            const endTime = new Date(eventData.end.dateTime);
            
            // 시간 범위를 좀 더 넓게 설정 (30분 전후)
            const timeMin = new Date(startTime.getTime() - 30 * 60 * 1000).toISOString();
            const timeMax = new Date(endTime.getTime() + 30 * 60 * 1000).toISOString();

            const events = await this.makeRequest(
                `/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`
            );

            // 제목이 동일한 일정이 있는지 확인
            const duplicateTitle = events.items.find(event => 
                event.summary && event.summary.toLowerCase() === eventData.summary.toLowerCase()
            );

            return duplicateTitle !== undefined;
        } catch (error) {
            console.error('중복 일정 확인 오류:', error);
            return false;
        }
    }

    async createEvent(calendarId, eventData) {
        try {
            const result = await this.makeRequest(
                `/calendars/${encodeURIComponent(calendarId)}/events`,
                {
                    method: 'POST',
                    body: JSON.stringify(eventData)
                }
            );

            return result;
        } catch (error) {
            console.error('일정 생성 오류:', error);
            throw error;
        }
    }
}





// 모듈 클래스 확인
let GeminiAPIInstance = GeminiAPI;
let GoogleCalendarAPIInstance = GoogleCalendarAPI;

// LLM 인스턴스 생성 팩토리 함수
function createLLMInstance(llmType, apiKey) {
    switch (llmType) {
        case 'gemini':
            return new GeminiAPIInstance(apiKey);
        default:
            throw new Error(`지원하지 않는 LLM 타입: ${llmType}`);
    }
}

// 모듈 로드 확인
function checkModules() {
    console.log('모듈 로드 상태 확인:');
    console.log('- GeminiAPI:', typeof GeminiAPIInstance);
    console.log('- GoogleCalendarAPI:', typeof GoogleCalendarAPIInstance);
}

// 확장 프로그램 설치/업데이트 시 초기화
chrome.runtime.onInstalled.addListener((details) => {
    console.log('SmartCalendar 확장 프로그램이 설치되었습니다:', details.reason);
    
    // 모듈 로드 확인
    checkModules();
    
    // 기본 설정값 초기화
    initializeDefaultSettings();
    
    // 컨텍스트 메뉴 생성
    createContextMenus();
});

// 기본 설정값 초기화
async function initializeDefaultSettings() {
    const defaultSettings = {
        selectedLLM: 'gemini', // 기본값: Gemini
        geminiApiKey: '',
        isFirstRun: true
    };
    
    try {
        const currentSettings = await chrome.storage.local.get();
        
        // 기존 설정이 없으면 기본값으로 초기화
        if (Object.keys(currentSettings).length === 0) {
            await chrome.storage.local.set(defaultSettings);
            console.log('기본 설정이 초기화되었습니다.');
        } else {
            // 기존 설정에 새로운 필드 추가 (마이그레이션)
            const updatedSettings = { ...defaultSettings, ...currentSettings };
            await chrome.storage.local.set(updatedSettings);
            console.log('설정이 업데이트되었습니다.');
        }
    } catch (error) {
        console.error('설정 초기화 오류:', error);
    }
}

// 컨텍스트 메뉴 생성
function createContextMenus() {
    // 기존 메뉴 제거
    chrome.contextMenus.removeAll(() => {
        // 메인 메뉴 생성
        chrome.contextMenus.create({
            id: 'smartcalendar-main',
            title: 'SmartCalendar',
            contexts: ['selection']
        });
        
        // 서브 메뉴들 생성
        chrome.contextMenus.create({
            id: 'smartcalendar-calendar',
            parentId: 'smartcalendar-main',
            title: '📅 일정 등록',
            contexts: ['selection']
        });
        

        

    });
}

// 컨텍스트 메뉴 클릭 이벤트 처리
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!info.selectionText) return;
    
    const selectedText = info.selectionText.trim();
    
    switch (info.menuItemId) {
        case 'smartcalendar-calendar':
            await handleCalendarAction(selectedText, tab);
            break;


    }
});

// 메시지 통신 처리
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 비동기 처리를 위해 Promise로 래핑
    handleMessage(request, sender).then(sendResponse);
    return true; // 비동기 응답을 위해 true 반환
});

// 메시지 처리 함수
async function handleMessage(request, sender) {
    try {
        switch (request.action) {

                
            case 'createCalendarEvent':
                return await handleCalendarAction(request.text, sender.tab);
                

                

                
            case 'getSettings':
                return await getSettings();
                
            case 'saveSettings':
                return await saveSettings(request.settings);
                

                
            case 'validateGoogleToken':
                return await validateAndRefreshToken(request.accessToken, request.refreshToken);
                

                
            default:
                return { success: false, error: '알 수 없는 액션' };
        }
    } catch (error) {
        console.error('메시지 처리 오류:', error);
        return { success: false, error: error.message };
    }
}



// 일정 등록 처리 (개선된 버전)
async function handleCalendarAction(text, tab) {
    try {
        console.log('일정 등록 처리 시작:', { textLength: text.length, sourceUrl: tab?.url });
        
        // 설정 확인
        const settings = await getSettings();
        
        // Gemini API 키 확인
        const apiKey = settings.geminiApiKey;
        
        if (!apiKey) {
            return { success: false, error: 'Gemini API 키가 설정되지 않았습니다.' };
        }
        
        // Google Calendar 액세스 토큰 확인 및 갱신
        const { googleAccessToken, googleRefreshToken } = await chrome.storage.local.get(['googleAccessToken', 'googleRefreshToken']);
        if (!googleAccessToken) {
            return { success: false, error: 'Google Calendar 인증이 필요합니다. 설정에서 인증해주세요.' };
        }
        
        // 토큰 유효성 검사 및 갱신
        const validToken = await validateAndRefreshToken(googleAccessToken, googleRefreshToken);
        if (!validToken) {
            return { success: false, error: 'Google Calendar 인증이 만료되었습니다. 설정에서 다시 인증해주세요.' };
        }
        
        console.log('인증 확인 완료, LLM 분석 시작');
        
        // LLM을 통한 일정 정보 추출
        try {
            const calendarData = await extractCalendarData(text, apiKey);
            console.log('LLM 분석 결과:', calendarData);
            
            // Google Calendar API 연동
            const result = await createGoogleCalendarEvent(calendarData, validToken);
            console.log('Google Calendar 등록 결과:', result);
            
            let message = '일정이 성공적으로 등록되었습니다!';
            if (result.isDuplicate) {
                message = '일정이 등록되었습니다. (동일한 제목의 일정이 이미 존재할 수 있습니다.)';
            }
            
            return { 
                success: true, 
                message: message,
                data: result 
            };
        } catch (extractError) {
            console.error('일정 정보 추출 실패:', extractError);
            
            // 일정 정보 추출 실패 시 특별한 응답 반환
            if (extractError.message.includes('일정 정보를 추출할 수 없습니다')) {
                return {
                    success: false,
                    error: 'extract_failed',
                    message: '제공된 텍스트에서 일정 정보를 추출할 수 없습니다.',
                    details: '텍스트에 날짜, 시간, 일정 제목 등의 정보가 포함되어 있는지 확인해주세요.'
                };
            }
            
            // 기타 오류는 일반적인 오류 메시지로 처리
            return { 
                success: false, 
                error: extractError.message 
            };
        }
    } catch (error) {
        console.error('일정 등록 처리 오류:', error);
        return { success: false, error: error.message };
    }
}

// Google Calendar 일정 생성 (개선된 버전)
async function createGoogleCalendarEvent(calendarData, accessToken) {
    try {
        console.log('Google Calendar 일정 생성 시작:', calendarData);
        
        if (!GoogleCalendarAPIInstance) {
            throw new Error('GoogleCalendarAPI 모듈이 로드되지 않았습니다.');
        }
        const calendar = new GoogleCalendarAPIInstance(accessToken);
        
        // 기본 캘린더 정보 가져오기
        const primaryCalendar = await calendar.getPrimaryCalendar();
        const calendarId = primaryCalendar.id;
        console.log('사용할 캘린더 ID:', calendarId);
        
        // 일정 데이터 포맷팅
        const eventData = calendar.formatEventData(calendarData);
        console.log('포맷된 일정 데이터:', eventData);
        
        // 일정 생성 (중복 확인은 createEvent 내부에서 처리)
        const result = await calendar.createEvent(calendarId, eventData);
        
        console.log('일정 생성 결과:', result);
        
        return {
            eventId: result.id,
            summary: result.summary,
            startTime: result.start.dateTime,
            endTime: result.end.dateTime,
            htmlLink: result.htmlLink,
            isDuplicate: result.isDuplicate || false,
            location: result.location || '',
            description: result.description || ''
        };
    } catch (error) {
        console.error('Google Calendar 일정 생성 오류:', error);
        throw error;
    }
}





// 설정 가져오기
async function getSettings() {
    try {
        const result = await chrome.storage.local.get();
        return result;
    } catch (error) {
        console.error('설정 가져오기 오류:', error);
        return {};
    }
}

// 설정 저장
async function saveSettings(settings) {
    try {
        await chrome.storage.local.set(settings);
        return { success: true };
    } catch (error) {
        console.error('설정 저장 오류:', error);
        return { success: false, error: error.message };
    }
}

// LLM 관련 함수들 (개선된 버전)
async function extractCalendarData(text, apiKey) {
    try {
        // 설정에서 Gemini API 키 가져오기
        const settings = await getSettings();
        const llmApiKey = settings.geminiApiKey || apiKey;
        
        console.log('사용할 LLM: Gemini');
        
        if (!llmApiKey) {
            throw new Error('Gemini API 키가 설정되지 않았습니다.');
        }
        
        // LLM 인스턴스 생성
        const llm = createLLMInstance('gemini', llmApiKey);
        
        console.log('일정 데이터 추출 시작');
        
        // 1단계: 기본 일정 정보 추출
        const calendarInfo = await llm.extractCalendarInfo(text);
        console.log('기본 일정 정보 추출 완료:', calendarInfo);
        
        // 일정 정보 유효성 검사
        if (!calendarInfo || !calendarInfo.title || calendarInfo.title === '새로운 일정') {
            throw new Error('제공된 텍스트에서 일정 정보를 추출할 수 없습니다.');
        }
        
        // 2단계: 상세 분석 (선택적)
        try {
            const detailedAnalysis = await llm.analyzeCalendarText(text);
            console.log('상세 분석 완료:', detailedAnalysis);
            
            // 상세 분석 결과를 기본 정보와 병합
            const enhancedInfo = {
                ...calendarInfo,
                eventType: detailedAnalysis.eventType || 'meeting',
                priority: detailedAnalysis.priority || 'normal',
                confidence: detailedAnalysis.confidence || 0.5,
                // 참석자 정보 개선 (유효한 이메일만 허용)
                attendees: llm.mergeAndValidateAttendees(
                    calendarInfo.attendees || [],
                    detailedAnalysis.participants?.emails || []
                ),
                // 장소 정보 개선 (안전한 접근)
                location: (detailedAnalysis.location && (
                    detailedAnalysis.location.address || 
                    detailedAnalysis.location.room || 
                    detailedAnalysis.location.platform
                )) || calendarInfo.location
            };
            
            console.log('향상된 일정 정보:', enhancedInfo);
            return enhancedInfo;
        } catch (analysisError) {
            console.warn('상세 분석 실패, 기본 정보만 사용:', analysisError.message);
            return calendarInfo;
        }
    } catch (error) {
        console.error('일정 데이터 추출 오류:', error);
        throw error; // 오류를 다시 던져서 상위에서 처리하도록 함
    }
}

// Google Calendar 일정 생성 (개선된 버전)
async function createGoogleCalendarEvent(calendarData, accessToken) {
    try {
        console.log('Google Calendar 일정 생성 시작:', calendarData);
        
        if (!GoogleCalendarAPIInstance) {
            throw new Error('GoogleCalendarAPI 모듈이 로드되지 않았습니다.');
        }
        const calendar = new GoogleCalendarAPIInstance(accessToken);
        
        // 기본 캘린더 정보 가져오기
        const primaryCalendar = await calendar.getPrimaryCalendar();
        const calendarId = primaryCalendar.id;
        console.log('사용할 캘린더 ID:', calendarId);
        
        // 일정 데이터 포맷팅
        const eventData = calendar.formatEventData(calendarData);
        console.log('포맷된 일정 데이터:', eventData);
        
        // 일정 생성 (중복 확인은 createEvent 내부에서 처리)
        const result = await calendar.createEvent(calendarId, eventData);
        
        console.log('일정 생성 결과:', result);
        
        return {
            eventId: result.id,
            summary: result.summary,
            startTime: result.start.dateTime,
            endTime: result.end.dateTime,
            htmlLink: result.htmlLink,
            isDuplicate: result.isDuplicate || false,
            location: result.location || '',
            description: result.description || ''
        };
    } catch (error) {
        console.error('Google Calendar 일정 생성 오류:', error);
        throw error;
    }
}





async function generateSummary(text, apiKey) {
    try {
        // 설정에서 Gemini API 키 가져오기
        const settings = await getSettings();
        const llmApiKey = settings.geminiApiKey || apiKey;
        
        console.log('요약 생성에 사용할 LLM: Gemini');
        
        if (!llmApiKey) {
            throw new Error('Gemini API 키가 설정되지 않았습니다.');
        }
        
        // LLM 인스턴스 생성
        const llm = createLLMInstance('gemini', llmApiKey);
        const summary = await llm.generateSummary(text, 200);
        return summary;
    } catch (error) {
        console.error('요약 생성 오류:', error);
        // 오류 시 기본 요약 반환
        return `요약: ${text.substring(0, 100)}...`;
    }
}





// Google OAuth 토큰 검증 및 갱신
async function validateAndRefreshToken(accessToken, refreshToken) {
    try {
        console.log('토큰 유효성 검사 시작');
        
        // 먼저 현재 토큰으로 간단한 API 호출 테스트
        const testResponse = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + accessToken);
        
        if (testResponse.ok) {
            console.log('토큰이 유효합니다');
            return accessToken;
        }
        
        // 토큰이 만료된 경우 갱신 시도
        if (refreshToken) {
            console.log('토큰 갱신 시도');
            const newToken = await refreshAccessToken(refreshToken);
            if (newToken) {
                console.log('토큰 갱신 성공');
                return newToken;
            }
        }
        
        console.log('토큰 갱신 실패');
        return null;
    } catch (error) {
        console.error('토큰 검증 오류:', error);
        return null;
    }
}

// 액세스 토큰 갱신
async function refreshAccessToken(refreshToken) {
    try {
        // OAuth Client ID (manifest.json에서 가져옴)
        const clientId = '459605052348-895rov4828rv37j0g8cd2d63l1lo4ou0.apps.googleusercontent.com';
        
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: '', // Chrome 확장 프로그램은 client_secret이 필요 없음
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // 새로운 토큰 저장
            await chrome.storage.local.set({
                googleAccessToken: data.access_token
            });
            
            return data.access_token;
        } else {
            console.error('토큰 갱신 실패:', response.status, response.statusText);
            return null;
        }
    } catch (error) {
        console.error('토큰 갱신 오류:', error);
        return null;
    }
}










// 탭 업데이트 이벤트 (선택사항)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        // 페이지 로드 완료 시 필요한 작업
        console.log('페이지 로드 완료:', tab.url);
    }
}); 