import { useState, useEffect } from 'react';
import { ChevronLeft, Users, Flame, Play } from 'lucide-react';
import type { GameCategory, GameConfig } from '../types';

interface GameConfigScreenProps {
  game: GameCategory;
  onBack: () => void;
  onStart: (config: GameConfig) => void;
  initialConfig: GameConfig;
}

export function GameConfigScreen({
  game,
  onBack,
  onStart,
  initialConfig,
}: GameConfigScreenProps) {
  const [players, setPlayers] = useState(initialConfig.players);
  const [intensity, setIntensity] = useState(initialConfig.intensity);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleStart = () => {
    onStart({ players, intensity });
  };

  const getIntensityLabel = (value: number) => {
    if (value < 33) return 'Suave';
    if (value < 66) return 'Medio';
    return 'Intenso';
  };

  const getIntensityColor = (value: number) => {
    if (value < 33) return '#22d3ee'; // Cyan
    if (value < 66) return '#a855f7'; // Purple
    return '#f97316'; // Orange
  };

  return (
    <div className={`min-h-screen relative overflow-hidden flex flex-col transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>

      {/* Background Ambience */}
      <div className="absolute inset-0 bg-black z-0">
        <div className={`absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] opacity-30 ${game.gradient.replace('bg-', 'bg-')}`}></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 px-6 py-8 flex flex-col h-full max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="mb-8 animate-in slide-in-from-top-4 duration-500">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-6 group"
          >
            <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </div>
            <span className="font-medium text-sm">Volver al Menú</span>
          </button>

          <div className="flex flex-col items-center text-center">
            <div className={`w-20 h-20 rounded-3xl mb-6 shadow-2xl flex items-center justify-center ${game.gradient} ring-4 ring-black/50 shadow-${game.color}/50`}>
              {/* We assume game.icon logic is handled in HomeScreen or passed down, 
                    but for now we just show a generic visual or we'd need the icon component passed. 
                    Simplified to just the aesthetic block for now. */}
              <span className="text-4xl">🎮</span>
            </div>
            <h1 className="text-5xl font-black tracking-tight mb-3 text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60">
              {game.title}
            </h1>
            <p className="text-gray-400 text-lg font-medium leading-relaxed max-w-xs mx-auto">
              {game.description}
            </p>
          </div>
        </div>

        {/* Configuration Options */}
        <div className="flex-1 space-y-6 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">

          {/* Number of Players */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-purple-500/20 rounded-xl text-purple-400">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white/90">Jugadores</h3>
            </div>

            <div className="flex items-center justify-between gap-6">
              <button
                onClick={() => setPlayers(Math.max(2, players - 1))}
                className="w-14 h-14 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 active:scale-90 transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed text-2xl"
                disabled={players <= 2}
              >
                −
              </button>

              <div className="flex-1 text-center flex flex-col items-center">
                <span className="text-6xl font-black tracking-tighter tabular-nums text-white drop-shadow-lg">
                  {players}
                </span>
              </div>

              <button
                onClick={() => setPlayers(Math.min(20, players + 1))}
                className="w-14 h-14 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 active:scale-90 transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed text-2xl"
                disabled={players >= 20}
              >
                +
              </button>
            </div>
          </div>

          {/* Intensity Level */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl text-orange-400" style={{ backgroundColor: `${getIntensityColor(intensity)}20`, color: getIntensityColor(intensity) }}>
                  <Flame className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white/90">Intensidad</h3>
              </div>
              <span className="text-sm font-bold px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">
                {intensity}%
              </span>
            </div>

            <div className="space-y-6">
              {/* Custom Range Slider */}
              <div className="relative h-6 flex items-center">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="w-full h-3 bg-gray-700/50 rounded-full appearance-none cursor-pointer focus:outline-none z-20 opacity-0 absolute inset-0"
                />
                {/* Visual Track */}
                <div className="absolute inset-0 h-4 bg-gray-800 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full transition-all duration-300 ease-out"
                    style={{
                      width: `${intensity}%`,
                      background: `linear-gradient(90deg, ${getIntensityColor(intensity)} 0%, ${getIntensityColor(intensity)} 100%)`,
                      boxShadow: `0 0 20px ${getIntensityColor(intensity)}`
                    }}
                  />
                </div>
                {/* Unused visual thumb could go here if manually rendered, but opacity 0 input handles interaction well enough for this style */}
              </div>

              <div className="flex justify-between items-center">
                <span
                  className={`text-2xl font-black transition-colors duration-300`}
                  style={{ color: getIntensityColor(intensity) }}
                >
                  {getIntensityLabel(intensity)}
                </span>
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                  Modo de Juego
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="mt-8 mb-4 animate-in slide-in-from-bottom-4 duration-700 delay-200">
          <button
            onClick={handleStart}
            className={`
                group relative w-full py-6 rounded-3xl overflow-hidden
                transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                shadow-2xl hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]
            `}
          >
            <div className={`absolute inset-0 opacity-80 group-hover:opacity-100 transition-opacity ${game.gradient}`}></div>

            <div className="relative flex items-center justify-center gap-3">
              <span className="text-3xl font-black text-white italic tracking-wide uppercase drop-shadow-md">
                ¡A Jugar!
              </span>
              <Play className="w-8 h-8 fill-current text-white" />
            </div>

            {/* Shine effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10"></div>
          </button>
        </div>
      </div>
    </div>
  );
}