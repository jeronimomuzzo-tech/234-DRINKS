import { useState, useEffect, useRef } from 'react';
import { GameNavbar } from '../ui/GameNavbar';
import { IconCrown } from '../ui/SuitIcons';
import {
    Users,
    MapPin,
    Search,
    ArrowRight,
    Shield,
    Globe,
    Bell,
    BellRing,
    BellOff,
    Volume2,
    Flame,
    Zap,
    Trophy,
    Swords,
    Share2,
    Copy,
    Check,
    Clock,
    Plus,
    Trash2,
    Sparkles,
    MessageCircle,
    AlertCircle,
    X,
    RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
    isNotificationSupported,
    getNotificationPermission,
    requestNotificationPermission,
    sendPreNotification,
    playPartyAlertSound
} from '../../lib/notifications';

interface PreVsPreGameProps {
    onExit: () => void;
}

interface RivalPre {
    id: string;
    name: string;
    score: number;
    peopleCount: number;
    trend: 'up' | 'stable';
    location: string;
    distance?: string;
    members?: string[];
    drinkType?: string;
    lat?: number;
    lng?: number;
}

interface PreHistoryItem {
    id: string;
    timestamp: string;
    type: 'drink' | 'duel_win' | 'duel_loss' | 'report' | 'lightning' | 'rank_up';
    text: string;
    points?: number;
}

interface ActiveDuel {
    id: string;
    rivalId: string;
    rivalName: string;
    type: 'fondo_blanco' | 'baile' | 'guerra_vasos' | 'capitan';
    title: string;
    description: string;
    rewardPoints: number;
    timeLeft: number;
    isChallenger: boolean;
}

type ViewMode = 'menu' | 'create' | 'join' | 'game';

const FUNNY_GROUP_NAMES = [
    'Los de Vitacura 🥃',
    'Casa de Pipe 🔥',
    'Previa en Zapallar 🌊',
    'Tequileros FC 🌵',
    'Piscola Lovers 🍷',
    'Los Sin Hígado 💀',
    'Pre Maipú Prendida ⚡',
    'La Dehesa VIP 👑',
    'Sed Insaciable 🍻',
    'Floripa de Carretera 🌴'
];

const CHILE_LOCATIONS = [
    'Vitacura',
    'Las Condes',
    'Providencia',
    'La Dehesa',
    'Ñuñoa',
    'Zapallar',
    'Maitencillo',
    'Viña del Mar',
    'Santiago Centro',
    'Chicureo',
    'Maipú',
    'Reñaca'
];

const DRINK_OPTIONS = [
    { id: 'piscola', name: 'Piscola 🥃', color: 'from-amber-600 to-amber-900' },
    { id: 'cerveza', name: 'Cerveza 🍺', color: 'from-yellow-500 to-amber-600' },
    { id: 'gin', name: 'Gin Tonic 🍸', color: 'from-teal-500 to-cyan-700' },
    { id: 'tequila', name: 'Tequila 🌵', color: 'from-orange-500 to-red-600' },
    { id: 'vodka', name: 'Vodka 🧊', color: 'from-blue-400 to-indigo-600' }
];

export function PreVsPreGame({ onExit }: PreVsPreGameProps) {
    const [view, setView] = useState<ViewMode>('menu');

    // Group Config Form
    const [groupName, setGroupName] = useState('');
    const [peopleCount, setPeopleCount] = useState<number>(4);
    const [members, setMembers] = useState<string[]>(['Mati', 'Sofi', 'Juan', 'Yo']);
    const [newMemberName, setNewMemberName] = useState('');
    const [location, setLocation] = useState('Vitacura');
    const [selectedDrink, setSelectedDrink] = useState('Piscola 🥃');
    const [roomCode, setRoomCode] = useState('PRE-' + Math.floor(1000 + Math.random() * 9000));

    // Game Core State
    const [myScore, setMyScore] = useState(0);
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'history' | 'group'>('leaderboard');
    const [history, setHistory] = useState<PreHistoryItem[]>([]);

    // Duel State
    const [activeDuel, setActiveDuel] = useState<ActiveDuel | null>(null);
    const [selectedRivalForDuel, setSelectedRivalForDuel] = useState<RivalPre | null>(null);

    // Lightning Round (Ronda Relámpago)
    const [lightningActive, setLightningActive] = useState(false);
    const [lightningTime, setLightningTime] = useState(180); // 3 mins

    // Notification State
    const [notifPermission, setNotifPermission] = useState<NotificationPermission>(getNotificationPermission());
    const [inAppToast, setInAppToast] = useState<{ title: string; body: string } | null>(null);

    // Hourly Report Timer
    const [reportTimer, setReportTimer] = useState(2400); // 40 mins
    const [reportModalActive, setReportModalActive] = useState(false);

    // Rivals List
    const [rivals, setRivals] = useState<RivalPre[]>([
        { id: '1', name: 'Pre de Mati', score: 18, peopleCount: 5, trend: 'stable', location: 'Las Condes', distance: '1.2km', members: ['Mati', 'Sofi', 'Juan', 'Nico', 'Vale'], drinkType: 'Piscola 🥃', lat: -33.4045, lng: -70.5758 },
        { id: '2', name: 'Pre en Zapallar', score: 38, peopleCount: 8, trend: 'up', location: 'Zapallar', distance: '150km', members: ['Agustín', 'Isidora', 'Clemente', 'Fran', 'Basti'], drinkType: 'Cerveza 🍺', lat: -32.5516, lng: -71.4646 },
        { id: '3', name: 'Pre La Dehesa', score: 14, peopleCount: 3, trend: 'stable', location: 'La Dehesa', distance: '5km', members: ['Colo', 'Pipe', 'Cata'], drinkType: 'Gin Tonic 🍸', lat: -33.3541, lng: -70.5204 },
        { id: '4', name: 'Pre Maipú Prendida', score: 42, peopleCount: 6, trend: 'up', location: 'Maipú', distance: '12km', members: ['Diego', 'Vale', 'Javi', 'Tomás', 'Benja', 'Caro'], drinkType: 'Tequila 🌵', lat: -33.5105, lng: -70.7523 },
    ]);

    // Modal Details for a Rival
    const [selectedRival, setSelectedRival] = useState<RivalPre | null>(null);
    const [copiedRoomCode, setCopiedRoomCode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [duelWhatsAppPrompt, setDuelWhatsAppPrompt] = useState<{ rivalName: string; title: string } | null>(null);

    // --- HELPER: In-App Toast & Audio ---
    const showNotice = (title: string, body: string) => {
        setInAppToast({ title, body });
        setTimeout(() => setInAppToast(null), 4500);
        sendPreNotification({ title, body, tag: 'pre-notice' });
    };

    // --- PERSISTENCE: Restore Active Session ---
    useEffect(() => {
        const activeSession = localStorage.getItem('pre_active_session');
        if (activeSession) {
            try {
                const session = JSON.parse(activeSession);
                setGroupName(session.groupName || '');
                setPeopleCount(session.peopleCount || 4);
                setMembers(session.members || ['Mati', 'Sofi', 'Juan', 'Yo']);
                setLocation(session.location || 'Vitacura');
                setSelectedDrink(session.selectedDrink || 'Piscola 🥃');
                setRoomCode(session.roomCode || ('PRE-' + Math.floor(1000 + Math.random() * 9000)));
                setMyScore(session.myScore || 0);
                if (session.history) setHistory(session.history);
            } catch (e) {
                console.error("Failed to parse active session", e);
            }
        }
    }, []);

    // Save active session
    useEffect(() => {
        if (view === 'game' && groupName) {
            const session = {
                groupName,
                peopleCount,
                members,
                location,
                selectedDrink,
                roomCode,
                myScore,
                history,
                timestamp: Date.now()
            };
            localStorage.setItem('pre_active_session', JSON.stringify(session));
        }
    }, [groupName, peopleCount, members, location, selectedDrink, roomCode, myScore, history, view]);

    // --- NOTIFICATION PERMISSION REQUEST ---
    const handleRequestNotification = async () => {
        const granted = await requestNotificationPermission();
        setNotifPermission(getNotificationPermission());
        if (granted) {
            showNotice("🔔 ¡Notificaciones Activadas!", "Te avisaremos al bolsillo cuando haya retos, hora de reportar o cuando un rival te pase.");
        } else {
            alert("No pudimos activar las notificaciones. Asegúrate de dar permisos en los ajustes de tu navegador o añadir la app a tu pantalla de inicio.");
        }
    };

    // --- TIMERS: Hourly Report & Lightning Round ---
    useEffect(() => {
        if (view !== 'game') return;

        const interval = setInterval(() => {
            // Report timer
            setReportTimer(prev => {
                if (prev <= 1) {
                    setReportModalActive(true);
                    showNotice("🚨 ¡HORA DE REPORTAR!", "¡Tu previa tiene que confirmar los tragos tomados o perderán 5 puntos!");
                    return 2400; // Reset 40 min
                }
                return prev - 1;
            });

            // Lightning round countdown
            setLightningTime(prev => {
                if (lightningActive && prev <= 1) {
                    setLightningActive(false);
                    showNotice("⚡ ¡Terminó la Ronda Relámpago!", "Los tragos vuelven a valer 1 punto normal.");
                    return 180;
                }
                return prev > 0 ? prev - 1 : 0;
            });

            // Active duel countdown
            setActiveDuel(prev => {
                if (prev && prev.timeLeft <= 1) {
                    showNotice("⏳ Tiempo acabado en el duelo", `El duelo contra ${prev.rivalName} ha finalizado.`);
                    return null;
                }
                return prev ? { ...prev, timeLeft: prev.timeLeft - 1 } : null;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [view, lightningActive]);

    // --- SIMULATE RIVALS & RANDOM EVENTS ---
    useEffect(() => {
        if (view !== 'game') return;

        const simInterval = setInterval(() => {
            setRivals(prevRivals => {
                const updated = prevRivals.map(r => {
                    // 35% chance to drink
                    if (Math.random() > 0.65) {
                        const newScore = r.score + 1;
                        return { ...r, score: newScore, trend: 'up' as const };
                    }
                    return { ...r, trend: 'stable' as const };
                }).sort((a, b) => b.score - a.score);

                // Check if top rival overtook me
                const myRankBefore = [...prevRivals, { id: 'me', score: myScore }]
                    .sort((a, b) => b.score - a.score)
                    .findIndex(t => t.id === 'me') + 1;

                const myRankAfter = [...updated, { id: 'me', score: myScore }]
                    .sort((a, b) => b.score - a.score)
                    .findIndex(t => t.id === 'me') + 1;

                if (myRankAfter > myRankBefore && Math.random() > 0.6) {
                    const rivalAhead = updated[myRankAfter - 2];
                    if (rivalAhead) {
                        showNotice("⚠️ ¡Te acaban de pasar!", `"${rivalAhead.name}" sumó tragos y los mandó al puesto #${myRankAfter}.`);
                    }
                }

                return updated;
            });

            // Random Surprise Duel from rivals (10% chance every 30s)
            if (Math.random() < 0.10 && !activeDuel) {
                const randomRival = rivals[Math.floor(Math.random() * rivals.length)];
                if (randomRival) {
                    const incomingDuel: ActiveDuel = {
                        id: String(Date.now()),
                        rivalId: randomRival.id,
                        rivalName: randomRival.name,
                        type: 'fondo_blanco',
                        title: '🥃 ¡Desafío de Fondo Blanco!',
                        description: `"${randomRival.name}" los retó a que todos en su previa se tomen un vaso al seco en 2 minutos.`,
                        rewardPoints: 5,
                        timeLeft: 120,
                        isChallenger: false
                    };
                    setActiveDuel(incomingDuel);
                    showNotice(`⚔️ ¡Reto de ${randomRival.name}!`, "¡Tienen 2 minutos para cumplir el fondo blanco o perderán puntos!");
                }
            }

        }, 12000);

        return () => clearInterval(simInterval);
    }, [view, myScore, activeDuel, rivals]);

    // Format time mm:ss
    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Current Time HH:MM
    const getNowTimeString = () => {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // --- ACTION: DRINK COUNTER ---
    const handleDrink = (amount = 1) => {
        const effectivePoints = lightningActive ? amount * 2 : amount;
        const newScore = myScore + effectivePoints;
        setMyScore(newScore);

        playPartyAlertSound();
        if (navigator.vibrate) navigator.vibrate(50);

        // Add to history
        const newEvent: PreHistoryItem = {
            id: String(Date.now()),
            timestamp: getNowTimeString(),
            type: lightningActive ? 'lightning' : 'drink',
            text: lightningActive
                ? `¡Sumaron ${effectivePoints} tragos en RONDA RELÁMPAGO (x2)! ⚡`
                : `+${amount} trago(s) sumados al marcador 🍺`,
            points: effectivePoints
        };
        setHistory(prev => [newEvent, ...prev].slice(0, 30));

        // Celebrate milestones
        if (newScore > 0 && newScore % 10 === 0) {
            confetti({ particleCount: 70, spread: 60, origin: { y: 0.8 } });
            showNotice(`🎉 ¡${newScore} Tragos en la Previa!`, "Van a un ritmo increíble. ¡A seguir prendiendo la noche!");
        }
    };

    // --- ACTION: TRIGGER LIGHTNING ROUND ---
    const triggerLightningRound = () => {
        setLightningActive(true);
        setLightningTime(180);
        showNotice("⚡ ¡RONDA RELÁMPAGO ACTIVADA!", "Durante los próximos 3 minutos, ¡CADA TRAGO VALE EL DOBLE! 🔥");
        confetti({ particleCount: 90, spread: 80, origin: { y: 0.5 } });
    };

    // --- ACTION: LAUNCH DUEL ---
    const handleLaunchDuel = (rival: RivalPre, type: ActiveDuel['type']) => {
        let title = '🥃 Fondo Blanco Grupal';
        let desc = `Tienen 3 minutos para que todos en tu previa tomen su vaso al seco.`;
        if (type === 'baile') {
            title = '💃 Reto de Baile / Karaoke';
            desc = `Alguien de la previa debe cantar el coro de un tema a todo pulmón o bailar 10 segundos.`;
        } else if (type === 'guerra_vasos') {
            title = '⚡ Guerra de Vasos (2 Min)';
            desc = `Sumen todos los tragos que puedan en los próximos 2 minutos.`;
        } else if (type === 'capitan') {
            title = '🎯 Duelo de Capitanes (1 vs 1)';
            desc = `Elige a tu mejor jugador para un duelo directo contra el capitán de "${rival.name}".`;
        }

        const duel: ActiveDuel = {
            id: String(Date.now()),
            rivalId: rival.id,
            rivalName: rival.name,
            type,
            title,
            description: desc,
            rewardPoints: 5,
            timeLeft: 180,
            isChallenger: true
        };

        setActiveDuel(duel);
        setSelectedRivalForDuel(null);
        setDuelWhatsAppPrompt({ rivalName: rival.name, title });

        // Record history
        const newEvent: PreHistoryItem = {
            id: String(Date.now()),
            timestamp: getNowTimeString(),
            type: 'report',
            text: `Lanzaron un reto a "${rival.name}": ${title} ⚔️`,
        };
        setHistory(prev => [newEvent, ...prev].slice(0, 30));
        showNotice(`⚔️ Reto enviado a ${rival.name}`, `Tienen 3 minutos para cumplir: ${title}`);
    };

    // --- ACTION: RESOLVE DUEL ---
    const handleResolveDuel = (success: boolean) => {
        if (!activeDuel) return;

        if (success) {
            const reward = activeDuel.rewardPoints;
            setMyScore(prev => prev + reward);
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

            const newEvent: PreHistoryItem = {
                id: String(Date.now()),
                timestamp: getNowTimeString(),
                type: 'duel_win',
                text: `¡GANARON EL DUELO contra "${activeDuel.rivalName}"! (+${reward} pts) 🏆`,
                points: reward
            };
            setHistory(prev => [newEvent, ...prev].slice(0, 30));
            showNotice("🏆 ¡DUELO GANADO!", `Cumplieron el reto con éxito y sumaron +${reward} puntos al marcador.`);
        } else {
            const newEvent: PreHistoryItem = {
                id: String(Date.now()),
                timestamp: getNowTimeString(),
                type: 'duel_loss',
                text: `Fallaron el duelo contra "${activeDuel.rivalName}". ¡Todos toman 2 tragos de castigo! 🍻`,
            };
            setHistory(prev => [newEvent, ...prev].slice(0, 30));
            showNotice("❌ Duelo no superado", "¡Castigo de 2 tragos para toda la previa por arrugar!");
        }

        setActiveDuel(null);
    };

    // --- RATIO: Tragos por persona (Prendidez) ---
    const perCapitaRatio = peopleCount > 0 ? (myScore / peopleCount).toFixed(1) : '0';
    const getPrendidezBadge = () => {
        const ratio = parseFloat(perCapitaRatio);
        if (ratio < 1) return { label: '🧊 Calentando Motores', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
        if (ratio < 3) return { label: '🍻 Previa Activada', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
        if (ratio < 5) return { label: '🔥 Previa On Fire', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
        return { label: '🚨 Previa Legendaria (Peligro)', color: 'bg-red-500/20 text-red-300 border-red-500/30 animate-pulse' };
    };

    // --- RANKING CALCULATION ---
    const fullLeaderboard = [
        ...rivals,
        {
            id: 'me',
            name: groupName || 'TU PREVIA',
            score: myScore,
            peopleCount: peopleCount || 4,
            trend: 'up' as const,
            location: location || 'Santiago',
            drinkType: selectedDrink,
            distance: '📍 Aquí'
        }
    ].sort((a, b) => b.score - a.score);

    const rank = fullLeaderboard.findIndex(r => r.id === 'me') + 1;

    // --- WHATSAPP SHARE ENGINE ---
    const handleShareWhatsApp = (
        type: 'invite' | 'duel' | 'ranking' = 'invite',
        extra?: { rivalName?: string; title?: string }
    ) => {
        let msg = '';
        if (type === 'duel') {
            msg =
                `⚔️ ¡DUELO DE PREVIAS EN 234 DRINKS! 🍻\n\n` +
                `🔥 De: "${groupName || 'Nuestra Previa'}" (📍 ${location})\n` +
                `🎯 Para: "${extra?.rivalName || 'Tu Previa'}"\n\n` +
                `💥 EL RETO: *${extra?.title || 'Fondo Blanco Grupal'}*\n` +
                `⏳ Tienen 3 minutos para cumplirlo o arrugan.\n` +
                `🏆 Si ganan: +5 pts en el Ranking | ❌ Si arrugan: ¡2 tragos al seco!\n\n` +
                `👉 Entren a responder el duelo aquí: https://234-drinks.vercel.app`;
        } else if (type === 'ranking') {
            msg =
                `🏆 ¡Ranking en Vivo de Previas en 234 Drinks! 🌎\n\n` +
                `🔥 Grupo: "${groupName || 'Nuestra Previa'}"\n` +
                `📍 Ubicación: ${location}\n` +
                `🍺 Marcador: ${myScore} tragos (#${rank} del Ranking)\n` +
                `👥 Integrantes: ${members.join(', ')}\n\n` +
                `¿Alguna previa que se anime a retarnos? Código de sala: *${roomCode}*\n` +
                `👉 Entra y compite: https://234-drinks.vercel.app`;
        } else {
            msg =
                `🍻 ¡Únete a nuestra previa en "234 Drinks"! 🎉\n\n` +
                `🔥 Grupo: "${groupName || 'Previa 234'}"\n` +
                `📍 Ubicación: ${location}\n` +
                `🥃 Trago Insignia: ${selectedDrink}\n` +
                `🔑 CÓDIGO DE SALA: *${roomCode}*\n\n` +
                `👉 Entra aquí para sumarte al grupo y llevar la cuenta de tragos:\n` +
                `https://234-drinks.vercel.app`;
        }

        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(roomCode);
        setCopiedRoomCode(true);
        setTimeout(() => setCopiedRoomCode(false), 2000);
    };

    // --- VIEW: MENU ---
    const renderMenu = () => {
        const hasActiveSession = !!localStorage.getItem('pre_active_session');

        return (
            <div className="flex flex-col items-center justify-center h-full p-6 space-y-6 animate-in fade-in max-w-md mx-auto text-center">
                <div className="relative">
                    <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 rounded-3xl flex items-center justify-center mx-auto mb-2 shadow-2xl shadow-blue-500/40 ring-4 ring-white/10">
                        <Globe size={46} className="text-white" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-green-500 text-black text-[10px] font-black rounded-full uppercase tracking-wider shadow">
                        PvP En Vivo
                    </span>
                </div>

                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Pre vs Pre 🌎</h2>
                    <p className="text-blue-200/80 text-sm mt-1 max-w-xs mx-auto">
                        Compite contra otros carretes y casas en tiempo real. Sumen tragos, láncense retos y conquisten el ranking.
                    </p>
                </div>

                {/* Notification Prompt in Menu if not granted */}
                {notifPermission !== 'granted' && (
                    <button
                        onClick={handleRequestNotification}
                        className="w-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 hover:bg-amber-500/30 p-3.5 rounded-2xl flex items-center gap-3 text-left transition-all active:scale-95"
                    >
                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-black flex items-center justify-center flex-shrink-0">
                            <BellRing size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-amber-200">Activar Notificaciones de Previa</h4>
                            <p className="text-[10px] text-amber-300/80">Recibe vibraciones y alertas cuando haya retos o te pasen.</p>
                        </div>
                    </button>
                )}

                <div className="w-full space-y-3 pt-2">
                    {hasActiveSession && (
                        <button
                            onClick={() => {
                                const activeSession = localStorage.getItem('pre_active_session');
                                if (activeSession) {
                                    const s = JSON.parse(activeSession);
                                    setGroupName(s.groupName || 'Mi Previa');
                                    setPeopleCount(s.peopleCount || 4);
                                    setMembers(s.members || ['Mati', 'Sofi', 'Juan', 'Yo']);
                                    setLocation(s.location || 'Vitacura');
                                    setSelectedDrink(s.selectedDrink || 'Piscola 🥃');
                                    setRoomCode(s.roomCode || 'PRE-1234');
                                    setMyScore(s.myScore || 0);
                                    if (s.history) setHistory(s.history);
                                    setView('game');
                                }
                            }}
                            className="w-full py-4.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-black text-base rounded-2xl shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all"
                        >
                            <ArrowRight size={20} /> REANUDAR PREVIA ACTIVA
                        </button>
                    )}

                    <button
                        onClick={() => setView('create')}
                        className="w-full py-4 bg-white text-blue-950 font-black text-base rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-transform"
                    >
                        <Users size={18} className="text-blue-600" /> Armar Mi Previa 🚀
                    </button>

                    <button
                        onClick={() => handleShareWhatsApp('invite')}
                        className="w-full py-3.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-950/20"
                    >
                        <MessageCircle size={18} className="text-emerald-400" /> Invitar Amigos por WhatsApp 📲
                    </button>

                    <button
                        onClick={() => setView('join')}
                        className="w-full py-3.5 bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                    >
                        <Shield size={18} className="text-cyan-400" /> Ver Ranking / Retar Otras Casas
                    </button>
                </div>

                <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 pt-2">
                    <span>• Fair-play per cápita</span>
                    <span>• Duelos en vivo</span>
                    <span>• WhatsApp Connect</span>
                </div>
            </div>
        );
    };

    // --- VIEW: CREATE / ARMAR PREVIA ---
    const renderCreate = () => (
        <div className="flex flex-col h-full p-6 animate-in slide-in-from-right max-w-md mx-auto w-full overflow-hidden">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                    <Users className="text-blue-400" /> Armar Tu Previa
                </h2>
                <button
                    onClick={() => setGroupName(FUNNY_GROUP_NAMES[Math.floor(Math.random() * FUNNY_GROUP_NAMES.length)])}
                    className="text-[11px] px-2.5 py-1 bg-blue-500/20 text-blue-300 font-bold rounded-lg border border-blue-500/30 flex items-center gap-1 hover:bg-blue-500/30"
                >
                    <Sparkles size={11} /> Nombre random
                </button>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar pr-1 pb-4">
                {/* 1. Nombre de la Previa */}
                <div>
                    <label className="text-xs text-blue-300 font-bold uppercase tracking-wider block mb-1.5">Nombre del Grupo</label>
                    <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Ej: Los Curados de la 234"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl p-3.5 text-white outline-none text-base font-semibold"
                    />
                </div>

                {/* 2. Cantidad de Personas */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-blue-300 font-bold uppercase tracking-wider block mb-1.5">¿Cuántos son?</label>
                        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1">
                            <button
                                onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}
                                className="w-10 h-10 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700"
                            >-</button>
                            <span className="flex-1 text-center font-black text-white text-lg">{peopleCount}</span>
                            <button
                                onClick={() => setPeopleCount(peopleCount + 1)}
                                className="w-10 h-10 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700"
                            >+</button>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-blue-300 font-bold uppercase tracking-wider block mb-1.5">Trago Insignia</label>
                        <select
                            value={selectedDrink}
                            onChange={(e) => setSelectedDrink(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm font-semibold outline-none focus:border-blue-500 h-[48px]"
                        >
                            {DRINK_OPTIONS.map(d => (
                                <option key={d.id} value={d.name}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 3. Integrantes del Grupo */}
                <div>
                    <label className="text-xs text-blue-300 font-bold uppercase tracking-wider block mb-1.5">
                        Integrantes ({members.length})
                    </label>
                    <div className="flex gap-2 mb-2">
                        <input
                            type="text"
                            value={newMemberName}
                            onChange={(e) => setNewMemberName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newMemberName.trim()) {
                                    setMembers([...members, newMemberName.trim()]);
                                    setNewMemberName('');
                                }
                            }}
                            placeholder="Nombre amigo (ej: Pipe)"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                        />
                        <button
                            onClick={() => {
                                if (newMemberName.trim()) {
                                    setMembers([...members, newMemberName.trim()]);
                                    setNewMemberName('');
                                }
                            }}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                        {members.map((m, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 border border-slate-700 text-white rounded-full text-xs font-medium">
                                {m}
                                <button
                                    onClick={() => setMembers(members.filter((_, idx) => idx !== i))}
                                    className="text-slate-400 hover:text-red-400"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                </div>

                {/* 4. Ubicación */}
                <div>
                    <label className="text-xs text-blue-300 font-bold uppercase tracking-wider block mb-1.5">Comuna / Sector</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Ej: Vitacura o Zapallar"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-blue-500 font-semibold"
                        />
                        <button
                            onClick={() => {
                                if (!navigator.geolocation) {
                                    alert("Geolocalización no soportada");
                                    return;
                                }
                                navigator.geolocation.getCurrentPosition(
                                    pos => {
                                        setLocation(`${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°`);
                                    },
                                    () => alert("No pudimos obtener la ubicación. Puedes escribir tu comuna manualmente.")
                                );
                            }}
                            className="px-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-xl flex items-center justify-center"
                            title="Usar mi ubicación GPS"
                        >
                            <MapPin size={18} />
                        </button>
                    </div>

                    {/* Quick Location Chips */}
                    <div className="flex gap-1.5 overflow-x-auto pt-2 no-scrollbar">
                        {CHILE_LOCATIONS.slice(0, 6).map(loc => (
                            <button
                                key={loc}
                                onClick={() => setLocation(loc)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${location === loc ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                            >
                                {loc}
                            </button>
                        ))}
                    </div>
                </div>

                {/* WhatsApp Pre-invite Banner */}
                <div className="bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/40 p-3.5 rounded-2xl flex items-center justify-between shadow-lg">
                    <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-300">
                            <Share2 size={13} /> SALA: <span className="font-mono text-white text-xs bg-slate-900/90 px-2 py-0.5 rounded-lg border border-slate-700">{roomCode}</span>
                        </div>
                        <p className="text-[11px] text-emerald-200/80 mt-0.5">Invita a tus amigos por WhatsApp antes de arrancar</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => handleShareWhatsApp('invite')}
                        className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl flex items-center gap-1.5 flex-shrink-0 shadow active:scale-95 transition-transform"
                    >
                        <MessageCircle size={14} /> WhatsApp
                    </button>
                </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                    onClick={() => setView('menu')}
                    className="flex-1 py-3.5 bg-slate-800 text-slate-400 font-bold rounded-xl hover:bg-slate-700"
                >
                    Volver
                </button>
                <button
                    onClick={() => {
                        const finalName = groupName.trim() || 'Previa 234';
                        setGroupName(finalName);
                        // Record creation in history
                        const initEvent: PreHistoryItem = {
                            id: String(Date.now()),
                            timestamp: getNowTimeString(),
                            type: 'report',
                            text: `¡Comenzó la previa "${finalName}" con ${peopleCount} personas en ${location}! 🚀`
                        };
                        setHistory([initEvent]);
                        setView('game');
                    }}
                    className="flex-[2] py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-base rounded-xl shadow-lg transition-transform active:scale-95"
                >
                    ¡Comenzar Previa! 🍻
                </button>
            </div>
        </div>
    );

    // --- VIEW: JOIN / VER RANKING Y RETAR ---
    const renderJoin = () => {
        const filteredRivals = rivals.filter(r =>
            r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.location.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
            <div className="flex flex-col h-full p-6 animate-in slide-in-from-right max-w-md mx-auto w-full">
                <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
                    <Shield className="text-blue-400" /> Previas Conectadas
                </h2>

                <div className="relative mb-4">
                    <Search className="absolute left-4 top-3.5 text-slate-500" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nombre, código o comuna..."
                        className="w-full bg-slate-900 pl-11 pr-4 py-3 rounded-xl text-white text-sm border border-slate-700 focus:border-blue-500 outline-none"
                    />
                </div>

                {/* Direct WhatsApp Challenge Banner */}
                <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 p-3 rounded-2xl mb-3 flex items-center justify-between shadow-lg">
                    <div className="min-w-0 pr-2">
                        <div className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                            <MessageCircle size={14} className="text-emerald-400" /> ¿Retar a amigos por WhatsApp?
                        </div>
                        <p className="text-[10px] text-slate-300 mt-0.5">Mándales un link de desafío directo a su chat grupal</p>
                    </div>
                    <button
                        onClick={() => handleShareWhatsApp('duel', { rivalName: 'Tu Casa', title: '🥃 Fondo Blanco Grupal' })}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl flex items-center gap-1 flex-shrink-0 shadow active:scale-95 transition-transform"
                    >
                        Retar WSP
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-4">
                    {filteredRivals.map(rival => (
                        <div
                            key={rival.id}
                            className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all group"
                        >
                            <div className="min-w-0 flex-1 mr-3">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-white text-sm truncate">{rival.name}</h4>
                                    <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/20 text-blue-300 font-semibold rounded">
                                        {rival.drinkType}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                    <span>📍 {rival.location}</span>
                                    <span>• {rival.peopleCount} pers</span>
                                    <span className="text-blue-400 font-bold">• {rival.score} tragos</span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setSelectedRivalForDuel(rival);
                                    if (view !== 'game') setView('game');
                                }}
                                className="px-3.5 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1 active:scale-95"
                            >
                                <Swords size={13} /> RETAR
                            </button>
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => setView(groupName ? 'game' : 'menu')}
                    className="mt-2 w-full py-3.5 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700"
                >
                    Volver
                </button>
            </div>
        );
    };

    // --- MODAL: RETAR A UNA PREVIA ---
    const renderDuelPickerModal = () => {
        if (!selectedRivalForDuel) return null;

        return (
            <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-5 animate-in fade-in">
                <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-5 shadow-2xl relative animate-in zoom-in-95">
                    <button
                        onClick={() => setSelectedRivalForDuel(null)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
                    >
                        <X size={18} />
                    </button>

                    <div className="text-center mb-4">
                        <div className="w-14 h-14 bg-gradient-to-tr from-red-600 to-orange-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-red-500/30 mb-2">
                            <Swords size={28} className="text-white" />
                        </div>
                        <h3 className="text-lg font-black text-white">Retar a "{selectedRivalForDuel.name}"</h3>
                        <p className="text-xs text-slate-400">Elige el tipo de duelo para enviarles a su pantalla:</p>
                    </div>

                    <div className="space-y-2.5 mb-5">
                        <button
                            onClick={() => handleLaunchDuel(selectedRivalForDuel, 'fondo_blanco')}
                            className="w-full p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-red-500/50 rounded-2xl text-left transition-all active:scale-[0.98]"
                        >
                            <div className="font-bold text-white text-sm flex items-center gap-2">
                                <span>🥃 Fondo Blanco Grupal</span>
                                <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full font-black ml-auto">+5 pts</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">Todos toman su vaso al seco en 3 minutos. Si no cumplen, les roban 5 pts.</p>
                        </button>

                        <button
                            onClick={() => handleLaunchDuel(selectedRivalForDuel, 'baile')}
                            className="w-full p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-orange-500/50 rounded-2xl text-left transition-all active:scale-[0.98]"
                        >
                            <div className="font-bold text-white text-sm flex items-center gap-2">
                                <span>💃 Canto o Baile de 10s</span>
                                <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full font-black ml-auto">+5 pts</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">Cantar el coro de una canción a grito pelado o video de 10s bailando.</p>
                        </button>

                        <button
                            onClick={() => handleLaunchDuel(selectedRivalForDuel, 'guerra_vasos')}
                            className="w-full p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-2xl text-left transition-all active:scale-[0.98]"
                        >
                            <div className="font-bold text-white text-sm flex items-center gap-2">
                                <span>⚡ Guerra de Vasos (2 Min)</span>
                                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-black ml-auto">+5 pts</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">Quién toma más en los próximos 120 segundos. El que gane se lleva el botín.</p>
                        </button>
                    </div>

                    <button
                        onClick={() => setSelectedRivalForDuel(null)}
                        className="w-full py-3 bg-slate-800 text-slate-400 font-bold rounded-xl text-xs hover:bg-slate-700"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        );
    };

    // --- MODAL: HORA DE REPORTAR ---
    const renderHourlyReportModal = () => {
        if (!reportModalActive) return null;

        return (
            <div className="absolute inset-0 z-50 bg-red-950/95 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center mb-4 shadow-2xl shadow-red-500/50 animate-bounce">
                    <Clock size={40} className="text-white" />
                </div>
                <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tight">
                    ¡HORA DE REPORTAR!
                </h2>
                <p className="text-red-200 text-sm max-w-xs mb-6">
                    Ha pasado otra ronda de la noche. Confirmen cuántos tragos se tomaron en el último bloque para mantener su puesto en el ranking.
                </p>

                <div className="flex gap-3 mb-6">
                    {[1, 2, 4, 6].map(num => (
                        <button
                            key={num}
                            onClick={() => {
                                handleDrink(num);
                                setReportModalActive(false);
                            }}
                            className="w-16 h-16 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl font-black text-xl text-white flex items-center justify-center active:scale-95 transition-transform"
                        >
                            +{num}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => setReportModalActive(false)}
                    className="px-10 py-4 bg-white text-red-600 font-black text-lg rounded-2xl shadow-2xl active:scale-95 transition-transform"
                >
                    TODO REPORTADO ✅
                </button>
            </div>
        );
    };

    // --- MODAL: ENVIAR RETO POR WHATSAPP ---
    const renderDuelWhatsAppModal = () => {
        if (!duelWhatsAppPrompt) return null;

        return (
            <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-5 animate-in fade-in">
                <div className="bg-slate-900 border border-emerald-500/40 w-full max-w-sm rounded-3xl p-5 shadow-2xl relative text-center animate-in zoom-in-95">
                    <button
                        onClick={() => setDuelWhatsAppPrompt(null)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
                    >
                        <X size={18} />
                    </button>

                    <div className="w-14 h-14 bg-gradient-to-tr from-emerald-500 to-green-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-3">
                        <MessageCircle size={28} className="text-white" />
                    </div>

                    <h3 className="text-lg font-black text-white">¡Reto Lanzado! ⚔️</h3>
                    <p className="text-xs text-slate-300 mt-1 mb-3">
                        Retaste a <strong>"{duelWhatsAppPrompt.rivalName}"</strong> a: <br />
                        <span className="text-emerald-400 font-bold text-sm block mt-1">{duelWhatsAppPrompt.title}</span>
                    </p>

                    <p className="text-[11px] text-slate-400 mb-5">
                        ¿Quieres avisarles por WhatsApp a su grupo para que respondan y no se hagan los locos?
                    </p>

                    <div className="space-y-2">
                        <button
                            onClick={() => {
                                handleShareWhatsApp('duel', {
                                    rivalName: duelWhatsAppPrompt.rivalName,
                                    title: duelWhatsAppPrompt.title
                                });
                                setDuelWhatsAppPrompt(null);
                            }}
                            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                        >
                            <MessageCircle size={16} /> Enviar Reto por WhatsApp 📲
                        </button>
                        <button
                            onClick={() => setDuelWhatsAppPrompt(null)}
                            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
                        >
                            Continuar en la App
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // --- RENDER MAIN VIEWS ---
    if (view === 'menu') return (
        <div className="h-full bg-slate-950 relative overflow-hidden flex flex-col font-sans select-none">
            <GameNavbar onExit={onExit} title="Pre vs Pre (PvP) 🌎" />
            {renderMenu()}
        </div>
    );

    if (view === 'create') return (
        <div className="h-full bg-slate-950 relative overflow-hidden flex flex-col font-sans select-none">
            <GameNavbar onExit={() => setView('menu')} title="Armar Previa" />
            {renderCreate()}
        </div>
    );

    if (view === 'join') return (
        <div className="h-full bg-slate-950 relative overflow-hidden flex flex-col font-sans select-none">
            <GameNavbar onExit={() => setView(groupName ? 'game' : 'menu')} title="Buscar Previas" />
            {renderJoin()}
        </div>
    );

    // ==========================================
    // --- MAIN GAME DASHBOARD ---
    // ==========================================
    const badge = getPrendidezBadge();

    return (
        <div className="flex flex-col h-full bg-slate-950 px-4 pt-16 pb-4 relative overflow-hidden font-sans select-none">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/25 via-slate-950 to-slate-950 pointer-events-none" />

            <GameNavbar onExit={onExit} title="Pre vs Pre (PvP) 🌎" />

            {/* Modals & Overlays */}
            {renderDuelPickerModal()}
            {renderHourlyReportModal()}
            {renderDuelWhatsAppModal()}

            {/* In-App Toast Banner */}
            {inAppToast && (
                <div className="absolute top-18 left-4 right-4 z-40 bg-blue-600 text-white p-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 border border-blue-400">
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                        <BellRing size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs leading-tight">{inAppToast.title}</div>
                        <div className="text-[11px] opacity-90 truncate">{inAppToast.body}</div>
                    </div>
                </div>
            )}

            {/* Header: Group Name, Room Code, Notifications */}
            <div className="flex items-center justify-between mb-3 pt-2 relative z-10">
                <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-black text-white truncate flex items-center gap-1.5">
                        <span>{groupName || 'Mi Previa'}</span>
                        <span className="text-xs text-blue-400 font-semibold">• {location}</span>
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                        <button
                            onClick={handleCopyCode}
                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700 flex items-center gap-1 font-mono transition-colors"
                        >
                            {copiedRoomCode ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                            {roomCode}
                        </button>
                        <button
                            onClick={() => handleShareWhatsApp('invite')}
                            className="text-[11px] bg-emerald-500 hover:bg-emerald-400 text-black px-2.5 py-0.5 rounded-lg font-black flex items-center gap-1 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                        >
                            <MessageCircle size={12} /> WhatsApp
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Lightning Round Trigger */}
                    {!lightningActive ? (
                        <button
                            onClick={triggerLightningRound}
                            className="p-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl transition-all"
                            title="Ronda Relámpago (x2 puntos)"
                        >
                            <Zap size={16} />
                        </button>
                    ) : (
                        <div className="px-2.5 py-1 bg-amber-500 text-black font-black text-xs rounded-xl flex items-center gap-1 animate-pulse shadow-lg">
                            <Zap size={12} className="fill-current" /> {formatTime(lightningTime)}
                        </div>
                    )}

                    {/* Notification Permission Toggle */}
                    <button
                        onClick={handleRequestNotification}
                        className={`p-2 rounded-xl border transition-all ${notifPermission === 'granted'
                            ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                            : 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse'
                            }`}
                        title={notifPermission === 'granted' ? 'Notificaciones activadas' : 'Activar notificaciones'}
                    >
                        {notifPermission === 'granted' ? <Bell size={16} /> : <BellOff size={16} />}
                    </button>
                </div>
            </div>

            {/* Active Duel Sticky Banner */}
            {activeDuel && (
                <div className="mb-3 bg-gradient-to-r from-red-950/80 to-orange-950/80 p-3 rounded-2xl border-2 border-red-500/60 shadow-xl relative z-10 animate-in slide-in-from-top">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-red-300 flex items-center gap-1.5 uppercase">
                            <Swords size={14} className="text-red-400" />
                            {activeDuel.title}
                        </span>
                        <span className="text-xs font-black font-mono text-red-200 bg-red-900/60 px-2 py-0.5 rounded-lg">
                            ⏳ {formatTime(activeDuel.timeLeft)}
                        </span>
                    </div>
                    <p className="text-[11px] text-red-200/90 mb-2">{activeDuel.description}</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleResolveDuel(true)}
                            className="flex-1 py-1.5 bg-green-500 hover:bg-green-400 text-black font-black rounded-xl text-xs shadow transition-transform active:scale-95"
                        >
                            ¡Cumplido! (+5 pts) ✅
                        </button>
                        <button
                            onClick={() => handleShareWhatsApp('duel', { rivalName: activeDuel.rivalName, title: activeDuel.title })}
                            className="py-1.5 px-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold rounded-xl text-xs flex items-center gap-1 active:scale-95 transition-all"
                            title="Enviar o recordar reto por WhatsApp"
                        >
                            <MessageCircle size={12} /> Avisar WSP
                        </button>
                        <button
                            onClick={() => handleResolveDuel(false)}
                            className="py-1.5 px-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-colors"
                        >
                            Arrugamos ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Score & Prendidez Card */}
            <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-5 border border-white/10 shadow-2xl relative z-10 mb-3 flex flex-col items-center text-center">
                <div className="flex items-center justify-between w-full text-xs text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                        <Trophy size={13} className="text-yellow-400" />
                        Puesto: <strong className="text-white">#{rank}</strong> de {fullLeaderboard.length}
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock size={13} />
                        Reporte: <strong className="text-white">{formatTime(reportTimer)}</strong>
                    </span>
                </div>

                {/* Score Number */}
                <div className="relative my-1">
                    <div className="text-7xl font-black text-white tracking-tight drop-shadow-[0_0_25px_rgba(59,130,246,0.5)] tabular-nums">
                        {myScore}
                    </div>
                    {lightningActive && (
                        <div className="absolute -top-1 -right-8 bg-amber-500 text-black font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-bounce">
                            x2 Pts
                        </div>
                    )}
                </div>

                {/* Prendidez & Per-Capita Ratio */}
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${badge.color}`}>
                        {badge.label}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">
                        ({perCapitaRatio} tragos / persona)
                    </span>
                </div>

                {/* Big Drink Button */}
                <div className="w-full mt-4 flex gap-2">
                    <button
                        onClick={() => handleDrink(1)}
                        className="flex-1 py-4.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xl rounded-2xl shadow-xl shadow-blue-500/30 border-t border-white/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <span>¡SUMAR TRAGO!</span>
                        <span className="text-2xl">🍺</span>
                    </button>
                    <button
                        onClick={() => handleDrink(3)}
                        className="px-4 bg-slate-800 hover:bg-slate-700 text-blue-300 font-black text-sm rounded-2xl border border-white/10 active:scale-95 transition-all flex flex-col items-center justify-center"
                        title="Sumar ronda de 3 tragos"
                    >
                        <span>+3</span>
                        <span className="text-[9px] opacity-70">Ronda</span>
                    </button>
                </div>

                {/* Party Quick Actions */}
                <div className="grid grid-cols-2 gap-2 w-full mt-3">
                    <button
                        onClick={() => setView('join')}
                        className="py-2.5 px-3 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                        <Swords size={14} className="text-red-400" /> Retar Otra Casa
                    </button>
                    <button
                        onClick={() => handleShareWhatsApp('invite')}
                        className="py-2.5 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                        <MessageCircle size={14} className="text-emerald-400" /> Invitar por WSP 📲
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-white/10 mb-3 relative z-10">
                <button
                    onClick={() => setActiveTab('leaderboard')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'leaderboard' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                        }`}
                >
                    <Trophy size={13} /> Leaderboard
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                        }`}
                >
                    <Clock size={13} /> Historial ({history.length})
                </button>
                <button
                    onClick={() => setActiveTab('group')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'group' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                        }`}
                >
                    <Users size={13} /> Mi Previa
                </button>
            </div>

            {/* TAB CONTENTS */}
            <div className="flex-1 overflow-y-auto no-scrollbar relative z-10 pb-6 pr-1">
                {/* 1. LEADERBOARD TAB */}
                {activeTab === 'leaderboard' && (
                    <div className="space-y-2">
                        {fullLeaderboard.map((team, index) => {
                            const isMe = team.id === 'me';
                            return (
                                <div
                                    key={team.id}
                                    onClick={() => !isMe && setSelectedRival(team as RivalPre)}
                                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${isMe
                                        ? 'bg-blue-600/25 border-blue-500/60 ring-1 ring-blue-500/30'
                                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/60 cursor-pointer active:scale-[0.98]'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 ${index === 0 ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-500/30' :
                                            index === 1 ? 'bg-slate-300 text-black' :
                                                index === 2 ? 'bg-amber-600 text-white' :
                                                    'bg-slate-800 text-slate-400'
                                            }`}>
                                            {index + 1}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="font-bold text-white text-xs truncate flex items-center gap-1.5">
                                                <span>{team.name}</span>
                                                {isMe && (
                                                    <span className="text-[9px] bg-blue-500 text-black px-1.5 py-0.2 rounded font-black">
                                                        UDS
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                <span>📍 {team.location}</span>
                                                <span>• {team.peopleCount} pers</span>
                                                <span>• {(team.score / (team.peopleCount || 1)).toFixed(1)} /pers</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <div className="text-right">
                                            <div className="text-lg font-black text-white">{team.score}</div>
                                            <div className="text-[9px] text-slate-400 uppercase">tragos</div>
                                        </div>

                                        {!isMe && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedRivalForDuel(team as RivalPre);
                                                }}
                                                className="px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 rounded-xl text-[10px] font-black flex items-center gap-1 active:scale-95"
                                            >
                                                <Swords size={11} /> Retar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Share Ranking in WhatsApp */}
                        <button
                            onClick={() => handleShareWhatsApp('ranking')}
                            className="w-full py-3 bg-slate-900 border border-slate-700 hover:border-emerald-500/50 text-slate-200 hover:text-emerald-300 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all mt-2 shadow"
                        >
                            <MessageCircle size={15} className="text-emerald-400" /> Compartir Ranking en WhatsApp 🏆
                        </button>
                    </div>
                )}

                {/* 2. HISTORY TAB */}
                {activeTab === 'history' && (
                    <div className="space-y-2">
                        {history.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 text-xs">
                                No hay actividad registrada aún. ¡Empiecen a sumar tragos y retos!
                            </div>
                        ) : (
                            history.map(item => (
                                <div
                                    key={item.id}
                                    className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800 text-xs flex items-center justify-between gap-3"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                                            {item.timestamp}
                                        </span>
                                        <span className="text-slate-200 truncate">{item.text}</span>
                                    </div>
                                    {item.points && (
                                        <span className="text-xs font-black text-green-400 flex-shrink-0">
                                            +{item.points}
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* 3. MI GRUPO TAB */}
                {activeTab === 'group' && (
                    <div className="space-y-3">
                        <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detalles de la Previa</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-slate-800/60 p-2.5 rounded-xl">
                                    <div className="text-[10px] text-slate-400">Trago Principal</div>
                                    <div className="font-bold text-white mt-0.5">{selectedDrink}</div>
                                </div>
                                <div className="bg-slate-800/60 p-2.5 rounded-xl">
                                    <div className="text-[10px] text-slate-400">Ubicación</div>
                                    <div className="font-bold text-white mt-0.5">{location}</div>
                                </div>
                            </div>

                            <div>
                                <div className="text-[10px] text-slate-400 mb-1.5 uppercase font-bold">Integrantes Registrados</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {members.map((m, i) => (
                                        <span key={i} className="px-3 py-1 bg-slate-800 border border-slate-700 text-slate-200 rounded-full text-xs font-medium">
                                            {m}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Room Sharing Card */}
                        <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 p-4 rounded-2xl border border-blue-500/30">
                            <h4 className="text-xs font-black text-blue-200 uppercase tracking-wider mb-1">Invita a tus Amigos</h4>
                            <p className="text-[11px] text-blue-300/80 mb-3">
                                Pásales este código para que se unan a tu grupo o compitan desde otra casa:
                            </p>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-slate-900/80 px-3 py-2 rounded-xl text-center font-mono font-black text-white text-base border border-slate-700">
                                    {roomCode}
                                </div>
                                <button
                                    onClick={() => handleShareWhatsApp('invite')}
                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl flex items-center gap-1.5 shadow active:scale-95 transition-transform"
                                >
                                    <MessageCircle size={14} /> WhatsApp
                                </button>
                            </div>
                        </div>

                        {/* Reset / Change Previa */}
                        <button
                            onClick={() => {
                                if (confirm("¿Seguro que quieres reiniciar la previa actual?")) {
                                    localStorage.removeItem('pre_active_session');
                                    setMyScore(0);
                                    setHistory([]);
                                    setView('menu');
                                }
                            }}
                            className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                            <RotateCcw size={13} /> Reiniciar Previa
                        </button>
                    </div>
                )}
            </div>

            {/* Bottom Status Ticker */}
            <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-slate-900 flex items-center justify-between">
                <span>Latam South • 14.2k previas activas</span>
                <button
                    onClick={() => {
                        showNotice("🔔 Alerta de Prueba", "¡Así sonará y vibrará tu celular cuando haya un reto o reporte!");
                    }}
                    className="text-blue-400 hover:underline font-semibold"
                >
                    Probar Alerta 🚀
                </button>
            </div>
        </div>
    );
}
