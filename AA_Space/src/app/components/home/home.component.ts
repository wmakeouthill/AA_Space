import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Post } from '../../models/post.interface';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  posts: Post[] = [
    {
      id: 1,
      title: 'Minha jornada de recuperação - 1 ano sóbrio',
      content: 'Hoje completo 1 ano sem bebida. Quero compartilhar minha experiência...',
      author: 'Anônimo',
      createdAt: new Date(),
      likes: 15,
      commentCount: 5,
      anonymous: true
    },
    {
      id: 2,
      title: 'Primeiro dia no AA',
      content: 'Hoje dei o primeiro passo admitindo que precisava de ajuda...',
      author: 'Anônimo',
      createdAt: new Date(),
      likes: 10,
      commentCount: 3,
      anonymous: true
    }
  ];
}
