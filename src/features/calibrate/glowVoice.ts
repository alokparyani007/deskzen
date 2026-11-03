export function speakCaption(text: string, muted: boolean, rate = 0.92, onend?: () => void): void {
  if (muted || typeof window === 'undefined' || !window.speechSynthesis) {
    onend?.();
    return;
  }
  window.speechSynthesis.cancel();
  const line = new SpeechSynthesisUtterance(text);
  line.lang = 'en-US';
  line.rate = rate;
  line.onend = () => onend?.();
  const local = window.speechSynthesis.getVoices().find((voice) => voice.localService && voice.lang.toLowerCase().startsWith('en'));
  if (local) line.voice = local;
  window.speechSynthesis.speak(line);
}

export function stopSpeech(): void {
  if (typeof window === 'undefined') return;
  window.speechSynthesis?.cancel();
}

export function playLockIn(): void {
  try {
    const audio = new AudioContext();
    const tone = audio.createOscillator();
    const gain = audio.createGain();
    tone.type = 'sine';
    tone.frequency.value = 740;
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.04, audio.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.28);
    tone.connect(gain).connect(audio.destination);
    tone.start();
    tone.stop(audio.currentTime + 0.3);
    tone.onended = () => void audio.close();
  } catch {
    /* A missing speaker should not block the lock-in. */
  }
  try {
    navigator.vibrate?.(18);
  } catch {
    /* Haptics are optional. */
  }
}
