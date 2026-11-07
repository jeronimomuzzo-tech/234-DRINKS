import { Card, Rank, Suite } from './types';

const SUITS: Suite[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export class Deck {
    cards: Card[];

    constructor(shuffled = true) {
        this.cards = [];
        this.reset();
        if (shuffled) {
            this.shuffle();
        }
    }

    reset() {
        this.cards = [];
        SUITS.forEach((suit) => {
            RANKS.forEach((rank, index) => {
                this.cards.push({
                    id: `${rank}-${suit}`,
                    suit,
                    rank,
                    isRed: suit === 'hearts' || suit === 'diamonds',
                    value: index + 1, // A=1, K=13
                    isHidden: false,
                });
            });
        });
    }

    shuffle() {
        // Fisher-Yates shuffle
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw(): Card | undefined {
        return this.cards.pop();
    }

    drawMultiple(count: number): Card[] {
        const drawn: Card[] = [];
        for (let i = 0; i < count; i++) {
            const card = this.draw();
            if (card) drawn.push(card);
        }
        return drawn;
    }

    remaining(): number {
        return this.cards.length;
    }
}
