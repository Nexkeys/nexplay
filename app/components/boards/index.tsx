import { lazy, type ComponentType } from 'react';
import type { GameId } from '~/engine/types';
import type { StageProps } from '~/lib/stage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Board = ComponentType<StageProps<any>>;

export const BOARDS: Record<GameId, React.LazyExoticComponent<Board>> = {
  ayo: lazy(() => import('./Ayo')),
  whot: lazy(() => import('./Whot')),
  'connect-four': lazy(() => import('./ConnectFour')),
  'tic-tac-toe': lazy(() => import('./TicTacToe')),
  rps: lazy(() => import('./Rps')),
  'word-race': lazy(() => import('./WordRace')),
  'quick-math': lazy(() => import('./QuickMath')),
  trivia: lazy(() => import('./Trivia'))
};
