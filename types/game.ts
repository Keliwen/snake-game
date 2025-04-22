export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Position {
  x: number;
  y: number;
}

export interface GameState {
  snake: Position[];
  food: Position;
  direction: Direction;
  score: number;
  highScore: number;
  isGameOver: boolean;
  isPaused: boolean;
  speed: number;
}

export interface GameConfig {
  gridSize: number;
  initialSnakeLength: number;
  initialSpeed: number;
  speedIncrement: number;
} 