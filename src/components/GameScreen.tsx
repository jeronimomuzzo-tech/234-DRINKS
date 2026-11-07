import { useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { GameCategory, GameConfig } from '../types';
import { BusGame } from './games/BusGame';
import { PiramideGame } from './games/PiramideGame';
import { PreVsPreGame } from './games/PreVsPreGame';
import { HombreTresGame, CuartoReyGame } from './games/HombreTresGame';
import { LaBombaGame } from './games/LaBombaGame';
import { LaOllaGame } from './games/LaOllaGame';
import { HitsterGame } from './games/HitsterGame';
import { ScrollableContentGame } from './games/ScrollableContentGame';
import { LaPollaGame } from './games/LaPollaGame';
import { DrinkHourGame } from './games/DrinkHourGame';
import {
  yoNuncaGame,
  kissListGame,
  varGame
} from './GameData';


interface GameScreenProps {
  game: GameCategory;
  config: GameConfig;
  onBack: () => void;
  onExit: () => void;
}

export function GameScreen({ game, config, onBack, onExit }: GameScreenProps) {
  const renderGame = () => {
    switch (game.id) {
      case 'pre-vs-pre':
        return <PreVsPreGame onExit={onExit} />;
      case 'hitster-drinks':
        return <HitsterGame onExit={onExit} />;
      case 'la-bomba':
        return <LaBombaGame onExit={onExit} />;
      case 'la-olla':
        return <LaOllaGame onExit={onExit} />;
      case 'bus':
        return <BusGame onExit={onExit} config={config} />;
      case 'piramide':
        return <PiramideGame onExit={onExit} config={config} />;
      case 'hombre-tres':
        return <HombreTresGame onExit={onExit} config={config} />;
      case 'cuarto-rey':
        return <CuartoReyGame onExit={onExit} config={config} />;
      // Scrollable Feed Games
      case 'yo-nunca':
        return <ScrollableContentGame onExit={onExit} title="Yo Nunca" data={yoNuncaGame} color="#4C6EF5" />;
      case 'the-list':
      case 'kiss-list':
        return <ScrollableContentGame onExit={onExit} title="The Nuca Nunca" data={kissListGame} color="#7048E8" />;
      case 'la-polla':
        return <LaPollaGame onExit={onExit} />;
      case 'var':
        return <ScrollableContentGame onExit={onExit} title="VAR" data={varGame} color="#10b981" />;
      case 'drink-hour':
        return <DrinkHourGame onExit={onExit} />;
      default:
        // Fallback for unmapped games
        return (
          <ScrollableContentGame
            onExit={onExit}
            title={game.title}
            data={['Juego en construcción...', 'Pronto más contenido']}
            color={game.color || '#ffffff'}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col h-screen fixed inset-0 z-50">
      {/* We use fixed h-screen to ensure scroll containers work properly */}
      <div className="flex-1 overflow-hidden relative h-full">
        {renderGame()}
      </div>
    </div>
  );
}