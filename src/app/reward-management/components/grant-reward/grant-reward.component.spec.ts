import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GrantRewardComponent } from './grant-reward.component';

describe('GrantRewardComponent', () => {
  let component: GrantRewardComponent;
  let fixture: ComponentFixture<GrantRewardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrantRewardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GrantRewardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
