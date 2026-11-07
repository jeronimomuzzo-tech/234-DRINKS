import { useState, useEffect, useRef } from 'react';
import { Share, Volume2, VolumeX, Moon, Sun, AlertTriangle, BatteryCharging, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DrinkHourGameProps {
    onExit: () => void;
}

type GameState = 'config' | 'running' | 'challenge';

interface Player {
    id: string;
    name: string;
}

interface Challenge {
    id: string;
    title: string;
    description: string;
    type: 'individual' | 'pair' | 'all' | 'special';
}

const DEFAULT_DRINKS = ['Caipirinha 🍋', 'Cerveza 🍺', 'Shot de Cachaça 🥃', 'Agua de Coco (con Malicia) 🥥'];

const CHALLENGES_BRAZIL: Challenge[] = [
    { id: '1', title: 'Saúde!', description: 'Toma hasta el fondo tu vaso. Si no lo haces, le pagas una caipirinha al grupo.', type: 'individual' },
    { id: '2', title: 'O Garçom 🤵', description: 'Todos toman un trago, MENOS TÚ. Pero tú debes servir la siguiente ronda de todos.', type: 'special' },
    { id: '3', title: 'Duelo de Samba 💃', description: 'Elige un rival. Toman un shot al mismo tiempo. El primero en terminar gana (y decide el próximo tema musical).', type: 'pair' },
    { id: '4', title: 'Mar de Floripa 🌊', description: 'El último en tocar algo "natural" (arena, agua, pasto o madera) toma DOBLE.', type: 'all' },
    { id: '5', title: 'Caipirinha Roulette 🔫', description: 'Toma el vaso de la persona a tu derecha. Si está vacío, ¡mala suerte! Llénalo y toma.', type: 'individual' },
    { id: '6', title: 'Clima de Floripa ☀️', description: 'Si tienes lentes de sol puestos (o gorro), regala 2 tragos. Si no, ¡toma 1 tú!', type: 'all' },
    { id: '7', title: 'Portugués Básico 🇧🇷', description: 'Intenta decir "O rato roeu a roupa do rei de Roma" sin trabarte. Si fallas, shot.', type: 'individual' },
];

const INTERVAL_OPTIONS = {
    demo: { label: 'Modo Demo 🚀', description: 'Retos cada 10-30 seg', min: 10, max: 30 },
    party: { label: 'Modo Fiesta 🔥', description: 'Retos cada 15-45 min', min: 15 * 60, max: 45 * 60 },
    allday: { label: 'Todo el Día ☀️', description: 'Retos cada 1-3 horas', min: 60 * 60, max: 3 * 60 * 60 }
};

type IntervalMode = keyof typeof INTERVAL_OPTIONS;

export function DrinkHourGame({ onExit }: DrinkHourGameProps) {
    const [gameState, setGameState] = useState<GameState>('config');
    const [players, setPlayers] = useState<Player[]>([{ id: '1', name: '' }, { id: '2', name: '' }]);
    const [drinks, setDrinks] = useState<string[]>(DEFAULT_DRINKS);
    const [selectedDrinks, setSelectedDrinks] = useState<string[]>([DEFAULT_DRINKS[0]]);
    const [intervalMode, setIntervalMode] = useState<IntervalMode>('party');
    const [isPocketMode, setIsPocketMode] = useState(false);
    const [targetTime, setTargetTime] = useState<Date | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
    const [targetedPlayers, setTargetedPlayers] = useState<string[]>([]);
    const [wakeLock, setWakeLock] = useState<any>(null);

    // Audio Ref
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const silentAudioRef = useRef<HTMLAudioElement | null>(null);

    // Silent MP3 for Keep-Alive (1 second of silence)
    const SILENT_AUDIO = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//oeAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAASAAAAAA//oeZn8ABOmZRABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAABAAAAAABAAJAJAAAB';

    // --- Wake Lock Management ---
    const requestWakeLock = async () => {
        try {
            if ('wakeLock' in navigator) {
                const lock = await (navigator as any).wakeLock.request('screen');
                setWakeLock(lock);
                console.log("Wake Lock active");
            }
        } catch (err) {
            console.error("Wake Lock failed", err);
        }
    };

    const releaseWakeLock = async () => {
        if (wakeLock) {
            await wakeLock.release();
            setWakeLock(null);
        }
    };

    // --- Notifications ---
    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    };

    const sendNotification = (title: string, body: string) => {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        try {
            // Service Worker is ideal, but new Notification() works for simple cases if page is open
            // @ts-ignore
            new Notification(title, {
                body,
                icon: '/icon-192.png', // Ideally should process valid icon path
                vibrate: [200, 100, 200]
            });
        } catch (e) { console.error("Notification failed", e); }
    };

    // --- Background Audio Logic ---
    const startSilentAudio = () => {
        if (!silentAudioRef.current) {
            const audio = new Audio(SILENT_AUDIO);
            audio.loop = true;
            audio.volume = 0.1; // iOS needs non-zero volume sometimes
            silentAudioRef.current = audio;
        }

        silentAudioRef.current.play().then(() => {
            console.log("Background Audio Started");

            // Set Media Session Metadata
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: 'Hora da Batida 🇧🇷',
                    artist: 'Juego en Curso...',
                    album: '234 Drinks',
                    artwork: [
                        { src: 'https://images.unsplash.com/photo-1544274944-7729f2203770?q=80&w=96&auto=format&fit=crop', sizes: '96x96', type: 'image/jpeg' },
                    ]
                });

                // Add dummy handlers to keep controls active
                navigator.mediaSession.setActionHandler('play', () => silentAudioRef.current?.play());
                navigator.mediaSession.setActionHandler('pause', () => { }); // Prevent pausing to keep alive
                navigator.mediaSession.setActionHandler('stop', () => { });
            }
        }).catch(e => console.error("Silent Audio play failed", e));
    };

    const stopSilentAudio = () => {
        if (silentAudioRef.current) {
            silentAudioRef.current.pause();
            silentAudioRef.current.currentTime = 0;
            // Clear Media Session
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = null;
            }
        }
    };

    // --- Timer Logic ---
    useEffect(() => {
        if (gameState !== 'running' || !targetTime) return;

        const interval = setInterval(() => {
            const now = new Date();
            const diff = targetTime.getTime() - now.getTime();

            if (diff <= 0) {
                triggerChallenge();
                clearInterval(interval);
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                if (hours > 0) {
                    setTimeLeft(`${hours}h ${minutes}m`);
                } else {
                    setTimeLeft(`${minutes}m ${seconds}s`);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [gameState, targetTime]);

    // Cleanup WakeLock and Audio on unmount
    useEffect(() => {
        return () => {
            releaseWakeLock();
            stopSilentAudio();
            stopSound();
        };
    }, [wakeLock]);


    const startGame = async () => {
        const validPlayers = players.filter(p => p.name.trim() !== '');
        if (validPlayers.length < 2) {
            alert("Minimo 2 jugadores para la 'Roda de Amigos'");
            return;
        }
        if (selectedDrinks.length === 0) {
            alert("Elige al menos un tipo de trago 🍹");
            return;
        }

        await requestNotificationPermission();
        requestWakeLock();
        startSilentAudio(); // START BACKGROUND HACK
        scheduleNextEvent();
        setGameState('running');
    };

    const scheduleNextEvent = () => {
        const { min, max } = INTERVAL_OPTIONS[intervalMode];
        const randomSeconds = Math.floor(Math.random() * (max - min + 1)) + min;
        try {
            // Ensure we log this for debugging intervals
            console.log(`Scheduling next event in ${randomSeconds} seconds (Mode: ${intervalMode})`);
        } catch (e) { }

        const delayMs = randomSeconds * 1000;

        const target = new Date(new Date().getTime() + delayMs);
        setTargetTime(target);
    };

    const triggerChallenge = () => {
        setIsPocketMode(false); // WAKE UP FROM POCKET MODE!
        stopSilentAudio();      // Pause silent track so alarm can take over focus

        // 1. Pick Notification Sound
        playSound();
        sendNotification("🇧🇷 ¡HORA DA BATIDA!", "¡Ha llegado el momento! Toca para ver el reto.");

        // Update Media Session for Challenge
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: '¡SALUD! 🍻',
                artist: 'Hora da Batida',
                artwork: []
            });
        }

        // 2. Pick Challenge
        const challenge = CHALLENGES_BRAZIL[Math.floor(Math.random() * CHALLENGES_BRAZIL.length)];
        setCurrentChallenge(challenge);

        // 3. Pick Players
        const validPlayers = players.filter(p => p.name.trim() !== '');
        let targets: string[] = [];

        if (challenge.type === 'pair') {
            // Pick 2 unique
            const shuffled = [...validPlayers].sort(() => 0.5 - Math.random());
            targets = shuffled.slice(0, 2).map(p => p.name);
        } else if (challenge.type === 'individual' || challenge.type === 'special') {
            const victim = validPlayers[Math.floor(Math.random() * validPlayers.length)];
            targets = [victim.name];
        } else {
            targets = ['TODOS'];
        }
        setTargetedPlayers(targets);

        setGameState('challenge');
        // Confetti only if visible, otherwise when they open
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#ffd700', '#009c3b', '#002776'] }); // Brazil Colors
    };

    const playSound = () => {
        // Simple alarm sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Notification chime
        audio.loop = true; // Loop until they interact
        audio.play().catch(e => console.log("Audio autoplay prevented", e));
        audioRef.current = audio;
    };

    const stopSound = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
    };

    const handleShare = async () => {
        if (!currentChallenge) return;

        const text = `🇧🇷 Hora da Batida en Floripa! 🇧🇷\n\n🎯 Reto: ${currentChallenge.title}\n👥 Para: ${targetedPlayers.join(' y ')}\n📝 Misión: ${currentChallenge.description}\n\n¡Saúde! 🥂`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Drink Hour Challenge',
                    text: text,
                });
            } catch (err) {
                console.log("Share canceled");
            }
        } else {
            // Fallback clipboard
            navigator.clipboard.writeText(text);
            alert("Copiado al portapapeles para WhatsApp!");
        }
    };

    const confirmChallenge = () => {
        stopSound();
        setGameState('running');
        startSilentAudio(); // Resume background hack for next round
        scheduleNextEvent();
    };

    // --- RENDERERS ---

    const renderConfig = () => (
        <div className="h-full overflow-y-auto p-6 flex flex-col items-center animate-in fade-in">
            <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-green-500 to-blue-500 mb-2">
                Hora da Batida 🇧🇷
            </h2>
            <p className="text-gray-400 text-center mb-6">Configura tua Roda de Amigos em Floripa</p>

            {/* Players */}
            <div className="w-full max-w-sm space-y-3 mb-6">
                <label className="text-sm font-bold text-green-400 uppercase tracking-widest">Jugadores</label>
                {players.map((player, idx) => (
                    <input
                        key={player.id}
                        type="text"
                        placeholder={`Nombre Jugador ${idx + 1}`}
                        value={player.name}
                        onChange={(e) => {
                            const newPlayers = [...players];
                            newPlayers[idx].name = e.target.value;
                            setPlayers(newPlayers);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white focus:border-green-500 focus:outline-none"
                    />
                ))}
                <button
                    onClick={() => setPlayers([...players, { id: Date.now().toString(), name: '' }])}
                    className="text-xs text-green-400 font-bold hover:text-green-300 flex items-center gap-1"
                >
                    + Agregar Amigo
                </button>
            </div>

            {/* Interval Mode */}
            <div className="w-full max-w-sm space-y-3 mb-6">
                <label className="text-sm font-bold text-blue-400 uppercase tracking-widest">Ritmo de Juego</label>
                <div className="flex flex-col gap-2">
                    {(Object.keys(INTERVAL_OPTIONS) as IntervalMode[]).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setIntervalMode(mode)}
                            className={`p-3 rounded-xl border text-left transition-all ${intervalMode === mode
                                    ? 'bg-blue-500/20 border-blue-500 text-blue-100'
                                    : 'bg-zinc-900 border-zinc-700 text-gray-500 hover:border-zinc-600'
                                }`}
                        >
                            <div className="font-bold flex items-center gap-2">
                                {INTERVAL_OPTIONS[mode].label}
                                {intervalMode === mode && <span className="text-blue-500 text-xs">●</span>}
                            </div>
                            <div className="text-xs opacity-70">{INTERVAL_OPTIONS[mode].description}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Drinks */}
            <div className="w-full max-w-sm space-y-3 mb-8">
                <label className="text-sm font-bold text-yellow-400 uppercase tracking-widest">Menú de Tragos</label>
                <div className="flex flex-wrap gap-2">
                    {drinks.map(drink => (
                        <button
                            key={drink}
                            onClick={() => {
                                if (selectedDrinks.includes(drink)) {
                                    setSelectedDrinks(selectedDrinks.filter(d => d !== drink));
                                } else {
                                    setSelectedDrinks([...selectedDrinks, drink]);
                                }
                            }}
                            className={`px-3 py-2 rounded-lg text-sm border transition-all ${selectedDrinks.includes(drink)
                                ? 'bg-yellow-500/20 border-yellow-500 text-yellow-200'
                                : 'bg-zinc-900 border-zinc-700 text-gray-500'
                                }`}
                        >
                            {drink}
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={startGame}
                className="w-full max-w-sm py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white font-black rounded-full text-xl shadow-lg hover:scale-105 transition-transform"
            >
                INICIAR RODA 🏖️
            </button>
        </div>
    );

    const renderRunning = () => (
        <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in space-y-8 bg-[url('https://images.unsplash.com/photo-1544274944-7729f2203770?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center relative">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Pocket Mode Overlay if Active */}
            {isPocketMode && (
                <div
                    className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center cursor-pointer"
                    onDoubleClick={() => setIsPocketMode(false)}
                    onClick={() => {
                        // Optional: Show hint on single click
                        const hint = document.getElementById('pocket-hint');
                        if (hint) {
                            hint.style.opacity = '1';
                            setTimeout(() => hint.style.opacity = '0', 2000);
                        }
                    }}
                >
                    <div id="pocket-hint" className="text-neutral-800 text-xs font-mono transition-opacity opacity-0 select-none">
                        Doble toque para despertar
                    </div>
                </div>
            )}

            <div className="relative z-10 flex flex-col items-center">
                <div className="w-32 h-32 rounded-full border-4 border-dashed border-green-500/50 flex items-center justify-center mb-6 animate-spin-slow">
                    <Sun size={48} className="text-yellow-400 animate-pulse" />
                </div>

                <h2 className="text-3xl font-bold text-white mb-2">Disfruten la Playa...</h2>
                <p className="text-gray-300 max-w-xs text-lg">
                    En cualquier momento suena la alarma.
                    <br />
                    <span className="text-sm text-green-400 font-bold mt-2 block">Mantén esta pantalla abierta</span>
                    <span className="text-xs text-white/40 block mt-1">(La app se mantendrá activa en fondo)</span>
                </p>

                {/* Wakelock Status */}
                <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-black/40 rounded-full border border-white/10">
                    {wakeLock ? <BatteryCharging size={16} className="text-green-400" /> : <AlertTriangle size={16} className="text-red-400" />}
                    <span className="text-xs text-gray-400">
                        {wakeLock ? "Pantalla Activa (NoSleep)" : "Cuidado: El celu se puede bloquear"}
                    </span>
                </div>

                {/* Pocket Mode Toggle */}
                <button
                    onClick={() => setIsPocketMode(true)}
                    className="mt-6 flex items-center gap-2 px-5 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700 transition-colors"
                >
                    <Moon size={20} className="text-blue-400" />
                    <div className="text-left">
                        <div className="font-bold text-sm text-white">Modo Bolsillo</div>
                        <div className="text-[10px] text-gray-400">Apagar pantalla (Ahorro Batería)</div>
                    </div>
                </button>

                {/* Debug Time (Hidden in prod usually, but good for confidence) */}
                <div className="mt-8 opacity-30 text-[10px] font-mono">
                    {intervalMode === 'allday' ? 'Modo Todo el Día' : `Próximo evento en: ${timeLeft}`}
                </div>
            </div>

            <button
                onClick={onExit}
                className="relative z-10 mt-auto text-white/50 hover:text-white text-sm underline pb-6"
            >
                Cancelar Partida
            </button>
        </div>
    );

    const renderChallenge = () => (
        <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-in zoom-in bg-gradient-to-b from-green-900 to-blue-900">
            <h1 className="text-6xl font-black text-yellow-400 mb-4 animate-bounce">¡HORA DA BATIDA!</h1>

            <div className="bg-black/30 w-full max-w-md p-8 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-md">
                <h3 className="text-purple-300 font-bold uppercase tracking-widest text-sm mb-2">
                    {currentChallenge?.type === 'all' ? 'Reto Grupal' : 'Reto para:'}
                </h3>

                <div className="text-3xl font-black text-white mb-6 leading-tight">
                    {targetedPlayers.join(' & ')}
                </div>

                <div className="w-full h-px bg-white/20 mb-6" />

                <h2 className="text-2xl font-bold text-green-300 mb-2">{currentChallenge?.title}</h2>
                <p className="text-white text-lg leading-relaxed mb-8">
                    {currentChallenge?.description}
                </p>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={handleShare}
                        className="col-span-1 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-colors"
                    >
                        <Share size={24} />
                        <span className="text-xs">WhatsApp</span>
                    </button>

                    <button
                        onClick={confirmChallenge}
                        className="col-span-1 py-4 bg-white hover:bg-gray-100 text-black rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-colors"
                    >
                        <Trophy size={24} />
                        <span className="text-xs">¡Cumplido!</span>
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 h-[100dvh] bg-zinc-950 z-50 overflow-hidden flex flex-col">
            {gameState === 'config' && renderConfig()}
            {gameState === 'running' && renderRunning()}
            {gameState === 'challenge' && renderChallenge()}

            {/* Pocket Mode Hint if needed, managed inside renderRunning for Z-index reasons */}
        </div>
    );
}
