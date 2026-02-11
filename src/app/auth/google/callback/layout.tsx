// Force dynamic rendering for OAuth callback
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

export default function CallbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
