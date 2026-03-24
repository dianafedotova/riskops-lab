import { AuthCallbackClient } from "./page-client";

type Props = {
  searchParams?: Promise<{ code?: string }>;
};

export default async function AuthCallbackPage({ searchParams }: Props) {
  const params = await searchParams;
  const code = params?.code ?? null;
  return <AuthCallbackClient code={code} />;
}
