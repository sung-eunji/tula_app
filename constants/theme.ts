export const PALETTE = {
  // 배경 / 카드
  page:        '#FBF3EA',  // 크림 배경
  card:        '#FFFDFB',

  // 텍스트
  text:        '#2B2521',  // ink (warm near-black)
  mutedText:   '#8C8076',  // muted

  // 테두리
  border:      '#EEE1D2',  // line

  // Primary — 로고 그린
  primary:     '#1F7A4D',
  primaryDark: '#13502F',

  // Accent — 로고 피치
  accent:      '#F0A878',
  accentSoft:  '#FBE6D3',

  // Soft tints
  greenSoft:   '#E4F0E8',

  // Danger — 삭제·계정삭제 등에만
  danger:      '#C0563B',
  dangerText:  '#C0563B',

  // 레거시 별칭 (기존 화면 호환)
  ink:         '#2B2521',
  muted:       '#8C8076',
  line:        '#EEE1D2',
  lemon:       '#E4F0E8',   // greenSoft로 대체
  lemonBorder: '#1F7A4D',   // primary로 대체
  track:       '#E4F0E8',   // greenSoft로 대체
  mutedBar:    '#8C8076',   // muted로 대체
} as const;
