let sharedContext: AudioContext | null = null;

export function playAlertSound(): void {
  try {
    if (!window.AudioContext) return;
    sharedContext ??= new AudioContext();
    const context = sharedContext;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.4);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.4);
  } catch {
    // Audio isn't available in every context (e.g. before a user gesture); skip silently.
  }
}
