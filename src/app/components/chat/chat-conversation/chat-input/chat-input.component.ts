import { Component, EventEmitter, Input, Output, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="input-container">
      <div class="input-wrapper">
        <textarea
          #messageInput
          class="message-input"
          [(ngModel)]="newMessage"
          name="newMessage"
          placeholder="Digite uma mensagem..."
          rows="1"
          (keydown.enter)="handleEnterKey($event)"
          (focus)="onInputFocus()"
          [disabled]="disabled"
          tabindex="0">
        </textarea>
        <button
          type="button"
          class="send-button"
          (click)="onSendMessage()"
          [disabled]="!newMessage.trim() || disabled"
          tabindex="-1">
          Enviar
        </button>
      </div>
    </div>
  `,
  styles: [`
    .input-container {
      padding: 10px 15px; /* Overall padding for the input area */
      background: white;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      z-index: 10;
      width: 100%;
      min-height: 70px; /* Ensure container has a minimum height */
    }

    .input-wrapper {
      display: flex; /* Changed from inline-flex */
      align-items: center;
      background-color: #f1f1f1;
      border-radius: 24px;
      padding: 5px 10px; /* Padding inside the rounded wrapper */
      height: 50px;
      box-sizing: border-box;
      width: 100%;
    }

    .message-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      resize: none;
      max-height: 100%; /* Allow it to use the 40px from min-height */
      min-height: 40px;
      font-family: inherit;
      font-size: 14px;
      white-space: nowrap; /* Keeps placeholder and input on one line if possible */
      text-align: left;
      line-height: 40px; /* Vertically center text in the 40px height */
      padding: 0 5px; /* Small horizontal padding within the textarea itself */
    }

    .message-input::placeholder {
      color: gray; /* Mantenha ou altere a cor */
      white-space: nowrap; /* Evita que o texto do placeholder quebre a linha */
      text-align: left; /* Alinha o texto à esquerda (padrão, mas explícito aqui) */
      display: inline-block; /* Permite usar vertical-align */
      vertical-align: middle;
      height: 100%; /* Exemplo de altura fixa */
      line-height: 40px; /* Igual à altura */
      padding: 0; /* Remova padding para um alinhamento mais preciso */
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
  @Output() inputFocused = new EventEmitter<void>();
  @ViewChild('messageInput') messageInputElementRef!: ElementRef<HTMLTextAreaElement>;

  newMessage: string = '';
  private hasFocused: boolean = false;

  handleEnterKey(event: any): void { // Mantido como 'any' para compatibilidade com a ferramenta
    if (!event.shiftKey) {
      event.preventDefault();
      this.onSendMessage();
    }
  }

  onSendMessage(): void {
    const messageText = this.newMessage.trim();

    if (this.disabled) {
      return;
    }

    if (!messageText) {
      // Se a mensagem estiver vazia, focar localmente.
      this.focusInputElement();
      return;
    }

    // Se a mensagem for válida, emitir e limpar.
    // O componente pai cuidará de refocar.
    this.sendMessage.emit(messageText);
    this.newMessage = '';
    this.hasFocused = false;
    // NÃO chamar focusInputElement() aqui para envio real de mensagem.
  }

  public focusInputElement(): void {
    // Usar setTimeout para garantir que a tentativa de foco ocorra após atualizações pendentes de renderização,
    // especialmente depois que o componente pai puder ter reabilitado este input.
    setTimeout(() => {
      const textareaEl = this.messageInputElementRef?.nativeElement;
      if (textareaEl) {
        if (textareaEl.disabled) {
          console.warn('[ChatInputComponent] Textarea está desabilitado quando focusInputElement foi chamado. Abortando foco.');
          return;
        }
        console.log('[ChatInputComponent] Tentando focar o elemento textarea:', textareaEl);
        textareaEl.focus();

        const activeEl = document.activeElement;
        if (activeEl === textareaEl) {
          console.log('[ChatInputComponent] Textarea focado com sucesso.');
        } else {
          let activeElementDescription = 'null';
          if (activeEl) {
            activeElementDescription = `${activeEl.tagName}`;
            if (activeEl.id) activeElementDescription += `#${activeEl.id}`;
            if (activeEl.className && typeof activeEl.className === 'string') {
                 activeElementDescription += `.${activeEl.className.split(' ').filter(c => c).join('.')}`;
            }
          }
          console.warn(`[ChatInputComponent] Falha ao focar textarea. Elemento ativo é: ${activeElementDescription}. Objeto do elemento ativo:`, activeEl);
        }
      } else {
        console.warn('[ChatInputComponent] Referência do elemento textarea não encontrada para focar.');
      }
    }, 0); // Delay mínimo
  }

  onInputFocus(): void {
    if (!this.hasFocused) {
      console.log('[ChatInputComponent] Input focado, emitindo inputFocused.');
      this.inputFocused.emit();
      this.hasFocused = true;
    }
  }
}
