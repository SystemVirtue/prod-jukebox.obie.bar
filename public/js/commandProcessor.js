
// =============================================================================
// ==                         commandProcessor.js                            ==
// ==                    Command Processing and Execution                     ==
// =============================================================================

import { PLAYER_CONFIG } from './playerConfig.js';

export class CommandProcessor {
    constructor(player, statusManager, fadeManager) {
        this.player = player;
        this.statusManager = statusManager;
        this.fadeManager = fadeManager;
        this.isPlayerReady = false;
    }

    setPlayerReady(ready) {
        this.isPlayerReady = ready;
    }

    processStoredCommand() {
        try {
            const commandString = localStorage.getItem(PLAYER_CONFIG.COMMAND_STORAGE_KEY);
            if (commandString) {
                console.log("DEBUG: [PlayerWin] Found command in storage on load/ready:", commandString);
                const commandData = JSON.parse(commandString);
                if (this.isPlayerReady) {
                    this.executePlayerCommand(commandData);
                } else {
                    console.warn("DEBUG: [PlayerWin] Player not ready yet, command stored but not executed immediately.");
                }
            } else { 
                console.log("DEBUG: [PlayerWin] No command found in storage on load/ready."); 
            }
        } catch (e) { 
            console.error("DEBUG: [PlayerWin] Error processing stored command:", e); 
        }
    }

    handleStorageChange(event) {
        if (event.key === PLAYER_CONFIG.COMMAND_STORAGE_KEY && event.newValue && event.storageArea === localStorage) {
            console.log("DEBUG: [PlayerWin] Received command via storage event:", event.newValue);
            try {
                const commandData = JSON.parse(event.newValue);
                this.executePlayerCommand(commandData);
            } catch (e) { 
                console.error("DEBUG: [PlayerWin] Error parsing command from storage event:", e); 
            }
        }
    }

    executePlayerCommand(commandData) {
        if (!commandData || !commandData.action) { 
            return; 
        }

        if (!this.isPlayerReady || !this.player) {
            console.warn(`DEBUG: [PlayerWin] Player not ready when command '${commandData.action}' received. Ignoring.`);
            return;
        }

        console.log(`DEBUG: [PlayerWin] Executing action: ${commandData.action}`);
        try {
            if (commandData.action !== 'fadeOutAndBlack') {
                this.fadeManager.resetFadeOverlayVisuals();
            }

            switch (commandData.action) {
                case 'play':
                    this.handlePlayCommand(commandData);
                    break;

                case 'stop':
                    this.handleStopCommand();
                    break;

                case 'fadeOutAndBlack':
                    this.handleFadeCommand(commandData);
                    break;

                default:
                    console.warn("DEBUG: [PlayerWin] Unknown command action:", commandData.action);
                    break;
            }
        } catch(e) {
            console.error(`DEBUG: [PlayerWin] Error executing command action '${commandData.action}':`, e);
        }
    }

    handlePlayCommand(commandData) {
        if (commandData.videoId && typeof this.player.loadVideoById === 'function') {
            console.log(`DEBUG: [PlayerWin] Loading Video: ${commandData.videoId} (${commandData.artist || '?'} - ${commandData.title || '?'})`);
            this.statusManager.setCurrentVideoId(commandData.videoId);
            console.log(`DEBUG: [PlayerWin] Set currentPlayerVideoId to: ${commandData.videoId}`);
            
            this.player.loadVideoById(commandData.videoId);
            this.player.playVideo();
            
            setTimeout(() => {
                try {
                    if (this.player.getPlayerState() === YT.PlayerState.PLAYING) {
                        this.player.unMute();
                        this.player.setVolume(100);
                        console.log("DEBUG: [PlayerWin] Video started playing, unmuting");
                    }
                } catch(e) {
                    console.warn("DEBUG: [PlayerWin] Error when unmuting:", e);
                }
            }, 1000);
            
            document.title = `${commandData.artist || '?'} - ${commandData.title || '?'}`;
        } else { 
            console.warn("DEBUG: [PlayerWin] Invalid 'play' command data:", commandData); 
        }
    }

    handleStopCommand() {
        if (typeof this.player.stopVideo === 'function') {
            console.log("DEBUG: [PlayerWin] Stopping video immediately.");
            this.fadeManager.stopFade();
            this.player.stopVideo();
            document.title = "Jukebox Player";
            this.statusManager.setCurrentVideoId(null);
        }
    }

    handleFadeCommand(commandData) {
        const fadeDuration = commandData.fadeDuration || 5000;
        console.log(`DEBUG: [PlayerWin] Initiating fadeOutAndBlack over ${fadeDuration}ms for video: ${this.statusManager.getCurrentVideoId()}`);
        this.fadeManager.startVisualAndAudioFade(fadeDuration);
    }
}
