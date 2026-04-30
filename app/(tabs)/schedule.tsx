import ScheduleScreen from '@/screens/ScheduleScreen';

import { useAppState } from './_appState';

export default function ScheduleRoute() {
  const { language, user } = useAppState();
  if (!user) return null;
  return <ScheduleScreen user={user} language={language} />;
}
