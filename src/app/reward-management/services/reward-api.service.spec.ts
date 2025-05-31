import { TestBed } from '@angular/core/testing';

import { RewardApiService } from './reward-api.service';

describe('RewardApiService', () => {
  let service: RewardApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RewardApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
