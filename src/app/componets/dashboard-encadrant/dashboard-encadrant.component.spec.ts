import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardEncadrantComponent } from './dashboard-encadrant.component';

describe('DashboardEncadrantComponent', () => {
  let component: DashboardEncadrantComponent;
  let fixture: ComponentFixture<DashboardEncadrantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardEncadrantComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardEncadrantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
