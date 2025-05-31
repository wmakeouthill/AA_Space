import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RewardListComponent } from './reward-list.component';

describe('RewardListComponent', () => {
  let component: RewardListComponent;
  let fixture: ComponentFixture<RewardListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RewardListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RewardListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
