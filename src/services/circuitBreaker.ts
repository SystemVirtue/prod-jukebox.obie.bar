/**
 * Emergency Circuit Breaker to prevent infinite API calls
 */

class CircuitBreakerService {
  private callCounts: { [endpoint: string]: number } = {};
  private resetTimers: { [endpoint: string]: NodeJS.Timeout } = {};
  private readonly MAX_CALLS_PER_MINUTE = 10;
  private readonly RESET_INTERVAL = 60000; // 1 minute

  private isCircuitOpen(endpoint: string): boolean {
    const count = this.callCounts[endpoint] || 0;
    return count >= this.MAX_CALLS_PER_MINUTE;
  }

  canMakeCall(endpoint: string): boolean {
    if (this.isCircuitOpen(endpoint)) {
      console.warn(
        `[CircuitBreaker] Circuit open for ${endpoint} - too many calls`,
      );
      return false;
    }
    return true;
  }

  recordCall(endpoint: string): void {
    this.callCounts[endpoint] = (this.callCounts[endpoint] || 0) + 1;

    // Set reset timer if not already set
    if (!this.resetTimers[endpoint]) {
      this.resetTimers[endpoint] = setTimeout(() => {
        console.log(`[CircuitBreaker] Resetting call count for ${endpoint}`);
        this.callCounts[endpoint] = 0;
        delete this.resetTimers[endpoint];
      }, this.RESET_INTERVAL);
    }

    // Log warning if approaching limit
    if (this.callCounts[endpoint] >= this.MAX_CALLS_PER_MINUTE * 0.8) {
      console.warn(
        `[CircuitBreaker] Approaching call limit for ${endpoint}: ${this.callCounts[endpoint]}/${this.MAX_CALLS_PER_MINUTE}`,
      );
    }
  }

  forceReset(endpoint?: string): void {
    if (endpoint) {
      this.callCounts[endpoint] = 0;
      if (this.resetTimers[endpoint]) {
        clearTimeout(this.resetTimers[endpoint]);
        delete this.resetTimers[endpoint];
      }
    } else {
      // Reset all
      this.callCounts = {};
      Object.values(this.resetTimers).forEach((timer) => clearTimeout(timer));
      this.resetTimers = {};
    }
  }

  getStatus(): { [endpoint: string]: { calls: number; blocked: boolean } } {
    const status: { [endpoint: string]: { calls: number; blocked: boolean } } =
      {};
    for (const endpoint in this.callCounts) {
      status[endpoint] = {
        calls: this.callCounts[endpoint],
        blocked: this.isCircuitOpen(endpoint),
      };
    }
    return status;
  }
}

export const circuitBreaker = new CircuitBreakerService();
