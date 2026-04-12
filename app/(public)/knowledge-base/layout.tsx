export default function KnowledgeBaseLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="main-content-shell p-3 sm:p-5 md:p-6">{children}</div>;
}
