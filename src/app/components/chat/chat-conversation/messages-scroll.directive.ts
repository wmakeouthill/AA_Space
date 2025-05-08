import { AfterViewInit, Directive, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[appMessagesScroll]',
  standalone: true
})
export class MessagesScrollDirective implements AfterViewInit, OnChanges {
  @Input() messages: any[] = [];
  
  constructor(private el: ElementRef) {}

  ngAfterViewInit() {
    this.scrollToBottom();
  }
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['messages']) {
      // Quando as mensagens mudam, rolamos para o final após um pequeno delay
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  scrollToBottom(): void {
    try {
      const element = this.el.nativeElement;
      element.scrollTop = element.scrollHeight;
      
      // Log para debug
      console.log('Diretiva de rolagem: scrollHeight =', element.scrollHeight);
      
      // Tentar novamente após um pequeno delay para garantir
      setTimeout(() => {
        element.scrollTop = element.scrollHeight;
      }, 50);
    } catch (err) {
      console.error('Erro na diretiva de rolagem:', err);
    }
  }
}
