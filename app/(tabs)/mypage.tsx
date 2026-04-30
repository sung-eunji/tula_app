import MyPageScreen from '@/screens/MyPageScreen';

import { useAppState } from './_appState';

export default function MyPageRoute() {
  const { language, setLanguage, user, setUser } = useAppState();
  if (!user) return null;

  return (
    <MyPageScreen
      user={user}
      onLogout={() => setUser(null)}
      onUserUpdate={setUser}
      language={language}
      onLanguageChange={setLanguage}
    />
  );
}
