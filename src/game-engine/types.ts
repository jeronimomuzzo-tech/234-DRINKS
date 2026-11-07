export type Suite = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'Joker';

export interface Card {
    id: string; // Unique ID for React keys
    suit: Suite;
    rank: Rank;
    isRed: boolean;
    value: number; // 1-13 for comparison
    isHidden?: boolean;
}

export interface Player {
    id: string;
    name: string;
    isHost: boolean;
    cards?: Card[];
    drinksTaken: number;
    drinksGiven: number;
}

export type GameStatus = 'setup' | 'playing' | 'paused' | 'finished';

// Generic interface for any game state
export interface GameState {
    status: GameStatus;
    players: Player[];
    currentPlayerIndex: number;
    message?: string; // Instruction to show
}
