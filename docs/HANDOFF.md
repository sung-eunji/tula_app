# Tula App — 개발 핸드오프 (Claude Code / 협업용)

> 레포 기준 스냅샷. 브랜드명 **Tula**, 패키지명 `yoga_business_appp`.  
> Momoyoga를 벤치마크로 하되, 현재는 **강사(스튜디오) 운영 툴**에 가깝다.

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **제품명** | Tula (요가 스튜디오·강사용 운영 앱) |
| **벤치마크** | Momoyoga (예약·결제·수련생 앱) — **대부분 미구현** |
| **타깃 시장** | 프랑스, 한국, 영국 |
| **사용자 모델** | 1 Supabase Auth 계정 = 1 스튜디오(강사). 강사가 **자기 회원(studio members)** 을 관리 |
| **플랫폼** | Expo ~54, React Native 0.81, React 19, **expo-router** |
| **백엔드** | Supabase (Auth + Postgres + Edge Function) |
| **원격** | https://github.com/sung-eunji/tula_app.git |

**포지셔닝:** Momoyoga처럼 “수련생 셀프 예약·온라인 결제”가 아니라, **강사가 회원·수업·출석·회원권을 직접 운영**하는 B2B 툴. 차별점으로 **요가 시퀀스**를 넣으려 했으나 **UI는 현재 비활성(복구 중)**.

---

## 2. 기술 스택 & 실행

```json
// package.json 핵심
"main": "expo-router/entry"
"expo": "~54.0.33"
"expo-router": "~6.0.23"
"@supabase/supabase-js": "^2.98.0"
```

**의존성:** Supabase, expo-router, react-native-webview(개인정보 HTML), url-polyfill  

**없음:** Stripe, Gemini SDK, React Navigation(직접), i18n 라이브러리(화면별 `COPY` 객체)

**환경 변수** (프로젝트 루트 `.env.local`):

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

**실행:**

```bash
npm install
npm run start   # expo start
npm run android
npm run ios
npm run web
```

**경로 별칭:** `@/*` → 프로젝트 루트 (`tsconfig.json`)

---

## 3. 앱 구조 (파일 트리)

```text
app/
  _layout.tsx              # Stack: tabs + support/*
  (tabs)/
    _layout.tsx            # Tabs + AppStateProvider
    index.tsx              # 스플래시 → mypage로 replace
    products.tsx           # → ProductsScreen
    members.tsx            # → MembersScreen
    schedule.tsx           # → ScheduleScreen
    sequence.tsx           # 플레이스홀더만 ("복구 중")
    mypage.tsx             # → MyPageScreen (로그인 필요)
  support/
    privacy.tsx            # WebView/iframe로 docs/privacy.html
    contact.tsx
    delete-account.tsx     # Edge Function 호출

screens/                   # 실제 UI 로직
  ProductsScreen.tsx
  MembersScreen.tsx
  ScheduleScreen.tsx
  MyPageScreen.tsx

services/
  supabase.ts              # 모든 API (단일 파일)

providers/
  AppState.tsx             # language, user, authLoading

types/
  index.ts                 # TS 타입 (일부 DB와 불일치 — §6 참고)

constants/
  theme.ts                 # PALETTE
  release.ts               # support email, privacy URLs

supabase/functions/
  delete-account/index.ts  # Deno Edge Function

docs/                      # GitHub Pages (privacy, delete-account, 이 문서)
components/
  CalendarDatePickerModal.tsx
utils/
  auth.ts                  # 비밀번호 규칙 검증
```

> **주의:** 루트 `README.md`는 구버전(`App.tsx`, `screens/` 단독, Gemini, `SUPABASE_SCHEMA.md`)을 언급한다. **실제 코드는 expo-router `app/` 구조**를 따른다.

---

## 4. 네비게이션 & UX 플로우

1. **시작:** `/(tabs)/index` — 로고 애니메이션 후 `/(tabs)/mypage`로 이동
2. **탭:** 상품 | 회원관리 | 스케줄 | 시퀀스 | 마이페이지
3. **인증:** `AppStateProvider`가 `getCurrentUser()`로 세션 복구
4. **미로그인:** `members`, `products`, `schedule`, `mypage` 라우트가 **`if (!user) return null`** → 빈 화면 (**로그인 UI 없음**)
5. **언어:** 마이페이지에서 `ko` | `en` | `fr` 전환 (기본 `ko`)

### 인증 갭 (중요)

`signInWithEmail`, `signUpWithEmail` 등은 `services/supabase.ts`에 있으나 **앱에 로그인/회원가입 화면이 없다**. 세션은 Supabase에 이미 있거나 외부에서 로그인해야 탭이 동작한다.

---

## 5. 화면별 기능

### 5.1 상품 (`ProductsScreen`)

| 기능 | 상태 |
|------|------|
| 상품 목록 조회 | ✅ (클라이언트 `user_id` 필터 없음 — RLS에 의존) |
| 상품 생성 | ✅ 이름, 설명, 가격, 통화(기본 EUR), 총 횟수, 유효일 |
| 상품 수정/삭제 | ❌ |
| 실제 결제 | ❌ (가격은 카탈로그용) |

### 5.2 회원 (`MembersScreen`)

| 기능 | 상태 |
|------|------|
| 회원 생성·수정 | ✅ |
| 회원 삭제 UI | ❌ |
| 회원권 부여 | ✅ 상품 + 시작일 → `memberships` insert |
| 회원권 삭제 | ✅ FK 시 `cancelled` 또는 attendances detach 후 삭제 |
| 남은 횟수/만료 표시 | ✅ |
| 다국어 | ✅ ko / en / fr |

**회원권 생성:** `remaining_sessions` = 상품 `total_sessions`, `end_date` = 시작일 + `validity_days`.

### 5.3 스케줄 (`ScheduleScreen`)

| 기능 | 상태 |
|------|------|
| 수업 생성 | ✅ 제목, 날짜, 시간, duration(30–120분), 장소, 정원 |
| 주간 반복 | ✅ 요일 + 종료일까지 여러 `classes` row |
| 수업 수정 | ✅ |
| 수업 삭제 | ❌ |
| 출석 | ✅ 수업 + 복수 회원 → `attendances` |
| 회원권 차감 | ✅ `used_session` + `membership_id` 시 `remaining_sessions` -1 |
| 중복 출석 방지 | ✅ 동일 class+member skip |
| 중복 정리 | ✅ 로드 시 `cleanupDuplicateAttendances` |
| 리스트/달력 뷰 | ✅ |
| 회원 셀프 예약 | ❌ |

`class_datetime`: `YYYY-MM-DDTHH:MM` 형태로 저장.

### 5.4 시퀀스 (`app/(tabs)/sequence.tsx`)

| 기능 | 상태 |
|------|------|
| UI | ❌ "시퀀스 화면은 현재 복구 중입니다." |
| DB API | ✅ `fetchSequences`, `createSequenceWithPoses` |
| Gemini 자동 생성 | ❌ |

### 5.5 마이페이지 (`MyPageScreen`)

| 기능 | 상태 |
|------|------|
| 닉네임 변경 + 중복 검사 | ✅ |
| 비밀번호 변경 | ✅ |
| 로그아웃 | ✅ |
| 통계 | ✅ 월별 시퀀스 theme 분포, 최근 6개월 신규 회원 유입 |
| 언어 전환 | ✅ |
| 개인정보/문의/계정삭제 | ✅ |
| 로그인/회원가입 UI | ❌ |

### 5.6 Support / App Store

- `constants/release.ts`: support email, GitHub Pages URLs
- `docs/privacy.html`, `docs/delete-account.html` → GitHub Actions Pages
- `supabase/functions/delete-account` + `app/support/delete-account.tsx`

---

## 6. Supabase

### 6.1 관계도

```text
auth.users
    └── profiles (1:1, id = auth uid)

profiles (studio owner / 강사)
    ├── members
    ├── products
    ├── memberships      (member + product)
    ├── classes
    ├── attendances      (class + member)
    ├── sequences
    └── sequence_poses
```

모든 비즈니스 row에 **`user_id`** = 스튜디오 소유자(강사) id.

> 레포에 **SQL migration / RLS policy 파일 없음**. 대시보드에만 있을 수 있음.

### 6.2 테이블 (코드 기준 추론)

#### `profiles`

| 컬럼 | 비고 |
|------|------|
| id | PK, = auth.users.id |
| email, nickname, full_name | |
| gender | `female` \| `male` \| `other` |

#### `members`

| 컬럼 | 비고 |
|------|------|
| id, user_id | |
| full_name | 필수 |
| email, phone, notes | optional |
| created_at | |

#### `products`

| 컬럼 | 비고 |
|------|------|
| id, user_id, name, description | |
| price | number |
| currency | default `EUR` |
| total_sessions | null = 무제한 |
| validity_days | null = 만료 없음 |
| is_active | default true |
| created_at | |

#### `memberships`

| 컬럼 | 비고 |
|------|------|
| id, user_id, member_id, product_id | |
| start_date, end_date | YYYY-MM-DD |
| remaining_sessions | |
| status | e.g. `active`, `cancelled` |
| created_at | |

#### `classes`

| 컬럼 | 비고 |
|------|------|
| id, user_id, title, class_datetime | |
| duration_minutes | 없는 DB면 insert fallback |
| location, capacity | optional |
| created_at | |

#### `attendances`

| 컬럼 | 비고 |
|------|------|
| id, user_id, class_id, member_id | |
| membership_id | optional |
| used_session | boolean |
| created_at | |

논리적 unique: `(user_id, class_id, member_id)`.

#### `sequences`

| 컬럼 (insert 기준) | |
|-------------------|--|
| user_id, title, theme | |
| level, total_duration | optional |
| origin | `manual` \| `auto` |
| notes | optional |
| created_at | |

#### `sequence_poses`

| 실제 DB (insert) | `types/index.ts` (구버전) |
|------------------|---------------------------|
| order_index | pose_order |
| english_name | pose_name |
| hold_time_seconds | duration_seconds |
| cue | (없음) |
| user_id, sequence_id | |

### 6.3 API 함수 (`services/supabase.ts`)

**Auth / Profile**

- `isEmailAvailable`, `isNicknameAvailable`
- `signUpWithEmail`, `signInWithEmail`, `signOut`, `getCurrentUser`, `getUserBySessionUser`
- `updateProfile`, `sendPasswordResetEmail`, `changePasswordWithCurrentPassword`
- `deleteCurrentAccount` → Edge Function `delete-account`

**Members:** `fetchMembers`, `createMember`, `updateMember`

**Products:** `fetchProducts`, `createProduct`

**Memberships:** `fetchMemberships`, `createMembership`, `deleteMembership`

**Classes / Attendance:** `fetchClasses`, `createClass`, `updateClass`, `fetchAttendances`, `markAttendance`, `cleanupDuplicateAttendances`

**Sequences:** `fetchSequences`, `createSequenceWithPoses`

### 6.4 Edge Function `delete-account`

삭제 순서 (service role):

1. sequence_poses  
2. attendances  
3. memberships  
4. classes  
5. members  
6. products  
7. sequences  
8. profiles  
9. `auth.admin.deleteUser`

환경: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### 6.5 RLS 가정

- `auth.uid() = user_id` 로 row 스코프
- `products` insert, `attendances` insert/update, `memberships` delete/update 정책 필요
- `MembersScreen`, `ScheduleScreen`은 클라이언트에서도 `user_id` 필터
- `ProductsScreen`은 클라이언트 필터 없음

---

## 7. 다국어 (FR / KR / UK)

| 코드 | UI |
|------|-----|
| `ko` | 한국어 |
| `en` | 영어 (영국 포함) |
| `fr` | 프랑스어 |

각 `screens/*` 내부 `COPY: Record<AppLanguage, ...>` — i18n 파일 분리 없음.

상품 기본 통화 `EUR`. `formatPrice`는 `ko-KR` locale 사용 중.

---

## 8. Momoyoga 대비

| Momoyoga | Tula |
|----------|------|
| 스튜디오 회원 관리 | ✅ |
| 이용권/상품 | ✅ (결제 없음) |
| 수업 스케줄 + 캘린더 | ✅ |
| 출석·횟수 차감 | ✅ |
| 온라인 예약 (수련생) | ❌ |
| 온라인 결제 | ❌ |
| 이벤트/워크숍 | ❌ |
| 수련생 앱 | ❌ |
| 시퀀스 | △ DB만 |
| 웹 embed / Zoom | ❌ |

---

## 9. 알려진 이슈 / 기술 부채

1. 로그인·회원가입 UI 없음  
2. 시퀀스 탭 비어 있음  
3. `types/index.ts` vs DB 컬럼 불일치 (sequence_poses)  
4. README vs 실제 구조 불일치  
5. ProductsScreen — `user_id` 클라이언트 필터 없음  
6. 상품·수업 삭제 없음  
7. 출석 취소·횟수 복구 UI 없음  
8. `authLoading` 로딩 UI 없음  
9. Gemini — README만 언급, 코드 없음  

---

## 10. 권장 다음 작업

### Phase A — 앱 사용 가능

1. 로그인 / 회원가입 / 비밀번호 찾기 화면  
2. `!user` → Auth, `user` → 탭  
3. `authLoading` 스플래시  

### Phase B — Momoyoga 방향 (FR/KR/UK)

4. `bookings`: 예약·정원·취소  
5. Stripe / 현지 PG → membership 자동 생성  
6. 수련생 계정 ↔ `members` 연결  
7. workshop vs regular class  

### Phase C — Tula 차별화

8. 시퀀스 UI 복구 (+ 선택 Gemini)  
9. EUR / KRW / GBP 프리셋  

### Phase D — 운영

10. `SUPABASE_SCHEMA.md` + migrations in repo  
11. RLS SQL 버전 관리  
12. README 업데이트  

---

## 11. 디자인 · 비밀번호

```typescript
// constants/theme.ts
PALETTE.page: '#FFF8F2'
PALETTE.primary: '#C62828'
```

```typescript
// utils/auth.ts — 8자+, 대소문자+숫자 각 1+
isValidPassword(password)
```

---

## 12. 릴리스 정보

```typescript
// constants/release.ts
supportEmail: 'nebaneba.rt@gmail.com'
privacyPolicyUrl: 'https://sung-eunji.github.io/tula_app/privacy.html'
accountDeletionUrl: 'https://sung-eunji.github.io/tula_app/delete-account.html'
```
