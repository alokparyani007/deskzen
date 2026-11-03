export function playChime(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const audio = new AudioContext();
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.frequency.value = 660;
  gain.gain.value = 0.04;
  osc.connect(gain).connect(audio.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18);
  osc.stop(audio.currentTime + 0.2);
  osc.onended = () => {
    void audio.close();
  };
}
