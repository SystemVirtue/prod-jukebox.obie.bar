
// =============================================================================
// ==                          youtubeManager.js                             ==
// ==                   YouTube API and Player Management                     ==
// =============================================================================

import { PLAYER_CONFIG } from './playerConfig.js';

export class YouTubeManager {
    constructor(statusManager, fadeManager, commandProcessor) {
        this.player = null;
        this.isPlayerReady = false;
        this.statusManager = statusManager;
        this.fadeManager = fadeManager;
        this.commandProcessor = commandProcessor;
        this.apiReadyCheckTimeoutId = null;
        
        this.setupAPIReadyTimeout();
    }

    setupAPIReadyTimeout() {
        this.apiReadyCheckTimeoutId = setTimeout(() => {
            if (!this.isPlayerReady) {
                console.error(`DEBUG: [PlayerWin] YouTube API or Player Ready event timed out after ${PLAYER_CONFIG.PLAYER_READY_TIMEOUT_MS / 1000} seconds.`);
                this.statusManager.displayPlayerError("Player Failed to Initialize (Timeout)");
                const targetElement = document.getElementById(PLAYER_CONFIG.PLAYER_ELEMENT_ID);
                if(targetElement) { 
                    const computedStyle = window.getComputedStyle(targetElement); 
                    console.error(`DEBUG: [PlayerWin] Timeout occurred. Target display: '${computedStyle.display}', visibility: '${computedStyle.visibility}'`); 
                } else { 
                    console.error("DEBUG: [PlayerWin] Timeout occurred. Target element not found at timeout."); 
                }
            } else {
                console.log("DEBUG: [PlayerWin] API Ready timeout check passed (player was already ready).");
            }
        }, PLAYER_CONFIG.PLAYER_READY_TIMEOUT_MS);
    }

    initializePlayer() {
        console.log("DEBUG: [PlayerWin] >>> onYouTubeIframeAPIReady called <<<");
        if (this.apiReadyCheckTimeoutId) {
            clearTimeout(this.apiReadyCheckTimeoutId);
            console.log("DEBUG: [PlayerWin] Cleared API ready timeout.");
        }

        if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
            console.error("DEBUG: [PlayerWin] FATAL - YT or YT.Player is UNDEFINED!");
            this.statusManager.displayPlayerError("YT API Load Fail");
            this.isPlayerReady = false;
            return;
        }
        console.log("DEBUG: [PlayerWin] YT object available.");

        try {
            const targetElement = document.getElementById(PLAYER_CONFIG.PLAYER_ELEMENT_ID);
            if (!targetElement) {
                console.error("DEBUG: [PlayerWin] FATAL - Target element '#youtube-fullscreen-player' missing!");
                this.statusManager.displayPlayerError("Player Div Missing");
                this.isPlayerReady = false;
                return;
            }
            console.log("DEBUG: [PlayerWin] Target element found.");

            this.createPlayerWhenReady(targetElement);

        } catch (e) {
            console.error("DEBUG: [PlayerWin] Error in onYouTubeIframeAPIReady:", e);
            this.isPlayerReady = false; 
            this.statusManager.displayPlayerError("Initialization Error");
        }
    }

    createPlayerWhenReady(targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(targetElement);
        console.log(`DEBUG: [PlayerWin] Checking dimensions - W: ${rect.width}, H: ${rect.height}, Display: ${computedStyle.display}`);

        if (rect.width > 0 && rect.height > 0 && computedStyle.display !== 'none') {
            console.log("DEBUG: [PlayerWin] Target element has dimensions. Creating player.");
            try {
                this.player = new YT.Player(PLAYER_CONFIG.PLAYER_ELEMENT_ID, {
                    height: '100%',
                    width: '100%',
                    playerVars: PLAYER_CONFIG.PLAYER_VARS,
                    events: {
                        'onReady': this.onPlayerReady.bind(this),
                        'onStateChange': this.onPlayerStateChange.bind(this),
                        'onError': this.onPlayerError.bind(this)
                    }
                });

                if (this.player && typeof this.player.addEventListener === 'function') {
                    console.log("DEBUG: [PlayerWin] YT.Player object CREATED (waiting for onReady event).");
                } else {
                    console.error("DEBUG: [PlayerWin] YT.Player object creation FAILED silently.");
                    this.isPlayerReady = false; 
                    this.statusManager.displayPlayerError("Player Object Create Fail");
                }
            } catch(e) {
                console.error("DEBUG: [PlayerWin] CRITICAL - Exception during new YT.Player() constructor.", e);
                this.isPlayerReady = false; 
                this.statusManager.displayPlayerError("Player Create Exception");
            }
        } else {
            console.log("DEBUG: [PlayerWin] Target element has zero dimensions or is hidden. Retrying...");
            setTimeout(() => this.createPlayerWhenReady(targetElement), 100);
        }
    }

    onPlayerReady(event) {
        console.log("%c DEBUG: [PlayerWin] >>> onPlayerWindowReady EVENT FIRED <<<", "color: green; font-weight: bold;");
        this.isPlayerReady = true;
        this.commandProcessor.setPlayerReady(true);
        console.log("DEBUG: [PlayerWin][Ready] isPlayerReady flag set to TRUE");

        if(this.player && typeof this.player.getPlayerState === 'function') {
            console.log("DEBUG: [PlayerWin][Ready] Initial Player State:", this.player.getPlayerState());
        }

        if (typeof this.player.playVideo === 'function') {
            console.log("DEBUG: [PlayerWin][Ready] Explicitly calling playVideo() to ensure autoplay");
            this.player.playVideo();
            setTimeout(() => {
                try {
                    if (this.player && typeof this.player.unMute === 'function' && typeof this.player.getPlayerState === 'function') {
                        if (this.player.getPlayerState() === YT.PlayerState.PLAYING) {
                            this.player.unMute();
                            console.log("DEBUG: [PlayerWin] Successfully unmuted after autoplay");
                        }
                    }
                } catch(e) {
                    console.warn("DEBUG: [PlayerWin] Failed to unmute:", e);
                }
            }, 1000);
        }

        this.statusManager.sendPlayerStatus('ready');
        this.commandProcessor.processStoredCommand();
    }

    onPlayerStateChange(event) {
        const newState = event.data;
        console.log("DEBUG: [PlayerWin] State Change:", newState, `(${ YT.PlayerState[newState] || 'Unknown' })`);

        if (newState === YT.PlayerState.ENDED && !this.fadeManager.isFadingOut) {
            console.log("DEBUG: [PlayerWin] Video Ended naturally. Current video ID:", this.statusManager.getCurrentVideoId());
            this.statusManager.sendPlayerStatus('ended', { id: this.statusManager.getCurrentVideoId() });
            this.statusManager.setCurrentVideoId(null);
        } else if (newState === YT.PlayerState.PLAYING) {
            console.log("DEBUG: [PlayerWin] Video State: PLAYING.");
            try {
                const videoData = event.target?.getVideoData?.();
                if (videoData?.video_id) {
                    this.statusManager.setCurrentVideoId(videoData.video_id);
                    console.log("DEBUG: [PlayerWin] Updated currentPlayerVideoId to:", videoData.video_id);
                    
                    this.statusManager.sendPlayerStatus('playing', { 
                        id: videoData.video_id,
                        title: videoData.title,
                        videoId: videoData.video_id
                    });
                }
            } catch(e){ 
                console.warn("Could not get video data on play state change:", e); 
            }
            this.fadeManager.resetFadeOverlayVisuals();
        }
    }

    onPlayerError(event) {
        console.error(`%c DEBUG: [PlayerWin] >>> onPlayerError EVENT FIRED <<< Code: ${event.data}`, "color: red; font-weight: bold;");
        const message = PLAYER_CONFIG.ERROR_MESSAGES[event.data] || `Unknown error ${event.data}`;
        console.error(`DEBUG: [PlayerWin] YouTube Player Error: ${message}`);

        this.statusManager.displayPlayerError(`Player Error: ${message} (${event.data})`);
        this.statusManager.sendPlayerStatus('error', { 
            code: event.data, 
            message: message, 
            id: this.statusManager.getCurrentVideoId() 
        });
        this.statusManager.setCurrentVideoId(null);
    }

    getPlayer() {
        return this.player;
    }
}
