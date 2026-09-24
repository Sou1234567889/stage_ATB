import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ForgrtMotDePasseComponent } from './forgrt-mot-de-passe.component';

describe('ForgrtMotDePasseComponent', () => {
  let component: ForgrtMotDePasseComponent;
  let fixture: ComponentFixture<ForgrtMotDePasseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ForgrtMotDePasseComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ForgrtMotDePasseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
