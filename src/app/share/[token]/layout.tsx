export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-atmosphere flex h-dvh min-h-0 flex-col overflow-hidden">
      <p className="shrink-0 border-b border-border bg-surface/90 px-4 py-2 text-center text-xs text-muted print:hidden">
        Shared initiative view — sign-in is not required
      </p>
      <main className="workspace-content min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
