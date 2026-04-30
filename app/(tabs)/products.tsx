import ProductsScreen from '@/screens/ProductsScreen';

import { useAppState } from './_appState';

export default function ProductsRoute() {
  const { language, user } = useAppState();
  if (!user) return null;
  return <ProductsScreen user={user} language={language} />;
}
