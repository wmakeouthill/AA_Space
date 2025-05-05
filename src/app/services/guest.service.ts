import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GuestService {
  private readonly GUEST_NICKNAME_KEY = 'guest_nickname';

  constructor() {}

  setGuestNickname(nickname: string): void {
    localStorage.setItem(this.GUEST_NICKNAME_KEY, nickname);
  }

  getGuestNickname(): string | null {
    return localStorage.getItem(this.GUEST_NICKNAME_KEY);
  }

  hasGuestNickname(): boolean {
    return !!this.getGuestNickname();
  }

  clearGuestNickname(): void {
    localStorage.removeItem(this.GUEST_NICKNAME_KEY);
  }
}
