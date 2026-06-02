import SequenceScreen from '@/screens/SequenceScreen';
import { useAppState } from '@/providers/AppState';

export default function SequenceRoute() {
  const { language, user } = useAppState();
  if (!user) return null;
  return <SequenceScreen user={user} language={language} />;
}
