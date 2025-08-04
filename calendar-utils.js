// Google Calendar API 유틸리티 모듈

// 기존 OAuth 방식 클래스
class GoogleCalendarAPI {
    constructor(accessToken) {
        this.accessToken = accessToken;
        this.baseUrl = 'https://www.googleapis.com/calendar/v3';
    }

    // API 호출 기본 함수 (개선된 버전)
    async callAPI(endpoint, options = {}) {
        if (!this.accessToken) {
            throw new Error('Google Calendar 액세스 토큰이 없습니다.');
        }

        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            method: options.method || 'GET',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        console.log('Google Calendar API 호출:', {
            url: url,
            method: config.method,
            body: options.body ? JSON.parse(options.body) : null
        });

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (parseError) {
                    errorData = { error: { message: response.statusText } };
                }
                
                console.error('Google Calendar API 오류 상세:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: url,
                    method: config.method,
                    errorData: errorData,
                    requestBody: options.body ? JSON.parse(options.body) : null
                });
                
                // 구체적인 오류 메시지 생성
                let errorMessage = `Calendar API 오류 (${response.status})`;
                if (errorData.error) {
                    if (errorData.error.message) {
                        errorMessage += `: ${errorData.error.message}`;
                    }
                    if (errorData.error.details && errorData.error.details.length > 0) {
                        errorMessage += ` - ${errorData.error.details.map(d => d.message).join(', ')}`;
                    }
                }
                
                throw new Error(errorMessage);
            }

            const responseData = await response.json();
            console.log('Google Calendar API 응답 성공:', responseData);
            return responseData;
        } catch (error) {
            console.error('Google Calendar API 호출 오류:', error);
            throw error;
        }
    }

    // 캘린더 목록 가져오기
    async getCalendarList() {
        try {
            const response = await this.callAPI('/users/me/calendarList');
            return response.items || [];
        } catch (error) {
            throw new Error(`캘린더 목록 조회 실패: ${error.message}`);
        }
    }

    // 기본 캘린더 정보 가져오기
    async getPrimaryCalendar() {
        try {
            const response = await this.callAPI('/calendars/primary');
            return response;
        } catch (error) {
            throw new Error(`기본 캘린더 조회 실패: ${error.message}`);
        }
    }

    // 일정 생성 (개선된 버전)
    async createEvent(calendarId, eventData) {
        try {
            console.log('일정 생성 시작:', {
                calendarId: calendarId,
                eventTitle: eventData.summary,
                startTime: eventData.start?.dateTime,
                endTime: eventData.end?.dateTime,
                attendees: eventData.attendees
            });

            // 중복 일정 확인
            const isDuplicate = await this.checkDuplicateEvent(calendarId, eventData);
            if (isDuplicate) {
                console.log('중복 일정 감지됨:', eventData.summary);
                // 중복이어도 계속 진행하되, 사용자에게 알림을 위해 플래그 설정
                eventData.isDuplicate = true;
            }

            // 최종 요청 데이터 로깅
            console.log('=== Google Calendar API 요청 데이터 ===');
            console.log('요청 URL:', `/calendars/${calendarId}/events`);
            console.log('요청 메서드:', 'POST');
            console.log('요청 본문:', JSON.stringify(eventData, null, 2));
            console.log('=== 요청 데이터 끝 ===');

            const response = await this.callAPI(`/calendars/${calendarId}/events`, {
                method: 'POST',
                body: JSON.stringify(eventData)
            });

            console.log('일정 생성 성공:', response);
            return {
                ...response,
                isDuplicate: eventData.isDuplicate || false
            };
        } catch (error) {
            console.error('일정 생성 오류:', error);
            throw new Error(`일정 생성 실패: ${error.message}`);
        }
    }

    // 일정 업데이트
    async updateEvent(calendarId, eventId, eventData) {
        try {
            const response = await this.callAPI(`/calendars/${calendarId}/events/${eventId}`, {
                method: 'PUT',
                body: JSON.stringify(eventData)
            });
            return response;
        } catch (error) {
            throw new Error(`일정 업데이트 실패: ${error.message}`);
        }
    }

    // 일정 삭제
    async deleteEvent(calendarId, eventId) {
        try {
            await this.callAPI(`/calendars/${calendarId}/events/${eventId}`, {
                method: 'DELETE'
            });
            return { success: true };
        } catch (error) {
            throw new Error(`일정 삭제 실패: ${error.message}`);
        }
    }

    // 일정 검색
    async searchEvents(calendarId, query, timeMin, timeMax) {
        try {
            const params = new URLSearchParams({
                q: query,
                timeMin: timeMin || new Date().toISOString(),
                timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 후
                singleEvents: true,
                orderBy: 'startTime'
            });

            const response = await this.callAPI(`/calendars/${calendarId}/events?${params}`);
            return response.items || [];
        } catch (error) {
            throw new Error(`일정 검색 실패: ${error.message}`);
        }
    }

    // 일정 데이터 포맷팅 (개선된 버전)
    formatEventData(calendarInfo) {
        console.log('일정 데이터 포맷팅 시작:', calendarInfo);
        
        const now = new Date();
        let startDate = new Date(calendarInfo.startDate || now);
        let endDate = new Date(calendarInfo.endDate || new Date(startDate.getTime() + 60 * 60 * 1000)); // 1시간 후

        // 날짜 유효성 검사 및 수정
        if (isNaN(startDate.getTime())) {
            console.warn('시작 날짜가 유효하지 않음, 현재 시간으로 설정:', calendarInfo.startDate);
            startDate = now;
        }
        
        if (isNaN(endDate.getTime())) {
            console.warn('종료 날짜가 유효하지 않음, 시작 시간 + 1시간으로 설정:', calendarInfo.endDate);
            endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        }

        // 종료 시간이 시작 시간보다 이전인 경우 수정
        if (endDate <= startDate) {
            console.warn('종료 시간이 시작 시간보다 이전임, 시작 시간 + 1시간으로 수정');
            endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        }

        // 한국 시간대 설정
        const koreaTimeZone = 'Asia/Seoul';

        // 참석자 데이터 정리 (스마트 검증)
        const attendees = [];
        if (calendarInfo.attendees && Array.isArray(calendarInfo.attendees)) {
            calendarInfo.attendees.forEach(attendee => {
                if (attendee && typeof attendee === 'string' && attendee.trim()) {
                    const trimmedAttendee = attendee.trim();
                    
                    // 이메일 형식 검증
                    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                    if (emailRegex.test(trimmedAttendee)) {
                        console.log('유효한 참석자 이메일 추가:', trimmedAttendee);
                        attendees.push({ email: trimmedAttendee });
                    } else {
                        // 이메일이 아닌 경우 (이름, 전화번호 등) 제외
                        console.log('이메일이 아닌 참석자 정보 제외:', trimmedAttendee);
                        console.log('참고: Google Calendar API는 유효한 이메일 주소만 허용합니다.');
                    }
                } else if (attendee && typeof attendee === 'object' && attendee.email) {
                    // 이미 객체 형태로 전달된 경우
                    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                    if (emailRegex.test(attendee.email)) {
                        console.log('유효한 참석자 객체 추가:', attendee);
                        attendees.push(attendee);
                    } else {
                        console.log('유효하지 않은 이메일을 가진 참석자 객체 제외:', attendee);
                    }
                }
            });
        }
        
        console.log('최종 참석자 목록:', attendees);

        // 알림 설정
        const reminderMinutes = this.parseReminderTime(calendarInfo.reminder);

        // 제목과 설명 정리
        const title = (calendarInfo.title && typeof calendarInfo.title === 'string') 
            ? calendarInfo.title.trim() 
            : '새로운 일정';
        
        const description = (calendarInfo.description && typeof calendarInfo.description === 'string') 
            ? this.improveDescriptionFormatting(calendarInfo.description.trim())
            : '';
        
        const location = (calendarInfo.location && typeof calendarInfo.location === 'string') 
            ? calendarInfo.location.trim() 
            : '';

        const eventData = {
            summary: title,
            description: description,
            location: location,
            start: {
                dateTime: startDate.toISOString(),
                timeZone: koreaTimeZone
            },
            end: {
                dateTime: endDate.toISOString(),
                timeZone: koreaTimeZone
            },
            attendees: attendees, // 빈 배열이어도 괜찮음
            reminders: {
                useDefault: false,
                overrides: [
                    {
                        method: 'popup',
                        minutes: reminderMinutes
                    }
                ]
            }
        };

        // 빈 필드 제거 (Google Calendar API 호환성을 위해)
        if (!eventData.description) {
            delete eventData.description;
        }
        if (!eventData.location) {
            delete eventData.location;
        }
        if (!eventData.attendees || eventData.attendees.length === 0) {
            delete eventData.attendees;
        } else {
            // 참석자 데이터 최종 검증
            const validAttendees = eventData.attendees.filter(attendee => {
                if (!attendee || !attendee.email) {
                    console.log('유효하지 않은 참석자 제거:', attendee);
                    return false;
                }
                const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                const isValid = emailRegex.test(attendee.email);
                if (!isValid) {
                    console.log('유효하지 않은 이메일 제거:', attendee.email);
                }
                return isValid;
            });
            
            if (validAttendees.length === 0) {
                delete eventData.attendees;
                console.log('모든 참석자가 유효하지 않아 참석자 필드 제거');
            } else {
                eventData.attendees = validAttendees;
                console.log('최종 유효한 참석자:', validAttendees);
            }
        }

        console.log('=== 최종 포맷된 일정 데이터 ===');
        console.log('제목:', eventData.summary);
        console.log('설명:', eventData.description || '(없음)');
        console.log('장소:', eventData.location || '(없음)');
        console.log('시작 시간:', eventData.start.dateTime);
        console.log('종료 시간:', eventData.end.dateTime);
        console.log('참석자:', eventData.attendees || '(없음)');
        console.log('알림:', eventData.reminders.overrides[0].minutes + '분 전');
        console.log('=== 포맷된 데이터 끝 ===');
        
        return eventData;
    }

    // Description 포맷팅 개선
    improveDescriptionFormatting(description) {
        if (!description || typeof description !== 'string') {
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
        improved = improved.replace(/([^\\n])(\()/g, '$1\n$2');
        
        // 5. 쉼표 뒤에 줄바꿈 추가 (특정 패턴)
        improved = improved.replace(/(진행\))(,)/g, '$1\n$2');
        
        // 6. 연속된 줄바꿈 정리 (3개 이상을 2개로)
        improved = improved.replace(/\n\n\n+/g, '\n\n');
        
        // 7. 앞뒤 공백 제거
        improved = improved.trim();
        
        return improved;
    }

    // 알림 시간 파싱
    parseReminderTime(reminderText) {
        if (!reminderText) return 15; // 기본값 15분 전

        const text = reminderText.toLowerCase();
        
        // 숫자와 단위 추출
        const patterns = [
            { regex: /(\d+)\s*분/, multiplier: 1 },
            { regex: /(\d+)\s*시간/, multiplier: 60 },
            { regex: /(\d+)\s*일/, multiplier: 24 * 60 },
            { regex: /(\d+)\s*주/, multiplier: 7 * 24 * 60 }
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern.regex);
            if (match) {
                const minutes = parseInt(match[1]) * pattern.multiplier;
                return Math.max(1, Math.min(minutes, 40320)); // 1분 ~ 4주 (Google Calendar 제한)
            }
        }

        return 15; // 기본값
    }

    // 중복 일정 확인
    async checkDuplicateEvent(calendarId, eventData, timeWindow = 30) {
        try {
            const startTime = new Date(eventData.start.dateTime);
            const endTime = new Date(startTime.getTime() + timeWindow * 60 * 1000); // 30분 윈도우

            const events = await this.searchEvents(
                calendarId,
                eventData.summary,
                startTime.toISOString(),
                endTime.toISOString()
            );

            return events.length > 0;
        } catch (error) {
            console.error('중복 일정 확인 오류:', error);
            return false;
        }
    }
}

// 전역으로 노출 (Service Worker와 브라우저 환경 모두 지원)
if (typeof window !== 'undefined') {
    window.GoogleCalendarAPI = GoogleCalendarAPI;
} else if (typeof self !== 'undefined') {
    // Service Worker 환경
    self.GoogleCalendarAPI = GoogleCalendarAPI;
}

// Node.js 환경에서도 사용 가능하도록
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoogleCalendarAPI;
}

// Chrome 확장 프로그램 환경에서는 export 문법을 사용하지 않음
// 대신 전역 객체에 할당하여 사용 