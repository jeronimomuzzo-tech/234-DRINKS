export interface HitsterTrack {
    id: string;
    name: string;
    artist: string;
    year: number;
    releaseDate: string;
    previewUrl: string;
    artworkUrl: string;
}

export interface CuratedPlaylist {
    id: string;
    name: string;
    description: string;
    icon: string;
    gradient: string;
    queries: string[];
}

export const CURATED_PLAYLISTS: CuratedPlaylist[] = [
    {
        id: 'reggaeton-clasico',
        name: 'Reggaeton Old School 🌴',
        description: 'Daddy Yankee, Don Omar, Wisin & Yandel, Plan B',
        icon: '🔥',
        gradient: 'from-amber-500 to-orange-700',
        queries: [
            'Daddy Yankee Gasolina', 'Don Omar Dale Don Dale', 'Wisin y Yandel Rakata',
            'Plan B Candy', 'Calle 13 Atrevete te te', 'Tego Calderon Pa que retozen',
            'Zion y Lennox Hay Algo En Ti', 'Alexis y Fido 5 Letras', 'Hector El Father Sola',
            'Angel y Khriz Ven Bailalo', 'Ivy Queen Yo Quiero Bailar', 'Don Omar Danza Kuduro',
            'Daddy Yankee Rompe', 'Wisin y Yandel Mayor Que Yo', 'J Balvin 6 AM'
        ]
    },
    {
        id: 'reggaeton-moderno',
        name: 'Reggaeton & Trap Actual ⚡',
        description: 'Bad Bunny, Feid, Karol G, Rauw Alejandro, Duki',
        icon: '💎',
        gradient: 'from-pink-500 to-purple-700',
        queries: [
            'Bad Bunny Dtmf', 'Feid Feliz Cumpleanos Ferxxo', 'Karol G Provenza',
            'Rauw Alejandro Todo De Ti', 'Quevedo Bizarrap Music Sessions', 'Bizarrap Shakira',
            'Cris Mj Una Noche En Medellin', 'Pailita Ultra Solo', 'Duki She Don Give a FO',
            'Mora La Inocente', 'Bad Bunny Titi Me Pregunto', 'Manuel Turizo La Bachata',
            'Rosalia Despecha', 'Myke Towers Lala', 'Young Cister La Terapia'
        ]
    },
    {
        id: 'rock-pop-latino',
        name: 'Rock Latino & Clásicos 🎸',
        description: 'Soda Stereo, Los Prisioneros, Los Bunkers, Enanitos Verdes',
        icon: '🎸',
        gradient: 'from-blue-600 to-indigo-800',
        queries: [
            'Soda Stereo De Musica Ligera', 'Los Prisioneros Tren Al Sur', 'Los Bunkers Bailando Solo',
            'Enanitos Verdes Lamento Boliviano', 'La Ley El Duelo', 'Charly Garcia Demoliendo Hoteles',
            'Andres Calamaro Flaca', 'Mana Clavado En Un Rincon', 'Los Fabulosos Cadillacs Matador',
            'Vilma Palma La Pachanga', 'Los Tres La Espada y La Pared', 'Cafe Tacvba Ingrata'
        ]
    },
    {
        id: 'hits-2000s',
        name: 'Hits 2000s & Nostalgia 🪩',
        description: 'Britney, Black Eyed Peas, Shakira, Rihanna, Avicii',
        icon: '✨',
        gradient: 'from-fuchsia-500 to-rose-600',
        queries: [
            'Britney Spears Toxic', 'Black Eyed Peas I Gotta Feeling', 'Shakira Hips Dont Lie',
            'Rihanna Umbrella', 'Avicii Wake Me Up', 'Lady Gaga Bad Romance',
            'David Guetta Titanium', 'Katy Perry Firework', 'Eminem Lose Yourself',
            'Outkast Hey Ya', 'Pitbull Give Me Everything', 'LMFAO Party Rock Anthem'
        ]
    },
    {
        id: 'cumbia-fiesta',
        name: 'Cumbia & Previas 🍻',
        description: 'Amar Azul, Ke Personajes, Damas Gratis, La Noche',
        icon: '🍻',
        gradient: 'from-emerald-500 to-teal-700',
        queries: [
            'Amar Azul Yo Me Enamore', 'Ke Personajes Un Finde', 'Damas Gratis No Te Creas Tan Importante',
            'La Noche Quiero Ser Libre', 'Noche de Brujas Me Gusta Todo De Ti', 'Ráfaga Una Cerveza',
            'Gilda No Me Arrepiento', 'Los Palmeras El Bombon', 'Santaferia El Gil De Tu Ex',
            'La Combo Tortuga Soy Feo Pero Rico', 'Agapornis Si Te Vas', 'Marama Noche Loca'
        ]
    },
    {
        id: 'all-time-classics',
        name: 'Grandes Éxitos Mundiales 🌍',
        description: 'Michael Jackson, Queen, Madonna, ABBA, Bon Jovi',
        icon: '👑',
        gradient: 'from-yellow-500 to-amber-700',
        queries: [
            'Michael Jackson Billie Jean', 'Queen Bohemian Rhapsody', 'Madonna Like a Prayer',
            'ABBA Dancing Queen', 'Bon Jovi Livin on a Prayer', 'Earth Wind Fire September',
            'A-ha Take On Me', 'Wham Careless Whisper', 'Guns N Roses Sweet Child O Mine',
            'The Police Every Breath You Take', 'Whitney Houston I Wanna Dance With Somebody', 'Cyndi Lauper Girls Just Want to Have Fun'
        ]
    }
];

export async function searchTracks(query: string, limit = 25): Promise<HitsterTrack[]> {
    try {
        const response = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}`
        );
        const data = await response.json();

        if (!data.results) return [];

        const validTracks: HitsterTrack[] = data.results
            .filter((item: any) => item.previewUrl && item.releaseDate && item.trackName)
            .map((item: any) => {
                const year = new Date(item.releaseDate).getFullYear();
                // Upgrade artwork resolution from 100x100 to 600x600 if available
                const artwork = item.artworkUrl100
                    ? item.artworkUrl100.replace('100x100bb', '600x600bb')
                    : 'https://placehold.co/400x400/22c55e/ffffff?text=🎵';

                return {
                    id: String(item.trackId),
                    name: item.trackName,
                    artist: item.artistName,
                    year: isNaN(year) ? 2000 : year,
                    releaseDate: item.releaseDate,
                    previewUrl: item.previewUrl,
                    artworkUrl: artwork
                };
            });

        return validTracks;
    } catch (e) {
        console.error("Music API search error:", e);
        return [];
    }
}

export async function loadPlaylistTracks(playlist: CuratedPlaylist): Promise<HitsterTrack[]> {
    const promises = playlist.queries.map(q => searchTracks(q, 1));
    const results = await Promise.all(promises);

    const tracks: HitsterTrack[] = [];
    const seenIds = new Set<string>();

    for (const res of results) {
        if (res && res.length > 0) {
            const track = res[0];
            if (!seenIds.has(track.id)) {
                seenIds.add(track.id);
                tracks.push(track);
            }
        }
    }

    // Shuffle tracks
    return tracks.sort(() => Math.random() - 0.5);
}
