import MembersScreen from '@/screens/MembersScreen';
import { useAppState } from '@/providers/AppState';

export default function MembersRoute() {
  const { language, user } = useAppState();
  return <MembersScreen user={user!} language={language} />;
}
