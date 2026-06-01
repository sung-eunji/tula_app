import ProductsScreen from '@/screens/ProductsScreen';
import { useAppState } from '@/providers/AppState';

export default function ProductsRoute() {
  const { language, user } = useAppState();
  return <ProductsScreen user={user!} language={language} />;
}
