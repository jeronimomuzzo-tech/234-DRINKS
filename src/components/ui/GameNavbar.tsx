import { X } from 'lucide-react';

interface GameNavbarProps {
    onExit: () => void;
    title?: string;
    children?: React.ReactNode;
    className?: string;
}

export function GameNavbar({ onExit, title, children, className = "" }: GameNavbarProps) {
    return (
        <div className={`w-full flex items-center justify-between px-4 py-3 z-[100] fixed top-0 left-0 bg-[#212529] shadow-lg border-b border-white/5 ${className}`}>
            <button
                onClick={onExit}
                className="pointer-events-auto p-2 rounded-xl bg-[#fa5252] text-white hover:bg-red-400 active:translate-y-1 transition-all shadow-[0px_4px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none"
                aria-label="Salir del juego"
            >
                <X size={28} strokeWidth={3} />
            </button>

            {(title || children) && (
                <div className="flex items-center gap-2">
                    {title && <h2 className="text-white font-black text-xl uppercase tracking-wider italic">{title}</h2>}
                    {children}
                </div>
            )}

            {/* Spacer */}
            {(!children && title) ? <div className="w-10"></div> : null}
        </div>
    );
}
