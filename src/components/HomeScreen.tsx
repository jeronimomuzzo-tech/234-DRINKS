import { useState } from 'react';
import { GameCategory } from '../types';
import {
  Flame,
  Zap,
  Wine,
  ArrowRight,
  Sparkles,
  Users,
  Gamepad2,
  Download,
  Music
} from 'lucide-react';
import { InstallPWA } from './InstallPWA';

interface HomeScreenProps {
  onGameSelect: (game: GameCategory) => void;
  onOpenConfig: () => void;
}

export function HomeScreen({ onGameSelect, onOpenConfig }: HomeScreenProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'cards' | 'social' | 'strategy' | 'music'>('all');

  const games: GameCategory[] = [
    {
      id: 'pre-vs-pre',
      title: 'Pre vs Pre',
      description: 'Compete against other parties in real-time.',
      color: '',
      gradient: 'bg-gradient-to-br from-blue-600 to-indigo-700',
      icon: 'gamepad',
      category: 'strategy'
    },
    {
      id: 'hitster-drinks',
      title: 'Hitster Drinks',
      description: 'Guess the year! Older or newer? Wrong guess = Drink.',
      color: '',
      gradient: 'bg-gradient-to-br from-[#1DB954] to-emerald-800', // Spotify Green
      icon: 'music',
      category: 'music'
    },
    {
      id: 'piramide',
      title: 'Pirámide',
      description: 'Flip cards from bottom to top. Match to drink or give!',
      color: '',
      gradient: 'bg-gradient-to-br from-purple-500 to-pink-500', // Pirámide: gradiente púrpura → rosado
      icon: 'zap',
      category: 'cards'
    },
    {
      id: 'cuarto-rey',
      title: 'Cuarto Rey',
      description: "King's Cup variant. Find all 4 Kings to end the game!",
      color: '',
      gradient: 'bg-fuchsia-600', // Cuarto Rey: fuchsia (approximation for "fucsia")
      icon: 'flame',
      category: 'cards'
    },
    {
      id: "the-list",
      title: "The Nuca Nunca",
      description: "Check off wild situations. Secrets and truths revealed.",
      color: "",
      gradient: "bg-gradient-to-br from-violet-600 to-purple-700", // The Nunca Nunca: violeta
      icon: "zap",
      category: "social"
    },
    {
      id: "la-polla",
      title: "La Polla 🤪",
      description: "100+ viral challenges. Selfies, dares, chaos!",
      color: "",
      gradient: "bg-orange-500", // La Polla: naranja
      icon: "flame",
      category: "social"
    },
    {
      id: 'drink-hour',
      title: 'Hora da Batida 🇧🇷',
      description: 'Random alerts. Brazil challenges. Keep the screen open!',
      color: '',
      gradient: 'bg-gradient-to-br from-yellow-400 via-green-500 to-blue-600', // Brazil Flag Gradient
      icon: 'flame',
      category: 'social'
    },
  ];

  const getIcon = (iconName: string, size = 28) => {
    switch (iconName) {
      case 'flame': return <Flame size={size} className="text-white" />;
      case 'zap': return <Zap size={size} className="text-white" />;
      case 'wine': return <Wine size={size} className="text-white" />;
      case 'users': return <Users size={size} className="text-white" />;
      case 'gamepad': return <Gamepad2 size={size} className="text-white" />;
      case 'music': return <Music size={size} className="text-white" />;
      default: return <Sparkles size={size} className="text-white" />;
    }
  };

  const filteredGames = activeFilter === 'all'
    ? games
    : games.filter(game => game.category === activeFilter);

  return (
    <div className="min-h-screen w-full bg-black text-white font-sans selection:bg-pink-500/30 pb-32">

      <div className="max-w-7xl mx-auto px-6 pt-12">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-5xl font-bold tracking-tight mb-2">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
              234 Drinks
            </span>
          </h1>
          <p className="text-gray-400 text-lg font-medium">
            9 epic games to turn up the party 🔥
          </p>
        </header>

        {/* Filters */}
        <div className="flex gap-3 mb-10 overflow-x-auto pb-2 no-scrollbar">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'cards', label: 'Cartas' },
            { id: 'social', label: 'Social' },
            { id: 'strategy', label: 'Estrategia' },
            { id: 'music', label: 'Música' }
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id as any)}
              className={`
                px-6 py-3 rounded-full text-base font-semibold transition-all duration-300 whitespace-nowrap
                ${activeFilter === filter.id
                  ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-lg shadow-pink-500/25 scale-105'
                  : 'bg-zinc-900 text-gray-400 hover:bg-zinc-800 hover:text-white border border-white/5'
                }
              `}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGames.map((game) => (
            <div
              key={game.id}
              onClick={() => onGameSelect(game)}
              className={`
                group relative h-[240px] rounded-[2rem] p-8 cursor-pointer overflow-hidden
                transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                ${game.gradient}
                shadow-xl shadow-black/50 hover:shadow-2xl
              `}
            >
              <div className="relative z-10 flex flex-col h-full justify-between">

                {/* Top Section */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner ring-1 ring-white/10">
                    {getIcon(game.icon, 28)}
                  </div>
                  <h3 className="text-3xl font-bold text-white leading-tight mt-1 drop-shadow-md">
                    {game.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-white/90 text-base font-medium leading-relaxed max-w-[90%] drop-shadow-sm">
                  {game.description}
                </p>

                {/* Arrow Icon */}
                <div className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <ArrowRight className="text-white" size={20} strokeWidth={3} />
                </div>
              </div>

              {/* Decorative Gradient Overlay (Subtle shine) */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            </div>
          ))}
        </div>
      </div>

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="w-full max-w-md pointer-events-auto">
          <InstallPWA />
        </div>
      </div>

    </div>
  );
}