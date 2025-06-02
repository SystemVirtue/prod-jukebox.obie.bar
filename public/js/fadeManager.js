
// =============================================================================
// ==                            fadeManager.js                              ==
// ==                      Audio and Visual Fade Effects                     ==
// =============================================================================

import { PLAYER_CONFIG } from './playerConfig.js';

export class FadeManager {
    constructor(player, statusManager) {
        this.player = player;
        this.statusManager = statusManager;
        this.fadeOverlay = null;
        this.fadeIntervalId = null;
        this.isFadingOut = false;
        
        // Cache overlay element
        document.addEventListener('DOMContentLoaded', () => {
            this.fadeOverlay = document.getElementById(PLAYER_CONFIG.FADE_OVERLAY_ID);
            if (!this.fadeOverlay) {
                console.error("DEBUG: [PlayerWin] CRITICAL - Fade overlay element not found on DOMContentLoaded!");
            }
            console.log("DEBUG: [PlayerWin] DOM Ready, overlay cached (if found).");
        });
    }

    startVisualAndAudioFade(durationMs) {
        if (!this.player || typeof this.player.getVolume !== 'function' || this.isFadingOut || !this.fadeOverlay) {
            console.warn("DEBUG: [PlayerWin] Cannot start fade");
            this.statusManager.sendPlayerStatus('fadeComplete', { id: this.statusManager.getCurrentVideoId() });
            return;
        }

        this.isFadingOut = true;
        let currentVolume = 100;
        try { 
            currentVolume = this.player.getVolume(); 
        } catch(e) { 
            console.warn("Could not get current volume, assuming 100."); 
        }

        const steps = durationMs / PLAYER_CONFIG.FADE_INTERVAL_MS;
        const volumeStep = steps > 0 ? (currentVolume / steps) : currentVolume;

        console.log(`DEBUG: [PlayerWin] Fading: Duration=${durationMs}ms, StartVol=${currentVolume}, Step=${volumeStep}, Steps=${steps}`);

        this.fadeOverlay.style.transitionDuration = `${durationMs / 1000}s`;
        this.fadeOverlay.classList.add('fading-out');

        if (this.fadeIntervalId) clearInterval(this.fadeIntervalId);

        this.fadeIntervalId = setInterval(() => {
            currentVolume -= volumeStep;
            if (currentVolume <= 0) {
                clearInterval(this.fadeIntervalId); 
                this.fadeIntervalId = null;
                console.log("DEBUG: [PlayerWin] Audio Fade Out Complete.");

                if (this.player && typeof this.player.setVolume === 'function') {
                    try {
                        this.player.setVolume(0);
                        if (typeof this.player.stopVideo === 'function') { 
                            this.player.stopVideo(); 
                        }
                        this.player.setVolume(100);
                        console.log("DEBUG: [PlayerWin] Video stopped, volume reset to 100.");
                    } catch(e) { 
                        console.error("Error during stop/volume reset:", e); 
                    }
                }

                this.isFadingOut = false;
                this.statusManager.sendPlayerStatus('fadeComplete', { id: this.statusManager.getCurrentVideoId() });
                this.statusManager.setCurrentVideoId(null);
            } else {
                if (this.player && typeof this.player.setVolume === 'function') {
                    try { 
                        this.player.setVolume(currentVolume); 
                    } catch(e) {}
                }
            }
        }, PLAYER_CONFIG.FADE_INTERVAL_MS);
    }

    resetFadeOverlayVisuals() {
        if (this.fadeOverlay && this.fadeOverlay.classList.contains('fading-out')) {
            console.log("DEBUG: [PlayerWin] Resetting fade overlay visuals.");
            this.fadeOverlay.classList.remove('fading-out');
        }
    }

    stopFade() {
        if (this.fadeIntervalId) {
            clearInterval(this.fadeIntervalId);
            this.fadeIntervalId = null;
        }
        this.isFadingOut = false;
        this.resetFadeOverlayVisuals();
    }
}
