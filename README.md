# SmartCalendar

클립보드의 텍스트를 Google Calendar에 자동 등록하는 AI 기반 생산성 도구

## 🚀 주요 기능

- **📅 일정 등록**: 클립보드의 텍스트를 Google Calendar에 자동 등록
- **🤖 AI 기반**: Google Gemini API를 활용한 스마트한 텍스트 분석
- **📝 스마트 요약**: 일정 내용을 AI가 자동으로 요약하여 등록
- **🔄 자동 로드**: 팝업 열기 시 클립보드에서 텍스트 자동 로드

## 📦 설치 방법

### Chrome 웹 스토어에서 설치 (권장)

1. [Chrome 웹 스토어](https://chrome.google.com/webstore)에서 SmartCalendar 검색
2. "Chrome에 추가" 버튼 클릭
3. 권한 허용 확인

### 개발자 모드로 설치

1. 이 저장소를 클론하거나 다운로드
2. Chrome에서 `chrome://extensions/` 접속
3. "개발자 모드" 활성화
4. "압축해제된 확장 프로그램을 로드합니다" 클릭
5. 프로젝트 폴더 선택

## ⚙️ 설정

### 1. API 키 설정

확장 프로그램 설정에서 다음 API 키들을 설정하세요:

- **Gemini API Key**: [Google AI Studio](https://aistudio.google.com/)에서 발급
- **Google Calendar OAuth**: 자동으로 처리됩니다

### 2. Gemini API 키 발급 방법

1. [Google AI Studio](https://aistudio.google.com/) 접속
2. Google 계정으로 로그인
3. "Get API key" 클릭
4. 새 API 키 생성 또는 기존 키 선택
5. 생성된 API 키를 확장 프로그램 설정에 입력

## 🎯 사용 방법

### 클립보드 기반 사용

1. 일정으로 등록할 텍스트를 복사 (Ctrl+C 또는 Cmd+C)
2. SmartCalendar 확장 프로그램 아이콘 클릭
3. 클립보드에서 텍스트가 자동으로 로드됨
4. "일정 등록" 버튼 클릭

### 컨텍스트 메뉴 사용

1. 웹 페이지에서 텍스트 선택
2. 우클릭하여 컨텍스트 메뉴 열기
3. "SmartCalendar" → "일정 등록" 선택

## 🔧 기술 스택

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Chrome Extension API
- **AI**: Google Gemini API
- **Calendar**: Google Calendar API

## 🛠️ 개발

### 프로젝트 구조

```
SmartCalendar/
├── background.js          # Service Worker (메인 로직)
├── content-script.js      # Content Script
├── popup.html/js          # 팝업 UI
├── options.html/js        # 설정 페이지
├── llm-utils.js           # Gemini API 연동
├── calendar-utils.js      # Google Calendar 연동
├── icons/                 # 확장 프로그램 아이콘
└── manifest.json          # 확장 프로그램 매니페스트
```

## 🐛 문제 해결

### 일반적인 문제

- **API 키 오류**: 설정에서 API 키를 다시 확인
- **권한 오류**: 확장 프로그램 권한을 확인
- **네트워크 오류**: 인터넷 연결 상태 확인
- **클립보드 접근 오류**: 브라우저 설정에서 클립보드 권한 허용

## 📝 라이선스

MIT License

## 🤝 기여

버그 리포트나 기능 제안은 이슈로 등록해주세요.

## 📞 지원

문제가 발생하면 다음을 확인해주세요:

1. Chrome 개발자 도구의 콘솔 로그
2. 확장 프로그램의 백그라운드 페이지 로그
3. 네트워크 연결 상태 및 API 키 설정 