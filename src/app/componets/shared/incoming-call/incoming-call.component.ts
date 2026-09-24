import {
  Component, EventEmitter, Input, Output, OnInit, OnDestroy, OnChanges, SimpleChanges
} from '@angular/core';

@Component({
  selector: 'app-incoming-call',
  templateUrl: './incoming-call.component.html',
  styleUrls: ['./incoming-call.component.css']
})
export class IncomingCallComponent implements OnInit, OnDestroy, OnChanges {

  @Input() visible = false;
  @Input() callerName = 'Encadrant';
  @Input() callerRole = 'Encadrant';
  @Input() callerInitials = 'E';

  @Output() accept = new EventEmitter<void>();
  @Output() refuse = new EventEmitter<void>();

  private audio: HTMLAudioElement | null = null;
  private ringtoneInterval: any = null;
  private audioContext: AudioContext | null = null;

  ngOnInit(): void {
    if (typeof Audio !== 'undefined') {
      this.audio = new Audio('assets/sounds/ringtone.mp3');
      this.audio.loop = true;
      this.audio.volume = 0.7;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']) {
      if (this.visible) {
        this.playRingtone();
      } else {
        this.stopRingtone();
      }
    }
  }

  ngOnDestroy(): void {
    this.stopRingtone();
    if (this.audioContext) {
      try { this.audioContext.close(); } catch {}
      this.audioContext = null;
    }
  }

  private playRingtone(): void {
    // Tentative 1 : fichier MP3
    if (this.audio) {
      this.audio.play().catch(() => {
        // Fallback : Web Audio
        this.playWebAudioRingtone();
      });
    } else {
      this.playWebAudioRingtone();
    }

    if ('vibrate' in navigator) {
      try { navigator.vibrate([500, 300, 500, 300]); } catch {}
    }
  }

  private playWebAudioRingtone(): void {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;

      if (!this.audioContext) {
        this.audioContext = new Ctx();
      }

      const playDing = () => {
        if (!this.audioContext) return;
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc1.frequency.value = 880;
        osc2.frequency.value = 660;
        osc1.type = 'sine';
        osc2.type = 'sine';

        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.6);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioContext.destination);

        osc1.start();
        osc2.start();
        osc1.stop(this.audioContext.currentTime + 0.6);
        osc2.stop(this.audioContext.currentTime + 0.6);
      };

      playDing();
      this.ringtoneInterval = setInterval(playDing, 1500);
    } catch (err) {
      console.warn('⚠️ Web Audio indisponible :', err);
    }
  }

  private stopRingtone(): void {
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.currentTime = 0;
      } catch {}
    }
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }

  onAccept(): void {
    this.stopRingtone();
    this.accept.emit();
  }

  onRefuse(): void {
    this.stopRingtone();
    this.refuse.emit();
  }
}