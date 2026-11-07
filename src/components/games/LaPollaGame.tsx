import { useState, useEffect } from 'react';
import { GameNavbar } from '../ui/GameNavbar';
import { AlertTriangle, RefreshCw, Trash2, X } from 'lucide-react';
import { laPollaGame } from '../GameData';
import confetti from 'canvas-confetti';

interface LaPollaGameProps {
    onExit: () => void;
}

export function LaPollaGame({ onExit }: LaPollaGameProps) {
    const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
    const [penalty, setPenalty] = useState<number | null>(null);
    const [revealedRule, setRevealedRule] = useState<string | null>(null);

    // Load state from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('la-polla-state');
        if (saved) {
            setSelectedNumbers(JSON.parse(saved));
        }
    }, []);

    // Save state whenever it changes
    useEffect(() => {
        localStorage.setItem('la-polla-state', JSON.stringify(selectedNumbers));
    }, [selectedNumbers]);

    const handleNumberClick = (num: number) => {
        if (selectedNumbers.includes(num)) {
            // Already selected -> PENALTY
            setPenalty(num);
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        } else {
            // Mark as selected
            setSelectedNumbers(prev => [...prev, num]);

            // Find the rule
            const ruleText = laPollaGame.find(s => s.startsWith(`${num}.`)) || `Regla secreta para el ${num}`;
            setRevealedRule(ruleText);

            confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.7 }
            });
        }
    };

    const handleReset = () => {
        if (confirm('¿Borrar todo el juego y empezar de cero?')) {
            setSelectedNumbers([]);
            setPenalty(null);
            setRevealedRule(null);
            localStorage.removeItem('la-polla-state');
        }
    };

    return (
        <div className="relative h-full w-full bg-[#18191a] text-white flex flex-col font-sans">
            <GameNavbar onExit={onExit} title="La Polla" className="z-10" />

            {/* Penalty Overlay */}
            {penalty !== null && (
                <div
                    className="absolute inset-0 z-50 bg-red-600/95 flex flex-col items-center justify-center animate-in zoom-in duration-200 p-6 text-center"
                    onClick={() => setPenalty(null)}
                >
                    <AlertTriangle size={80} className="text-white mb-6 animate-bounce" />
                    <h2 className="text-5xl font-black text-white mb-2 leading-none">¡YA SALIÓ!</h2>
                    <p className="text-xl font-bold text-red-100 mb-8">El número {penalty} ya estaba marcado.</p>
                    <div className="bg-white text-red-600 px-8 py-4 rounded-full font-black text-2xl animate-pulse shadow-lg transform rotate-2">
                        ¡PENITENCIA! 🍻
                    </div>
                </div>
            )}

            {/* Rule Reveal Overlay */}
            {revealedRule && (
                <div
                    className="absolute inset-0 z-40 bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-200 p-6 text-center"
                    onClick={() => setRevealedRule(null)}
                >
                    <div className="max-w-md w-full bg-zinc-900 border border-white/10 p-8 rounded-3xl relative shadow-2xl">
                        <button className="absolute top-4 right-4 text-gray-500 hover:text-white">
                            <X size={24} />
                        </button>

                        <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-400 to-red-600 mb-4 block">
                            {revealedRule.split('.')[0]}
                        </span>

                        <h3 className="text-2xl font-bold text-white leading-tight">
                            {revealedRule.split('.').slice(1).join('.').trim()}
                        </h3>

                        <p className="text-gray-500 text-sm mt-6 uppercase tracking-widest font-bold">
                            Toca para continuar
                        </p>
                    </div>
                </div>
            )}

            {/* Grid Container */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 pt-20">
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 sm:gap-3 max-w-3xl mx-auto pb-8">
                    {Array.from({ length: 100 }, (_, i) => i + 1).map(num => {
                        const isSelected = selectedNumbers.includes(num);
                        return (
                            <button
                                key={num}
                                onClick={() => handleNumberClick(num)}
                                className={`
                                    aspect-square rounded-xl font-black text-lg sm:text-2xl flex items-center justify-center transition-all duration-200 relative overflow-hidden
                                    ${isSelected
                                        ? 'bg-zinc-900 text-zinc-700 shadow-inner border border-white/5'
                                        : 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg shadow-orange-900/20 hover:scale-105 active:scale-95'
                                    }
                                `}
                            >
                                {isSelected ? (
                                    <span className="opacity-50 scale-75 filter grayscale">❌</span>
                                ) : (
                                    <span className="drop-shadow-md">{num}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-zinc-900 border-t border-white/10 flex justify-between items-center text-xs text-gray-500">
                <span>{selectedNumbers.length} / 100 Marcados</span>
                <button
                    onClick={handleReset}
                    className="flex items-center gap-2 text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                    <Trash2 size={14} /> Reiniciar Juego
                </button>
            </div>
        </div>
    );
}
