import { Component, ElementRef, ViewChild } from '@angular/core';
import { JitsiService } from '../../services/jitsi.service';

@Component({
  selector: 'app-visio',
  template: `
    <div #jitsiContainer style="height: 500px; width: 100%;"></div>
    <button (click)="start()">Démarrer la visio</button>
  `
})
export class VisioComponent {
  @ViewChild('jitsiContainer') jitsiContainer!: ElementRef;

  constructor(private jitsiService: JitsiService) {}

  start(): void {
    this.jitsiService.createMeeting(
      this.jitsiContainer.nativeElement,
      'attijari-room-123',
      'Aymen Said'
    ).then(api => console.log('Jitsi prêt', api))
     .catch(err => console.error('Erreur Jitsi:', err));
  }
}