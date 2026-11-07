import { useState, useEffect, useRef } from 'react';
import { GameNavbar } from '../ui/GameNavbar';
import { Bomb, Skull, AlertTriangle } from 'lucide-react';

interface LaBombaGameProps {
    onExit: () => void;
}

const CATEGORIES = [
    "Marcas de Cerveza", "Excusas para faltar al trabajo", "Posiciones Sexuales",
    "Nombres de Ex parejas", "Marcas de Autos", "Países de Europa", "Animales con L",
    "Cosas en un baño", "Ingredientes de Pizza", "Bandas de Rock",
    "Películas de Terror", "Superhéroes", "Sabores de Helado", "Cosas pegajosas",
    "Razones para terminar", "Tragos con Vodka", "Partes del cuerpo", "Insultos chilenos",
    "Marcas de condones", "Cosas que harías por dinero", "Cosas que no se dicen en una cena",
    "Lugares para tener sexo", "Marcas de ropa interior", "Nombres de abuelas"
];

export function LaBombaGame({ onExit }: LaBombaGameProps) {
    const [gameState, setGameState] = useState<'setup' | 'ticking' | 'exploded'>('setup');
    const [category, setCategory] = useState("");
    const [tickSpeed, setTickSpeed] = useState(1000); // ms per tick
    const [explosionType, setExplosionType] = useState<'normal' | 'cluster'>('normal');
    const [bgIntensity, setBgIntensity] = useState(0); // 0 to 1 for red opacity

    const timeRemainingRef = useRef(0);
    const timerId = useRef<NodeJS.Timeout | null>(null);

    // Audio context placeholder (for future sound implementation)
    // const playSound = (type: 'tick' | 'boom') => { ... }

    const startGame = () => {
        const randomCat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
        setCategory(randomCat);

        // Random duration: 25s - 55s
        const duration = Math.floor(Math.random() * (30000)) + 25000;
        timeRemainingRef.current = duration;

        // Cluster Bomb Chance (20%)
        setExplosionType(Math.random() < 0.2 ? 'cluster' : 'normal');

        setGameState('ticking');
        setTickSpeed(800);
        setBgIntensity(0);

        if (navigator.vibrate) navigator.vibrate(200);

        processTick();
    };

    const processTick = () => {
        if (timeRemainingRef.current <= 0) {
            explode();
            return;
        }

        // Calculate intensity (0 to 1) based on remaining time
        // 40s -> 0, 0s -> 1
        const intensity = Math.max(0, 1 - (timeRemainingRef.current / 30000));
        setBgIntensity(intensity);

        let currentTick = 800;
        if (timeRemainingRef.current < 8000) currentTick = 150; // Panic!
        else if (timeRemainingRef.current < 15000) currentTick = 300; // Fast
        else if (timeRemainingRef.current < 25000) currentTick = 500; // Medium

        setTickSpeed(currentTick);

        // Haptic Feedback Logic
        if (navigator.vibrate) {
            navigator.vibrate(currentTick < 200 ? 30 : 50);
        }

        const nextTick = Math.min(currentTick, timeRemainingRef.current);

        timerId.current = setTimeout(() => {
            timeRemainingRef.current -= nextTick;
            processTick();
        }, nextTick);
    };

    const explode = () => {
        setGameState('exploded');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 1000]); // Violent vibration
    };

    useEffect(() => {
        return () => {
            if (timerId.current) clearTimeout(timerId.current);
        };
    }, []);

    // Color logic based on state
    // Setup: Slate-950
    // Ticking: Dynamic Radial Gradient from Black to Red based on intensity
    // Exploded: Red-950

    return (
        <div className="flex flex-col h-full w-full relative overflow-hidden bg-black touch-none select-none">

            <GameNavbar onExit={onExit} title="" className="z-30 absolute top-0" />

            {/* DYNAMIC BACKGROUND FOR TICKING */}
            {gameState === 'ticking' && (
                <div
                    className="absolute inset-0 transition-opacity duration-200 pointer-events-none z-0"
                    style={{
                        background: `radial-gradient(circle at center, rgb(${100 + (bgIntensity * 155)}, 0, 0) 0%, rgb(0, 0, 0) 70%)`,
                        opacity: 0.8 + (bgIntensity * 0.2)
                    }}
                >
                    <div className={`absolute inset-0 bg-red-500 Mix-blend-overlay ${tickSpeed < 200 ? 'animate-pulse' : ''} opacity-20`}></div>
                </div>
            )}

            {/* SETUP SCREEN */}
            {gameState === 'setup' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 z-10 bg-slate-950">
                    <div className="mb-12 relative">
                        <div className="absolute inset-0 bg-red-500 blur-[80px] opacity-20 rounded-full animate-pulse" />
                        <Bomb className="w-40 h-40 text-white relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                    </div>

                    <h1 className="text-6xl font-black text-white mb-2 tracking-tighter">LA BOMBA</h1>
                    <p className="text-xl text-gray-400 mb-12 text-center max-w-xs">
                        Pásalo rápido.<br />Si explota en tu mano, <span className="text-red-500 font-bold">mueres.</span>
                    </p>

                    <button
                        onClick={startGame}
                        className="w-full max-w-xs bg-gradient-to-r from-red-600 to-orange-600 text-white text-2xl font-black py-6 rounded-3xl shadow-[0_0_40px_rgba(220,38,38,0.5)] active:scale-95 active:shadow-none transition-all"
                    >
                        ENCENDER 🔥
                    </button>
                </div>
            )}

            {/* TICKING SCREEN (THE GAME) */}
            {gameState === 'ticking' && (
                <div className="flex-1 flex flex-col z-10 h-full">
                    {/* TOP HALF: CATEGORY */}
                    <div className="flex-[0.8] flex flex-col items-center justify-center p-6 text-center pointer-events-none transition-transform duration-100"
                        style={{ transform: tickSpeed < 200 ? `translate(${Math.random() * 4 - 2}px, ${Math.random() * 4 - 2}px)` : 'none' }} // Shake effect
                    >
                        <h3 className="text-red-300 font-bold uppercase tracking-[0.2em] text-sm mb-4 animate-in fade-in slide-in-from-top-4">
                            MENCIONA UN...
                        </h3>
                        <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight drop-shadow-2xl animate-in zoom-in duration-300">
                            {category}
                        </h2>
                    </div>

                    {/* BOTTOM HALF: THE BUTTON */}
                    <button
                        className={`flex-1 w-full bg-transparent border-t-2 border-white/10 active:bg-white/5 active:backdrop-blur-sm transition-colors flex flex-col items-center justify-start pt-12 group`}
                        onClick={() => {
                            if (navigator.vibrate) navigator.vibrate(15);
                            // Visual feedback is handled by active state
                        }}
                    >
                        <div className={`w-32 h-32 rounded-full border-4 border-white/20 flex items-center justify-center mb-4 group-active:scale-90 transition-transform ${tickSpeed < 200 ? 'scale-110 border-red-500/50' : ''}`}>
                            <Bomb className={`w-16 h-16 text-white ${tickSpeed < 300 ? 'animate-bounce' : 'animate-pulse'}`} />
                        </div>
                        <span className="text-3xl font-black text-white/80 tracking-widest group-active:text-white">
                            PASAR 📲
                        </span>
                        <p className="text-white/30 text-sm mt-2 font-mono">
                            PRESIONA FUERTE
                        </p>
                    </button>

                    {/* Panic Overlay for last seconds */}
                    {tickSpeed < 200 && (
                        <div className="absolute inset-0 border-[10px] border-red-600 pointer-events-none animate-pulse z-50"></div>
                    )}
                </div>
            )}

            {/* EXPLODED SCREEN */}
            {gameState === 'exploded' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 z-20 bg-red-950 animate-shake-violent relative overflow-hidden">
                    {/* Cracks / Chaos Decoration */}
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-red-500 rotate-12 translate-y-20 opacity-50"></div>
                    <div className="absolute bottom-0 right-0 w-full h-[2px] bg-red-500 -rotate-12 -translate-y-20 opacity-50"></div>

                    <div className="mb-8 relative">
                        <div className="absolute inset-0 bg-black blur-[50px] opacity-60 rounded-full" />
                        <Skull className="w-48 h-48 text-white relative z-10" />
                    </div>

                    <h1 className="text-7xl font-black text-white mb-2 tracking-tighter drop-shadow-lg">
                        BOOM
                    </h1>

                    <div className="bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-red-500/30 w-full max-w-sm text-center mb-8 transform hover:scale-105 transition-transform">
                        {explosionType === 'cluster' ? (
                            <>
                                <div className="inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-300 px-4 py-1 rounded-full text-xs font-black uppercase mb-4 tracking-wider border border-yellow-500/30">
                                    <AlertTriangle size={12} /> Daño Masivo
                                </div>
                                <p className="text-2xl font-bold text-white leading-relaxed">
                                    ¡BOMBA RACIMO!
                                </p>
                                <p className="text-red-200 mt-2">
                                    Mueres tú <span className="font-black text-white">Y TUS VECINOS</span> de al lado.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-2xl font-bold text-white leading-relaxed">
                                    Estás Muerto.
                                </p>
                                <p className="text-red-200 mt-2">
                                    Fondo blanco o shot de castigo.
                                </p>
                            </>
                        )}
                    </div>

                    <button
                        onClick={() => setGameState('setup')}
                        className="bg-white text-black font-black py-4 px-12 rounded-full shadow-2xl active:scale-95 transition-all text-lg"
                    >
                        OTRA RONDA 🔄
                    </button>
                </div>
            )}
        </div>
    );
}
