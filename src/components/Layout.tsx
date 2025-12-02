import { Link, Outlet } from 'react-router-dom';
export default function Layout() {
  return (
    <div className="flex h-lvh bg-background text-foreground">
      <nav className="w-52 border-r border-border bg-sidebar p-5">
        <div className="flex justify-between items-center mb-6">
          <h2 className="mt-0 text-sidebar-foreground font-semibold">Menu</h2>
        </div>
        <ul className="list-none p-0 space-y-2">
          <li>
            <Link
              to="/"
              className="block px-3 py-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              to="/campaigns"
              className="block px-3 py-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              Campaigns
            </Link>
          </li>
          <li>
            <Link
              to="/line-items"
              className="block px-3 py-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              Line Items
            </Link>
          </li>
          { /*
          <li>
            <Link
              to="/invoices"
              className="block px-3 py-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              Invoices
            </Link>
          </li> */}
        </ul>
      </nav>
      <div className="flex-1 flex flex-col min-h-0">
        <main className="flex-1 p-5 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
