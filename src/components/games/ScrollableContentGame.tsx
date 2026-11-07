import { useState, useEffect, useRef } from 'react';
import { GameNavbar } from '../ui/GameNavbar';
import { ArrowDown } from 'lucide-react';

interface ScrollableContentGameProps {
    onExit: () => void;
    title: string;
    data: string[];
    color: string;
}

export function ScrollableContentGame({ onExit, title, data, color }: ScrollableContentGameProps) {
    const [scrambledData, setScrambledData] = useState<string[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setScrambledData(shuffled);
    }, [data]);

    return (
        <div className="relative h-full w-full bg-[#18191a] overflow-hidden text-white font-sans flex flex-col">
            <GameNavbar onExit={onExit} title={title} className="z-50" />

            {/* Scroll Container */}
            <div
                ref={containerRef}
                className="flex-1 w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
                style={{ scrollBehavior: 'smooth' }}
            >
                {scrambledData.map((text, index) => {
                    // Alternate slight tilt for fun
                    const tilt = index % 2 === 0 ? '-rotate-1' : 'rotate-1';

                    return (
                        <div
                            key={index}
                            className="h-full w-full snap-center snap-always flex flex-col items-center justify-center p-6 relative pb-20"
                        >
                            {/* Modern Card */}
                            <div
                                className={`
                                    w-full max-w-sm aspect-[3/4] bg-zinc-900 border border-white/10 rounded-3xl 
                                    p-8 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl
                                    transform transition-transform ${tilt}
                                `}
                            >
                                {/* Decorative elements */}
                                <div className="absolute top-0 inset-x-0 h-4" style={{ backgroundColor: color }} />
                                <div className="absolute -bottom-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ backgroundColor: color }}></div>
                                <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ backgroundColor: color }}></div>

                                {/* Content */}
                                <div className="relative z-10 flex flex-col h-full justify-center">
                                    <h3 className="text-3xl sm:text-4xl font-black leading-tight text-white/90 drop-shadow-md pb-4">
                                        {text}
                                    </h3>
                                </div>

                                <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                                    <span className="text-xs font-bold text-gray-600 tracking-[0.2em] uppercase">
                                        {index + 1} / {scrambledData.length}
                                    </span>
                                </div>
                            </div>

                            {/* Arrow Hint */}
                            {index < scrambledData.length - 1 && (
                                <div className="absolute bottom-6 sm:bottom-10 animate-bounce opacity-50">
                                    <ArrowDown size={32} className="text-white" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
