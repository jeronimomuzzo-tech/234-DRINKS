import { useState, useRef, useEffect } from 'react';
import { GameNavbar } from '../ui/GameNavbar';
import { Check, X, Timer, Layers, AlertCircle, Plus } from 'lucide-react';

interface LaOllaGameProps {
    onExit: () => void;
}

type Round = 'setup' | 'explain' | 'playing' | 'scoring' | 'game-over';
type SubRound = 'desc' | 'one-word' | 'mimic';

const MOCK_WORDS = [
    'El Dibu Martínez', 'Piscola', 'Leonardo Farkas', 'Completo Italiano',
    'Alexis Sánchez', 'Caña Moral', 'Metro Baquedano', 'Tusa', 'Bad Bunny',
    'La Constituyente', 'Palta Reina', 'Terremoto', 'El Negro Piñera',
    'Tío Aceite', 'Av. Providencia', 'Carrete en Bellavista'
];

export function LaOllaGame({ onExit }: LaOllaGameProps) {
    const [gameState, setGameState] = useState<Round>('setup');
    const [subRound, setSubRound] = useState<SubRound>('desc');

    // Data
    const [words, setWords] = useState<string[]>([]);
    const [deck, setDeck] = useState<string[]>([]);
    const [currentWord, setCurrentWord] = useState<string | null>(null);
    const [customWord, setCustomWord] = useState("");

    // Turn State
    const [timeLeft, setTimeLeft] = useState(60);
    const [turnScore, setTurnScore] = useState(0);
    const [turnDebt, setTurnDebt] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Setup
    const addWord = () => {
        if (!customWord.trim()) return;
        setWords(prev => [...prev, customWord.trim()]);
        setCustomWord("");
        if (navigator.vibrate) navigator.vibrate(10);
    };

    const startWithDefault = () => {
        setWords([...MOCK_WORDS]);
        startGame([...MOCK_WORDS]);
    };

    const startGame = (initialWords: string[]) => {
        setDeck([...initialWords]);
        setSubRound('desc');
        setGameState('explain');
    };

    // Round Logic
    const startTurn = () => {
        if (deck.length === 0) shuffleDeck();
        pickNextWord();
        setTurnScore(0);
        setTurnDebt(0);
        setTimeLeft(60);
        setGameState('playing');

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    endTurn();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const endTurn = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setGameState('scoring');
        if (navigator.vibrate) navigator.vibrate([200, 200, 200]);
    };

    const pickNextWord = () => {
        if (deck.length === 0) {
            handleRoundEnd();
            return;
        }
        // Improve randomness
        const randomIndex = Math.floor(Math.random() * deck.length);
        setCurrentWord(deck[randomIndex]);
    };

    const handleCorrect = () => {
        setTurnScore(prev => prev + 1);
        const newDeck = deck.filter(w => w !== currentWord);
        setDeck(newDeck);
        if (navigator.vibrate) navigator.vibrate(50);

        if (newDeck.length === 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleRoundEnd();
        } else {
            const randomIndex = Math.floor(Math.random() * newDeck.length);
            setCurrentWord(newDeck[randomIndex]);
        }
    };

    const handleSkip = () => {
        setTurnDebt(prev => prev + 1);
        if (navigator.vibrate) navigator.vibrate(50);
        // Only skip if more than 1 word, otherwise you are stuck
        if (deck.length > 1) {
            let nextWord = currentWord;
            while (nextWord === currentWord) {
                nextWord = deck[Math.floor(Math.random() * deck.length)];
            }
            setCurrentWord(nextWord);
        }
    };

    const handleRoundEnd = () => {
        if (subRound === 'desc') setSubRound('one-word');
        else if (subRound === 'one-word') setSubRound('mimic');
        else setGameState('game-over');

        if (gameState !== 'game-over') {
            shuffleDeck();
            setGameState('explain');
        } else {
            setGameState('game-over');
        }
    };

    const shuffleDeck = () => {
        setDeck([...words]);
    };

    useEffect(() => {
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    // Color Theme for SubRounds
    const getThemeColor = () => {
        if (subRound === 'desc') return 'bg-blue-600';
        if (subRound === 'one-word') return 'bg-purple-600';
        return 'bg-pink-600';
    }

    // MAIN RENDER
    return (
        <div className="flex flex-col h-full bg-[#121212] relative overflow-hidden font-sans">
            <GameNavbar onExit={onExit} title="" className="z-30 absolute top-0" />

            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0">
                <div className={`absolute top-0 right-0 w-[500px] h-[500px] ${getThemeColor()} opacity-20 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2`}></div>
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-600 opacity-10 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2"></div>
            </div>

            {/* ---------------- SETUP  ---------------- */}
            {gameState === 'setup' && (
                <div className="flex-1 flex flex-col items-center justify-center space-y-8 p-6 z-10">
                    <div className="text-center space-y-2">
                        <div className="inline-block p-4 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
                            <Layers className="w-12 h-12 text-indigo-400" />
                        </div>
                        <h1 className="text-4xl font-black text-white">LA OLLA</h1>
                        <p className="text-gray-400">Arma tu mazo y a jugar.</p>
                    </div>

                    {/* Add Word Input */}
                    <div className="w-full max-w-sm bg-white/5 rounded-2xl p-2 border border-white/10 flex items-center">
                        <input
                            type="text"
                            value={customWord}
                            onChange={(e) => setCustomWord(e.target.value)}
                            placeholder="Agregar palabra..."
                            className="flex-1 bg-transparent px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && addWord()}
                        />
                        <button onClick={addWord} className="bg-indigo-600 p-3 rounded-xl hover:bg-indigo-500 transition-colors">
                            <Plus className="text-white" size={24} />
                        </button>
                    </div>

                    {/* Word Chips */}
                    <div className="w-full flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto px-2">
                        {words.length === 0 && <span className="text-gray-600 italic text-sm">Agrega palabras o usa el pack chileno.</span>}
                        {words.map((w, i) => (
                            <span key={i} className="px-3 py-1.5 bg-indigo-900/40 border border-indigo-500/30 rounded-lg text-xs text-indigo-200 font-medium animate-in fade-in zoom-in">{w}</span>
                        ))}
                    </div>

                    <div className="w-full max-w-sm space-y-3 pt-4">
                        <button
                            onClick={() => startGame(words)}
                            disabled={words.length < 4}
                            className="w-full bg-white text-black font-black py-4 rounded-2xl shadow-xl disabled:opacity-50 disabled:shadow-none transition-all hover:scale-[1.02] active:scale-95 text-lg"
                        >
                            JUGAR ({words.length})
                        </button>
                        <button
                            onClick={startWithDefault}
                            className="w-full bg-transparent border border-white/20 text-white font-bold py-4 rounded-2xl hover:bg-white/5 transition-all"
                        >
                            PACK CHILENO 🇨🇱
                        </button>
                    </div>
                </div>
            )}

            {/* ---------------- EXPLAIN CARD ---------------- */}
            {gameState === 'explain' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 z-10 text-center animate-in zoom-in duration-300">
                    <div className={`w-32 h-32 rounded-full ${getThemeColor()} flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/20`}>
                        <span className="text-6xl text-white">
                            {subRound === 'desc' ? '🗣️' : subRound === 'one-word' ? '☝️' : '🎭'}
                        </span>
                    </div>

                    <h3 className="text-indigo-400 font-bold uppercase tracking-widest text-sm mb-2">PRÓXIMA RONDA</h3>
                    <h2 className="text-4xl font-black text-white mb-6">
                        {subRound === 'desc' ? 'DESCRIPCIÓN' : subRound === 'one-word' ? 'UNA PALABRA' : 'MÍMICA'}
                    </h2>

                    <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 max-w-xs mb-10">
                        <p className="text-gray-300 leading-relaxed">
                            {subRound === 'desc' && "Explica lo que dice la carta sin decir el nombre ni rimas."}
                            {subRound === 'one-word' && "Elige solo UNA palabra clave. Si dices más, pierdes."}
                            {subRound === 'mimic' && "Silencio total. Solo tu cuerpo puede hablar."}
                        </p>
                    </div>

                    <button
                        onClick={startTurn}
                        className="w-full max-w-xs bg-white text-black font-black py-4 rounded-full shadow-lg hover:scale-105 transition-transform"
                    >
                        ¡DALE! ▶️
                    </button>
                </div>
            )}

            {/* ---------------- PLAYING (SPLIT CONTROLS) ---------------- */}
            {gameState === 'playing' && (
                <div className="flex h-full w-full relative z-10">
                    {/* LEFT: SKIP (RED) */}
                    <button
                        onClick={handleSkip}
                        className="w-1/2 h-full bg-red-600/10 active:bg-red-600/30 flex flex-col items-center justify-center border-r border-white/5 transition-colors group touch-none"
                    >
                        <X className="w-16 h-16 text-red-500 mb-2 opacity-50 group-active:scale-125 transition-transform" />
                        <span className="text-red-500 font-black tracking-widest opacity-50">PASAR</span>
                    </button>

                    {/* RIGHT: CORRECT (GREEN) */}
                    <button
                        onClick={handleCorrect}
                        className="w-1/2 h-full bg-green-600/10 active:bg-green-600/30 flex flex-col items-center justify-center border-l border-white/5 transition-colors group touch-none"
                    >
                        <Check className="w-16 h-16 text-green-500 mb-2 opacity-50 group-active:scale-125 transition-transform" />
                        <span className="text-green-500 font-black tracking-widest opacity-50">BIEN</span>
                    </button>

                    {/* CENTER OVERLAY ELEMENTS */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">

                        {/* TIMER */}
                        <div className="absolute top-20 flex flex-col items-center">
                            <div className={`text-4xl font-mono font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'} drop-shadow-md`}>
                                {timeLeft}
                            </div>
                            <div className="h-1 w-32 bg-gray-800 rounded-full mt-2 overflow-hidden">
                                <div className="h-full bg-white transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 60) * 100}%` }}></div>
                            </div>
                        </div>

                        {/* CARD */}
                        <div className="bg-white text-black w-72 h-96 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-90 duration-150 transform transition-all">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-auto mt-2">La Olla</span>
                            <h2 className="text-4xl font-black leading-tight my-auto break-words">
                                {currentWord}
                            </h2>
                            <div className="mb-auto"></div>
                        </div>

                        {/* DEBT PILL */}
                        {turnDebt > 0 && (
                            <div className="absolute bottom-10 bg-red-600 text-white px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 animate-bounce">
                                <AlertCircle size={20} />
                                DEUDA: {turnDebt}
                            </div>
                        )}

                        {/* SCORE PILL */}
                        <div className="absolute bottom-24 opacity-50 text-green-500 font-black text-xl">
                            +{turnScore}
                        </div>
                    </div>
                </div>
            )}

            {/* ---------------- SCORING ---------------- */}
            {gameState === 'scoring' && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 z-20 bg-black/80 backdrop-blur-xl h-full w-full absolute inset-0 animate-in fade-in">
                    <h2 className="text-white text-3xl font-bold mb-8">⏰ TIEMPO</h2>

                    <div className="w-full max-w-xs bg-[#1A1A1A] rounded-3xl p-6 border border-white/10 mb-8">
                        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                            <span className="text-gray-400 font-medium">Aciertos</span>
                            <span className="text-3xl font-black text-green-500">{turnScore}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400 font-medium">Deuda</span>
                            <span className="text-3xl font-black text-red-500">{turnDebt}</span>
                        </div>
                    </div>

                    {turnDebt > 0 ? (
                        <div className="text-center mb-10 animate-pulse">
                            <p className="text-red-400 font-bold uppercase tracking-widest text-sm mb-2">Castigo</p>
                            <h3 className="text-4xl font-white font-black leading-tight text-white">
                                PAGA {turnDebt} {turnDebt === 1 ? 'TRAGO' : 'TRAGOS'}
                            </h3>
                        </div>
                    ) : (
                        <div className="text-center mb-10">
                            <h3 className="text-2xl font-bold text-white">¡Limpio! 🎉</h3>
                            <p className="text-gray-400">Pasa el celular al siguiente equipo.</p>
                        </div>
                    )}

                    <button
                        onClick={() => setGameState('explain')}
                        className="bg-white text-black font-black py-4 px-12 rounded-full hover:scale-105 active:scale-95 transition-transform shadow-xl"
                    >
                        SIGUIENTE ➡️
                    </button>
                </div>
            )}

            {/* ---------------- GAME OVER ---------------- */}
            {gameState === 'game-over' && (
                <div className="flex-1 flex flex-col items-center justify-center z-10 p-6 text-center">
                    <div className="mb-6">
                        <Check className="w-24 h-24 text-green-500" />
                    </div>
                    <h1 className="text-4xl font-black text-white mb-4">¡FIN DE OLLA!</h1>
                    <p className="text-gray-400 mb-12">Se acabaron todas las palabras.</p>

                    <button onClick={() => setGameState('setup')} className="bg-indigo-600 text-white font-bold py-4 px-12 rounded-full shadow-lg">
                        Volver al Menú
                    </button>
                </div>
            )}
        </div>
    );
}
