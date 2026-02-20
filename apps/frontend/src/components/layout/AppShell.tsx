import { Outlet } from 'react-router-dom';

// TODO Sprint 1 : ajouter navigation sidebar, header, layout complet
export function AppShell() {
  return (
    <div className="flex h-screen bg-luxury-50">
      {/* Sidebar — Sprint 1 */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground" />

      {/* Contenu principal */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
