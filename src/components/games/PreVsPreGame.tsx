import { useState, useEffect } from 'react';
import { GameNavbar } from '../ui/GameNavbar';
import { IconCrown } from '../ui/SuitIcons';
import { Users, MapPin, Search, ArrowRight, Shield, Globe } from 'lucide-react';

interface PreVsPreGameProps {
    onExit: () => void;
}

interface RivalPre {
    id: string;
    name: string;
    score: number;
    trend: 'up' | 'stable';
    distance?: string;
    members?: string[];
    lat?: number;
    lng?: number;
}

type ViewMode = 'menu' | 'create' | 'join' | 'game';

export function PreVsPreGame({ onExit }: PreVsPreGameProps) {
    const [view, setView] = useState<ViewMode>('menu');

    // Create Group Form
    const [groupName, setGroupName] = useState('');
    const [peopleCount, setPeopleCount] = useState('');
    const [location, setLocation] = useState('');

    // Game State
    const [myScore, setMyScore] = useState(0);

    const INITIAL_RIVALS: RivalPre[] = [
        { id: '1', name: 'Pre de Mati', score: 12, trend: 'stable', distance: '1.2km', members: ['Mati', 'Sofi', 'Juan'], lat: -33.4045, lng: -70.5758 },
        { id: '2', name: 'Pre en Zapallar', score: 34, trend: 'up', distance: '150km', members: ['Agustín', 'Isidora', 'Clemente', 'Fran'], lat: -32.5516, lng: -71.4646 },
        { id: '3', name: 'Pre La Dehesa', score: 8, trend: 'stable', distance: '5km', members: ['Colo', 'Pipe'], lat: -33.3541, lng: -70.5204 },
        { id: '4', name: 'Pre Maipú', score: 45, trend: 'up', distance: '12km', members: ['Diego', 'Vale', 'Javi', 'Tomás', 'Benja'], lat: -33.5105, lng: -70.7523 },
    ];

    const [rivals, setRivals] = useState<RivalPre[]>(INITIAL_RIVALS);

    // Patch existing state if missing coords (Fixes HMR/Persistence issues)
    useEffect(() => {
        setRivals(currentRivals => {
            const needsUpdate = currentRivals.some(r => r.lat === undefined && parseInt(r.id) <= 4);
            if (needsUpdate) {
                return currentRivals.map(r => {
                    const fresh = INITIAL_RIVALS.find(i => i.id === r.id);
                    return fresh ? { ...r, lat: fresh.lat, lng: fresh.lng } : r;
                });
            }
            return currentRivals;
        });
    }, []);
    const [timeLeft, setTimeLeft] = useState(3600); // Seconds until next report
    const [alertActive, setAlertActive] = useState(false);

    // Persistence: Active Session
    useEffect(() => {
        const activeSession = localStorage.getItem('pre_active_session');
        if (activeSession) {
            try {
                const session = JSON.parse(activeSession);
                setGroupName(session.groupName);
                setPeopleCount(session.peopleCount);
                setLocation(session.location);
                setMyScore(session.myScore);
            } catch (e) {
                console.error("Failed to parse active session", e);
            }
        }
    }, []);

    // Save active session whenever critical state changes
    useEffect(() => {
        if (view === 'game') {
            const session = {
                groupName,
                peopleCount,
                location,
                myScore,
                timestamp: Date.now()
            };
            localStorage.setItem('pre_active_session', JSON.stringify(session));
        }
    }, [groupName, peopleCount, location, myScore, view]);

    // Simulate Rivals drinking independent of user (only in game)
    useEffect(() => {
        if (view !== 'game') return;
        const interval = setInterval(() => {
            setRivals(prev => prev.map(r => {
                if (Math.random() > 0.7) {
                    return { ...r, score: r.score + 1, trend: 'up' as const };
                }
                return { ...r, trend: 'stable' as const };
            }).sort((a, b) => b.score - a.score));
        }, 3000); // Update every 3 seconds for dynamic feel

        return () => clearInterval(interval);
    }, [view]);

    // Timer Logic
    useEffect(() => {
        if (view !== 'game') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setAlertActive(true);
                    return 3600; // Reset hour
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [view]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleDrink = () => {
        setMyScore(prev => prev + 1);
        if (navigator.vibrate) navigator.vibrate(50);
    };

    const getRank = () => {
        const allScores = [...rivals, { id: 'me', name: groupName || 'TU PREVIA', score: myScore, trend: 'stable' as const }].sort((a, b) => b.score - a.score);
        return allScores.findIndex(s => s.id === 'me') + 1;
    };

    const rank = getRank();

    // --- VIEWS ---

    // Geolocation
    const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);

    // Modal for Details
    const [selectedRival, setSelectedRival] = useState<RivalPre | null>(null);
    const closeRivalModal = () => setSelectedRival(null);

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert("Tu navegador no soporta geolocalización");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setCoords({ lat: latitude, lng: longitude });
                setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            },
            () => {
                alert("No pudimos obtener tu ubicación. Revisa los permisos.");
            }
        );
    };

    const openMap = (lat?: number, lng?: number, query?: string) => {
        // Robust check for coordinates
        if (typeof lat === 'number' && typeof lng === 'number') {
            window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
        } else if (query) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
        } else {
            alert("Ubicación no disponible para el mapa.");
        }
    };

    // --- VIEWS ---

    const renderMenu = () => {
        const hasActiveSession = !!localStorage.getItem('pre_active_session');

        return (
            <div className="flex flex-col items-center justify-center h-full p-6 space-y-8 animate-in fade-in">
                <div className="text-center">
                    <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/50">
                        <Globe size={48} className="text-white" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-2">Pre vs Pre</h2>
                    <p className="text-blue-200">Compite contra otras previas en tiempo real.</p>
                </div>

                <div className="w-full max-w-xs space-y-4">
                    {hasActiveSession && (
                        <button
                            onClick={() => {
                                const activeSession = localStorage.getItem('pre_active_session');
                                if (activeSession) {
                                    const session = JSON.parse(activeSession);
                                    setGroupName(session.groupName);
                                    setPeopleCount(session.peopleCount);
                                    setLocation(session.location);
                                    setMyScore(session.myScore);
                                    setView('game');
                                }
                            }}
                            className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-lg rounded-2xl shadow-blue-500/30 flex items-center justify-center gap-2 hover:scale-105 transition-transform animate-pulse"
                        >
                            <ArrowRight size={24} /> REANUDAR "{JSON.parse(localStorage.getItem('pre_active_session')!).groupName}"
                        </button>
                    )}

                    <button
                        onClick={() => setView('create')}
                        className="w-full py-4 bg-white text-blue-900 font-bold rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                    >
                        <Users size={20} /> Crear Nuevo Grupo
                    </button>

                    <button
                        onClick={() => setView('join')}
                        className="w-full py-4 bg-blue-900/50 border border-blue-500/30 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-900/80 transition-colors"
                    >
                        <Shield size={20} /> Ver Ranking / Retar
                    </button>
                </div>
            </div>
        );
    };

    // Saved Groups Persistence
    const [savedGroups, setSavedGroups] = useState<{ name: string, people: string, location: string }[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('pre_saved_groups');
        if (saved) {
            try {
                setSavedGroups(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse saved groups", e);
            }
        }
    }, []);

    const saveCurrentGroup = () => {
        const newItem = { name: groupName, people: peopleCount, location };
        // Check for duplicates based on name
        const filtered = savedGroups.filter(g => g.name !== groupName);
        const newList = [newItem, ...filtered].slice(0, 5); // Keep last 5
        setSavedGroups(newList);
        localStorage.setItem('pre_saved_groups', JSON.stringify(newList));
        setView('game');
    };

    const loadGroup = (g: { name: string, people: string, location: string }) => {
        setGroupName(g.name);
        setPeopleCount(g.people);
        setLocation(g.location);
    };

    const deleteGroup = (name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newList = savedGroups.filter(g => g.name !== name);
        setSavedGroups(newList);
        localStorage.setItem('pre_saved_groups', JSON.stringify(newList));
    };

    // --- VIEWS ---

    // ... (renderMenu remains same) ...

    const renderCreate = () => (
        <div className="flex flex-col h-full p-6 animate-in slide-in-from-right">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Users className="text-blue-400" /> Nuevo Grupo
            </h2>

            <div className="space-y-6 flex-1 overflow-y-auto">
                {/* Saved Groups List */}
                {savedGroups.length > 0 && (
                    <div className="mb-6">
                        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Tus Pres Guardadas</div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {savedGroups.map((g, i) => (
                                <div
                                    key={i}
                                    onClick={() => loadGroup(g)}
                                    className="flex-shrink-0 bg-slate-800 border border-slate-700 rounded-xl p-3 min-w-[120px] cursor-pointer hover:bg-slate-700 transition-colors relative group"
                                >
                                    <div className="font-bold text-white text-sm truncate max-w-[100px]">{g.name}</div>
                                    <div className="text-[10px] text-slate-400">{g.location}</div>
                                    <button
                                        onClick={(e) => deleteGroup(g.name, e)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <label className="text-xs text-blue-300 font-bold uppercase tracking-wider block mb-2">Nombre del Grupo</label>
                    <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Ej: Los Curados de la 234"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-blue-500 outline-none transition-colors"
                    />
                </div>

                <div>
                    <label className="text-xs text-blue-300 font-bold uppercase tracking-wider block mb-2">¿Cuántos son?</label>
                    <input
                        type="number"
                        value={peopleCount}
                        onChange={(e) => setPeopleCount(e.target.value)}
                        placeholder="Ej: 5"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-blue-500 outline-none transition-colors"
                    />
                </div>

                <div>
                    <label className="text-xs text-blue-300 font-bold uppercase tracking-wider block mb-2">¿Dónde están?</label>
                    <div className="flex gap-2">
                        <MapPin className="text-slate-500 mt-4" size={24} />
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Ej: Vitacura"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-blue-500 outline-none transition-colors"
                        />
                    </div>
                    <button
                        onClick={handleGetLocation}
                        className="mt-2 text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300"
                    >
                        <MapPin size={12} /> Usar mi ubicación actual
                    </button>
                </div>
            </div>

            <div className="flex gap-4 mt-4 pt-4 border-t border-slate-800">
                <button onClick={() => setView('menu')} className="flex-1 py-4 bg-slate-800 text-slate-400 font-bold rounded-xl">Cancelar</button>
                <button
                    onClick={saveCurrentGroup}
                    disabled={!groupName || !peopleCount || !location}
                    className="flex-[2] py-4 bg-blue-600 disabled:opacity-50 disabled:grayscale text-white font-bold rounded-xl shadow-lg hover:bg-blue-500 transition-colors"
                >
                    ¡Comenzar! 🚀
                </button>
            </div>
        </div>
    );

    const renderJoin = () => (
        <div className="flex flex-col h-full p-6 animate-in slide-in-from-right">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Shield className="text-blue-400" /> Retar Grupo
            </h2>
            <div className="relative mb-6">
                <Search className="absolute left-4 top-4 text-slate-500" />
                <input
                    type="text"
                    placeholder="Buscar ID o nombre..."
                    className="w-full bg-slate-900 pl-12 p-4 rounded-xl text-white border border-slate-700 focus:border-blue-500 outline-none"
                />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
                {rivals.map(rival => (
                    <div key={rival.id} className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center justify-between hover:bg-slate-800 transition-colors">
                        <div className="cursor-pointer" onClick={() => openMap(undefined, undefined, rival.distance && rival.distance.includes('km') ? undefined : rival.name)}>
                            {/* Heuristic: if distance is vague, maybe duplicate map search by name? Or just dummy link */}
                            <div className="font-bold text-white">{rival.name}</div>
                            <button
                                onClick={(e) => { e.stopPropagation(); openMap(undefined, undefined, rival.name); }}
                                className="text-xs text-blue-400 flex items-center gap-1 hover:underline"
                            >
                                <MapPin size={10} /> {rival.distance || 'Ver Mapa'}
                            </button>
                        </div>
                        <button onClick={() => setView('game')} className="px-4 py-2 bg-blue-600/20 text-blue-400 text-xs font-bold rounded-lg border border-blue-500/30">RETAR</button>
                    </div>
                ))}
            </div>

            <button onClick={() => setView('menu')} className="mt-4 w-full py-4 bg-slate-800 text-slate-400 font-bold rounded-xl">Volver</button>
        </div>
    );

    if (view === 'menu') return (
        <div className="h-full bg-slate-950 relative overflow-hidden flex flex-col">
            <GameNavbar onExit={onExit} title="Pre vs Pre (PvP)" />
            {renderMenu()}
        </div>
    );

    if (view === 'create') return (
        <div className="h-full bg-slate-950 relative overflow-hidden flex flex-col">
            <GameNavbar onExit={() => setView('menu')} title="Configurar" />
            {renderCreate()}
        </div>
    );

    if (view === 'join') return (
        <div className="h-full bg-slate-950 relative overflow-hidden flex flex-col">
            <GameNavbar onExit={() => setView('menu')} title="Buscar" />
            {renderJoin()}
        </div>
    );

    // GAME VIEW
    return (
        <div className="flex flex-col h-full bg-slate-950 px-4 py-6 pt-20 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />

            <GameNavbar onExit={onExit} title="Pre vs Pre (PvP) 🌎" />

            {/* Rival Details Modal */}
            {selectedRival && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={closeRivalModal}>
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button onClick={closeRivalModal} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>

                        <div className="text-center mb-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-black shadow-lg shadow-blue-500/30">
                                {selectedRival.name[0]}
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-1">{selectedRival.name}</h2>
                            <button
                                onClick={() => openMap(selectedRival.lat, selectedRival.lng, selectedRival.name)}
                                className="text-blue-400 text-sm font-medium flex items-center justify-center gap-1 hover:underline"
                            >
                                <MapPin size={14} /> {selectedRival.distance || 'Ubicación Desconocida'}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-800 p-4 rounded-2xl text-center">
                                <div className="text-xs text-slate-400 uppercase font-bold mb-1">Tragos</div>
                                <div className="text-3xl font-black text-white">{selectedRival.score}</div>
                            </div>
                            <div className="bg-slate-800 p-4 rounded-2xl text-center">
                                <div className="text-xs text-slate-400 uppercase font-bold mb-1">Ranking</div>
                                <div className="text-3xl font-black text-yellow-400">#{rank}</div>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 rounded-2xl p-4 mb-6">
                            <h3 className="text-xs text-slate-400 uppercase font-bold mb-3 flex items-center gap-2">
                                <Users size={12} /> Integrantes {selectedRival.members ? `(${selectedRival.members.length})` : ''}
                            </h3>
                            {selectedRival.members && selectedRival.members.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {selectedRival.members.map((member, i) => (
                                        <span key={i} className="px-3 py-1 bg-slate-700 text-slate-300 text-xs rounded-full font-medium">
                                            {member}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-500 text-sm italic">Información de integrantes oculta.</p>
                            )}
                        </div>

                        <button
                            onClick={closeRivalModal}
                            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {/* Alert Overlay */}
            {alertActive && (
                <div className="absolute inset-0 z-50 bg-red-600/90 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                    <h2 className="text-6xl font-black text-white text-center mb-4 uppercase tracking-tighter">¡HORA DE<br />REPORTAR!</h2>
                    <p className="text-2xl text-white font-bold mb-8">¿Cuántos se tomaron?</p>
                    <button
                        onClick={() => setAlertActive(false)}
                        className="px-10 py-5 bg-white text-red-600 font-black text-2xl rounded-full shadow-2xl active:scale-95 transition-transform"
                    >
                        LISTO ✅
                    </button>
                    <div className="absolute inset-0 border-[20px] border-red-400 animate-pulse pointer-events-none" />
                </div>
            )}

            {/* Score Header */}
            <div className="flex flex-col items-center justify-center mb-8 relative z-10">
                <div className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-2">{groupName || 'Tu Puntuación'}</div>
                <div className="text-8xl font-black text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] tabular-nums">
                    {myScore}
                </div>
                <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-white/10 rounded-full border border-white/10">
                    <span className={`w-2 h-2 rounded-full ${rank === 1 ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`} />
                    <span className="text-gray-300 text-xs font-bold uppercase">Ranking Global: #{rank}</span>
                </div>
                {location && <div className="text-[10px] text-gray-500 mt-2 flex items-center gap-1"><MapPin size={10} /> {location}</div>}
            </div>

            {/* Controls */}
            <div className="w-full max-w-sm mx-auto mb-8 z-10">
                <button
                    onClick={handleDrink}
                    className="w-full bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 active:scale-95 active:from-blue-600 active:to-blue-800 text-white p-6 rounded-3xl shadow-[0_10px_30px_rgba(37,99,235,0.4)] border-t border-white/20 transition-all group relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <span className="text-3xl font-black italic block">¡SUMAR TRAGO! 🍺</span>
                    <span className="text-blue-100 text-sm font-medium opacity-80 mt-1 block">Toca cada vez que alguien termine un vaso</span>
                </button>
            </div>

            {/* Leaderboard */}
            <div className="flex-1 w-full max-w-md mx-auto z-10 overflow-y-auto pr-1">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-gray-400 font-bold text-sm uppercase">Leaderboard en Vivo</h3>
                    <div className="text-xs font-mono text-gray-500 bg-black/30 px-2 py-1 rounded">
                        Siguiente reporte: <span className="text-white">{formatTime(timeLeft)}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-3 pb-20">
                    {[...rivals, { id: 'me', name: groupName || 'TU PREVIA (Uds)', score: myScore, trend: 'up' as const, distance: '📍' }]
                        .sort((a, b) => b.score - a.score)
                        .map((team, index) => (
                            <div
                                key={team.id}
                                onClick={() => setSelectedRival(team)}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer active:scale-95 ${team.id === 'me' ? 'bg-blue-600/20 border-blue-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 flex items-center justify-center font-black rounded-full ${index === 0 ? 'bg-yellow-400 text-black' : index === 1 ? 'bg-gray-400 text-black' : index === 2 ? 'bg-orange-700 text-white' : 'bg-white/10 text-gray-400'}`}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className={`font-bold ${team.id === 'me' ? 'text-white' : 'text-gray-300'}`}>{team.name}</p>
                                        <div className="flex items-center gap-2">
                                            {team.id === 'me' && <span className="text-[10px] text-blue-400 font-semibold tracking-wider">ESTAMOS AQUÍ</span>}
                                            {team.distance && <span className="text-[10px] text-gray-600">{team.distance}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-2xl font-black ${team.id === 'me' ? 'text-white' : 'text-gray-400'}`}>{team.score}</span>
                                    {team.id !== 'me' && team.score > 20 && <IconCrown className="w-4 h-4 text-yellow-500/50" />}
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {/* Disclaimer Footer */}
            <div className="text-center text-[10px] text-gray-600 mt-4 absolute bottom-2 w-full left-0 px-4 pointer-events-none">
                Conectado a servidor Latam-South (Ping: 104ms) • 12.4k Pres activas
            </div>
        </div>
    );
}
