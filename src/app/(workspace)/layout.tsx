import { WorkspaceNav, ConceptBanner } from "@/components/workspace/WorkspaceNav";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-atmosphere flex min-h-full flex-1 flex-col">
      <WorkspaceNav />
      <ConceptBanner />
      {children}
    </div>
  );
}
