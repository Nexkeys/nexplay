import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, type LinksFunction } from 'react-router';
import type { Route } from './+types/root';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './styles/base.css';

export const links: LinksFunction = () => [
  { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
  { rel: 'apple-touch-icon', href: '/icon-192.png' },
  { rel: 'manifest', href: '/manifest.webmanifest' }
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#130e0a" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function HydrateFallback() {
  return (
    <div className="boot" aria-busy="true">
      <span className="boot-mark" aria-hidden="true">
        <i />
      </span>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = 'Something went wrong';
  let detail = 'Please refresh the page. If it keeps happening, try again in a minute.';
  if (isRouteErrorResponse(error) && error.status === 404) {
    title = 'Page not found';
    detail = 'That page does not exist.';
  } else if (import.meta.env.DEV && error instanceof Error) {
    detail = error.message;
  }
  return (
    <main className="crash">
      <h1>{title}</h1>
      <p>{detail}</p>
      <a className="crash-link" href="/">
        Back to NexPlay
      </a>
    </main>
  );
}
