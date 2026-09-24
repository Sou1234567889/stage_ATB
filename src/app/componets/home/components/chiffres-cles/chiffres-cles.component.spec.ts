import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChiffresClesComponent } from './chiffres-cles.component';

describe('ChiffresClesComponent', () => {
  let component: ChiffresClesComponent;
  let fixture: ComponentFixture<ChiffresClesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChiffresClesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChiffresClesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
