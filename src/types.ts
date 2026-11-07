export type GameCategory = {
    id: string;
    title: string;
    description: string;
    color: string;
    gradient: string;
    icon: string;
    category: 'cards' | 'social' | 'strategy' | 'music';
};

export type GameConfig = {
    players: number;
    intensity: number;
};
