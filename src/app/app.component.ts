import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router'; // Removed NavigationEnd, filter as they are not used
import { HeaderComponent } from './components/header/header.component';
import { AuthService } from './services/auth.service';
import { ChatService } from './services/chat.service';
import { Subscription } from 'rxjs';
import { Chat } from './models/chat/chat.interface'; // Import Chat interface
// Removed filter from 'rxjs/operators' as it's not used

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'AA Space';
  private authSubscription: Subscription | undefined;

  constructor(
    private authService: AuthService,
    private chatService: ChatService,
    private router: Router // Keep router if needed for other purposes, though not used in this snippet
  ) {}

  ngOnInit() {
    // console.log('[APP COMPONENT] ngOnInit - Initializing component.');
    // Subscribe to authentication changes
    this.authSubscription = this.authService.isAuthenticated.subscribe({
      next: (isAuthenticated: boolean) => {
        // console.log(`[APP COMPONENT] isAuthenticated observable emitted: ${isAuthenticated}`);
        if (isAuthenticated) {
          // console.log('[APP COMPONENT] User is authenticated. Validating token and initializing chats.');
          // Validate token and then load chats
          this.authService.validateToken().subscribe({
            next: (validationResponse) => {
              // console.log('[APP COMPONENT] validateToken response:', validationResponse);
              if (validationResponse && validationResponse.valid) {
                // console.log('[APP COMPONENT] Token validated successfully. Fetching chats.');
                this.chatService.fetchConversations().subscribe({ // Changed getChats to fetchConversations
                  next: (chats: Chat[]) => { // Added type for chats
                    // console.log('[APP COMPONENT] Chats loaded and listeners initialized successfully. Chats:', chats);
                  },
                  error: (err: any) => { // Added type for err
                    // console.error('[APP COMPONENT] Error loading chats after token validation:', err);
                    // Optionally, handle chat loading errors, e.g., by cleaning up session or notifying user
                  }
                });
              } else {
                console.warn('[APP COMPONENT] Token validation failed or token is invalid. User might be logged out or session expired.');
                this.chatService.cleanupUserSession();
              }
            },
            error: (tokenValidationError) => {
              console.error('[APP COMPONENT] Error during token validation call:', tokenValidationError);
              this.authService.logout();
              this.chatService.cleanupUserSession();
            }
          });
        } else {
          // console.log('[APP COMPONENT] User is NOT authenticated. Cleaning up chat session.');
          this.chatService.cleanupUserSession();
        }
      },
      error: (authError: any) => { // Added type any
        console.error('[APP COMPONENT] Error in isAuthenticated observable:', authError);
        this.chatService.cleanupUserSession();
      }
    });
  }

  ngOnDestroy() {
    // console.log('[APP COMPONENT] ngOnDestroy - Cleaning up component.');
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    // No need to call cleanupUserSession here if it's handled by auth state changes
    // However, if direct cleanup on app destroy is desired regardless of auth state, it can be kept.
    // For now, let's assume auth state changes will trigger necessary cleanup.
    // this.chatService.cleanupUserSession();
  }
}
