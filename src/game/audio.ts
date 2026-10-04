// 초경량 WebAudio 신스 — 타격/가드/미러 사운드
export class Sfx {
  private ctx: AudioContext | null = null;
  private noiseBuf: AudioBuffer | null = null;
  enabled = true;

  private ac(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number) {
    const ac = this.ac();
    if (!ac) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), ac.currentTime + dur);
    g.gain.setValueAtTime(gain, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0008, ac.currentTime + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + dur + 0.02);
  }

  private noise(dur: number, gain: number, hp = 900) {
    const ac = this.ac();
    if (!ac) return;
    // 1초 노이즈 1회 생성 후 재사용 — 매타격 할당 제거
    if (!this.noiseBuf || this.noiseBuf.sampleRate !== ac.sampleRate) {
      const len = ac.sampleRate * 1;
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
    }
    const src = ac.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = Math.max(0.5, Math.min(2, dur * 4));
    const f = ac.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp;
    const g = ac.createGain();
    const t = ac.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f); f.connect(g); g.connect(ac.destination);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  swing() { this.noise(0.08, 0.05, 1800); }
  hit(heavy: boolean) {
    this.tone(heavy ? 120 : 210, heavy ? 0.22 : 0.12, 'square', 0.1, heavy ? 44 : 90);
    this.noise(heavy ? 0.18 : 0.09, heavy ? 0.14 : 0.08, 600);
  }
  block() { this.tone(680, 0.09, 'triangle', 0.07, 320); this.noise(0.06, 0.05, 2400); }
  mirror() { this.tone(880, 0.24, 'sine', 0.07, 1760); this.tone(1320, 0.2, 'sine', 0.04, 660); }
  habitBreak() { this.tone(420, 0.3, 'sawtooth', 0.06, 1400); }
  ko() { this.tone(90, 0.7, 'sawtooth', 0.12, 38); this.noise(0.5, 0.1, 300); }
  ui() { this.tone(520, 0.06, 'square', 0.04, 780); }
  /** 읽혔다 — 심장이 내려앉는 소리 */
  read(heavy: boolean) {
    this.tone(heavy ? 1400 : 1100, 0.07, 'square', 0.05, heavy ? 180 : 320);
    this.tone(heavy ? 78 : 110, heavy ? 0.5 : 0.3, 'sine', 0.09, heavy ? 40 : 62);
    if (heavy) { this.noise(0.22, 0.06, 240); this.tone(220, 0.35, 'sawtooth', 0.04, 1600); }
  }
  /** 예측을 벗어남 — 해방감 */
  unread() {
    this.tone(440, 0.1, 'triangle', 0.06, 880);
    this.tone(660, 0.26, 'sine', 0.05, 1320);
  }
  fireball() { this.tone(320, 0.3, 'sawtooth', 0.06, 980); this.noise(0.2, 0.05, 1200); }
  special() { this.tone(240, 0.18, 'square', 0.07, 640); }
  superFlash() {
    this.tone(160, 0.55, 'sawtooth', 0.1, 1200);
    this.tone(640, 0.4, 'sine', 0.06, 160);
    this.noise(0.4, 0.09, 500);
  }
}

export const sfx = new Sfx();
