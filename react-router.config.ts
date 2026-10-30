import type { Config } from '@react-router/dev/config';
import { gameIds } from './app/engine/catalog';

export default {
  ssr: false,
  prerender: [
    '/',
    '/games',
    ...gameIds.map((id) => `/games/${id}`),
    '/leaderboard',
    '/about',
    '/guide',
    '/privacy',
    '/terms'
  ]
} satisfies Config;
