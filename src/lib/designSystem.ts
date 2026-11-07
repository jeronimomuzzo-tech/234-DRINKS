import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- COLOR PALETTE (BENTO GRID) ---
export const COLORS = {
    background: 'bg-[#09090b]', // Deep Zinc Black
    cardBg: 'bg-zinc-900/50',
    text: {
        primary: 'text-white',
        secondary: 'text-zinc-400',
        accent: 'text-white' // Usually on colored backgrounds
    },
    games: {
        pre: {
            gradient: 'from-blue-500 to-cyan-400',
            shadow: 'shadow-blue-500/20',
            border: 'border-blue-400/20',
            iconUrl: '🍺'
        },
        hitster: {
            gradient: 'from-green-500 to-emerald-400',
            shadow: 'shadow-green-500/20',
            border: 'border-green-400/20',
            iconUrl: '🎵'
        },
        bomba: {
            gradient: 'from-red-600 to-orange-500',
            shadow: 'shadow-red-500/20',
            border: 'border-red-400/20',
            iconUrl: '💣'
        },
        cards: {
            gradient: 'from-purple-600 to-pink-500', // Social/Yo Nunca
            shadow: 'shadow-purple-500/20',
            border: 'border-purple-400/20',
            iconUrl: '🃏'
        },
        truth: {
            gradient: 'from-pink-500 to-rose-400',
            shadow: 'shadow-pink-500/20',
            border: 'border-pink-400/20',
            iconUrl: '🎭'
        },
        slots: {
            gradient: 'from-yellow-500 to-amber-400',
            shadow: 'shadow-yellow-500/20',
            border: 'border-yellow-400/20',
            iconUrl: '🎰'
        }
    }
};

// --- ANIMATION VARIANTS (FRAMER MOTION) ---
export const ANIMATIONS = {
    gridContainer: {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    },
    cardItem: {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    },
    tap: { scale: 0.95 }
};
