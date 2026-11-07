import { useState, useEffect, useRef } from 'react';
import { useSpotify } from '../../context/SpotifyContext';
import {
    fetchPlaylistTracks,
    searchPlaylists,
    transferPlayback,
    getAvailableDevices,
    getUserPlaylists,
    openSpotifyApp,
    playTrack
} from '../../lib/spotify';
import {
    Play,
    Pause,
    Music,
    HelpCircle,
    CheckCircle,
    XCircle,
    Search,
    ListMusic,
    Calendar,
    Trophy,
    Users,
    Volume2,
    Mic2,
    AlertTriangle,
    RefreshCw,
    Smartphone,
    Monitor,
    Speaker,
    Flame,
    Zap,
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
    timeline: any[];
    color: string;
}

interface StealBet {
    challengerTeam: Team;
    targetTeam: Team;
    stolen: boolean | null;
}

export function HitsterGame({ onExit }: { onExit: () => void }) {
    const { token, player, deviceId, login, refreshTokenNow } = useSpotify();

    // Game lifecycle
    const [gameState, setGameState] = useState<
        'team-select' | 'playlist-select' | 'start' | 'turn-start' | 'playing' | 'revealed' | 'gameover'
    >('team-select');

    // Playlist & Tracks
    const [tracks, setTracks] = useState<any[]>([]);
    const [currentTrack, setCurrentTrack] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [myPlaylists, setMyPlaylists] = useState<any[]>([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);

    // Gameplay & Mechanics
    const [difficulty, setDifficulty] = useState<Difficulty>('normal');
    const [lastGuessCorrect, setLastGuessCorrect] = useState<boolean | null>(null);
    const [yearDiff, setYearDiff] = useState<number | null>(null);
    const [isExactYear, setIsExactYear] = useState(false);
    const [stealBet, setStealBet] = useState<StealBet | null>(null);
    const [bonusDrinks, setBonusDrinks] = useState(false);
    const [showTrackDetails, setShowTrackDetails] = useState(false);
    const [previewTrack, setPreviewTrack] = useState<any>(null);
    const [shake, setShake] = useState(false);

    // Audio & Device Management
    const [availableDevices, setAvailableDevices] = useState<any[]>([]);
    const [targetDeviceId, setTargetDeviceId] = useState<string | null>(null);
    const [playbackError, setPlaybackError] = useState<string | null>(null);
    const [isTransferring, setIsTransferring] = useState(false);
    const [isResuming, setIsResuming] = useState(false);

    // Teams
    const [teamCount, setTeamCount] = useState<number>(2);
    const [currentTeam, setCurrentTeam] = useState<Team>('A');
    const [teams, setTeams] = useState<Record<string, TeamState>>({
        A: { score: 0, timeline: [], color: 'bg-green-500' },
        B: { score: 0, timeline: [], color: 'bg-purple-500' }
    });

    // --- DEVICE MANAGEMENT & RECOVERY ---
    const fetchDevices = async (autoSelect = false) => {
        if (!token) return;
        try {
            const data = await getAvailableDevices(token);
            let rawDevices = data.devices || [];

            // Identify Web Player vs Native Apps
            const formattedDevices = rawDevices.map((d: any) => ({
                ...d,
                isWebPlayer: d.id === deviceId || d.name?.includes('234 Drinks')
            }));

            // If local web player is ready and not returned by API yet, add it
            if (deviceId && !formattedDevices.find((d: any) => d.id === deviceId)) {
                formattedDevices.push({
                    id: deviceId,
                    name: '🔊 Este Navegador (Web)',
                    type: 'Computer',
                    is_active: false,
                    isWebPlayer: true
                });
            }

            setAvailableDevices(formattedDevices);

            // Native external devices (e.g. Phone, PC Spotify App, Speaker)
            const nativeDevices = formattedDevices.filter((d: any) => !d.isWebPlayer);
            const activeNative = nativeDevices.find((d: any) => d.is_active);
            const activeAny = formattedDevices.find((d: any) => d.is_active);

            // PRIORITY ORDER FOR SELECTION:
            // 1. If user previously chose a device and it still exists, keep it!
            // 2. Active Native device (e.g. user currently listening in Spotify phone/PC app)
            // 3. First available Native device (user's real Spotify app)
            // 4. Any active device / first device
            if (autoSelect || !targetDeviceId) {
                if (activeNative) {
                    setTargetDeviceId(activeNative.id);
                } else if (nativeDevices.length > 0) {
                    setTargetDeviceId(nativeDevices[0].id);
                } else if (activeAny) {
                    setTargetDeviceId(activeAny.id);
                } else if (formattedDevices.length > 0) {
                    setTargetDeviceId(formattedDevices[0].id);
                }
            } else {
                const stillExists = formattedDevices.some((d: any) => d.id === targetDeviceId);
                if (!stillExists && formattedDevices.length > 0) {
                    setTargetDeviceId(activeNative?.id || nativeDevices[0]?.id || formattedDevices[0].id);
                }
            }
        } catch (e) {
            console.error("Error fetching devices", e);
        }
    };

    // Auto-poll devices in start, turn-start, and setup
    useEffect(() => {
        if (!token) return;
        fetchDevices(true);

        const interval = setInterval(() => {
            if (gameState === 'start' || gameState === 'turn-start') {
                fetchDevices(false);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [gameState, token, deviceId]);

    // Force Transfer Audio to target device
    const handleForceConnect = async (devId: string) => {
        if (!token) return;
        setIsTransferring(true);
        setPlaybackError(null);
        try {
            await transferPlayback(token, devId, false);
            setTargetDeviceId(devId);
            setTimeout(() => {
                fetchDevices(false);
                setIsTransferring(false);
            }, 800);
        } catch (e: any) {
            console.error("Force transfer error", e);
            setIsTransferring(false);
        }
    };

    // --- REPLAY / FORCE RESUME HELPER ---
    const replayCurrentTrack = async () => {
        if (!token || !currentTrack) return;
        setIsResuming(true);
        setPlaybackError(null);

        // Unlock web audio element if available
        if (player && typeof player.activateElement === 'function') {
            await player.activateElement().catch(() => {});
        }

        const devId = targetDeviceId || deviceId;
        const contextUri = selectedPlaylist?.uri || (selectedPlaylist?.id ? `spotify:playlist:${selectedPlaylist.id}` : undefined);

        try {
            const res = await playTrack(token, currentTrack.uri, devId || undefined, contextUri);
            if (!res.ok) {
                // Fallback direct play
                await playTrack(token, currentTrack.uri, devId || undefined);
            }
            setTimeout(() => setIsResuming(false), 500);
        } catch (e) {
            console.error("Replay error", e);
            setPlaybackError("No pudimos reproducir en Spotify. Abre la app de Spotify en tu celular o PC.");
            setIsResuming(false);
        }
    };

    // --- PLAYBACK CONTROL WITH RESILIENCE ---
    const playNextTrack = async () => {
        if (!token || tracks.length === 0) {
            console.error("Cannot play: missing token or tracks");
            return;
        }

        // Activate browser audio element if using Web Playback SDK
        if (player && typeof player.activateElement === 'function') {
            try {
                await player.activateElement();
            } catch (e) {
                console.warn("player.activateElement error:", e);
            }
        }

        setGameState('playing');
        setLastGuessCorrect(null);
        setYearDiff(null);
        setIsExactYear(false);
        setStealBet(null);
        setBonusDrinks(false);
        setPlaybackError(null);

        const nextTrack = tracks[0];
        setCurrentTrack(nextTrack);
        setTracks(prev => prev.slice(1));

        // Get fresh devices and prioritize user's real native Spotify app (iPhone, Mac/PC Spotify app)
        let devId = targetDeviceId;
        let activeDevice: any = null;
        try {
            const devData = await getAvailableDevices(token);
            const rawDevs = devData.devices || [];

            // Native external devices (e.g. Phone, PC/Mac Spotify App, Speaker) - excluding Web Player
            const nativeDevs = rawDevs.filter((d: any) => !d.name?.includes('234 Drinks') && d.id !== deviceId);
            const activeNative = nativeDevs.find((d: any) => d.is_active);
            activeDevice = rawDevs.find((d: any) => d.is_active);
            const targetStillPresent = rawDevs.find((d: any) => d.id === targetDeviceId);

            if (activeNative) {
                // If native Spotify App is active/playing, ALWAYS target it!
                devId = activeNative.id;
            } else if (targetStillPresent && !targetStillPresent.name?.includes('234 Drinks')) {
                // Target is an explicit native device
                devId = targetStillPresent.id;
            } else if (nativeDevs.length > 0) {
                // Preferred native device
                devId = nativeDevs[0].id;
            } else if (activeDevice) {
                devId = activeDevice.id;
            } else if (targetStillPresent) {
                devId = targetStillPresent.id;
            } else if (rawDevs.length > 0) {
                devId = rawDevs[0].id;
            }

            if (devId) setTargetDeviceId(devId);
        } catch (e) {
            console.warn("Could not refresh devices", e);
        }

        if (!devId) {
            setPlaybackError("No hay ningún dispositivo Spotify conectado. Abre la App de Spotify en tu teléfono o PC y dale Play.");
            return;
        }

        // If target device is not currently active, transfer playback to it first so it wakes up
        if (activeDevice && activeDevice.id !== devId) {
            try {
                await transferPlayback(token, devId, false);
                await new Promise(r => setTimeout(r, 400));
            } catch (e) { }
        }

        const contextUri = selectedPlaylist?.uri || (selectedPlaylist?.id ? `spotify:playlist:${selectedPlaylist.id}` : undefined);

        // Attempt 1: Play with Context + Offset (Native Spotify handles this with 100% reliability)
        try {
            console.log(`Spotify: Playing "${nextTrack.name}" (${nextTrack.uri}) on device ${devId} with context ${contextUri}`);
            const response = await playTrack(token, nextTrack.uri, devId, contextUri);

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                const msg = err.error?.message || response.statusText;

                if (response.status === 403) {
                    setPlaybackError("⚠️ Spotify requiere suscripción Premium para controlar la reproducción de forma remota.");
                    return;
                }

                if (response.status === 401) {
                    await refreshTokenNow();
                }

                throw new Error(msg);
            }

        } catch (e) {
            console.warn("First play attempt failed, transferring and retrying...", e);
            // Attempt 2: Transfer and Retry with direct uris
            try {
                await transferPlayback(token, devId, false);
                await new Promise(r => setTimeout(r, 600));

                const retryRes = await playTrack(token, nextTrack.uri, devId);

                if (!retryRes.ok) {
                    const err = await retryRes.json().catch(() => ({}));
                    if (retryRes.status === 403) {
                        setPlaybackError("⚠️ Spotify Premium requerido para reproducir en este dispositivo.");
                    } else {
                        setPlaybackError("Spotify no respondió a tiempo. Abre tu App de Spotify y dale Play a cualquier tema para reactivar Connect.");
                    }
                }
            } catch (retryErr) {
                console.error("Retry playback failed", retryErr);
                setPlaybackError("Dispositivo desconectado. Pulsa 'Abrir Spotify' para despertarlo.");
            }
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

    // --- PLAYLIST LOADING & SEARCH ---
    useEffect(() => {
        if (!token) return;

        const loadMyPlaylists = async () => {
            try {
                const data = await getUserPlaylists(token);
                if (data.items) {
                    setMyPlaylists(data.items);
                    setSearchResults(data.items);
                }
            } catch (e) {
                console.error("Error loading user playlists", e);
            }
        };

        loadMyPlaylists();
    }, [token]);

    useEffect(() => {
        if (!token) return;

        const performSearch = async () => {
            const q = searchQuery.trim();
            if (!q) {
                setSearchResults(myPlaylists || []);
                return;
            }

            setIsSearching(true);
            try {
                let globalResults: any[] = [];
                const globalData = await searchPlaylists(token, q);
                if (globalData?.playlists?.items) {
                    globalResults = globalData.playlists.items.filter((item: any) => item !== null);
                }

                let localMatches: any[] = [];
                if (myPlaylists.length > 0) {
                    localMatches = myPlaylists.filter(p =>
                        p.name.toLowerCase().includes(q.toLowerCase())
                    );
                }

                const uniqueResults = new Map();
                localMatches.forEach(p => uniqueResults.set(p.id, p));
                globalResults.forEach(p => uniqueResults.set(p.id, p));

                setSearchResults(Array.from(uniqueResults.values()));
            } catch (e) {
                console.error("Search failed", e);
            } finally {
                setIsSearching(false);
            }
        };

        const debounce = setTimeout(performSearch, 500);
        return () => clearTimeout(debounce);
    }, [searchQuery, token, myPlaylists]);

    const handlePlaylistSelect = async (playlist: any) => {
        setLoading(true);
        setSelectedPlaylist(playlist);
        const data = await fetchPlaylistTracks(token!, playlist.id);

        if (data.items && data.items.length > 0) {
            const shuffled = data.items
                .map((item: any) => item.track)
                .filter((t: any) => t && t.uri && t.album && t.album.release_date && t.is_playable !== false)
                .sort(() => Math.random() - 0.5);

            setTracks(shuffled);

            // Setup Initial Timelines for active teams
            if (shuffled.length >= teamCount) {
                const newTeams = { ...teams };
                Object.keys(newTeams).forEach((teamId, index) => {
                    newTeams[teamId as Team].timeline = [shuffled[index]];
                    newTeams[teamId as Team].score = 0;
                });
                setTeams(newTeams);
                setTracks(prev => prev.slice(teamCount));
            } else {
                const base = shuffled[0] || null;
                const newTeams = { ...teams };
                Object.keys(newTeams).forEach((teamId) => {
                    newTeams[teamId as Team].timeline = base ? [base] : [];
                });
                setTeams(newTeams);
                setTracks(prev => prev.slice(1));
            }

            setGameState('start');
        } else {
            alert('Esta playlist no tiene canciones válidas o disponibles.');
            setSelectedPlaylist(null);
        }
        setLoading(false);
    };

    const startGame = () => {
        // Do not interrupt or pause Spotify playback here.
        // Let background music keep playing until the first team hits "PLAY ▶️".
        setGameState('turn-start');
    };

    // --- GUESSING LOGIC WITH B.2 DIFFICULTY & B.3 PARTY MECHANICS ---
    const handleGuess = (index: number) => {
        if (!currentTrack) return;

        const currentYear = parseInt(currentTrack.album.release_date.split('-')[0]);
        const activeTimeline = teams[currentTeam].timeline;

        // Check timeline neighbors
        let isOrderCorrect = true;
        let closestNeighborYear = currentYear;

        if (index > 0) {
            const prevYear = parseInt(activeTimeline[index - 1].album.release_date.split('-')[0]);
            closestNeighborYear = prevYear;
            if (currentYear < prevYear) isOrderCorrect = false;
        }

        if (index < activeTimeline.length) {
            const nextYear = parseInt(activeTimeline[index].album.release_date.split('-')[0]);
            closestNeighborYear = nextYear;
            if (currentYear > nextYear) isOrderCorrect = false;
        }

        const calculatedDiff = Math.abs(currentYear - closestNeighborYear);
        setYearDiff(calculatedDiff);

        // Check if exact match with neighbor or precise hit
        const exactHit = (index > 0 && currentYear === parseInt(activeTimeline[index - 1].album.release_date.split('-')[0])) ||
            (index < activeTimeline.length && currentYear === parseInt(activeTimeline[index].album.release_date.split('-')[0])) ||
            calculatedDiff === 0;

        setIsExactYear(exactHit);

        // Apply Difficulty rules (B.2)
        let finalCorrect = isOrderCorrect;

        if (difficulty === 'easy') {
            // Easy Mode: forgiving if in same decade or +/- 3 years
            const sameDecade = Math.floor(currentYear / 10) === Math.floor(closestNeighborYear / 10);
            if (isOrderCorrect || calculatedDiff <= 3 || sameDecade) {
                finalCorrect = true;
            }
        } else if (difficulty === 'hard') {
            // Hard Mode: Must be chronologically correct AND within 1 year
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
            // Challenger was RIGHT! The original team failed!
            // Challenger steals the track into their timeline
            const challengerTimeline = [...teams[challenger].timeline];
            const currentYear = parseInt(currentTrack.album.release_date.split('-')[0]);

            // Insert sorted into challenger timeline
            let insertIdx = challengerTimeline.findIndex(t => parseInt(t.album.release_date.split('-')[0]) > currentYear);
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
            // Challenger was WRONG! Original team was right, challenger takes penalty!
            setStealBet({
                challengerTeam: challenger,
                targetTeam: currentTeam,
                stolen: false
            });
        }
    };

    const nextTurn = () => {
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

    const getDeviceIcon = (type: string) => {
        if (type?.toLowerCase() === 'smartphone') return <Smartphone size={20} />;
        if (type?.toLowerCase() === 'computer') return <Monitor size={20} />;
        return <Speaker size={20} />;
    };

    // --- RENDER HELPERS ---

    // 1. Team Select Screen
    const renderTeamSelect = () => (
        <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-8 animate-in fade-in">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#1DB954] to-emerald-400 flex items-center justify-center shadow-2xl shadow-green-500/30">
                <Music size={40} className="text-black" />
            </div>
            <div>
                <h2 className="text-4xl font-extrabold text-white mb-2">Hitster Drinks 🎧</h2>
                <p className="text-gray-400 max-w-xs text-sm">
                    Adivina el año, ordena las canciones en tu línea de tiempo y manda tragos a tus rivales.
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
                            flex flex-col items-center justify-center gap-1 shadow-2xl border border-white/10
                        `}
                    >
                        <span>{num}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Equipos</span>
                    </button>
                ))}
            </div>
        </div>
    );

    // 2. Login Screen
    const renderLogin = () => (
        <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-6 animate-in fade-in">
            <div className="w-24 h-24 bg-[#1DB954] rounded-full flex items-center justify-center shadow-2xl shadow-green-500/40 animate-pulse">
                <Music size={48} className="text-black" />
            </div>
            <h2 className="text-3xl font-extrabold text-white">Conecta tu Spotify</h2>
            <p className="text-gray-400 max-w-sm text-sm">
                Inicia sesión para sincronizar la música con tus playlists o cualquier canción de Spotify.
            </p>
            <button
                onClick={() => login('hitster')}
                className="px-8 py-4 bg-[#1DB954] text-black font-extrabold rounded-full text-xl hover:scale-105 transition-all shadow-xl shadow-green-500/25 active:scale-95"
            >
                Conectar Spotify 🟢
            </button>
            <p className="text-[11px] text-gray-500 max-w-xs">
                💡 Funciona con la app de Spotify en tu celular o PC.
            </p>
        </div>
    );

    // 3. Playlist Select Screen
    const renderPlaylistSelect = () => (
        <div className="flex flex-col h-full p-6 animate-in fade-in">
            <h2 className="text-3xl font-black mb-4 text-center">Elige tu Música 🎵</h2>

            <div className="relative mb-4">
                <Search className="absolute left-4 top-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar playlists, géneros o artistas..."
                    className="w-full bg-zinc-900 text-white pl-12 pr-4 py-3.5 rounded-2xl border border-white/10 focus:border-green-500 focus:outline-none text-base"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Quick Party Genres */}
            <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar mb-2">
                {['Mis Listas', 'Reggaeton Viejo', 'Cumbia Fiesta', 'Rock 80s 90s', 'Hits 2000s', 'Floripa Verano'].map(tag => (
                    <button
                        key={tag}
                        onClick={() => setSearchQuery(tag === 'Mis Listas' ? '' : tag)}
                        className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold whitespace-nowrap border border-white/5 transition-colors"
                    >
                        {tag}
                    </button>
                ))}
            </div>

            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 flex justify-between items-center">
                {searchQuery ? 'Resultados de Búsqueda' : 'Tus Playlists Guardadas'}
                {isSearching && <span className="text-green-500 animate-pulse text-xs">Buscando...</span>}
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
                {searchResults.map(playlist => {
                    const imageUrl = playlist.images && playlist.images.length > 0
                        ? playlist.images[0].url
                        : 'https://placehold.co/64x64/22c55e/ffffff?text=🎵';

                    return (
                        <button
                            key={playlist.id}
                            onClick={() => handlePlaylistSelect(playlist)}
                            className="w-full bg-zinc-900/60 p-3.5 rounded-2xl flex items-center gap-4 hover:bg-zinc-800 border border-white/5 hover:border-white/20 transition-all text-left group active:scale-[0.98]"
                        >
                            <img src={imageUrl} className="w-14 h-14 rounded-xl shadow-md group-hover:scale-105 transition-transform object-cover bg-zinc-800 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold truncate text-base text-white">{playlist.name}</h3>
                                <p className="text-gray-400 text-xs">{playlist.tracks?.total || 0} canciones</p>
                            </div>
                            <ListMusic className="text-gray-500 group-hover:text-green-400 flex-shrink-0" size={20} />
                        </button>
                    );
                })}
            </div>
        </div>
    );

    // 4. Device Selector Component
    const renderDeviceSelector = () => (
        <div className="w-full max-w-sm bg-zinc-900/90 p-4 rounded-2xl backdrop-blur-md border border-white/10 mt-2">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Speaker size={14} className="text-green-400" /> Dispositivo de Audio:
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={openSpotifyApp}
                        className="text-[11px] px-2.5 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 font-bold rounded-lg border border-green-500/30 flex items-center gap-1 transition-all"
                        title="Abrir app nativa de Spotify para despertarla"
                    >
                        <Play size={10} className="fill-current" /> Abrir Spotify
                    </button>
                    <button
                        onClick={() => fetchDevices(true)}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                        title="Actualizar lista de dispositivos"
                    >
                        <RefreshCw size={14} className={`text-gray-400 ${isTransferring ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="space-y-2 max-h-44 overflow-y-auto no-scrollbar">
                {availableDevices.map(device => {
                    const isSelected = targetDeviceId === device.id;
                    return (
                        <button
                            key={device.id}
                            onClick={() => handleForceConnect(device.id)}
                            className={`w-full p-2.5 rounded-xl flex items-center gap-3 transition-all ${isSelected
                                ? 'bg-green-600 text-white ring-2 ring-green-400 shadow-lg'
                                : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                                }`}
                        >
                            {getDeviceIcon(device.type)}
                            <div className="flex-1 text-left min-w-0">
                                <div className="font-bold text-xs truncate flex items-center gap-1.5">
                                    <span>{device.name}</span>
                                    {device.is_active && (
                                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                                    )}
                                </div>
                                <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5">
                                    {device.is_active ? (
                                        <span className="text-green-200 font-bold uppercase tracking-wider text-[9px]">Sonando ahora 🟢</span>
                                    ) : (
                                        <span>Conectado</span>
                                    )}
                                    {!device.isWebPlayer ? (
                                        <span className="bg-white/15 px-1.5 py-0.5 rounded text-[9px] font-semibold text-white">App Spotify 📱/💻</span>
                                    ) : (
                                        <span className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] text-gray-400">Web</span>
                                    )}
                                </div>
                            </div>
                            {isSelected && <Check size={16} className="text-white flex-shrink-0" />}
                        </button>
                    );
                })}

                {availableDevices.length === 0 && (
                    <div className="flex flex-col items-center py-3 text-gray-400 gap-1.5 text-center">
                        <AlertTriangle size={20} className="text-amber-400" />
                        <p className="text-xs">
                            No se detecta ningún dispositivo activo.<br />
                            <span className="text-[10px] text-gray-500">Abre Spotify en tu cel/PC y dale Play 1 seg.</span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );

    // 5. Difficulty Selector Component (B.2)
    const renderDifficultySelector = () => (
        <div className="w-full max-w-sm mt-3">
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
                        className={`p-2 rounded-2xl border text-center transition-all ${difficulty === d.id
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
    );

    // 6. Feedback Overlay with Steal & Drink Penalties (B.3)
    const renderFeedbackOverlay = () => {
        if (gameState !== 'revealed') return null;

        const isCorrect = lastGuessCorrect === true;
        const releaseYear = currentTrack?.album?.release_date ? parseInt(currentTrack.album.release_date.split('-')[0]) : 0;
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
                                    Le erraron por más de {yearDiff} años. ¡Imperdonable!
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
                                            src={currentTrack?.album?.images[0]?.url}
                                            className="w-full h-full object-cover"
                                            alt="Album Art"
                                        />
                                    </div>
                                    <h3 className="text-lg font-bold text-white leading-tight px-4 truncate max-w-xs">{currentTrack?.name}</h3>
                                    <p className="text-gray-400 text-xs mb-3">{currentTrack?.artists?.[0]?.name}</p>
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

                        {/* Bonus Sing-Along (Cantar el Coro) */}
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

    // 7. Preview Zoom Modal
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
                            src={previewTrack.album?.images[0]?.url}
                            className="w-full h-full object-cover"
                            alt="Album Art"
                        />
                    </div>
                    <h2 className="text-xl font-black text-white leading-tight mb-1">{previewTrack.name}</h2>
                    <p className="text-sm text-green-400 font-bold mb-4">{previewTrack.artists?.[0]?.name}</p>
                    <div className="bg-white/5 px-6 py-2 rounded-full border border-white/10 mb-6">
                        <span className="text-xs text-gray-400 uppercase font-bold mr-2">Año:</span>
                        <span className="text-2xl font-black text-white">{previewTrack.album?.release_date?.split('-')[0]}</span>
                    </div>
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
            <div className="p-4 flex justify-between items-center bg-gradient-to-b from-green-950/60 to-transparent flex-shrink-0 z-10 border-b border-white/5">
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

                {!token ? (
                    renderLogin()
                ) : gameState === 'team-select' ? (
                    renderTeamSelect()
                ) : gameState === 'playlist-select' ? (
                    renderPlaylistSelect()
                ) : gameState === 'start' ? (
                    /* START / CONFIG SCREEN */
                    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in no-scrollbar">
                        <img
                            src={selectedPlaylist?.images?.[0]?.url}
                            className="w-36 h-36 rounded-2xl shadow-2xl shadow-green-500/20 object-cover ring-2 ring-white/10"
                        />
                        <div>
                            <h2 className="text-2xl font-black text-white leading-tight">{selectedPlaylist?.name}</h2>
                            <p className="text-gray-400 text-xs mt-1">{teamCount} Equipos Listos</p>
                        </div>

                        {/* Difficulty Selector (B.2) */}
                        {renderDifficultySelector()}

                        {/* Device Selector */}
                        {renderDeviceSelector()}

                        <button
                            onClick={startGame}
                            className="w-full max-w-sm py-4 bg-[#1DB954] text-black font-black rounded-2xl text-lg shadow-xl hover:scale-105 active:scale-95 transition-all mt-2"
                        >
                            Empezar Partida ▶️
                        </button>
                    </div>
                ) : gameState === 'turn-start' ? (
                    /* TURN START SCREEN */
                    <div className={`flex flex-col items-center justify-center h-full text-center p-6 space-y-6 animate-in zoom-in duration-300 ${currentTeam === 'A' ? 'bg-green-950/20' : 'bg-purple-950/20'
                        }`}>
                        <div className={`w-28 h-28 rounded-3xl flex items-center justify-center shadow-2xl ${currentTeam === 'A' ? 'bg-green-500 text-black shadow-green-500/50' : 'bg-purple-600 text-white shadow-purple-500/50'
                            }`}>
                            <span className="text-5xl font-black">{currentTeam}</span>
                        </div>

                        <div>
                            <h2 className="text-4xl font-black text-white">Turno Equipo {currentTeam}</h2>
                            <p className="text-gray-300 text-sm max-w-xs mt-1">
                                Escuchen con atención. ¡Si fallan, pagan con tragos!
                            </p>
                        </div>

                        {/* Device / Audio Status Bar */}
                        <div className="bg-zinc-900/80 p-3 rounded-2xl flex flex-col items-center gap-2 border border-white/10 max-w-xs w-full">
                            <div className="flex items-center justify-between w-full text-xs">
                                <span className="text-gray-400 flex items-center gap-1">
                                    <Speaker size={14} /> Reproduciendo en:
                                </span>
                                <span className="font-bold text-green-400 truncate max-w-[140px]">
                                    {availableDevices.find(d => d.id === targetDeviceId)?.name || 'Dispositivo Spotify'}
                                </span>
                            </div>

                            <div className="flex gap-2 w-full pt-1">
                                <button
                                    onClick={openSpotifyApp}
                                    className="flex-1 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg text-xs font-bold border border-green-500/30 flex items-center justify-center gap-1 transition-all"
                                >
                                    <Play size={12} className="fill-current" /> Abrir Spotify
                                </button>
                                <button
                                    onClick={() => fetchDevices(true)}
                                    className="py-1.5 px-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-bold border border-white/10 flex items-center justify-center gap-1 transition-all"
                                >
                                    <RefreshCw size={12} /> Re-conectar
                                </button>
                            </div>
                        </div>

                        {playbackError && (
                            <div className="bg-amber-950/40 border border-amber-500/40 p-3 rounded-xl text-amber-200 text-xs max-w-xs">
                                {playbackError}
                            </div>
                        )}

                        <button
                            onClick={playNextTrack}
                            className="px-12 py-5 bg-white text-black font-black rounded-full text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all"
                        >
                            PLAY ▶️
                        </button>
                    </div>
                ) : (
                    /* GAME BOARD (TIMELINE) */
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

                        {/* Audio fallback warning if error */}
                        {playbackError && (
                            <div className="mb-3 p-3 bg-amber-950/60 border border-amber-500/50 rounded-xl text-amber-200 text-xs flex items-center justify-between">
                                <span className="truncate pr-2">{playbackError}</span>
                                <button
                                    onClick={openSpotifyApp}
                                    className="flex-shrink-0 px-2 py-1 bg-amber-500 text-black font-bold rounded-lg text-[10px]"
                                >
                                    Abrir Spotify
                                </button>
                            </div>
                        )}

                        {/* Now Playing Card (Sticky Top) */}
                        <div className="sticky top-0 z-20 flex flex-col items-center mb-4 pb-4 bg-gradient-to-b from-black via-black/95 to-transparent w-full">
                            <div className={`relative w-36 h-36 rounded-2xl overflow-hidden shadow-2xl ring-4 ${currentTeam === 'A' ? 'ring-green-500/40' : 'ring-purple-500/40'
                                } ${gameState === 'playing' ? 'animate-pulse' : ''}`}>
                                <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center">
                                    <HelpCircle size={44} className="text-white drop-shadow-lg animate-bounce" />
                                    <span className="text-xs font-bold text-gray-300 mt-2 uppercase tracking-wider">Adivina el Año</span>
                                </div>
                            </div>
                            <p className="text-gray-400 text-xs mt-2 font-medium">
                                Escuchando pista... ¿En qué posición de tu línea de tiempo va?
                            </p>

                            <div className="flex items-center gap-2 mt-2.5">
                                <button
                                    onClick={replayCurrentTrack}
                                    disabled={isResuming}
                                    className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 font-bold text-xs rounded-xl border border-green-500/30 flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                                    title="Volver a enviar señal de reproducción a Spotify"
                                >
                                    <Volume2 size={13} className={isResuming ? 'animate-spin' : ''} />
                                    <span>{isResuming ? 'Reconectando...' : '¿No suena? Forzar Play ▶️'}</span>
                                </button>
                                <button
                                    onClick={openSpotifyApp}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs rounded-xl border border-white/10 flex items-center gap-1 transition-all"
                                >
                                    Abrir App
                                </button>
                            </div>
                        </div>

                        {/* Interactive Timeline Slots */}
                        <div className="flex-1 flex flex-col items-center space-y-3 pb-24 max-w-md mx-auto w-full">
                            {/* Slot 0 (Earliest) */}
                            {gameState === 'playing' && (
                                <button
                                    onClick={() => handleGuess(0)}
                                    className="w-full py-3.5 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 text-gray-300 hover:bg-white/10 hover:border-green-400 hover:text-green-400 transition-all font-bold text-xs active:scale-[0.98]"
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
                                        <div className="flex-shrink-0 w-14 h-14 bg-zinc-800 rounded-xl flex flex-col items-center justify-center border border-white/10 group-hover:border-green-500/50">
                                            <Calendar size={14} className="text-gray-400 mb-0.5 group-hover:text-green-400" />
                                            <span className="font-black text-base text-white">{track.album?.release_date?.split('-')[0]}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold truncate text-sm text-white">{track.name}</p>
                                            <p className="text-gray-400 text-xs truncate">{track.artists?.[0]?.name}</p>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Search size={16} className="text-green-400" />
                                        </div>
                                    </div>

                                    {/* Slot After Card */}
                                    {gameState === 'playing' && (
                                        <button
                                            onClick={() => handleGuess(i + 1)}
                                            className="w-full py-3.5 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 text-gray-300 hover:bg-white/10 hover:border-green-400 hover:text-green-400 transition-all font-bold text-xs active:scale-[0.98]"
                                        >
                                            👇 {i === teams[currentTeam].timeline.length - 1
                                                ? 'Más reciente que todo'
                                                : `Entre ${track.album?.release_date?.split('-')[0]} y ${teams[currentTeam].timeline[i + 1]?.album?.release_date?.split('-')[0]}`
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
