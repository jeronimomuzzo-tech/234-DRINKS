import { useState, useEffect } from 'react';
import { Deck } from '../../game-engine/deck';
import { Card, Player } from '../../game-engine/types';
import { PlayingCard } from '../ui/PlayingCard';
import { Dice } from '../../game-engine/dice';
import { IconDice, IconCrown } from '../ui/SuitIcons';
import { GameNavbar } from '../ui/GameNavbar';
// import { Dices } from 'lucide-react';

interface HombreTresGameProps {
    onExit: () => void;
    config: { players: number };
}

export function HombreTresGame({ onExit, config }: HombreTresGameProps) {
    const [deck, setDeck] = useState(new Deck());
    const [currentCard, setCurrentCard] = useState<Card | null>(null);
    const [message, setMessage] = useState("Toca el mazo");
    const [lastAction, setLastAction] = useState("Para sacar una carta");
    const [diceResult, setDiceResult] = useState<number | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);

    useEffect(() => {
        setPlayers(Array.from({ length: config.players }, (_, i) => ({
            id: `p-${i}`,
            name: `Jugador ${i + 1}`,
            isHost: i === 0,
            drinksTaken: 0,
            drinksGiven: 0,
        })));
    }, [config.players]);

    const handleDraw = () => {
        const card = deck.draw();
        if (!card) {
            setMessage("¡Fin del Mazo!");
            setLastAction("Barajando de nuevo...");
            setDeck(new Deck()); // Auto restart deck
            return;
        }

        setCurrentCard(card);
        setDiceResult(null); // Reset dice

        // Set rule based on Rank (Hombre 3 Rules)
        let rule = "";
        let action = "";

        switch (card.rank) {
            case 'A': rule = "A TORRE"; action = "Todos toman un sorbo (o empiezan la torre)"; break;
            case '2': rule = "REGALA 2"; action = "Elige a alguien para que tome 2 sorbos"; break;
            case '3': rule = "HOMBRE TRES"; action = "¡El que lo saca toma 3 sorbos!"; break;
            case '4': rule = "DADO"; action = "Tira el dado. El número que salga son tragos a repartir."; break;
            case '5': rule = "DERECHA"; action = "El jugador de tu derecha toma."; break;
            case '6': rule = "IZQUIERDA"; action = "El jugador de tu izquierda toma."; break;
            case '7': rule = "EL SIETE"; action = "¡Manos arriba! El último en levantar las manos toma."; break;
            case '8': rule = "CATEGORÍAS"; action = "Marcas de autos, países, cigarros..."; break;
            case '9': rule = "RIMA"; action = "Palabra que rime con... (ej: Camión)"; break;
            case '10': rule = "TODOS TOMAN"; action = "Brindis general. ¡Salud!"; break;
            case 'J': rule = "INVENTA REGLA"; action = "Crea una regla sagrada para el resto del juego."; break;
            case 'Q': rule = "PREGUNTAS"; action = "Solo se puede hablar con preguntas."; break;
            case 'K': rule = "CUARTO REY"; action = "Rey normal. El 4to Rey termina el juego."; break;
            default: rule = "JUEGA"; action = "";
        }

        setMessage(rule);
        setLastAction(action);
        setCurrentPlayerIdx((prev) => (prev + 1) % players.length);
    };

    const rollDice = () => {
        const res = Dice.roll();
        setDiceResult(res);
        setLastAction(`Salió un ${res} 🎲 -> ${players[currentPlayerIdx].name} reparte ${res} tragos.`);
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] items-center py-6 px-4 relative overflow-hidden pt-20">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-cyan-900/20 to-blue-900/20 pointer-events-none" />

            <GameNavbar onExit={onExit} title="Hombre Tres" />

            <div className="text-center z-10 mb-8">
                {/* Title removed here as it is in Navbar now, or we keep a sub-header? Let's simplify. */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <p className="text-gray-300 text-sm font-medium">{players[currentPlayerIdx]?.name}, tu turno</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full gap-8 z-10">
                {/* Deck Area */}
                <div onClick={handleDraw} className="relative cursor-pointer group perserve-3d">
                    <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-500" />
                    {!currentCard ? (
                        <div className="w-56 h-80 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-white/10 flex flex-col items-center justify-center shadow-2xl transform transition-transform group-hover:scale-105">
                            <span className="text-6xl mb-2">🃏</span>
                            <span className="text-white/50 font-bold tracking-widest text-sm">TOCAR</span>
                        </div>
                    ) : (
                        <PlayingCard card={currentCard} className="w-64 h-96 shadow-2xl transform transition-transform group-hover:scale-105" />
                    )}
                </div>

                {/* Info Area */}
                <div className="text-center w-full max-w-md min-h-[140px] animate-in slide-in-from-bottom duration-300">
                    <h3 className="text-5xl font-black text-white mb-3 uppercase tracking-tighter drop-shadow-lg leading-none">
                        {message}
                    </h3>
                    <p className="text-xl text-cyan-200 font-medium leading-normal p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                        {lastAction}
                    </p>
                </div>

                {/* Dice Button if Card is 4 */}
                {currentCard?.rank === '4' && (
                    <button onClick={rollDice} disabled={diceResult !== null} className="group relative flex items-center gap-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black px-8 py-4 rounded-2xl font-black text-xl shadow-lg shadow-yellow-500/20 transition-all hover:-translate-y-1 active:translate-y-0">
                        <IconDice className="w-8 h-8" />
                        {diceResult ? `Salió: ${diceResult}` : 'TIRAR DADO'}
                    </button>
                )}
            </div>

            <button onClick={onExit} className="z-10 mt-6 px-8 py-3 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-medium">Salir</button>
        </div>
    );
}

// Cuarto Rey (Similar engine, different rules)
export function CuartoReyGame({ onExit, config }: HombreTresGameProps) {
    const [deck, setDeck] = useState(new Deck()); // Using same deck instance? No, new instance.
    const [currentCard, setCurrentCard] = useState<Card | null>(null);
    const [kingsCount, setKingsCount] = useState(0); // Track Kings for "Cuarto Rey"
    const [message, setMessage] = useState("Toca el mazo");
    const [description, setDescription] = useState("Encuentra los 4 Reyes");
    const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
    const [players, setPlayers] = useState<Player[]>([]);

    useEffect(() => {
        setPlayers(Array.from({ length: config.players }, (_, i) => ({
            id: `p-${i}`,
            name: `Jugador ${i + 1}`,
            isHost: i === 0,
            drinksTaken: 0,
            drinksGiven: 0,
        })));
    }, [config.players]);

    const handleDraw = () => {
        const card = deck.draw();
        if (!card) return;

        setCurrentCard(card);
        let title = "";
        let desc = "";

        const isRed = card.isRed;

        if (card.rank === 'K') {
            const newCount = kingsCount + 1;
            setKingsCount(newCount);
            title = `¡REY #${newCount}!`;
            if (newCount === 4) {
                title = "¡CUARTO REY!";
                desc = "FIN DEL JUEGO. TÓMATELO TODO (O FONDO BLANCO). ☠️";
            } else {
                desc = "Vierte un poco de tu trago en la Copa del Rey (o toma un sorbo grande).";
            }
        } else {
            // Standard Rules
            switch (card.rank) {
                case 'A':
                    title = isRed ? "REGALA 2" : "TOMA 2";
                    desc = isRed ? "Elige a quién regalarle 2 tragos." : "Mala suerte, toma 2 tragos.";
                    break;
                case '2':
                    title = isRed ? "HISTORIA" : "CULTURA CHUPÍSTICA";
                    desc = isRed ? "Armen una historia palabra por palabra." : "Nombra marcas, tipos de...";
                    break;
                case '3':
                    title = isRed ? "CHANCHO INFLADO" : "DEDITO";
                    desc = isRed ? "El último en inflar los cachetes toma." : "El último en poner el dedo en la mesa toma.";
                    break;
                case '4':
                    title = isRed ? "CASCADA" : "NUNCA NUNCA";
                    desc = isRed ? "Todos toman hasta que el de la derecha pare." : "Yo nunca nunca...";
                    break;
                case '5':
                    title = isRed ? "ANIMALES" : "REGLA NUEVA";
                    desc = isRed ? "Imita un animal sin mostrar los dientes." : "Crea una regla para el resto del juego.";
                    break;
                case '6':
                    title = isRed ? "ESPALDA" : "COLISEO";
                    desc = "Dos personas compiten espalda con espalda o shot.";
                    break;
                case '7':
                    title = isRed ? "EL SIETE" : "PREGUNTA";
                    desc = isRed ? "Manos arriba, último toma." : "El que responde tu pregunta toma.";
                    break;
                case '8':
                    title = isRed ? "VERDAD/RETO" : "REPUDIO";
                    desc = "Elige sabiamente o sé repudiado.";
                    break;
                case '9':
                    title = isRed ? "ÁNDALE" : "PROBABILIDADES";
                    desc = "Juego rápido de reacción.";
                    break;
                case '10':
                    title = isRed ? "APUNTA" : "MI MMM ES";
                    desc = "Todos apuntan al más... o completan 'Mi X es...'";
                    break;
                case 'J':
                    title = isRed ? "ABECEDARIO" : "VIKINGO";
                    desc = "Sigue el orden o rema como vikingo.";
                    break;
                case 'Q':
                    title = isRed ? "OJITOS" : "DATO FREAK";
                    desc = "Nadie te puede mirar a los ojos o dato curioso.";
                    break;
                default:
                    title = "JUEGA";
            }
        }

        setMessage(title);
        setDescription(desc);
        setCurrentPlayerIdx(prev => (prev + 1) % players.length);
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] items-center py-6 px-4 relative overflow-hidden pt-20">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-pink-900/20 to-rose-900/20 pointer-events-none" />

            <GameNavbar onExit={onExit} title="Cuarto Rey" />

            <div className="text-center z-10 mb-6">
                <div className="flex justify-center gap-4 mt-4 bg-black/40 p-3 rounded-2xl border border-white/10 backdrop-blur-sm">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className={`relative transition-all duration-500 ${i < kingsCount ? 'text-yellow-400 scale-110' : 'text-gray-700 scale-90'}`}>
                            <IconCrown className="w-8 h-8" />
                            {i < kingsCount && <span className="absolute inset-0 animate-ping opacity-50 bg-yellow-500 rounded-full blur-sm" />}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full gap-8 z-10">
                <div onClick={handleDraw} className="relative cursor-pointer group perserve-3d">
                    <div className="absolute inset-0 bg-rose-500/20 blur-xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-500" />
                    {!currentCard ? (
                        <div className="w-56 h-80 bg-gradient-to-br from-red-900 to-pink-900 rounded-2xl border-2 border-yellow-500/50 flex flex-col items-center justify-center shadow-2xl transform transition-transform group-hover:scale-105">
                            <IconCrown className="w-16 h-16 text-yellow-500/50 mb-2" />
                            <span className="text-white/50 font-bold tracking-widest text-sm">JUGAR</span>
                        </div>
                    ) : (
                        <PlayingCard card={currentCard} className="w-64 h-96 shadow-2xl transform transition-transform group-hover:scale-105" />
                    )}
                </div>

                <div className="text-center w-full max-w-md min-h-[140px] animate-in slide-in-from-bottom duration-300">
                    <h3 className="text-4xl text-white font-black mb-3 uppercase tracking-tighter drop-shadow-lg leading-none break-words">
                        {message}
                    </h3>
                    {description && (
                        <p className="text-xl text-rose-200 font-medium leading-normal p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                            {description}
                        </p>
                    )}
                </div>
            </div>

            <button onClick={onExit} className="z-10 mt-6 px-8 py-3 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-medium">Salir</button>
        </div>
    );
}
