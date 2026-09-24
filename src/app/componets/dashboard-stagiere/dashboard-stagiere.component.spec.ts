import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardStagiereComponent } from './dashboard-stagiere.component';

describe('DashboardStagiereComponent', () => {
  let component: DashboardStagiereComponent;
  let fixture: ComponentFixture<DashboardStagiereComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardStagiereComponent ]
    }).compileComponents();
    fixture = TestBed.createComponent(DashboardStagiereComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
