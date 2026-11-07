import { Card } from '../../game-engine/types';
import { cn } from '../../lib/utils'; // Assuming basic utils exist, if not I will remove or fix
import { SuitHeart, SuitDiamond, SolidClub, SuitSpade } from './SuitIcons';

interface PlayingCardProps {
    card: Card;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
}

export function PlayingCard({ card, className, onClick, disabled }: PlayingCardProps) {
    // If no card is provided (placeholder slots), render outline
    if (!card) return null;

    const SuitIcon = () => {
        switch (card.suit) {
            case 'hearts': return <SuitHeart className="w-full h-full text-red-600" />;
            case 'diamonds': return <SuitDiamond className="w-full h-full text-red-600" />;
            case 'clubs': return <SolidClub className="w-full h-full text-gray-900" />;
            case 'spades': return <SuitSpade className="w-full h-full text-gray-900" />;
        }
    };

    return (
        <div
            onClick={!disabled ? onClick : undefined}
            className={cn(
                "relative w-24 h-36 sm:w-32 sm:h-48 rounded-xl transition-all duration-500 transform preserve-3d cursor-pointer select-none",
                disabled && "cursor-not-allowed opacity-80",
                className
            )}
            style={{ perspective: '1000px' }}
        >
            <div className={cn(
                "absolute inset-0 w-full h-full duration-500 preserve-3d shadow-xl rounded-xl",
                card.isHidden ? "rotate-y-180" : ""
            )}>
                {/* Front of card */}
                <div className={cn(
                    "absolute inset-0 w-full h-full backface-hidden bg-white rounded-xl p-2 flex flex-col justify-between select-none border border-gray-200",
                    card.isRed ? "text-red-600" : "text-gray-900"
                )}>
                    <div className="text-left leading-none">
                        <span className="text-xl sm:text-2xl font-bold block">{card.rank}</span>
                        <div className="w-4 h-4 sm:w-5 sm:h-5 mt-1"><SuitIcon /></div>
                    </div>

                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 opacity-20">
                        <SuitIcon />
                    </div>

                    <div className="text-right leading-none rotate-180">
                        <span className="text-xl sm:text-2xl font-bold block">{card.rank}</span>
                        <div className="w-4 h-4 sm:w-5 sm:h-5 mt-1 inline-block"><SuitIcon /></div>
                    </div>
                </div>

                {/* Back of card */}
                <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-blue-900 rounded-xl border-2 border-white overflow-hidden flex items-center justify-center">
                    <div className="w-full h-full opacity-30"
                        style={{
                            backgroundImage: 'repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #1a1a1a 25%, #1a1a1a 75%, #000 75%, #000)',
                            backgroundPosition: '0 0, 10px 10px',
                            backgroundSize: '20px 20px'
                        }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white/50">234</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
