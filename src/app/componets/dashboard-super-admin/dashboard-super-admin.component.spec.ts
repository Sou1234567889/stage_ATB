import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardSuperAdminComponent } from './dashboard-super-admin.component';

describe('DashboardSuperAdminComponent', () => {
  let component: DashboardSuperAdminComponent;
  let fixture: ComponentFixture<DashboardSuperAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardSuperAdminComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardSuperAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
