import { type RouteConfig, index, layout, route } from '@react-router/dev/routes';

export default [
  layout('routes/public/layout.tsx', [
    index('routes/public/home.tsx'),
    route('games', 'routes/public/games.tsx'),
    route('games/:id', 'routes/public/game.tsx'),
    route('leaderboard', 'routes/public/leaderboard.tsx'),
    route('about', 'routes/public/about.tsx'),
    route('guide', 'routes/public/guide.tsx'),
    route('privacy', 'routes/public/privacy.tsx'),
    route('terms', 'routes/public/terms.tsx')
  ]),
  layout('routes/app/layout.tsx', [
    route('play', 'routes/app/play.tsx'),
    route('room/:code', 'routes/app/room.tsx'),
    route('solo/:game', 'routes/app/solo.tsx'),
    route('match/:game', 'routes/app/match.tsx'),
    route('profile', 'routes/app/profile.tsx')
  ]),
  route('*', 'routes/not-found.tsx')
] satisfies RouteConfig;
