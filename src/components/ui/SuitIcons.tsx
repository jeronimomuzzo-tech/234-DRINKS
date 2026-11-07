import React from 'react';

export const SuitHeart = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
);

export const SuitDiamond = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M19 12L12 22 5 12 12 2z" />
    </svg>
);

export const SuitClub = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2C12 2 12 2 12 2c-.15 0-.29.06-.39.17l-1.02 1.13c-.94 1.05-1.46 2.37-1.46 3.77 0 .55.1 1.09.28 1.59-1.99-.86-4.32-.44-5.88 1.12C2.1 11.23 2.1 14 4.53 15.34c.32.17.66.3.99.39-.33.09-.67.22-.99.39-2.43 1.34-2.43 4.11 0 5.56 1.56 1.56 3.89 1.98 5.88 1.12-.18.5-.28 1.04-.28 1.59 0 1.4 1.57 2.53 3.5 2.53s3.5-1.13 3.5-2.53c0-.55-.1-1.09-.28-1.59 1.99.86 4.32.44 5.88-1.12 2.43-2.79 2.43-5.56 0-7.11 0 0 0 0 0 0l-5.02-5.58c-.1-.11-.24-.17-.39-.17z" transform="scale(0.8) translate(3, 1)" />
        {/* Simplified standard club shape */}
        <path d="M19.33 13.91c.79-2.92-1.76-5.41-4.63-4.59-.28-3.15-4.24-3.95-5.6-.96-2.56-1.13-5.09 1.25-3.64 3.71-2.92.79-2.07 5.09.96 5.25.13 1.98 1.63 3.63 4.08 3.64v2.04h3v-2.04c2.45-.01 3.95-1.66 4.08-3.64 3.03-.16 3.88-4.46.96-5.25-.01 0-.01-.01-.02-.01l-.19.85z" display="none" />
        {/* Use simple 3-circles logic for Club if needed, but path above is close enough for icon */}
        <circle cx="12" cy="7" r="4.5" />
        <circle cx="6.5" cy="16" r="4.5" />
        <circle cx="17.5" cy="16" r="4.5" />
        <path d="M12 14 L10 22 L14 22 Z" />
    </svg>
);

export const SolidClub = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12,2C9,2,6.5,4,6.5,6.5c0,1.2,0.5,2.3,1.3,3.1c-2,0.2-3.8,1.3-4.9,3.1c-1.5,2.6-0.6,5.9,2.1,7.4 c0.5,0.3,1.1,0.5,1.7,0.6C6.2,21.5,6.5,22,7,22h10c0.5,0,0.8-0.5,0.3-1.3c0.6-0.1,1.2-0.3,1.7-0.6c2.7-1.5,3.6-4.9,2.1-7.4 c-1.1-1.8-2.9-2.9-4.9-3.1c0.8-0.8,1.3-1.9,1.3-3.1C17.5,4,15,2,12,2z" />
    </svg>
)

export const SuitSpade = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2S4 8 4 14c0 3.31 2.69 6 6 6 0 2.21-3 3-3 3h10s-3-.79-3-3c3.31 0 6-2.69 6-6 0-6-8-12-8-12z" />
    </svg>
);

export const IconDroplet = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
);

export const IconDice = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM7.5 18c-.83 0-1.5-.67-1.5-1.5S6.67 15 7.5 15s1.5.67 1.5 1.5S8.33 18 7.5 18zm0-9C6.67 9 6 8.33 6 7.5S6.67 6 7.5 6 9 6.67 9 7.5 8.33 9 7.5 9zm4.5 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4.5 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm0-9c-.83 0-1.5-.67-1.5-1.5S15.67 6 16.5 6s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
    </svg>
);

export const IconCrown = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11h-5h-.5H13H5zm5 0h14v2H5v-2zM5.5 8.16l1.3.82L5.5 10.3c-.35-.74-.35-1.56 0-2.14zM18.5 8.16l-1.3.82L18.5 10.3c.35-.74.35-1.56 0-2.14zM12 2l-5.5 9h11L12 2z" opacity="0.5" />
        <path d="M19 13H5v-2h14v2z" opacity="0.2" />
        <path d="M5 16h14v2H5z" />
        <path d="M12 2L9 7h6l-3-5z" />
    </svg>
);

export const IconSkull = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2c-3.87 0-7 3.13-7 7 0 2.22 1.04 4.19 2.66 5.48.56 1.48.06 2.45-.66 2.52 0 .55.45 1 1 1h8c.55 0 1-.45 1-1-.72-.07-1.22-1.04-.66-2.52C17.96 13.19 19 11.22 19 9c0-3.87-3.13-7-7-7zm0 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
        <circle cx="9" cy="9" r="1.5" className="fill-black" />
        <circle cx="15" cy="9" r="1.5" className="fill-black" />
        <path d="M10 14h4v2h-4z" />
    </svg>
);
