
// =============================================================================
// ==                           statusManager.js                             ==
// ==                     Player Status Communication                         ==
// =============================================================================

import { PLAYER_CONFIG } from './playerConfig.js';

export class StatusManager {
    constructor() {
        this.currentPlayerVideoId = null;
    }

    setCurrentVideoId(videoId) {
        this.currentPlayerVideoId = videoId;
    }

    getCurrentVideoId() {
        return this.currentPlayerVideoId;
    }

    sendPlayerStatus(statusType, data = {}) {
        try {
            const statusData = {
                status: statusType,
                id: this.currentPlayerVideoId,
                timestamp: Date.now(),
                ...data
            };
            console.log(`DEBUG: [PlayerWin] >>> Sending status >>> Type: ${statusType}, VideoID: ${this.currentPlayerVideoId}, Data: ${JSON.stringify(statusData)}`);
            localStorage.setItem(PLAYER_CONFIG.STATUS_STORAGE_KEY, JSON.stringify(statusData));
        } catch (e) {
            console.error("DEBUG: [PlayerWin] Failed to send status update via localStorage.", e);
        }
    }

    displayPlayerError(message) {
        const container = document.getElementById(PLAYER_CONFIG.PLAYER_ELEMENT_ID);
        document.body.style.backgroundColor = '#300';
        if (container) {
            container.innerHTML = `<div style="position: absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index: 10;"><p style="color: #ffcccc; font-size: 1.5em; text-align:center; padding: 20px; background: rgba(0,0,0,0.7); border-radius: 5px;">PLAYER ERROR:<br>${message}</p></div>`;
        } else {
            document.body.innerHTML = `<p style="color:red; font-size:2em; padding: 30px;">FATAL PLAYER ERROR:<br>${message}</p>`;
        }
    }
}
