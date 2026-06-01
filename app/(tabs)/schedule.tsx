import ScheduleScreen from '@/screens/ScheduleScreen';
import { useAppState } from '@/providers/AppState';

export default function ScheduleRoute() {
  const { language, user } = useAppState();
  return <ScheduleScreen user={user!} language={language} />;
}
