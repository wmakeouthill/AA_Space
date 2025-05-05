import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { PostComponent } from './components/post/post.component';
import { CreatePostComponent } from './components/create-post/create-post.component';
import { AuthComponent } from './components/auth/auth.component';
import { WelcomeDialogComponent } from './components/welcome-dialog/welcome-dialog.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'welcome', component: WelcomeDialogComponent },
  { path: 'post/:id', component: PostComponent },
  { path: 'create', component: CreatePostComponent },
  { path: 'auth', component: AuthComponent },
  { path: '**', redirectTo: '' }
];
