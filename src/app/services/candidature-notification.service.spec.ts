import { TestBed } from '@angular/core/testing';

import { CandidatureNotificationService } from './candidature-notification.service';

describe('CandidatureNotificationService', () => {
  let service: CandidatureNotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CandidatureNotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
