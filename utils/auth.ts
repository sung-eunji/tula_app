const MIN_PASSWORD_LENGTH = 8;

export function isValidPassword(password: string): boolean {
  if (password.length < MIN_PASSWORD_LENGTH) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  return true;
}

export function getPasswordValidationMessage(password: string): string {
  if (!password) return '비밀번호를 입력해주세요.';
  if (password.length < MIN_PASSWORD_LENGTH) return '비밀번호는 8자 이상이어야 합니다.';
  if (!/[A-Z]/.test(password)) return '비밀번호에 영문 대문자를 1개 이상 포함해주세요.';
  if (!/[a-z]/.test(password)) return '비밀번호에 영문 소문자를 1개 이상 포함해주세요.';
  if (!/\d/.test(password)) return '비밀번호에 숫자를 1개 이상 포함해주세요.';
  return '';
}
