import { useState, useEffect } from 'react';
import { Download, Share } from 'lucide-react';

export function InstallPWA() {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Check Install Prompt (Android/Desktop)
    const handler = (e: any) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling if needed

    if (isIOS) {
      setShowIOSInstructions(true);
    } else if (promptInstall) {
      promptInstall.prompt();
    } else {
      // Fallback or just show iOS instructions if doubtful
      if (isIOS) setShowIOSInstructions(true);
    }
  };

  if (isInstalled) return null;
  // If not iOS and no prompt yet (and not dev env where we might wanna force show), 
  // we could hide it. But for this UI we probably want it visible or just check support.
  // For now, let's always show it if it's not installed, as a call to action.

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="w-full bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold text-lg py-4 rounded-2xl shadow-xl shadow-pink-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-white/10"
      >
        <Download size={22} className="stroke-2" />
        Instalar App
      </button>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-sm rounded-3xl p-6 relative shadow-2xl">
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                <Share size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Instalar en iPhone</h3>
              <div className="space-y-4 text-left p-2">
                <p className="text-gray-300 flex items-center gap-3">
                  1. Toca <span className="text-blue-400 font-bold">Compartir</span> <Share size={16} />
                </p>
                <p className="text-gray-300 flex items-center gap-3">
                  2. Elige <span className="text-white font-bold">Agregar a Inicio</span>
                  <span className="bg-gray-700 px-2 py-0.5 rounded text-xs border border-gray-500">➕</span>
                </p>
              </div>
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="mt-6 w-full py-3 bg-white text-black font-bold rounded-xl"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
