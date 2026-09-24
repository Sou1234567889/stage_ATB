import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OffresStagiaireComponent } from './offres-stagiaire.component';

describe('OffresStagiaireComponent', () => {
  let component: OffresStagiaireComponent;
  let fixture: ComponentFixture<OffresStagiaireComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OffresStagiaireComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OffresStagiaireComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
