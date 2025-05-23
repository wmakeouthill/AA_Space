import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { PostComponent } from './components/post/post.component';
import { CreatePostComponent } from './components/create-post/create-post.component';
import { AuthComponent } from './components/auth/auth.component';
import { WelcomeDialogComponent } from './components/welcome-dialog/welcome-dialog.component';
import { AdminComponent } from './components/admin/admin.component';
import { ChatComponent } from './components/chat/chat.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent }, // HomePage é acessível sem o guard
  { path: 'welcome', component: WelcomeDialogComponent },
  { path: 'post/:id', component: PostComponent }, // Post view também é acessível sem o guard
  { path: 'create', component: CreatePostComponent, canActivate: [authGuard] },
  { path: 'auth', component: AuthComponent },
  { path: 'admin', component: AdminComponent, canActivate: [authGuard] },
  { path: 'chat', component: ChatComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
