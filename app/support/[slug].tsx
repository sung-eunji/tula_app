import { Redirect, useLocalSearchParams } from 'expo-router';

const ALLOWED_SLUGS = new Set(['privacy', 'contact', 'delete-account']);

export default function SupportSlugRedirect() {
  const params = useLocalSearchParams<{ slug?: string }>();
  const rawSlug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const normalizedSlug = (rawSlug ?? '').toLowerCase();

  if (ALLOWED_SLUGS.has(normalizedSlug)) {
    return <Redirect href={`/support/${normalizedSlug}` as const} />;
  }

  return <Redirect href="/+not-found" />;
}
