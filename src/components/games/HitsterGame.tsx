import { useState, useEffect, useRef } from 'react';
import {
    HitsterTrack,
    CuratedPlaylist,
    CURATED_PLAYLISTS,
    loadPlaylistTracks,
    searchTracks
} from '../../lib/musicApi';
import {
    Play,
    Pause,
    Music,
    HelpCircle,
    CheckCircle,
    XCircle,
    Search,
    Calendar,
    Trophy,
    Volume2,
    VolumeX,
    Mic2,
    RotateCcw,
    Flame,
    Swords,
    Skull,
    Sparkles,
    Check
} from 'lucide-react';
import confetti from 'canvas-confetti';

type Team = 'A' | 'B' | 'C' | 'D';
export type Difficulty = 'easy' | 'normal' | 'hard';

interface TeamState {
    score: number;
    timeline: HitsterTrack[];
    color: string;
}

interface StealBet {
    challengerTeam: Team;
    targetTeam: Team;
    stolen: boolean | null;
}

export function HitsterGame({ onExit }: { onExit: () => void }) {
    // Game lifecycle
    const [gameState, setGameState] = useState<
        'team-select' | 'playlist-select' | 'start' | 'turn-start' | 'playing' | 'revealed' | 'gameover'
    >('team-select');

    // Playlist & Tracks
    const [tracks, setTracks] = useState<HitsterTrack[]>([]);
    const [currentTrack, setCurrentTrack] = useState<HitsterTrack | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<HitsterTrack[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedPlaylistName, setSelectedPlaylistName] = useState('Fiesta Mix');

    // Gameplay & Mechanics
    const [difficulty, setDifficulty] = useState<Difficulty>('normal');
    const [lastGuessCorrect, setLastGuessCorrect] = useState<boolean | null>(null);
    const [yearDiff, setYearDiff] = useState<number | null>(null);
    const [isExactYear, setIsExactYear] = useState(false);
    const [stealBet, setStealBet] = useState<StealBet | null>(null);
    const [bonusDrinks, setBonusDrinks] = useState(false);
    const [showTrackDetails, setShowTrackDetails] = useState(false);
    const [previewTrack, setPreviewTrack] = useState<HitsterTrack | null>(null);
    const [shake, setShake] = useState(false);

    // In-App Audio Player
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const [audioDuration, setAudioDuration] = useState(30);

    // Teams
    const [teamCount, setTeamCount] = useState<number>(2);
    const [currentTeam, setCurrentTeam] = useState<Team>('A');
    const [teams, setTeams] = useState<Record<string, TeamState>>({
        A: { score: 0, timeline: [], color: 'bg-green-500' },
        B: { score: 0, timeline: [], color: 'bg-purple-500' }
    });

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    // Setup audio track playback
    const playAudio = (url: string) => {
        if (!url) return;
        if (audioRef.current) {
            audioRef.current.pause();
        }

        const audio = new Audio(url);
        audioRef.current = audio;
        audio.volume = 1.0;

        audio.ontimeupdate = () => {
            if (audio.duration) {
                setAudioProgress((audio.currentTime / audio.duration) * 100);
                setAudioDuration(audio.duration);
            }
        };

        audio.onended = () => {
            setIsPlaying(false);
            setAudioProgress(100);
        };

        audio.play().then(() => {
            setIsPlaying(true);
        }).catch((err) => {
            console.warn("Audio autoplay blocked or failed:", err);
            setIsPlaying(false);
        });
    };

    const toggleAudio = () => {
        if (!audioRef.current) {
            if (currentTrack?.previewUrl) playAudio(currentTrack.previewUrl);
            return;
        }

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
        }
    };

    const replayAudio = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
        } else if (currentTrack?.previewUrl) {
            playAudio(currentTrack.previewUrl);
        }
    };

    // --- TEAMS INITIALIZATION ---
    const initTeams = (count: number) => {
        const newTeams: Record<string, TeamState> = {
            A: { score: 0, timeline: [], color: 'bg-green-500' },
            B: { score: 0, timeline: [], color: 'bg-purple-500' },
        };
        if (count >= 3) newTeams.C = { score: 0, timeline: [], color: 'bg-orange-500' };
        if (count >= 4) newTeams.D = { score: 0, timeline: [], color: 'bg-cyan-500' };

        setTeams(newTeams);
        setTeamCount(count);
        setGameState('playlist-select');
    };

    // --- PLAYLIST SELECTION ---
    const handleSelectCurated = async (playlist: CuratedPlaylist) => {
        setLoading(true);
        setSelectedPlaylistName(playlist.name);
        try {
            const playlistTracks = await loadPlaylistTracks(playlist);
            if (playlistTracks.length >= teamCount) {
                setupGameWithTracks(playlistTracks);
            } else {
                alert("Cargando canciones... Intenta de nuevo en unos segundos.");
            }
        } catch (e) {
            console.error("Error loading curated playlist", e);
        } finally {
            setLoading(false);
        }
    };

    // Handle Custom Search
    const handleSearchSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const q = searchQuery.trim();
        if (!q) return;

        setIsSearching(true);
        try {
            const res = await searchTracks(q, 30);
            setSearchResults(res);
            if (res.length >= teamCount) {
                setSelectedPlaylistName(`Búsqueda: ${q}`);
            }
        } catch (e) {
            console.error("Search error", e);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectSearchBatch = () => {
        if (searchResults.length >= teamCount) {
            setupGameWithTracks(searchResults);
        } else {
            alert(`Necesitas al menos ${teamCount} canciones válidas con audio.`);
        }
    };

    const setupGameWithTracks = (allTracks: HitsterTrack[]) => {
        const shuffled = [...allTracks].sort(() => Math.random() - 0.5);

        // Distribute 1 base card to each team
        const newTeams = { ...teams };
        Object.keys(newTeams).forEach((teamId, index) => {
            newTeams[teamId as Team].timeline = [shuffled[index]];
            newTeams[teamId as Team].score = 0;
        });

        setTeams(newTeams);
        setTracks(shuffled.slice(teamCount));
        setGameState('start');
    };

    const startTurn = () => {
        if (tracks.length === 0) {
            alert("¡Se acabaron las canciones de esta playlist!");
            setGameState('gameover');
            return;
        }

        const nextTrack = tracks[0];
        setCurrentTrack(nextTrack);
        setTracks(prev => prev.slice(1));

        setGameState('playing');
        setLastGuessCorrect(null);
        setYearDiff(null);
        setIsExactYear(false);
        setStealBet(null);
        setBonusDrinks(false);
        setShowTrackDetails(false);

        // Play 30s preview automatically inside the app
        playAudio(nextTrack.previewUrl);
    };

    // --- GUESSING LOGIC ---
    const handleGuess = (index: number) => {
        if (!currentTrack) return;

        const currentYear = currentTrack.year;
        const activeTimeline = teams[currentTeam].timeline;

        let isOrderCorrect = true;
        let closestNeighborYear = currentYear;

        if (index > 0) {
            const prevYear = activeTimeline[index - 1].year;
            closestNeighborYear = prevYear;
            if (currentYear < prevYear) isOrderCorrect = false;
        }

        if (index < activeTimeline.length) {
            const nextYear = activeTimeline[index].year;
            closestNeighborYear = nextYear;
            if (currentYear > nextYear) isOrderCorrect = false;
        }

        const calculatedDiff = Math.abs(currentYear - closestNeighborYear);
        setYearDiff(calculatedDiff);

        // Exact match
        const exactHit = (index > 0 && currentYear === activeTimeline[index - 1].year) ||
            (index < activeTimeline.length && currentYear === activeTimeline[index].year) ||
            calculatedDiff === 0;

        setIsExactYear(exactHit);

        // Apply Difficulty (B.2)
        let finalCorrect = isOrderCorrect;

        if (difficulty === 'easy') {
            const sameDecade = Math.floor(currentYear / 10) === Math.floor(closestNeighborYear / 10);
            if (isOrderCorrect || calculatedDiff <= 3 || sameDecade) {
                finalCorrect = true;
            }
        } else if (difficulty === 'hard') {
            if (!isOrderCorrect || calculatedDiff > 1) {
                finalCorrect = false;
            }
        }

        setLastGuessCorrect(finalCorrect);
        setGameState('revealed');
        setShowTrackDetails(false);

        if (finalCorrect) {
            confetti({
                particleCount: exactHit ? 150 : 80,
                spread: 70,
                origin: { y: 0.6 },
                colors: exactHit ? ['#eab308', '#22c55e', '#ffffff'] : ['#22c55e', '#ffffff']
            });

            const newTimeline = [...activeTimeline];
            newTimeline.splice(index, 0, currentTrack);

            setTeams(prev => ({
                ...prev,
                [currentTeam]: {
                    ...prev[currentTeam],
                    score: prev[currentTeam].score + 1,
                    timeline: newTimeline
                }
            }));
        } else {
            setShake(true);
            setTimeout(() => setShake(false), 500);
        }
    };

    // --- B.3 STEAL BET CHALLENGE ("ROBAR CANCIÓN") ---
    const handleStealBet = (challenger: Team) => {
        if (!currentTrack || lastGuessCorrect === null) return;

        const originalTeamCorrect = lastGuessCorrect === true;

        if (!originalTeamCorrect) {
            // Challenger was right! Steals song to challenger timeline
            const challengerTimeline = [...teams[challenger].timeline];
            const currentYear = currentTrack.year;

            let insertIdx = challengerTimeline.findIndex(t => t.year > currentYear);
            if (insertIdx === -1) insertIdx = challengerTimeline.length;
            challengerTimeline.splice(insertIdx, 0, currentTrack);

            setTeams(prev => ({
                ...prev,
                [challenger]: {
                    ...prev[challenger],
                    score: prev[challenger].score + 1,
                    timeline: challengerTimeline
                }
            }));

            setStealBet({
                challengerTeam: challenger,
                targetTeam: currentTeam,
                stolen: true
            });

            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#a855f7', '#ec4899', '#ffffff']
            });
        } else {
            setStealBet({
                challengerTeam: challenger,
                targetTeam: currentTeam,
                stolen: false
            });
        }
    };

    const nextTurn = () => {
        if (audioRef.current) {
            audioRef.current.pause();
        }

        const teamOrder: Team[] = ['A', 'B', 'C', 'D'];
        const currentIndex = teamOrder.indexOf(currentTeam);
        let nextIndex = (currentIndex + 1) % teamOrder.length;

        while (!teams[teamOrder[nextIndex]]) {
            nextIndex = (nextIndex + 1) % teamOrder.length;
        }

        setCurrentTeam(teamOrder[nextIndex]);
        setStealBet(null);
        setGameState('turn-start');
    };

    // --- SCREENS ---

    // 1. Team Select Screen (Instant, zero login)
    const renderTeamSelect = () => (
        <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-8 animate-in fade-in">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-pink-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-purple-500/30">
                <Music size={40} className="text-white" />
            </div>
            <div>
                <h2 className="text-4xl font-extrabold text-white mb-2">Hitster Drinks 🎧</h2>
                <p className="text-gray-400 max-w-xs text-sm">
                    Escucha el audio de 30s directo en tu celular, adivina el año y manda tragos a tus rivales.
                </p>
            </div>

            <div className="flex gap-4">
                {[2, 3, 4].map(num => (
                    <button
                        key={num}
                        onClick={() => initTeams(num)}
                        className={`
                            w-24 h-24 rounded-3xl text-4xl font-black transition-all hover:scale-105 active:scale-95
                            ${num === 2 ? 'bg-gradient-to-br from-green-500 to-green-700 shadow-green-500/30' : ''}
                            ${num === 3 ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-purple-500/30' : ''}
                            ${num === 4 ? 'bg-gradient-to-br from-orange-400 to-red-600 shadow-orange-500/30' : ''}
                            flex flex-col items-center justify-center gap-1 shadow-2xl border border-white/10 text-white
                        `}
                    >
                        <span>{num}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Equipos</span>
                    </button>
                ))}
            </div>

            <p className="text-[11px] text-gray-500">
                ⚡ Audio 100% integrado sin ventanas ni inicios de sesión.
            </p>
        </div>
    );

    // 2. Playlist Select Screen (Pre-made party mixes + Live Search)
    const renderPlaylistSelect = () => (
        <div className="flex flex-col h-full p-5 animate-in fade-in no-scrollbar overflow-y-auto">
            <h2 className="text-3xl font-black mb-1 text-center text-white">Elige la Música 🎵</h2>
            <p className="text-gray-400 text-xs text-center mb-5">Selecciona un pack fiestero o busca cualquier artista</p>

            {/* Curated Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {CURATED_PLAYLISTS.map(pl => (
                    <button
                        key={pl.id}
                        onClick={() => handleSelectCurated(pl)}
                        disabled={loading}
                        className={`p-4 rounded-2xl bg-gradient-to-br ${pl.gradient} text-left text-white shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all border border-white/10 flex items-start gap-3`}
                    >
                        <span className="text-3xl flex-shrink-0">{pl.icon}</span>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-black text-base leading-tight mb-1">{pl.name}</h3>
                            <p className="text-white/80 text-xs leading-normal line-clamp-2">{pl.description}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Custom Search Section */}
            <div className="bg-zinc-900/80 p-4 rounded-2xl border border-white/10 mb-6">
                <h3 className="text-xs font-bold uppercase text-gray-300 tracking-wider mb-2 flex items-center gap-1.5">
                    <Search size={14} className="text-purple-400" /> O busca cualquier artista o género:
                </h3>
                <form onSubmit={handleSearchSubmit} className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Ej: Bad Bunny, Chayanne, Rock 80s..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-black text-white px-3.5 py-2.5 rounded-xl border border-white/10 text-sm focus:border-purple-500 focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={isSearching || !searchQuery.trim()}
                        className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 font-bold text-white text-xs rounded-xl hover:opacity-90 disabled:opacity-50"
                    >
                        {isSearching ? 'Buscando...' : 'Buscar'}
                    </button>
                </form>

                {searchResults.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                        <span className="text-xs text-green-400 font-bold">
                            ✅ {searchResults.length} canciones encontradas
                        </span>
                        <button
                            onClick={handleSelectSearchBatch}
                            className="px-3.5 py-1.5 bg-white text-black font-black text-xs rounded-lg hover:scale-105 active:scale-95 transition-all"
                        >
                            Jugar con estos temas ▶️
                        </button>
                    </div>
                )}
            </div>

            {loading && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-6">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <h3 className="text-xl font-bold text-white mb-1">Cargando Canciones...</h3>
                    <p className="text-gray-400 text-xs">Preparando audios para la partida</p>
                </div>
            )}
        </div>
    );

    // 3. Start Configuration Screen (Difficulty Selector - B.2)
    const renderStartScreen = () => (
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center space-y-5 animate-in fade-in no-scrollbar">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-2xl shadow-pink-500/30 text-4xl">
                🎵
            </div>
            <div>
                <h2 className="text-2xl font-black text-white leading-tight">{selectedPlaylistName}</h2>
                <p className="text-gray-400 text-xs mt-1">{teamCount} Equipos Listos • {tracks.length + teamCount} Canciones</p>
            </div>

            {/* B.2 Difficulty Selector */}
            <div className="w-full max-w-sm">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-center gap-1.5">
                    <Flame size={14} className="text-orange-400" /> Nivel de Dificultad:
                </h4>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { id: 'easy', label: 'Fácil', sub: '±3 años / Década', color: 'border-green-500 bg-green-500/20 text-green-300' },
                        { id: 'normal', label: 'Clásico', sub: 'Línea de Tiempo', color: 'border-yellow-500 bg-yellow-500/20 text-yellow-300' },
                        { id: 'hard', label: 'Experto', sub: 'Año Exacto (±1)', color: 'border-red-500 bg-red-500/20 text-red-300' }
                    ].map(d => (
                        <button
                            key={d.id}
                            onClick={() => setDifficulty(d.id as Difficulty)}
                            className={`p-2.5 rounded-2xl border text-center transition-all ${difficulty === d.id
                                ? `${d.color} shadow-lg scale-105 font-black`
                                : 'border-white/10 bg-zinc-900/80 text-gray-400 hover:bg-zinc-800'
                                }`}
                        >
                            <div className="text-xs font-bold leading-tight">{d.label}</div>
                            <div className="text-[9px] opacity-75 mt-0.5 truncate">{d.sub}</div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-3.5 bg-zinc-900/80 rounded-2xl border border-white/10 text-xs text-gray-300 max-w-sm w-full text-left space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-400" /> ¿Cómo se juega?
                </div>
                <p className="text-[11px] text-gray-400">
                    Sonará un fragmento de 30 segundos. El equipo en turno debe colocarlo en su línea temporal. ¡Si fallan o los retan, beben!
                </p>
            </div>

            <button
                onClick={() => setGameState('turn-start')}
                className="w-full max-w-sm py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black rounded-2xl text-lg shadow-xl hover:scale-105 active:scale-95 transition-all mt-2"
            >
                Empezar Partida ▶️
            </button>
        </div>
    );

    // 4. Turn Start Screen
    const renderTurnStart = () => (
        <div className={`flex flex-col items-center justify-center h-full text-center p-6 space-y-6 animate-in zoom-in duration-300 ${currentTeam === 'A' ? 'bg-green-950/20' : 'bg-purple-950/20'
            }`}>
            <div className={`w-28 h-28 rounded-3xl flex items-center justify-center shadow-2xl ${currentTeam === 'A' ? 'bg-green-500 text-black shadow-green-500/50' : 'bg-purple-600 text-white shadow-purple-500/50'
                }`}>
                <span className="text-5xl font-black">{currentTeam}</span>
            </div>

            <div>
                <h2 className="text-4xl font-black text-white">Turno Equipo {currentTeam}</h2>
                <p className="text-gray-300 text-sm max-w-xs mt-1">
                    Escuchen con atención el audio que sonará a continuación. ¡Si fallan, pagan con tragos!
                </p>
            </div>

            <button
                onClick={startTurn}
                className="px-12 py-5 bg-white text-black font-black rounded-full text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all"
            >
                PLAY ▶️
            </button>
        </div>
    );

    // 5. Feedback Overlay with Steal & Drink Penalties (B.3)
    const renderFeedbackOverlay = () => {
        if (gameState !== 'revealed') return null;

        const isCorrect = lastGuessCorrect === true;
        const releaseYear = currentTrack?.year || 0;
        const isAbysmal = (yearDiff !== null && yearDiff >= 10);

        return (
            <div className="absolute inset-0 z-50 bg-black/95 flex flex-col animate-in fade-in duration-300 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center no-scrollbar">
                    <div className={`w-full max-w-md p-6 rounded-3xl flex flex-col items-center text-center shadow-2xl my-auto ${isCorrect
                        ? 'bg-green-950/40 border-2 border-green-500'
                        : isAbysmal
                            ? 'bg-red-950/60 border-2 border-red-500 shadow-red-500/20'
                            : 'bg-red-950/30 border-2 border-red-500/60'
                        }`}>

                        {/* Title & Badge */}
                        {isExactYear ? (
                            <>
                                <Trophy size={56} className="text-yellow-400 mb-2 animate-bounce flex-shrink-0" />
                                <h2 className="text-3xl font-black text-yellow-300 mb-1">🎯 ¡CLAVADO PERFECTO!</h2>
                                <p className="text-yellow-100 text-sm font-bold bg-yellow-500/20 px-4 py-1 rounded-full border border-yellow-500/30">
                                    ¡TODOS LOS RIVALES TOMAN 1 SHOT! 🥃
                                </p>
                            </>
                        ) : isCorrect ? (
                            <>
                                <CheckCircle size={56} className="text-green-400 mb-2 animate-bounce flex-shrink-0" />
                                <h2 className="text-3xl font-black text-white mb-1">¡CORRECTO!</h2>
                                <p className="text-green-300 text-sm font-bold">+1 Punto para Equipo {currentTeam}</p>
                            </>
                        ) : isAbysmal ? (
                            <>
                                <Skull size={56} className="text-red-500 mb-2 animate-pulse flex-shrink-0" />
                                <h2 className="text-3xl font-black text-red-400 mb-1">🚨 ¡DIFERENCIA ABISMAL!</h2>
                                <div className="bg-red-600 text-white font-black px-4 py-1.5 rounded-full text-sm mt-1 animate-pulse shadow-lg">
                                    ¡FONDO BLANCO / 3 TRAGOS! 🔥
                                </div>
                                <p className="text-xs text-red-200 mt-2 font-medium">
                                    Le erraron por más de {yearDiff} años. ¡A beber!
                                </p>
                            </>
                        ) : (
                            <>
                                <XCircle size={56} className="text-red-400 mb-2 animate-shake flex-shrink-0" />
                                <h2 className="text-3xl font-black text-white mb-1">¡ERROR!</h2>
                                <div className="bg-red-500 text-white font-black px-4 py-1 rounded-full text-sm mt-1">
                                    ¡EQUIPO {currentTeam} BEBE 2 TRAGOS! 🍻
                                </div>
                            </>
                        )}

                        {/* Release Year Showcase */}
                        <div className="mt-5 pt-4 border-t border-white/10 w-full flex flex-col items-center">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Año de Lanzamiento</div>
                            <p className="text-5xl font-black text-white mb-3 tracking-tight">{releaseYear}</p>

                            {!showTrackDetails ? (
                                <button
                                    onClick={() => setShowTrackDetails(true)}
                                    className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold text-sm flex items-center gap-2 transition-all border border-white/20 hover:scale-105"
                                >
                                    <Music size={16} /> Revelar Canción (+Bonus)
                                </button>
                            ) : (
                                <div className="flex flex-col items-center animate-in zoom-in slide-in-from-bottom-2 duration-300 w-full">
                                    <div className="relative w-32 h-32 mb-2 shadow-xl rounded-2xl overflow-hidden bg-black/50 border border-white/10 flex-shrink-0">
                                        <img
                                            src={currentTrack?.artworkUrl}
                                            className="w-full h-full object-cover"
                                            alt="Album Art"
                                        />
                                    </div>
                                    <h3 className="text-lg font-bold text-white leading-tight px-4 truncate max-w-xs">{currentTrack?.name}</h3>
                                    <p className="text-gray-400 text-xs mb-3">{currentTrack?.artist}</p>
                                </div>
                            )}
                        </div>

                        {/* B.3: MECÁNICA DE ROBO DE CANCIÓN ("STEAL BET") */}
                        <div className="mt-4 w-full bg-gradient-to-r from-purple-950/40 to-indigo-950/40 p-3 rounded-2xl border border-purple-500/20 text-left">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black text-purple-300 flex items-center gap-1.5 uppercase">
                                    <Swords size={14} className="text-purple-400" /> Duelo: ¡Robar Canción!
                                </span>
                                <span className="text-[10px] text-gray-400">Apuesta 2 Tragos</span>
                            </div>

                            {stealBet === null ? (
                                <div>
                                    <p className="text-[11px] text-gray-300 mb-2">
                                        ¿Un equipo rival sospecha que fallaron? Pueden retar para robarse la carta:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.keys(teams).filter(t => t !== currentTeam).map(rival => (
                                            <button
                                                key={rival}
                                                onClick={() => handleStealBet(rival as Team)}
                                                className="flex-1 py-2 px-3 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/30 rounded-xl text-xs font-bold text-purple-200 flex items-center justify-center gap-1 transition-all active:scale-95"
                                            >
                                                ⚔️ Equipo {rival} Reta
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : stealBet.stolen ? (
                                <div className="bg-purple-500/20 border border-purple-500 p-2.5 rounded-xl text-center animate-in zoom-in">
                                    <p className="text-xs font-black text-purple-200">
                                        🎉 ¡EQUIPO {stealBet.challengerTeam} ROBÓ LA CARTA!
                                    </p>
                                    <p className="text-[10px] text-purple-300 mt-0.5">
                                        Equipo {stealBet.targetTeam} falló y toma <span className="font-bold underline">4 tragos</span> de castigo.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-red-500/20 border border-red-500 p-2.5 rounded-xl text-center animate-in zoom-in">
                                    <p className="text-xs font-black text-red-300">
                                        ❌ ¡RETO FALLIDO!
                                    </p>
                                    <p className="text-[10px] text-red-200 mt-0.5">
                                        Equipo {stealBet.targetTeam} acertó. ¡Equipo {stealBet.challengerTeam} toma <span className="font-bold underline">2 tragos</span> por apostar mal!
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Bonus Sing-Along */}
                        {showTrackDetails && (
                            <div className="mt-3 w-full bg-zinc-900/60 p-3 rounded-2xl border border-white/10">
                                <div className="flex items-center justify-between">
                                    <div className="text-left">
                                        <div className="text-xs font-bold text-green-300 flex items-center gap-1">
                                            <Mic2 size={12} /> Bonus: ¿Cantaron el Coro?
                                        </div>
                                        <div className="text-[10px] text-gray-400">Si se sabían la letra completa:</div>
                                    </div>
                                    <button
                                        onClick={() => setBonusDrinks(!bonusDrinks)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${bonusDrinks
                                            ? 'bg-green-500 text-black shadow-md'
                                            : 'bg-white/10 text-white hover:bg-white/20'
                                            }`}
                                    >
                                        {bonusDrinks ? '✅ ¡Regalan 2 Tragos!' : '🎤 Sí, cantaron'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={nextTurn}
                            className="mt-5 w-full py-3.5 bg-white text-black font-black rounded-2xl text-lg shadow-xl hover:scale-105 active:scale-95 transition-transform"
                        >
                            Siguiente Turno ➡️
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // 6. Preview Modal for Timeline Cards
    const renderPreviewOverlay = () => {
        if (!previewTrack) return null;
        return (
            <div
                className="absolute inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in"
                onClick={() => setPreviewTrack(null)}
            >
                <div
                    className="w-full max-w-sm bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-white/10 flex flex-col items-center text-center animate-in zoom-in-95"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="w-56 h-56 rounded-2xl overflow-hidden shadow-2xl mb-4 ring-2 ring-white/10">
                        <img
                            src={previewTrack.artworkUrl}
                            className="w-full h-full object-cover"
                            alt="Album Art"
                        />
                    </div>
                    <h2 className="text-xl font-black text-white leading-tight mb-1">{previewTrack.name}</h2>
                    <p className="text-sm text-purple-400 font-bold mb-4">{previewTrack.artist}</p>

                    <div className="bg-white/5 px-6 py-2 rounded-full border border-white/10 mb-5">
                        <span className="text-xs text-gray-400 uppercase font-bold mr-2">Año:</span>
                        <span className="text-2xl font-black text-white">{previewTrack.year}</span>
                    </div>

                    {/* Quick Replay button */}
                    <button
                        onClick={() => playAudio(previewTrack.previewUrl)}
                        className="mb-4 px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                        <Volume2 size={14} /> Escuchar Snippet 🔊
                    </button>

                    <button
                        onClick={() => setPreviewTrack(null)}
                        className="px-6 py-2.5 bg-white text-black font-bold rounded-full text-sm hover:scale-105 transition-transform"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 h-[100dvh] bg-black z-50 overflow-hidden flex flex-col font-sans select-none">
            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-gradient-to-b from-purple-950/60 to-transparent flex-shrink-0 z-10 border-b border-white/5">
                <button
                    onClick={onExit}
                    className="text-white/70 hover:text-white px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-bold transition-colors"
                >
                    ✕ Salir
                </button>

                {gameState !== 'playlist-select' && gameState !== 'team-select' && (
                    <div className="flex items-center gap-3 bg-zinc-900/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                        {Object.entries(teams).map(([teamId, teamState]) => (
                            <div
                                key={teamId}
                                className={`flex items-center gap-1.5 text-xs ${currentTeam === teamId ? 'text-white font-extrabold scale-105' : 'text-gray-400'
                                    }`}
                            >
                                <div className={`w-2.5 h-2.5 rounded-full ${teamState.color}`} />
                                <span>{teamId}: {teamState.score}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-hidden relative flex flex-col">
                {renderFeedbackOverlay()}
                {renderPreviewOverlay()}

                {gameState === 'team-select' ? (
                    renderTeamSelect()
                ) : gameState === 'playlist-select' ? (
                    renderPlaylistSelect()
                ) : gameState === 'start' ? (
                    renderStartScreen()
                ) : gameState === 'turn-start' ? (
                    renderTurnStart()
                ) : (
                    /* GAME BOARD (IN-APP AUDIO + TIMELINE) */
                    <div className={`h-full flex flex-col pt-2 pb-8 px-4 overflow-y-auto no-scrollbar ${shake ? 'animate-shake' : ''}`}>
                        {/* Status Bar */}
                        <div className="flex items-center justify-between mb-3 px-1">
                            <div className={`py-1.5 px-3 rounded-xl font-bold uppercase tracking-wider text-xs ${currentTeam === 'A' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'
                                }`}>
                                Jugando: Equipo {currentTeam}
                            </div>
                            <div className="text-[11px] text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg">
                                Modo: <span className="font-bold text-white capitalize">{difficulty}</span>
                            </div>
                        </div>

                        {/* In-App Music Player (Floating & Sticky) */}
                        <div className="sticky top-0 z-20 flex flex-col items-center mb-4 pb-4 bg-gradient-to-b from-black via-black/95 to-transparent w-full">
                            <div className={`relative w-36 h-36 rounded-2xl overflow-hidden shadow-2xl ring-4 ${currentTeam === 'A' ? 'ring-green-500/40' : 'ring-purple-500/40'
                                } ${isPlaying ? 'animate-pulse' : ''}`}>
                                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 flex flex-col items-center justify-center p-2 text-center">
                                    <Music size={40} className={`text-white drop-shadow-lg ${isPlaying ? 'animate-bounce' : 'opacity-60'}`} />
                                    <span className="text-[11px] font-black text-gray-300 mt-2 uppercase tracking-wider">
                                        {isPlaying ? 'Reproduciendo...' : 'Pausado'}
                                    </span>
                                </div>
                            </div>

                            {/* Audio Progress Bar */}
                            <div className="w-full max-w-xs mt-3 flex items-center gap-3">
                                <button
                                    onClick={toggleAudio}
                                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90"
                                    title={isPlaying ? "Pausar" : "Reanudar"}
                                >
                                    {isPlaying ? <Pause size={16} /> : <Play size={16} className="fill-current" />}
                                </button>

                                <div className="flex-1 bg-white/10 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-200"
                                        style={{ width: `${audioProgress}%` }}
                                    />
                                </div>

                                <button
                                    onClick={replayAudio}
                                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90"
                                    title="Repetir audio"
                                >
                                    <RotateCcw size={14} />
                                </button>
                            </div>

                            <p className="text-gray-400 text-xs mt-2 font-medium">
                                ¿En qué posición de tu línea de tiempo va esta canción?
                            </p>
                        </div>

                        {/* Interactive Timeline Slots */}
                        <div className="flex-1 flex flex-col items-center space-y-3 pb-24 max-w-md mx-auto w-full">
                            {/* Slot 0 (Earliest) */}
                            {gameState === 'playing' && (
                                <button
                                    onClick={() => handleGuess(0)}
                                    className="w-full py-3.5 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 text-gray-300 hover:bg-white/10 hover:border-purple-400 hover:text-purple-300 transition-all font-bold text-xs active:scale-[0.98]"
                                >
                                    👆 Más antigua que {teams[currentTeam].timeline[0]?.name || 'todo'}
                                </button>
                            )}

                            {teams[currentTeam].timeline.map((track, i) => (
                                <div key={track.id + i} className="w-full flex flex-col space-y-3">
                                    {/* Timeline Card */}
                                    <div
                                        className="bg-zinc-900/80 p-3.5 rounded-2xl flex items-center gap-3.5 border border-white/10 hover:border-white/20 active:scale-[0.98] transition-all cursor-pointer group shadow-lg"
                                        onClick={() => setPreviewTrack(track)}
                                    >
                                        <div className="flex-shrink-0 w-14 h-14 bg-zinc-800 rounded-xl flex flex-col items-center justify-center border border-white/10 group-hover:border-purple-500/50">
                                            <Calendar size={14} className="text-gray-400 mb-0.5 group-hover:text-purple-400" />
                                            <span className="font-black text-base text-white">{track.year}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold truncate text-sm text-white">{track.name}</p>
                                            <p className="text-gray-400 text-xs truncate">{track.artist}</p>
                                        </div>
                                        <div className="p-2 rounded-lg bg-white/5 group-hover:bg-purple-500/20 text-gray-400 group-hover:text-purple-300 transition-colors">
                                            <Volume2 size={16} />
                                        </div>
                                    </div>

                                    {/* Slot After Card */}
                                    {gameState === 'playing' && (
                                        <button
                                            onClick={() => handleGuess(i + 1)}
                                            className="w-full py-3.5 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 text-gray-300 hover:bg-white/10 hover:border-purple-400 hover:text-purple-300 transition-all font-bold text-xs active:scale-[0.98]"
                                        >
                                            👇 {i === teams[currentTeam].timeline.length - 1
                                                ? 'Más reciente que todo'
                                                : `Entre ${track.year} y ${teams[currentTeam].timeline[i + 1]?.year}`
                                            }
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
