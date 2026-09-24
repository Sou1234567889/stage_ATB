import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BackToDashboardComponent } from './back-to-dashboard.component';

describe('BackToDashboardComponent', () => {
  let component: BackToDashboardComponent;
  let fixture: ComponentFixture<BackToDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BackToDashboardComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BackToDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
