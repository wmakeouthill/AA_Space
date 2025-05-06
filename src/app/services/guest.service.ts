import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GuestService {
  private readonly GUEST_NICKNAME_KEY = 'guest_nickname';
  private guestNicknameSubject = new BehaviorSubject<string | null>(this.getStoredNickname());

  constructor() {}

  setGuestNickname(nickname: string): void {
    localStorage.setItem(this.GUEST_NICKNAME_KEY, nickname);
    this.guestNicknameSubject.next(nickname);
  }

  getGuestNickname(): string | null {
    return this.getStoredNickname();
  }

  guestNickname$(): Observable<string | null> {
    return this.guestNicknameSubject.asObservable();
  }

  hasGuestNickname(): boolean {
    return !!this.getStoredNickname();
  }

  clearGuestNickname(): void {
    localStorage.removeItem(this.GUEST_NICKNAME_KEY);
    this.guestNicknameSubject.next(null);
  }

  private getStoredNickname(): string | null {
    return localStorage.getItem(this.GUEST_NICKNAME_KEY);
  }
}
