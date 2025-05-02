import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Post } from '../../models/post.interface';

interface Comment {
  id: number;
  content: string;
  author: string;
  createdAt: Date;
}

@Component({
  selector: 'app-post',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './post.component.html',
  styleUrl: './post.component.css'
})
export class PostComponent implements OnInit {
  post: Post | null = null;
  comments: Comment[] = [];
  commentForm: FormGroup;
  isSubmitting = false;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    this.commentForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(3)]],
      isAnonymous: [true]
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    // TODO: Implementar busca do post no backend
    // Por enquanto, usando dados mockados
    this.post = {
      id: Number(id),
      title: 'Minha jornada de recuperação',
      content: 'Hoje completo 1 ano sem bebida...',
      author: 'Anônimo',
      createdAt: new Date(),
      likes: 15,
      commentCount: 2,
      anonymous: true
    };

    this.comments = [
      {
        id: 1,
        content: 'Parabéns pela sua jornada! Continue firme!',
        author: 'Anônimo',
        createdAt: new Date()
      }
    ];
  }

  onSubmitComment() {
    if (this.commentForm.valid) {
      this.isSubmitting = true;
      // TODO: Implementar envio do comentário ao backend
      const newComment: Comment = {
        id: this.comments.length + 1,
        content: this.commentForm.value.content,
        author: this.commentForm.value.isAnonymous ? 'Anônimo' : 'Usuário',
        createdAt: new Date()
      };
      this.comments.unshift(newComment);
      this.commentForm.reset({ isAnonymous: true });
      this.isSubmitting = false;
    }
  }
}
