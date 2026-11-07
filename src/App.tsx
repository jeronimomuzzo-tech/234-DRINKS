import { useState, useEffect } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { GameConfigScreen } from './components/GameConfigScreen';
import { GameScreen } from './components/GameScreen';
import { DrinkHourGame } from './components/games/DrinkHourGame';
import { GameCategory, GameConfig } from './types';

function App() {
  const [screen, setScreen] = useState<'home' | 'config' | 'game'>('home');
  const [selectedGame, setSelectedGame] = useState<GameCategory | null>(null);
  const [gameConfig, setGameConfig] = useState<GameConfig>({ players: 4, intensity: 50 });

  const handleGameSelect = (game: GameCategory) => {
    setSelectedGame(game);
    setScreen('config');
  };

  const handleStartGame = (config: GameConfig) => {
    setGameConfig(config);
    setScreen('game');
  };

  const handleBackToHome = () => {
    localStorage.removeItem('spotify_redirect_target');
    setScreen('home');
    setSelectedGame(null);
  };

  // Restore session if returning from Spotify Login (e.g. on mobile redirect)
  useEffect(() => {
    const target = localStorage.getItem('spotify_redirect_target');
    const urlParams = new URLSearchParams(window.location.search);
    const hasCode = urlParams.has('code');
    const hasToken = Boolean(localStorage.getItem('spotify_access_token'));

    if (target === 'hitster' && (hasCode || hasToken)) {
      localStorage.removeItem('spotify_redirect_target');
      setSelectedGame({
        id: 'hitster-drinks',
        title: 'Hitster Drinks',
        description: 'Guess the year! Older or newer? Wrong guess = Drink.',
        color: '',
        gradient: 'bg-gradient-to-br from-[#1DB954] to-emerald-800',
        icon: 'music',
        category: 'music'
      });
      setScreen('game');
    }
  }, []);

  const handleBackToConfig = () => {
    setScreen('config');
  };

  return (
    <div className="min-h-screen text-white">
      {screen === 'home' && <HomeScreen onGameSelect={handleGameSelect} onOpenConfig={handleBackToConfig} />}
      {screen === 'config' && selectedGame && (
        <GameConfigScreen
          game={selectedGame}
          onBack={handleBackToHome}
          onStart={handleStartGame}
          initialConfig={gameConfig}
        />
      )}
      {screen === 'game' && selectedGame && (
        <GameScreen
          game={selectedGame}
          config={gameConfig}
          onBack={handleBackToConfig}
          onExit={handleBackToHome}
        />
      )}
    </div>
  );
}

export default App;