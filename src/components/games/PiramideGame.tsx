import { useState, useEffect } from 'react';
import { Deck } from '../../game-engine/deck';
import { Card, Player } from '../../game-engine/types';
import { PlayingCard } from '../ui/PlayingCard';
import { Eye, Hand, Trophy, ArrowUp } from 'lucide-react';
import { GameNavbar } from '../ui/GameNavbar';

interface PiramideGameProps {
    onExit: () => void;
    config: { players: number };
}

type PiramidePhase = 'distribute' | 'pyramid' | 'finished';

interface PiramideState {
    phase: PiramidePhase;
    deck: Deck;
    players: Player[];
    pyramidRows: Card[][];
    currentFileIndex: number; // 0 to 4 (bottom to top)
    revealedCard: Card | null;
    message: string;
    actionType: string; // e.g., "TOMA 1", "REGALA 2"
    myCardsVisible: boolean;
}

export function PiramideGame({ onExit, config }: PiramideGameProps) {
    const [state, setState] = useState<PiramideState>({
        phase: 'distribute',
        deck: new Deck(),
        players: [],
        pyramidRows: [],
        currentFileIndex: 0,
        revealedCard: null,
        message: 'Repartiendo cartas...',
        actionType: '',
        myCardsVisible: false
    });

    // Setup
    useEffect(() => {
        const deck = new Deck();
        const players: Player[] = Array.from({ length: config.players }, (_, i) => ({
            id: `p-${i}`,
            name: `Jugador ${i + 1}`,
            isHost: i === 0,
            cards: deck.drawMultiple(4),
            drinksTaken: 0,
            drinksGiven: 0,
        }));

        // Pyramid: 5 rows (5, 4, 3, 2, 1)
        const rows: Card[][] = [];
        for (let i = 5; i >= 1; i--) {
            rows.push(deck.drawMultiple(i).map(c => ({ ...c, isHidden: true })));
        }

        setState(prev => ({
            ...prev,
            deck,
            players,
            pyramidRows: rows,
            phase: 'pyramid',
            message: 'Arrancamos con la Base (Fila 1)',
            actionType: 'TOMA 1 TRAGO 🍺'
        }));
    }, [config.players]);

    const revealNextCard = () => {
        // Find next hidden card in current row
        const currentRow = state.pyramidRows[state.currentFileIndex];
        const cardIndex = currentRow.findIndex(c => c.isHidden);

        if (cardIndex === -1) {
            // Row finished, move up
            if (state.currentFileIndex >= 4) {
                setState(prev => ({
                    ...prev,
                    phase: 'finished',
                    message: '¡PIRÁMIDE COMPLETADA!',
                    actionType: '¡SALUD! 🎉'
                }));
                return;
            }

            const nextRow = state.currentFileIndex + 1;
            let nextAction = "";
            if (nextRow === 1) nextAction = "REGALA 2 TRAGOS 🎁";
            else if (nextRow === 2) nextAction = "TOMA 3 TRAGOS 🍺";
            else if (nextRow === 3) nextAction = "REGALA 4 TRAGOS 🎁";
            else if (nextRow === 4) nextAction = "¡MATA! (FONDO) ☠️";

            setState(prev => ({
                ...prev,
                currentFileIndex: nextRow,
                message: `Subiendo de Nivel...`,
                actionType: nextAction
            }));
            return;
        }

        // Reveal Logic
        const card = currentRow[cardIndex];
        const revealed = { ...card, isHidden: false };
        const newRows = [...state.pyramidRows];
        newRows[state.currentFileIndex][cardIndex] = revealed;

        setState(prev => ({
            ...prev,
            pyramidRows: newRows,
            revealedCard: revealed,
            message: `¡Salió un ${revealed.rank}!`
        }));
    };

    const getRowAction = (rowIndex: number) => {
        const r = rowIndex + 1;
        if (r === 1) return "Toma 1";
        if (r === 2) return "Regala 2";
        if (r === 3) return "Toma 3";
        if (r === 4) return "Regala 4";
        if (r === 5) return "MATA";
        return "";
    };

    // --- RENDER ---

    if (state.phase === 'finished') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center bg-purple-950 text-white p-6">
                <Trophy size={80} className="text-yellow-400 mb-6 animate-bounce" />
                <h1 className="text-4xl font-black mb-4">¡Pirámide Conquistada!</h1>
                <p className="text-xl text-purple-200 mb-8">Todos han bebido lo suficiente.</p>
                <button onClick={onExit} className="px-8 py-4 bg-white text-purple-900 font-bold rounded-full shadow-xl hover:scale-105 transition-transform">
                    Volver al Menú
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#120a2e] text-white relative overflow-hidden">
            <GameNavbar onExit={onExit} title="Pirámide" className="z-20 bg-[#120a2e]/80" />

            {/* Main Content Area - Scrollable avoiding overlap */}
            <div className="flex-1 overflow-y-auto w-full relative z-10 pt-16 pb-32 flex flex-col items-center">

                {/* Status Board */}
                <div className="sticky top-0 z-30 bg-[#120a2e]/95 backdrop-blur w-full p-4 border-b border-purple-500/20 shadow-xl flex flex-col items-center">
                    <div className="text-xs font-bold text-purple-400 uppercase tracking-widest">{state.message}</div>
                    <div className="text-2xl font-black text-white mt-1 animate-pulse">{state.actionType}</div>
                </div>

                {/* The Pyramid */}
                <div className="flex flex-col-reverse items-center gap-4 py-8 px-2 w-full max-w-lg mx-auto transform scale-95 sm:scale-100 origin-top">
                    {state.pyramidRows.map((row, rowIndex) => (
                        <div key={rowIndex} className="relative w-full flex justify-center items-center">

                            {/* Row Indicator (Left) */}
                            <div className={`absolute left-0 text-[10px] sm:text-xs font-bold px-2 py-1 rounded-r-lg 
                                 ${state.currentFileIndex === rowIndex ? 'bg-yellow-400 text-black animate-pulse' : 'bg-white/5 text-purple-500'}`}>
                                {getRowAction(rowIndex)}
                            </div>

                            <div className="flex gap-2 sm:gap-4 justify-center">
                                {row.map((card) => {
                                    const isCurrentTarget = card.isHidden && state.pyramidRows[state.currentFileIndex] === row && row.find(c => c.isHidden) === card;

                                    return (
                                        <div key={card.id} className={`relative transition-all duration-300 ${isCurrentTarget ? 'scale-110 z-20 ring-4 ring-yellow-400 rounded-xl' : ''}`}>
                                            <PlayingCard
                                                card={card}
                                                className={`w-14 h-20 sm:w-20 sm:h-28 shadow-2xl`}
                                                disabled={state.phase !== 'pyramid'}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer Controls (Fixed Bottom) */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#0d0725] border-t border-purple-500/30 p-4 z-50 flex flex-col gap-3 pb-8">

                {/* Next Card Button */}
                <button
                    onClick={revealNextCard}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-xl text-xl shadow-lg shadow-purple-900/40 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    {state.revealedCard ? (
                        <>Revelar Siguiente <ArrowUp size={20} /></>
                    ) : (
                        'Empezar Juego'
                    )}
                </button>

                {/* Hand Toggle */}
                <button
                    onClick={() => setState(p => ({ ...p, myCardsVisible: !p.myCardsVisible }))}
                    className="flex items-center justify-center gap-2 text-purple-300 text-sm py-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                    <Eye size={16} />
                    {state.myCardsVisible ? 'Ocultar mis cartas' : 'Ver mis cartas'}
                </button>

                {/* Player Hand Drawer */}
                {state.myCardsVisible && (
                    <div className="absolute bottom-full left-0 right-0 bg-[#0d0725]/95 backdrop-blur-xl border-t border-purple-500/30 p-4 max-h-[50vh] overflow-y-auto animate-in slide-in-from-bottom rounded-t-3xl shadow-2xl">
                        <div className="text-center text-xs text-gray-400 mb-4 uppercase tracking-widest">Cartas de los Jugadores</div>
                        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                            {state.players.map(p => (
                                <div key={p.id} className="bg-white/5 p-3 rounded-xl border border-white/5">
                                    <div className="text-xs font-bold text-gray-400 mb-2 flex justify-between">
                                        {p.name}
                                        {state.revealedCard && p.cards?.some(c => c.rank === state.revealedCard!.rank) && (
                                            <span className="text-green-400 animate-pulse">¡TIENE UNA!</span>
                                        )}
                                    </div>
                                    <div className="flex justify-center -space-x-4">
                                        {p.cards?.map(c => (
                                            <PlayingCard key={c.id} card={c} className="w-12 h-16 sm:w-14 sm:h-20 shadow-lg" />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
