import { useState, useEffect } from 'react';
import { Deck } from '../../game-engine/deck';
import { Card, Player } from '../../game-engine/types';
import { PlayingCard } from '../ui/PlayingCard';
import { SuitHeart, SuitDiamond, SolidClub, SuitSpade, IconDroplet } from '../ui/SuitIcons';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { GameNavbar } from '../ui/GameNavbar';

interface BusGameProps {
    onExit: () => void;
    config: { players: number };
}

type BusPhase = 'setup' | 'give-cards' | 'the-bus' | 'finished';
type RoundType = 'color' | 'high-low' | 'in-out' | 'suit' | 'bus-round';

interface BusState {
    phase: BusPhase;
    deck: Deck;
    players: Player[];
    currentPlayerIndex: number;
    currentRound: RoundType;
    message: string;
    punishment: number | null;
    busCards: Card[];
    busIndex: number; // current card in the bus (0 to busCards.length-1)
    busHidden: boolean; // Is the current bus card hidden?
    busFailed: boolean; // Did they fail the current card?
}

// Bus Game - Refactored for Premium UX
export function BusGame({ onExit, config }: BusGameProps) {
    const [state, setState] = useState<BusState>({
        phase: 'setup',
        deck: new Deck(),
        players: [],
        currentPlayerIndex: 0,
        currentRound: 'color',
        message: 'Preparando la mesa...',
        punishment: null,
        busCards: [],
        busIndex: 0,
        busHidden: true,
        busFailed: false
    });

    // Initialize Game
    useEffect(() => {
        const newDeck = new Deck();
        const newPlayers: Player[] = Array.from({ length: config.players }, (_, i) => ({
            id: `p-${i}`,
            name: `Jugador ${i + 1}`,
            isHost: i === 0,
            cards: [],
            drinksTaken: 0,
            drinksGiven: 0,
        }));

        setState(prev => ({
            ...prev,
            phase: 'give-cards',
            deck: newDeck,
            players: newPlayers,
            message: `${newPlayers[0].name}, ¿Rojo o Negro?`,
        }));
    }, [config.players]);

    const currentPlayer = state.players[state.currentPlayerIndex];

    // Logic: Handle Guess
    const handleGuess = (guess: string) => {
        // If in Bus phase, route to handleBusGuess
        if (state.phase === 'the-bus') {
            handleBusGuess(guess as 'high' | 'low');
            return;
        }

        const card = state.deck.draw();
        if (!card) return; // Should not happen

        let correct = false;
        let punishment = 0;

        // Logic based on round
        if (state.currentRound === 'color') {
            const isRed = card.isRed;
            correct = (guess === 'red' && isRed) || (guess === 'black' && !isRed);
            punishment = correct ? 0 : 1;
        } else if (state.currentRound === 'high-low') {
            // Round 2 check
            const firstCard = currentPlayer.cards![0];
            correct = (guess === 'high' && card.value > firstCard.value) ||
                (guess === 'low' && card.value < firstCard.value) ||
                (card.value === firstCard.value); // Tie is usually safe or fail? Let's say safe for now
            punishment = correct ? 0 : 1;
        } else if (state.currentRound === 'in-out') {
            const c1 = currentPlayer.cards![0].value;
            const c2 = currentPlayer.cards![1].value;
            const min = Math.min(c1, c2);
            const max = Math.max(c1, c2);
            const inside = card.value > min && card.value < max;
            // Outside means < min or > max or equal to one of them
            correct = (guess === 'in' && inside) || (guess === 'out' && !inside);
            punishment = correct ? 0 : 1;
        } else if (state.currentRound === 'suit') {
            correct = guess === card.suit;
            punishment = correct ? 0 : 1;
        }

        // Give card to player
        const updatedPlayers = [...state.players];
        updatedPlayers[state.currentPlayerIndex].cards?.push(card);
        if (!correct) {
            updatedPlayers[state.currentPlayerIndex].drinksTaken += punishment;
        }

        setState(prev => ({
            ...prev,
            players: updatedPlayers,
            punishment: !correct ? punishment : null, // Show punish modal if failed
        }));

        // Wait and move to next turn
        setTimeout(() => {
            nextTurn();
        }, correct ? 1000 : 2500); // Longer wait if punishment to read it
    };

    const nextTurn = () => {
        setState(prev => {
            let nextIndex = prev.currentPlayerIndex + 1;
            let nextRound = prev.currentRound;
            let nextPhase = prev.phase;
            let nextMessage = "";

            // Check if round finished
            if (nextIndex >= prev.players.length) {
                nextIndex = 0;
                // Advance Round
                if (prev.currentRound === 'color') nextRound = 'high-low';
                else if (prev.currentRound === 'high-low') nextRound = 'in-out';
                else if (prev.currentRound === 'in-out') nextRound = 'suit';
                else if (prev.currentRound === 'suit') {
                    // Determine Losers for BUS
                    const loser = [...prev.players].sort((a, b) => b.drinksTaken - a.drinksTaken)[0];
                    // Create Bus: 5 cards
                    const busCards = prev.deck.drawMultiple(5).map(c => ({ ...c, isHidden: true }));
                    // Reference card needed for H/L guess
                    const referenceCard = prev.deck.draw();

                    return {
                        ...prev,
                        phase: 'the-bus',
                        currentRound: 'bus-round',
                        currentPlayerIndex: prev.players.findIndex(p => p.id === loser.id),
                        busCards: busCards,
                        busIndex: 0, // Points to first card in the line
                        busHidden: true,
                        busFailed: false,
                        // Give player the reference card
                        players: prev.players.map(p => p.id === loser.id ? { ...p, cards: referenceCard ? [referenceCard] : [] } : p),

                        message: `¡${loser.name} al BUS! 🚌`,
                        punishment: null
                    }
                }
            }

            const nextPlayerName = prev.players[nextIndex].name;
            if (nextRound === 'color') nextMessage = `${nextPlayerName}, ¿Rojo o Negro?`;
            else if (nextRound === 'high-low') nextMessage = `${nextPlayerName}, ¿Mayor o Menor?`;
            else if (nextRound === 'in-out') nextMessage = `${nextPlayerName}, ¿Dentro o Fuera?`;
            else if (nextRound === 'suit') nextMessage = `${nextPlayerName}, ¿Qué Pinta?`;

            return {
                ...prev,
                currentPlayerIndex: nextIndex,
                currentRound: nextRound,
                phase: nextPhase,
                message: nextMessage,
                punishment: null
            }
        });
    };

    // Logic for The Bus Phase
    const handleBusGuess = (guess: 'high' | 'low') => {
        // Current Reference is last card in player's hand
        const cards = state.players[state.currentPlayerIndex].cards;
        if (!cards || cards.length === 0) return;

        const reference = cards[cards.length - 1];
        const target = state.busCards[state.busIndex];

        // Reveal target
        const revealedTarget = { ...target, isHidden: false };

        // Check logic
        const isHigh = revealedTarget.value > reference.value;
        const isLow = revealedTarget.value < reference.value;

        let correct = false;
        if (guess === 'high' && isHigh) correct = true;
        if (guess === 'low' && isLow) correct = true;
        if (reference.value === revealedTarget.value) correct = false; // Tie is lose in Bus

        // Update State to show result
        const newBusCards = [...state.busCards];
        newBusCards[state.busIndex] = revealedTarget;

        setState(prev => ({
            ...prev,
            busCards: newBusCards,
            busHidden: false,
            busFailed: !correct,
            punishment: !correct ? (prev.busIndex + 1) : null // Drink the position number
        }));

        // Delay then proceed
        setTimeout(() => {
            if (correct) {
                if (state.busIndex >= state.busCards.length - 1) {
                    // VICTORY
                    setState(prev => ({ ...prev, phase: 'finished', message: '¡AUTOBÚS COMPLETADO! 🎉' }));
                } else {
                    // Next Card
                    setState(prev => {
                        const pIndex = prev.currentPlayerIndex;
                        const newPlayers = [...prev.players];
                        newPlayers[pIndex].cards?.push(revealedTarget); // Current card becomes reference

                        return {
                            ...prev,
                            players: newPlayers,
                            busIndex: prev.busIndex + 1,
                            busHidden: true,
                            busFailed: false,
                            punishment: null
                        };
                    });
                }
            } else {
                // FAILED -> RESET
                setState(prev => {
                    const pIndex = prev.currentPlayerIndex;
                    const newPlayers = [...prev.players];
                    newPlayers[pIndex].drinksTaken += (prev.busIndex + 1);
                    newPlayers[pIndex].cards?.push(revealedTarget);
                    // Reset bus cards to hidden and REFILL from deck to avoid memorization
                    const resetBus = prev.busCards.map(() => {
                        return prev.deck.draw() || { id: 'shim', suit: 'spades', rank: 'A', isRed: false, value: 0, isHidden: true } as Card;
                    }).map(c => ({ ...c, isHidden: true }));

                    return {
                        ...prev,
                        players: newPlayers,
                        busCards: resetBus,
                        busIndex: 0,
                        busHidden: true,
                        busFailed: false,
                        punishment: null,
                        message: `¡Fallaste! Todo de nuevo. 🚌`
                    };
                });
            }
        }, !correct ? 2500 : 1000);
    };

    // UI Components
    const GameHeader = () => (
        <div className="flex justify-between items-center w-full max-w-lg mb-4 bg-black/40 p-3 rounded-full backdrop-blur-md border border-white/10 relative z-20">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-lg">
                    {currentPlayer ? currentPlayer.name.charAt(0) : '?'}
                </div>
                <div>
                    <p className="text-xs text-gray-400 font-medium">Turno de</p>
                    <p className="text-sm text-white font-bold">{currentPlayer ? currentPlayer.name : '...'}</p>
                </div>
            </div>
            <div className="flex gap-1">
                {/* Progress Indicator dots or similar could go here */}
                <div className="px-3 py-1 bg-white/10 rounded-full text-xs font-mono text-gray-300">
                    Ronda {state.currentRound === 'color' ? 1 : state.currentRound === 'high-low' ? 2 : state.currentRound === 'in-out' ? 3 : 4}
                </div>
            </div>
        </div>
    );

    if (state.phase === 'give-cards') {
        const p = state.players[state.currentPlayerIndex];
        return (
            <div className="relative flex flex-col items-center justify-between h-full py-6 px-4 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[#0f172a] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-50 pointer-events-none" />

                <GameNavbar onExit={onExit} title="El Bus">
                    <PlayerBadge />
                </GameNavbar>

                <div className="flex-1 flex flex-col items-center justify-center w-full z-10">
                    <h2 className="text-3xl font-black text-white mb-8 drop-shadow-lg text-center leading-tight">{state.message}</h2>

                    {/* Card Layout */}
                    <div className="flex items-center justify-center gap-[-2rem] mb-8 min-h-[220px]">
                        {p.cards?.map((c, i) => (
                            <PlayingCard key={c.id + i} card={c} className="shadow-2xl hover:-translate-y-4 transition-transform duration-300 first:rotate-[-6deg] last:rotate-[6deg] -ml-12 first:ml-0 border border-white/10" />
                        ))}
                        <div className="w-32 h-48 border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center -ml-12 bg-white/5 backdrop-blur-sm">
                            <span className="text-white/20 text-4xl font-bold">+</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-8 z-10 px-2 pb-6">
                    {state.currentRound === 'color' && (
                        <>
                            <button onClick={() => handleGuess('red')} className="relative overflow-hidden group bg-gradient-to-br from-red-600 to-red-900 p-6 rounded-2xl shadow-lg border border-red-500/30 active:scale-95 transition-all">
                                <span className="relative z-10 text-2xl font-black text-white uppercase tracking-wider">Rojo</span>
                            </button>
                            <button onClick={() => handleGuess('black')} className="relative overflow-hidden group bg-gradient-to-br from-gray-800 to-black p-6 rounded-2xl shadow-lg border border-gray-700 active:scale-95 transition-all">
                                <span className="relative z-10 text-2xl font-black text-white uppercase tracking-wider">Negro</span>
                            </button>
                        </>
                    )}
                    {state.currentRound === 'high-low' && (
                        <>
                            <button onClick={() => handleGuess('high')} className="relative overflow-hidden group bg-gradient-to-br from-blue-600 to-indigo-900 p-6 rounded-2xl shadow-lg border-t border-blue-400/30 active:scale-95 transition-all flex flex-col items-center">
                                <ArrowUp className="w-8 h-8 text-white mb-1" />
                                <span className="text-lg font-bold text-white">MAYOR</span>
                            </button>
                            <button onClick={() => handleGuess('low')} className="relative overflow-hidden group bg-gradient-to-br from-cyan-600 to-blue-900 p-6 rounded-2xl shadow-lg border-t border-cyan-400/30 active:scale-95 transition-all flex flex-col items-center">
                                <ArrowDown className="w-8 h-8 text-white mb-1" />
                                <span className="text-lg font-bold text-white">MENOR</span>
                            </button>
                        </>
                    )}
                    {state.currentRound === 'in-out' && (
                        <>
                            <button onClick={() => handleGuess('in')} className="bg-gradient-to-br from-emerald-500 to-emerald-800 p-6 rounded-2xl shadow-lg border-t border-emerald-400/30 active:scale-95 transition-all flex flex-col items-center">
                                <span className="text-2xl mb-1">↔️</span>
                                <span className="text-lg font-bold text-white">DENTRO</span>
                            </button>
                            <button onClick={() => handleGuess('out')} className="bg-gradient-to-br from-amber-500 to-orange-800 p-6 rounded-2xl shadow-lg border-t border-amber-400/30 active:scale-95 transition-all flex flex-col items-center">
                                <span className="text-2xl mb-1">⬅️➡️</span>
                                <span className="text-lg font-bold text-white">FUERA</span>
                            </button>
                        </>
                    )}
                    {state.currentRound === 'suit' && (
                        <div className="col-span-2 grid grid-cols-4 gap-3 bg-white/5 p-4 rounded-3xl backdrop-blur-md border border-white/10">
                            {[
                                { s: 'hearts', Icon: SuitHeart, c: 'text-red-500' },
                                { s: 'diamonds', Icon: SuitDiamond, c: 'text-red-500' },
                                { s: 'clubs', Icon: SolidClub, c: 'text-white' },
                                { s: 'spades', Icon: SuitSpade, c: 'text-white' }
                            ].map((opt) => (
                                <button key={opt.s} onClick={() => handleGuess(opt.s)} className="aspect-square bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all shadow-inner">
                                    <opt.Icon className={`w-8 h-8 ${opt.c}`} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                {state.punishment !== null && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                        <div className="bg-gradient-to-b from-red-600 to-red-900 p-10 rounded-[2.5rem] text-center shadow-2xl shadow-red-900/50 border border-red-400/30 transform scale-100 relative overflow-hidden">
                            <h3 className="text-xl text-red-200 font-bold mb-4 uppercase tracking-widest opacity-80">Castigo</h3>
                            <h2 className="text-8xl font-black text-white mb-6 drop-shadow-xl">+{state.punishment}</h2>
                            <div className="animate-bounce inline-flex p-5 bg-white rounded-full text-red-600 shadow-lg">
                                <IconDroplet className="w-10 h-10 fill-current" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (state.phase === 'the-bus') {
        const playerCards = state.players[state.currentPlayerIndex].cards || [];
        const referenceCard = playerCards[playerCards.length - 1];

        return (
            <div className="relative flex flex-col items-center justify-between h-full py-4 text-center overflow-hidden bg-slate-900">
                {/* Asymmetry background */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-600/20 rounded-full blur-[100px] pointer-events-none" />

                <div className="z-10 mt-4">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-1">El Autobús</h2>
                    <p className="text-red-400 font-medium animate-pulse">{state.message}</p>
                </div>

                <div className="flex-1 flex flex-col justify-center w-full gap-8 z-10 w-full overflow-hidden">
                    {/* The Path */}
                    <div className="relative w-full py-10 overflow-x-auto flex items-center gap-4 px-8 snap-x">
                        <div className="absolute left-0 top-1/2 w-full h-2 bg-white/10 -translate-y-1/2 rounded-full" />

                        {/* Reference (Left side sticky) */}
                        <div className="relative flex-shrink-0 z-10 mr-8">
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-400 uppercase tracking-widest">Tu Carta</div>
                            {referenceCard && <PlayingCard card={referenceCard} className="w-28 h-40 shadow-2xl ring-4 ring-purple-500/50 rounded-xl" />}
                        </div>

                        {state.busCards.map((c, i) => (
                            <div key={i} className={`relative flex-shrink-0 transition-all duration-500 ${i === state.busIndex ? 'scale-110 z-20' : 'scale-90 opacity-60 grayscale'}`}>
                                <PlayingCard
                                    card={c}
                                    className={`w-24 h-36 ${i === state.busIndex ? 'shadow-[0_0_30px_rgba(255,255,0,0.3)]' : ''}`}
                                />
                                {i === state.busIndex && (
                                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3 h-3 bg-yellow-400 rounded-full animate-bounce shadow-[0_0_10px_rgba(255,200,0,0.8)]" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full max-w-sm z-10 pb-8 px-4">
                    <button onClick={() => handleBusGuess('high')} className="group bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-2xl shadow-xl border-t border-blue-400/30 flex flex-col items-center active:scale-95 transition-all">
                        <ArrowUp className="w-8 h-8 text-white mb-1 group-hover:-translate-y-1 transition-transform" />
                        <span className="text-lg font-bold text-white tracking-wide">MAYOR</span>
                    </button>
                    <button onClick={() => handleBusGuess('low')} className="group bg-gradient-to-br from-cyan-600 to-blue-800 p-5 rounded-2xl shadow-xl border-t border-cyan-400/30 flex flex-col items-center active:scale-95 transition-all">
                        <ArrowDown className="w-8 h-8 text-white mb-1 group-hover:translate-y-1 transition-transform" />
                        <span className="text-lg font-bold text-white tracking-wide">MENOR</span>
                    </button>
                </div>

                {state.punishment !== null && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in zoom-in duration-300">
                        <div className="bg-red-600 p-8 rounded-[2rem] text-center shadow-[0_0_60px_rgba(220,38,38,0.6)] border-4 border-red-400 max-w-xs w-full mx-4 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
                            <h3 className="text-3xl font-black mb-2 text-white italic transform -skew-x-6">¡FAIL!</h3>
                            <p className="text-red-100 text-lg mb-6 font-medium">Al fondo del bus...</p>
                            <div className="bg-white text-red-600 font-black text-6xl py-4 rounded-xl shadow-inner mb-4">
                                +{state.punishment}
                            </div>
                            <p className="text-xs text-red-200 opacity-70 uppercase tracking-widest">Tragos de castigo</p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full text-center bg-zinc-900 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 pointer-events-none" />
            <div className="z-10 p-8">
                <h1 className="text-5xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">¡JUEGO TERMINADO!</h1>
                <p className="text-xl text-gray-400 mb-10 max-w-xs mx-auto">{state.message}</p>
                <button onClick={onExit} className="px-10 py-4 bg-white text-black font-bold rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                    Volver al Menú
                </button>
            </div>
        </div>
    );
}
