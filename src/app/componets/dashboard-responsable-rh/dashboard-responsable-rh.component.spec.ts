import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardResponsableRhComponent } from './dashboard-responsable-rh.component';

describe('DashboardResponsableRhComponent', () => {
  let component: DashboardResponsableRhComponent;
  let fixture: ComponentFixture<DashboardResponsableRhComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardResponsableRhComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardResponsableRhComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
