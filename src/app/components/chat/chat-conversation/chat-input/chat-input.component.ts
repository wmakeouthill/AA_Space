import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="input-container">
      <form (ngSubmit)="onSendMessage()">
        <div class="input-wrapper">
          <textarea
            class="message-input"
            [(ngModel)]="newMessage"
            name="newMessage"
            placeholder="Digite uma mensagem..."
            rows="1"
            (keydown.enter)="$event.preventDefault(); onSendMessage();"
            [disabled]="disabled"
          ></textarea>
          <button
            type="submit"
            class="send-button"
            [disabled]="!newMessage.trim() || disabled">
            Enviar
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .input-container {
      flex: 0 0 70px;
      padding: 10px 15px;
      background: white;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      z-index: 10;
      width: 100%;
    }
    
    .input-wrapper {
      display: flex;
      align-items: center;
      background-color: #f1f1f1;
      border-radius: 24px;
      padding: 5px 15px;
      height: 50px;
      box-sizing: border-box;
      width: 100%;
    }
    
    .message-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      padding: 10px 0;
      resize: none;
      max-height: 40px;
      min-height: 40px;
      font-family: inherit;
      font-size: 14px;
    }
    
    .send-button {
      background-color: #1890ff;
      color: white;
      border: none;
      border-radius: 24px;
      padding: 8px 16px;
      cursor: pointer;
      margin-left: 10px;
      outline: none;
      font-weight: bold;
      height: 40px;
      min-width: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .send-button:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }
  `]
})
export class ChatInputComponent {
  @Input() disabled: boolean = false;
  @Output() sendMessage = new EventEmitter<string>();
  
  newMessage: string = '';
  
  onSendMessage(): void {
    if (!this.newMessage.trim() || this.disabled) {
      return;
    }
    
    this.sendMessage.emit(this.newMessage);
    this.newMessage = '';
  }
}
