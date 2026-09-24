import { Component } from '@angular/core';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent {

  formData = {
    nom: '',
    email: '',
    telephone: '',
    sujet: '',
    message: ''
  };

  envoyerMessage(): void {
    console.log('Message envoyé :', this.formData);
    alert('✅ Merci ! Votre message a bien été envoyé. Nous vous répondrons sous 24h.');
    this.formData = { nom: '', email: '', telephone: '', sujet: '', message: '' };
  }
}