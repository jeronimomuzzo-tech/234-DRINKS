const CLIENT_ID = '7c1931d9cf914d689558f2ad38469c64'; // Hardcoded for Spotify Dashboard compatibility
export const REDIRECT_URI = typeof window !== 'undefined'
    ? (import.meta.env.PROD
        ? 'https://234-drinks.vercel.app/callback'
        : `${window.location.origin}/callback`)
    : 'https://234-drinks.vercel.app/callback';

if (!CLIENT_ID) {
    console.error("CRITICAL: Spotify Client ID is missing.");
}

// Generates a random string for the code verifier
const generateRandomString = (length: number) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

// Hashes the code verifier for the code challenge
const sha256 = async (plain: string) => {
    const encoder = new TextEncoder()
    const data = encoder.encode(plain)
    return window.crypto.subtle.digest('SHA-256', data)
}

// Base64 encodes the hash
const base64encode = (input: ArrayBuffer) => {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
}

// Opens the native Spotify App on mobile / desktop via URL Scheme
export const openSpotifyApp = () => {
    window.location.href = 'spotify://';
};

export const loginWithSpotify = async (redirectTarget?: string) => {
    if (!CLIENT_ID) {
        alert("Error: Falta la 'Client ID' de Spotify. Configura la variable VITE_SPOTIFY_CLIENT_ID.");
        return;
    }

    if (redirectTarget) {
        window.localStorage.setItem('spotify_redirect_target', redirectTarget);
    }

    const codeVerifier = generateRandomString(64);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);

    window.localStorage.setItem('spotify_code_verifier', codeVerifier);

    const scope = 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative';
    const authUrl = new URL("https://accounts.spotify.com/authorize");

    const params = {
        response_type: 'code',
        client_id: CLIENT_ID,
        scope,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        redirect_uri: REDIRECT_URI,
    };

    authUrl.search = new URLSearchParams(params).toString();

    // Check if mobile device or standalone PWA
    // Open Popup
    const width = 450;
    const height = 730;
    const left = (window.innerWidth / 2) - (width / 2);
    const top = (window.innerHeight / 2) - (height / 2);

    const popup = window.open(
        authUrl.toString(),
        'Spotify Login',
        `width=${width},height=${height},top=${top},left=${left}`
    );

    if (!popup) {
        // Only redirect if browser completely blocked the popup
        window.location.href = authUrl.toString();
    }
}

export const getToken = async (code: string) => {
    const codeVerifier = window.localStorage.getItem('spotify_code_verifier');

    const payload = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: CLIENT_ID,
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
            code_verifier: codeVerifier || '',
        }),
    }

    const response = await fetch("https://accounts.spotify.com/api/token", payload);
    return await response.json();
}

export const refreshToken = async (storedRefreshToken: string) => {
    const payload = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: CLIENT_ID,
            grant_type: 'refresh_token',
            refresh_token: storedRefreshToken,
        }),
    }
    const response = await fetch("https://accounts.spotify.com/api/token", payload);
    return await response.json();
}

// Authenticated Spotify Fetch with automatic token refresh on 401 Unauthorized
export const spotifyFetch = async (url: string, token: string, options: RequestInit = {}): Promise<Response> => {
    let currentToken = token;
    if (typeof window !== 'undefined') {
        const storedToken = localStorage.getItem('spotify_access_token');
        if (storedToken && storedToken !== currentToken) {
            currentToken = storedToken;
        }
    }

    const headers: Record<string, string> = {
        'Authorization': `Bearer ${currentToken}`,
        ...((options.headers as Record<string, string>) || {})
    };

    let response = await fetch(url, { ...options, headers });

    // If 401 Unauthorized, automatically try to refresh token once!
    if (response.status === 401 && typeof window !== 'undefined') {
        const storedRefreshToken = localStorage.getItem('spotify_refresh_token');
        if (storedRefreshToken) {
            console.log("Spotify: 401 Unauthorized detected. Auto-refreshing access token...");
            try {
                const refreshData = await refreshToken(storedRefreshToken);
                if (refreshData && refreshData.access_token) {
                    localStorage.setItem('spotify_access_token', refreshData.access_token);
                    if (refreshData.refresh_token) {
                        localStorage.setItem('spotify_refresh_token', refreshData.refresh_token);
                    }
                    const expiresInMs = (refreshData.expires_in || 3600) * 1000;
                    localStorage.setItem('spotify_token_expires_at', String(Date.now() + expiresInMs));

                    window.dispatchEvent(new CustomEvent('spotify_token_refreshed', { detail: refreshData.access_token }));

                    // Retry request with fresh token
                    const retryHeaders: Record<string, string> = {
                        'Authorization': `Bearer ${refreshData.access_token}`,
                        ...((options.headers as Record<string, string>) || {})
                    };
                    response = await fetch(url, { ...options, headers: retryHeaders });
                } else if (refreshData?.error === 'invalid_grant') {
                    console.warn("Spotify: Refresh token revoked, clearing session");
                    localStorage.removeItem('spotify_access_token');
                    localStorage.removeItem('spotify_refresh_token');
                    localStorage.removeItem('spotify_token_expires_at');
                    window.dispatchEvent(new CustomEvent('spotify_logout'));
                }
            } catch (err) {
                console.error("Auto-refresh inside spotifyFetch failed", err);
            }
        }
    }

    return response;
};

export const fetchPlaylistTracks = async (token: string, playlistId: string) => {
    const response = await spotifyFetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&market=from_token`, token);
    return await response.json();
};

export const searchPlaylists = async (token: string, query: string) => {
    const response = await spotifyFetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=playlist&limit=50&market=from_token`, token);
    return await response.json();
};

export const getPlaylist = async (token: string, playlistId: string) => {
    const response = await spotifyFetch(`https://api.spotify.com/v1/playlists/${playlistId}`, token);
    return await response.json();
};

export const transferPlayback = async (token: string, deviceId: string, play = false) => {
    return await spotifyFetch('https://api.spotify.com/v1/me/player', token, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            device_ids: [deviceId],
            play: play
        })
    });
};

export const getAvailableDevices = async (token: string) => {
    const response = await spotifyFetch('https://api.spotify.com/v1/me/player/devices', token);
    return await response.json();
};

export const getUserPlaylists = async (token: string) => {
    const response = await spotifyFetch('https://api.spotify.com/v1/me/playlists?limit=50', token);
    return await response.json();
};

export const playTrack = async (
    token: string,
    trackUri: string,
    deviceId?: string,
    contextUri?: string
) => {
    const url = `https://api.spotify.com/v1/me/player/play${deviceId ? `?device_id=${deviceId}` : ''}`;

    // Prefer context + offset for playlists (Spotify native apps handle this with 100% reliability)
    const body: any = contextUri ? {
        context_uri: contextUri,
        offset: { uri: trackUri },
        position_ms: 0
    } : {
        uris: [trackUri],
        position_ms: 0
    };

    let response = await spotifyFetch(url, token, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    // If context_uri fails, fallback to direct uris array
    if (!response.ok && contextUri) {
        response = await spotifyFetch(url, token, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uris: [trackUri],
                position_ms: 0
            })
        });
    }

    return response;
};

