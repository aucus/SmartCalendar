// Gemini API 유틸리티 모듈
class GeminiAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    }

    // API 호출 기본 함수 (상세 로깅 버전)
    async callAPI(prompt, options = {}) {
        if (!this.apiKey) {
            throw new Error('Gemini API 키가 설정되지 않았습니다.');
        }

        console.log('=== Gemini API 호출 시작 (llm-utils) ===');
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
                topK: options.topK || 40,
                topP: options.topP || 0.95,
                maxOutputTokens: options.maxOutputTokens || 1024,
            }
        };

        console.log('요청 본문:', JSON.stringify(requestBody, null, 2));

        try {
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
            console.log('=== 원본 응답 텍스트 (llm-utils) ===');
            console.log(responseText);
            console.log('=== 원본 응답 텍스트 끝 ===');
            console.log('응답 텍스트 길이:', responseText.length);
            
            const data = JSON.parse(responseText);
            console.log('=== 파싱된 응답 데이터 (llm-utils) ===');
            console.log(JSON.stringify(data, null, 2));
            console.log('=== 파싱된 응답 데이터 끝 ===');
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const text = data.candidates[0].content.parts[0].text;
                console.log('=== 추출된 텍스트 (llm-utils) ===');
                console.log(text);
                console.log('=== 추출된 텍스트 끝 ===');
                console.log('텍스트 길이:', text.length);
                return text;
            } else {
                console.error('응답 구조 문제:', data);
                throw new Error('API 응답 형식이 올바르지 않습니다.');
            }
        } catch (error) {
            console.error('=== Gemini API 호출 오류 (llm-utils) ===');
            console.error('오류 타입:', error.constructor.name);
            console.error('오류 메시지:', error.message);
            console.error('오류 스택:', error.stack);
            throw error;
        }
    }

    // 일정 정보 추출 (개선된 버전)
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
   - 줄바꿈(\\n)을 사용하여 가독성을 높이세요
   - 예시: "이벤트 내용\\n기간: 2025-07-30 ~ 2025-08-06\\n시간: 18:00 ~ 23:59\\n예상 인원: 500명"

4. 장소(location) 추출:
   - 회의실, 주소, 온라인 플랫폼, 건물명 등
   - 텍스트에서 장소 관련 정보가 있으면 추출

5. 참석자(attendees) 추출:
   - 이메일 주소가 있는 경우에만 포함하세요
   - 이름만 있는 경우는 제외하세요 (Google Calendar API는 유효한 이메일만 허용)
   - "참석자:", "참가자:", "함께:", "담당자:" 등의 키워드 뒤에 오는 사람들
   - 이메일 형식: example@domain.com

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
- description에는 줄바꿈(\\n)을 사용하여 가독성을 높이세요
- 텍스트에 날짜/시간 정보가 없으면 현재 시간 기준으로 설정하세요
- 참석자는 유효한 이메일 주소만 포함하세요 (이름만 있는 경우 제외)
- JSON 외의 다른 텍스트는 절대 포함하지 마세요
`;

        try {
            const response = await this.callAPI(prompt, { temperature: 0.3 });
            console.log('Gemini API 원본 응답:', response);
            
            // JSON 파싱 시도
            try {
                const parsed = JSON.parse(response);
                console.log('JSON 파싱 성공:', parsed);
                return parsed;
            } catch (parseError) {
                console.error('JSON 파싱 실패:', parseError);
                console.log('파싱 실패한 응답:', response);
                
                // Python 테스트에서 발견한 마크다운 코드 블록 패턴 처리
                console.log('=== 마크다운 코드 블록 패턴 처리 시작 ===');
                
                // 1. JSON 추출 시도 (개선된 버전)
                const extractedJson = this.extractJSONFromResponse(response);
                if (extractedJson) {
                    console.log('JSON 추출 성공:', extractedJson);
                    return extractedJson;
                }
                
                // 2. 응답 정리 후 재시도
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
                
                // 3. 추가적인 마크다운 패턴 처리
                const additionalJson = this.extractJSONFromMarkdown(response);
                if (additionalJson) {
                    console.log('추가 마크다운 패턴에서 JSON 추출 성공:', additionalJson);
                    return additionalJson;
                }
                
                // 4. 텍스트에서 제목 추출 시도
                const extractedTitle = this.extractTitleFromText(text);
                console.log('텍스트에서 추출한 제목:', extractedTitle);
                
                // 5. JSON 파싱 실패 시 오류 발생
                console.log('모든 JSON 추출 시도 실패');
                throw new Error('제공된 텍스트에서 일정 정보를 추출할 수 없습니다.');
            }
        } catch (error) {
            console.error('API 호출 실패:', error);
            throw new Error(`일정 정보 추출 실패: ${error.message}`);
        }
    }

    // 노트 포맷팅
    async formatNote(text, sourceUrl = '', sourceTitle = '') {
        const prompt = `
다음 텍스트를 마크다운 형식의 노트로 변환해주세요.

텍스트: "${text}"
출처 URL: ${sourceUrl}
출처 제목: ${sourceTitle}

요구사항:
1. 적절한 제목 생성
2. 내용을 구조화하여 정리
3. 핵심 포인트를 불릿 포인트로 정리
4. 태그 추가 (관련성에 따라)
5. 출처 정보 포함

마크다운 형식으로 응답해주세요.
`;

        try {
            const response = await this.callAPI(prompt, { temperature: 0.5 });
            return response;
        } catch (error) {
            throw new Error(`노트 포맷팅 실패: ${error.message}`);
        }
    }

    // 요약 생성
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

    // 태그 추출
    async extractTags(text) {
        const prompt = `
다음 텍스트에서 관련 태그를 추출해주세요.

텍스트: "${text}"

요구사항:
1. 텍스트의 주제와 관련된 태그 3-5개 추출
2. 쉼표로 구분하여 응답
3. 한국어 태그 사용

예시: #프로젝트, #회의, #일정, #업무
`;

        try {
            const response = await this.callAPI(prompt, { temperature: 0.3 });
            return response;
        } catch (error) {
            throw new Error(`태그 추출 실패: ${error.message}`);
        }
    }

    // 텍스트 분류
    async classifyText(text) {
        const prompt = `
다음 텍스트를 분류해주세요.

텍스트: "${text}"

분류 옵션:
- calendar: 일정/미팅 관련
- note: 노트/메모 관련  
- message: 메신저/소통 관련
- other: 기타

JSON 형식으로 응답:
{
    "category": "calendar|note|message|other",
    "confidence": 0.0-1.0,
    "reason": "분류 이유"
}
`;

        try {
            const response = await this.callAPI(prompt, { temperature: 0.2 });
            
            try {
                return JSON.parse(response);
            } catch (parseError) {
                return {
                    category: 'other',
                    confidence: 0.5,
                    reason: '분류 실패'
                };
            }
        } catch (error) {
            throw new Error(`텍스트 분류 실패: ${error.message}`);
        }
    }

    // 일정 정보 상세 분석
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
   - 명시된 참석자 이름/이메일
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

    // 응답에서 JSON 추출 (Python 테스트 결과 기반 개선 버전)
    extractJSONFromResponse(response) {
        try {
            console.log('=== JSON 추출 시도 (llm-utils) ===');
            console.log('원본 응답 길이:', response.length);
            console.log('원본 응답:', response);
            
            // 0. 응답 정리 (앞뒤 공백, 불필요한 문자 제거)
            let cleanedResponse = response.trim();
            console.log('정리된 응답:', cleanedResponse);
            
            // 1. 마크다운 코드 블록에서 JSON 추출 (Python 테스트에서 발견한 주요 패턴)
            // ```json\n{...}\n``` 형태
            const jsonBlockMatch = cleanedResponse.match(/```json\s*\n?([\s\S]*?)\n?\s*```/);
            if (jsonBlockMatch) {
                const jsonContent = jsonBlockMatch[1].trim();
                console.log('마크다운 JSON 블록 발견:', jsonContent);
                return JSON.parse(jsonContent);
            }
            
            // 2. 일반 마크다운 코드 블록에서 JSON 추출 (json 태그 없이)
            // ```\n{...}\n``` 형태
            const codeBlockMatch = cleanedResponse.match(/```\s*\n?([\s\S]*?)\n?\s*```/);
            if (codeBlockMatch) {
                const blockContent = codeBlockMatch[1].trim();
                console.log('일반 코드 블록 발견:', blockContent);
                // 블록 내용이 JSON 객체인지 확인
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
            
            // 4. 더 관대한 JSON 찾기 (중첩된 객체 포함)
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

    // 마크다운에서 JSON 추출 (Python 테스트 결과 기반 추가 함수)
    extractJSONFromMarkdown(response) {
        try {
            console.log('=== 마크다운 JSON 추출 시도 ===');
            
            // Python 테스트에서 발견한 정확한 패턴들
            const patterns = [
                // ```json\n{...}\n``` (정확한 패턴)
                /```json\s*\n([\s\S]*?)\n\s*```/,
                // ```json{...}``` (한 줄 패턴)
                /```json\s*(\{[\s\S]*?\})\s*```/,
                // ```\n{...}\n``` (json 태그 없이)
                /```\s*\n(\{[\s\S]*?\})\n\s*```/,
                // ```{...}``` (한 줄, json 태그 없이)
                /```\s*(\{[\s\S]*?\})\s*```/,
                // ```json\n{...}``` (개행 없이 끝)
                /```json\s*\n(\{[\s\S]*?\})\s*```/,
                // ```\n{...}``` (개행 없이 끝, json 태그 없이)
                /```\s*\n(\{[\s\S]*?\})\s*```/
            ];
            
            for (let i = 0; i < patterns.length; i++) {
                const match = response.match(patterns[i]);
                if (match) {
                    const jsonContent = match[1].trim();
                    console.log(`패턴 ${i + 1}에서 JSON 발견:`, jsonContent);
                    try {
                        const parsed = JSON.parse(jsonContent);
                        console.log('마크다운 JSON 파싱 성공:', parsed);
                        return parsed;
                    } catch (parseError) {
                        console.log(`패턴 ${i + 1} 파싱 실패:`, parseError.message);
                        continue;
                    }
                }
            }
            
            console.log('마크다운 패턴에서 JSON을 찾을 수 없음');
            return null;
        } catch (error) {
            console.error('마크다운 JSON 추출 실패:', error);
            return null;
        }
    }

    // 텍스트에서 제목 추출 (개선된 버전)
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

    // 시간 표현인지 확인
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

    // 응답 정리 함수 (Python 테스트 결과 기반 개선)
    cleanResponse(response) {
        try {
            console.log('=== 응답 정리 시작 ===');
            console.log('원본 응답:', response);
            
            // 앞뒤 공백 제거
            let cleaned = response.trim();
            
            // Python 테스트에서 발견한 마크다운 코드 블록 패턴들 제거
            const markdownPatterns = [
                // ```json\n{...}\n``` 형태
                /```json\s*\n([\s\S]*?)\n\s*```/,
                // ```\n{...}\n``` 형태 (json 태그 없이)
                /```\s*\n([\s\S]*?)\n\s*```/,
                // ```json{...}``` 형태 (한 줄)
                /```json\s*(\{[\s\S]*?\})\s*```/,
                // ```{...}``` 형태 (한 줄, json 태그 없이)
                /```\s*(\{[\s\S]*?\})\s*```/
            ];
            
            // 마크다운 코드 블록에서 내용만 추출
            for (const pattern of markdownPatterns) {
                const match = cleaned.match(pattern);
                if (match && match[1]) {
                    console.log('마크다운 패턴 발견, 내용 추출:', match[1]);
                    cleaned = match[1].trim();
                    break;
                }
            }
            
            // 불필요한 텍스트 제거 (JSON 객체만 남기기)
            const jsonMatch = cleaned.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
                cleaned = jsonMatch[0];
            }
            
            // 이스케이프 문자 정리
            cleaned = cleaned.replace(/\\"/g, '"');
            cleaned = cleaned.replace(/\\n/g, '\n');
            cleaned = cleaned.replace(/\\t/g, '\t');
            
            console.log('정리된 응답:', cleaned);
            return cleaned;
        } catch (error) {
            console.error('응답 정리 실패:', error);
            return response;
        }
    }

    // 일반적인 단어인지 확인
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

    // 텍스트에서 키워드 추출
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
}

// 전역으로 노출 (Service Worker와 브라우저 환경 모두 지원)
if (typeof window !== 'undefined') {
    window.GeminiAPI = GeminiAPI;
} else if (typeof self !== 'undefined') {
    // Service Worker 환경
    self.GeminiAPI = GeminiAPI;
}

// Node.js 환경에서도 사용 가능하도록
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeminiAPI;
} 