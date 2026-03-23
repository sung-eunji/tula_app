# Tula App

Tula는 요가 스튜디오 운영을 위한 Expo + React Native 앱입니다.  
회원 관리, 상품 관리, 수업 일정/출석 관리, 시퀀스 생성 및 저장, 계정 설정 기능을 하나의 앱에서 사용할 수 있습니다.

## 주요 기능

- 이메일 기반 로그인/회원가입 및 비밀번호 재설정
- 회원 등록 및 회원권 부여
- 상품(이용권) 등록 및 관리
- 수업 일정 등록, 수정, 출석 체크
- 요가 시퀀스 수동 작성
- Gemini 기반 요가 시퀀스 자동 생성 및 저장
- 마이페이지 통계 확인
- 한국어 / 영어 / 프랑스어 지원

## 기술 스택

- Expo
- React Native
- TypeScript
- React Navigation
- Supabase Auth + Database

## 프로젝트 구조

```text
.
|- App.tsx                # 메인 탭 네비게이션 및 세션 진입점
|- screens/               # 화면 컴포넌트
|- services/              # Supabase / Gemini 연동 로직
|- components/            # 공통 UI 컴포넌트
|- types/                 # 타입 정의
|- assets/                # 이미지 및 정적 리소스
|- SUPABASE_SCHEMA.md     # 현재 앱에서 사용하는 스키마 정리
```

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 만들고 아래 값을 설정합니다.

```bash
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-gemini-api-key
```

현재 `services/gemini.ts`에서는 Gemini 키를 `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` 이름으로 읽고 있습니다.

### 3. 앱 실행

```bash
npm run start
```

필요하면 아래 명령도 사용할 수 있습니다.

```bash
npm run android
npm run ios
npm run web
```

## 데이터베이스

백엔드는 Supabase를 사용합니다. 현재 앱에서 사용하는 주요 테이블과 메모는 `SUPABASE_SCHEMA.md`에 정리되어 있습니다.

주요 사용 테이블:

- `profiles`
- `members`
- `products`
- `memberships`
- `classes`
- `attendances`
- `sequences`
- `sequence_poses`

## 개발 메모

- 일부 화면은 다국어 문자열을 화면 파일 내부에서 직접 관리합니다.
- 출석 저장은 Supabase RLS 정책에 영향을 받습니다.
- 시퀀스 자동 생성은 외부 API 키가 필요합니다.

## 참고

원격 저장소: [sung-eunji/tula_app](https://github.com/sung-eunji/tula_app.git)
