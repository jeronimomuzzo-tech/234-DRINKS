import { useState, useEffect } from 'react';
import { MessageCircle, ThumbsUp, ThumbsDown } from 'lucide-react';

interface SocialGameProps {
    onExit: () => void;
    config: { players: number };
    title: string;
    data: string[];
    color: string;
}

export function SocialGame({ onExit, config, title, data, color }: SocialGameProps) {
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [shuffledData, setShuffledData] = useState<string[]>([]);

    useEffect(() => {
        // Shuffle data on start
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setShuffledData(shuffled);
    }, [data]);

    const handleNext = () => {
        if (currentCardIndex < shuffledData.length - 1) {
            setCurrentCardIndex(prev => prev + 1);
        } else {
            // Restart or Finish? Usually infinite.
            // Reshuffle
            const shuffled = [...data].sort(() => Math.random() - 0.5);
            setShuffledData(shuffled);
            setCurrentCardIndex(0);
        }
    };

    const currentText = shuffledData[currentCardIndex];

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <h2 className="text-3xl font-bold mb-8" style={{ color: color }}>{title}</h2>

                <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-2xl w-full max-w-md min-h-[300px] flex items-center justify-center">
                    <p className="text-2xl sm:text-3xl font-medium leading-relaxed">
                        {currentText}
                    </p>
                </div>

                <div className="mt-8 text-gray-500">
                    {currentCardIndex + 1} / {shuffledData.length}
                </div>
            </div>

            <div className="p-6">
                <button
                    onClick={handleNext}
                    className="w-full py-5 rounded-2xl text-xl font-bold bg-white text-black hover:bg-gray-200 transition-all active:scale-95 shadow-lg"
                >
                    Siguiente
                </button>
            </div>
        </div>
    );
}
