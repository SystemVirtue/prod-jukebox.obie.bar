
// =============================================================================
// ==                            playerConfig.js                             ==
// ==                  Configuration and Constants for Player                ==
// =============================================================================

export const PLAYER_CONFIG = {
    COMMAND_STORAGE_KEY: 'jukeboxCommand',
    STATUS_STORAGE_KEY: 'jukeboxStatus',
    PLAYER_READY_TIMEOUT_MS: 15000,
    FADE_INTERVAL_MS: 50,
    PLAYER_ELEMENT_ID: 'youtube-fullscreen-player',
    FADE_OVERLAY_ID: 'fade-overlay',
    
    PLAYER_VARS: {
        'playsinline': 1,
        'controls': 0,
        'disablekb': 1,
        'rel': 0,
        'autoplay': 1,
        'mute': 0,
        'fs': 0,
        'modestbranding': 1,
        'iv_load_policy': 3
    },
    
    ERROR_MESSAGES: {
        2: 'Invalid parameter',
        5: 'HTML5 player error',
        100: 'Video not found',
        101: 'Playback disallowed (embed)',
        150: 'Playback disallowed (embed)'
    }
};
