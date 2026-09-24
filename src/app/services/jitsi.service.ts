import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class JitsiService {
  private loaded = false;

  loadScript(): Promise<void> {
    if (this.loaded) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src*="external_api.js"]');
      if (existing) {
        this.loaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => {
        this.loaded = true;
        resolve();
      };
      script.onerror = () => reject('Erreur chargement Jitsi');
      document.body.appendChild(script);
    });
  }

  createMeeting(container: HTMLElement, roomName: string, userName: string): Promise<any> {
    return this.loadScript().then(() => {
      return new (window as any).JitsiMeetExternalAPI('meet.jit.si', {
        roomName,
        parentNode: container,
        userInfo: { displayName: userName },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false
        }
      });
    });
  }
}