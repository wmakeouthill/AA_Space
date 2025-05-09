import { AfterViewInit, Directive, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[appMessagesScroll]',
  standalone: true
})
export class MessagesScrollDirective implements AfterViewInit, OnChanges {
  @Input() messages: any[] = [];
  private isAtBottom = true;
  private mutationObserver: MutationObserver | null = null;
  private scrolling = false;
  
  constructor(private el: ElementRef) {}

  ngAfterViewInit() {
    // Atraso a execução para garantir que o DOM esteja completamente renderizado
    // Usando um tempo maior para garantir que tudo esteja carregado
    setTimeout(() => {
      this.setupScrollListener();
      this.setupMutationObserver();
      
      // Adiciona um delay maior para o scroll inicial para garantir que todas as mensagens estejam renderizadas
      setTimeout(() => {
        this.scrollToBottom();
        console.log('Scroll inicial executado após espera prolongada');
      }, 300);
    }, 200);
  }
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['messages']) {
      const currentMessages = changes['messages'].currentValue || [];
      const previousMessages = changes['messages'].previousValue || [];
      
      console.log(`Mensagens alteradas: Anterior=${previousMessages.length}, Atual=${currentMessages.length}`);
      
      // Se adicionamos novas mensagens, rolamos para o final
      if (currentMessages.length > previousMessages.length) {
        // Estratégia de múltiplas tentativas com intervalos crescentes
        // para garantir que o DOM esteja completamente renderizado
        
        // Primeira tentativa rápida
        setTimeout(() => {
          console.log('Primeira tentativa de rolagem');
          this.scrollToBottom();
        }, 0);
        
        // Segunda tentativa após um curto delay
        setTimeout(() => {
          console.log('Segunda tentativa de rolagem');
          this.scrollToBottom();
        }, 100);
        
        // Terceira tentativa após o Angular provavelmente ter terminado a renderização
        setTimeout(() => {
          console.log('Terceira tentativa de rolagem');
          this.scrollToBottom();
          
          // Força o navegador a recalcular o layout
          const element = this.el.nativeElement;
          void element.offsetHeight; // Hack para forçar reflow
        }, 300);
        
        // Tentativa final com um delay significativo
        setTimeout(() => {
          console.log('Tentativa final de rolagem');
          this.scrollToBottom();
        }, 800);
      }
    }
  }

  private setupScrollListener() {
    const element = this.el.nativeElement;
    element.addEventListener('scroll', () => {
      // Verifica se o usuário está próximo do final
      this.isAtBottom = Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop) < 50;
    });
  }

  private setupMutationObserver() {
    // Observa mudanças no DOM para rolar quando novas mensagens são adicionadas
    if (typeof MutationObserver !== 'undefined') {
      this.mutationObserver = new MutationObserver((mutations) => {
        console.log('MutationObserver detectou', mutations.length, 'alterações no DOM');
        
        // Se o usuário estava no final antes das mudanças, rolamos para baixo
        if (this.isAtBottom) {
          // Verifica se temos nós adicionados (novas mensagens)
          const hasAddedNodes = mutations.some(mutation => 
            mutation.addedNodes.length > 0
          );
          
          if (hasAddedNodes) {
            console.log('Novas mensagens detectadas pelo MutationObserver, rolando para o final');
            this.scrollToBottom();
          }
        }
      });
      
      // Observa todas as mudanças no elemento e seus filhos
      this.mutationObserver.observe(this.el.nativeElement, {
        childList: true, // Observa adição/remoção de filhos
        subtree: true,   // Observa os filhos também
        attributes: true, // Observa mudanças de atributos
        characterData: true // Observa mudanças no texto
      });
      
      console.log('MutationObserver configurado para:', this.el.nativeElement);
    } else {
      console.warn('MutationObserver não está disponível neste navegador');
    }
  }

  scrollToBottom(): void {
    try {
      const element = this.el.nativeElement;
      
      // Abordagem extremamente simples para debug
      console.log('Calculado. ScrollHeight:', element.scrollHeight, 'ClientHeight:', element.clientHeight);
      
      // Força o scroll diretamente sem complexidade
      element.scrollTop = 999999;
      
      // Log para debugging
      console.log('Applied scrollTop:', element.scrollTop);
      console.log('Computed style:', {
        overflow: window.getComputedStyle(element).overflow,
        overflowY: window.getComputedStyle(element).overflowY,
        height: window.getComputedStyle(element).height,
        maxHeight: window.getComputedStyle(element).maxHeight,
        display: window.getComputedStyle(element).display
      });
      
      this.scrolling = false;
    } catch (err) {
      console.error('Erro na diretiva de rolagem:', err);
      this.scrolling = false;
    }
  }
}
