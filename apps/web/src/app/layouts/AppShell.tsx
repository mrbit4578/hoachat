import { ROUTES } from "../../constants/routes";

export function AppShell() {
  return (
    <main className="app-shell">
      <header>
        <h1>Hoachat Chemical Control</h1>
        <p>ZDHC compliance, inventory lots, inbound, outbound, and reporting.</p>
      </header>
      <section aria-label="Module navigation" className="module-grid">
        {ROUTES.map((route) => (
          <article key={route.path} className="module-card">
            <h2>{route.label}</h2>
            <p>{route.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
