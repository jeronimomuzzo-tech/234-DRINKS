import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getToken, loginWithSpotify, refreshToken } from '../lib/spotify';

interface SpotifyContextType {
    token: string | null;
    player: any | null;
    deviceId: string | null;
    isPaused: boolean;
    isActive: boolean;
    login: (target?: string, forceDialog?: boolean) => void;
    logout: () => void;
    refreshTokenNow: () => Promise<string | null>;
}

const SpotifyContext = createContext<SpotifyContextType>({
    token: null,
    player: null,
    deviceId: null,
    isPaused: true,
    isActive: false,
    login: () => { },
    logout: () => { },
    refreshTokenNow: async () => null,
});

export const useSpotify = () => useContext(SpotifyContext);

export const SpotifyProvider = ({ children }: { children: React.ReactNode }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('spotify_access_token'));
    const [player, setPlayer] = useState<any>(null);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const [isPaused, setPaused] = useState(false);
    const [isActive, setActive] = useState(false);

    const logout = useCallback(() => {
        setToken(null);
        setPlayer(null);
        setDeviceId(null);
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_refresh_token');
        localStorage.removeItem('spotify_token_expires_at');
        localStorage.removeItem('spotify_code_verifier');
        localStorage.removeItem('spotify_redirect_target');
    }, []);

    // Refresh token helper
    const refreshTokenNow = useCallback(async (): Promise<string | null> => {
        const storedRefreshToken = localStorage.getItem('spotify_refresh_token');
        if (!storedRefreshToken) {
            console.warn("No refresh token available");
            return null;
        }

        try {
            console.log("Spotify: Refreshing access token...");
            const data = await refreshToken(storedRefreshToken);
            if (data.access_token) {
                localStorage.setItem('spotify_access_token', data.access_token);
                if (data.refresh_token) {
                    localStorage.setItem('spotify_refresh_token', data.refresh_token);
                }
                const expiresInMs = (data.expires_in || 3600) * 1000;
                localStorage.setItem('spotify_token_expires_at', String(Date.now() + expiresInMs));
                setToken(data.access_token);
                return data.access_token;
            } else if (data?.error === 'invalid_grant') {
                console.warn("Spotify: Refresh token expired or revoked, logging out");
                logout();
            }
        } catch (e) {
            console.error("Spotify: Token refresh failed", e);
        }
        return null;
    }, [logout]);

    // Silent restore on mount if refresh token is present and token is expired or missing
    useEffect(() => {
        const storedToken = localStorage.getItem('spotify_access_token');
        const storedRefreshToken = localStorage.getItem('spotify_refresh_token');
        const expiresAt = Number(localStorage.getItem('spotify_token_expires_at') || '0');

        const isExpired = !storedToken || !expiresAt || Date.now() >= (expiresAt - 60000);

        if (storedRefreshToken && isExpired) {
            console.log("Spotify: Startup check detected expired or missing token. Refreshing immediately...");
            refreshTokenNow();
        }
    }, [refreshTokenNow]);

    // Handle Token Refresh / Initial Load / Auth Callbacks
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const authChannel = new BroadcastChannel('spotify_auth_channel');

        const isPopup = Boolean(window.opener || window.name === 'Spotify Login');

        // Helper to update state
        const updateTokenState = (newToken: string, expiresIn?: number) => {
            console.log("Spotify: Updating token state", newToken.substring(0, 10));
            setToken(newToken);
            const duration = (expiresIn || 3600) * 1000;
            localStorage.setItem('spotify_token_expires_at', String(Date.now() + duration));
        };

        // Case A: Running inside POPUP window
        if (code && isPopup) {
            console.log("Popup: Code received. Exchanging token internally...");
            getToken(code).then(data => {
                if (data.access_token) {
                    localStorage.setItem('spotify_access_token', data.access_token);
                    if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
                    const expiresIn = data.expires_in || 3600;
                    localStorage.setItem('spotify_token_expires_at', String(Date.now() + expiresIn * 1000));

                    try {
                        window.opener?.postMessage({ type: 'SPOTIFY_TOKEN_SUCCESS', token: data.access_token, expiresIn }, '*');
                    } catch (e) { }
                    authChannel.postMessage({ type: 'SPOTIFY_TOKEN_SUCCESS', token: data.access_token, expiresIn });

                    setTimeout(() => window.close(), 500);
                } else {
                    try { window.opener?.postMessage({ type: 'SPOTIFY_CODE', code }, '*'); } catch (e) { }
                    authChannel.postMessage({ type: 'SPOTIFY_CODE', code });
                    setTimeout(() => window.close(), 100);
                }
            }).catch(e => {
                console.error("Popup: Token Error", e);
                try { window.opener?.postMessage({ type: 'SPOTIFY_CODE', code }, '*'); } catch (err) { }
                authChannel.postMessage({ type: 'SPOTIFY_CODE', code });
                setTimeout(() => window.close(), 100);
            });

            return;
        }

        // Case B: Direct redirect in MAIN WINDOW (Mobile or standard flow)
        if (code && !isPopup) {
            console.log("Main: Code detected in URL search. Exchanging token directly...");
            getToken(code).then(data => {
                if (data.access_token) {
                    localStorage.setItem('spotify_access_token', data.access_token);
                    if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
                    updateTokenState(data.access_token, data.expires_in);

                    // Clean URL parameter so refresh doesn't fail
                    const cleanPath = window.location.pathname.replace('/callback', '') || '/';
                    window.history.replaceState({}, document.title, cleanPath);
                }
            }).catch(e => {
                console.error("Main: Error exchanging code", e);
            });
        }

        // --- LISTENERS FOR POPUP / TABS ---
        const handlePostMessage = (event: MessageEvent) => {
            if (event.data?.type === 'SPOTIFY_TOKEN_SUCCESS' && event.data.token) {
                console.log("Main: Received TOKEN via postMessage");
                updateTokenState(event.data.token, event.data.expiresIn);
            } else if (event.data?.type === 'SPOTIFY_CODE' && event.data.code) {
                console.log("Main: Received CODE via postMessage");
                getToken(event.data.code).then(data => {
                    if (data.access_token) {
                        localStorage.setItem('spotify_access_token', data.access_token);
                        if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
                        updateTokenState(data.access_token, data.expires_in);
                    }
                });
            }
        };

        authChannel.onmessage = (event) => {
            if (event.data?.type === 'SPOTIFY_TOKEN_SUCCESS' && event.data.token) {
                console.log("Main: Received TOKEN via BroadcastChannel");
                updateTokenState(event.data.token, event.data.expiresIn);
            } else if (event.data?.type === 'SPOTIFY_CODE' && event.data.code) {
                console.log("Main: Received CODE via BroadcastChannel");
                getToken(event.data.code).then(data => {
                    if (data.access_token) {
                        localStorage.setItem('spotify_access_token', data.access_token);
                        if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
                        updateTokenState(data.access_token, data.expires_in);
                    }
                });
            }
        };

        const handleStorage = (event: StorageEvent) => {
            if (event.key === 'spotify_access_token' && event.newValue) {
                console.log("Main: Detected token in localStorage");
                updateTokenState(event.newValue);
            }
        };

        const checkExpiryAndRefresh = () => {
            const stored = localStorage.getItem('spotify_access_token');
            if (stored && stored !== token) {
                updateTokenState(stored);
            }
            const storedRefreshToken = localStorage.getItem('spotify_refresh_token');
            const expiresAt = Number(localStorage.getItem('spotify_token_expires_at') || '0');
            if (storedRefreshToken && (!expiresAt || Date.now() >= expiresAt - 60000)) {
                console.log("Spotify: Visibility/Focus detected expired token, refreshing...");
                refreshTokenNow();
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkExpiryAndRefresh();
            }
        };

        const handleTokenRefreshed = (e: any) => {
            if (e.detail) {
                console.log("Spotify: Token refreshed externally, updating state...");
                setToken(e.detail);
            }
        };

        const handleCustomLogout = () => {
            logout();
        };

        // Scheduled check for auto-refresh every 60s
        const refreshTimer = setInterval(() => {
            const expiresAt = Number(localStorage.getItem('spotify_token_expires_at') || '0');
            if (expiresAt && Date.now() > expiresAt - 180000) { // 3 mins before expiry
                refreshTokenNow();
            }
        }, 60000);

        window.addEventListener('message', handlePostMessage);
        window.addEventListener('storage', handleStorage);
        window.addEventListener('focus', checkExpiryAndRefresh);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('spotify_token_refreshed', handleTokenRefreshed);
        window.addEventListener('spotify_logout', handleCustomLogout);

        return () => {
            clearInterval(refreshTimer);
            window.removeEventListener('message', handlePostMessage);
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('focus', checkExpiryAndRefresh);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('spotify_token_refreshed', handleTokenRefreshed);
            window.removeEventListener('spotify_logout', handleCustomLogout);
            authChannel.close();
        };
    }, [token, refreshTokenNow, logout]);

    // Load Web Playback SDK for desktop browsers
    useEffect(() => {
        if (!token) return;

        // Skip loading on mobile browsers to avoid silent failures
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isMobile) {
            console.log("Mobile browser detected: Web Playback SDK is not supported, using Spotify Connect.");
            return;
        }

        const script = document.createElement("script");
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;

        document.body.appendChild(script);

        (window as any).onSpotifyWebPlaybackSDKReady = () => {
            const playerInstance = new (window as any).Spotify.Player({
                name: '🔊 234 Drinks (Web Player)',
                getOAuthToken: (cb: any) => { cb(token); },
                volume: 1.0
            });

            playerInstance.addListener('ready', ({ device_id }: any) => {
                console.log('Ready with Device ID', device_id);
                setDeviceId(device_id);
            });

            playerInstance.addListener('not_ready', ({ device_id }: any) => {
                console.log('Device ID has gone offline', device_id);
                setDeviceId(null);
            });

            playerInstance.addListener('player_state_changed', (state: any) => {
                if (!state) return;
                setPaused(state.paused);
                setActive(true);
            });

            playerInstance.addListener('initialization_error', ({ message }: any) => { console.error("Init Error:", message); });
            playerInstance.addListener('authentication_error', ({ message }: any) => {
                console.error("Auth Error:", message);
                refreshTokenNow();
            });
            playerInstance.addListener('account_error', ({ message }: any) => { console.error("Account Error:", message); });
            playerInstance.addListener('playback_error', ({ message }: any) => { console.error("Playback Error:", message); });

            playerInstance.connect();
            setPlayer(playerInstance);
        };

        return () => {
            if (player) player.disconnect();
        }
    }, [token, refreshTokenNow]);

    const login = (target?: string, forceDialog: boolean = false) => {
        if (forceDialog) {
            logout();
        }
        loginWithSpotify(target, forceDialog);
    };

    return (
        <SpotifyContext.Provider value={{ token, player, deviceId, isPaused, isActive, login, logout, refreshTokenNow }}>
            {children}
        </SpotifyContext.Provider>
    );
};
