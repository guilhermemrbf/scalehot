# Redesign Visual Premium (Black & Purple)

Transformar a interface atual em uma experiência de elite, focada em sofisticação, minimalismo moderno e fluidez, utilizando uma paleta de cores baseada em preto e roxo.

## Ações de Design

- **Paleta de Cores e Profundidade**:
    - Ajustar tokens de design em `src/styles.css` para um tema escuro (Dark) mais profundo, utilizando preto puro (#000000) e tons de roxo vibrante e profundo.
    - Implementar `Glassmorphism` em cards e componentes de interface.
    - Refinar sombras (`Soft Shadows`) e gradientes lineares.
- **Tipografia**:
    - Ajustar escalas fluídas e line-height para legibilidade editorial.
    - Utilizar "Space Grotesk" para títulos (Bold) e "Inter" para corpo de texto.
- **Layout e Espaçamento**:
    - Rigor no sistema de grade de 8px.
    - Aumentar o uso de espaços em branco (White Space).
- **Micro-interações**:
    - Adicionar animações de entrada (staggered fade-in) usando Framer Motion em componentes principais.
    - Efeitos de hover refinados com `cubic-bezier`.

## Detalhes Técnicos

- Atualizar `--background`, `--card`, `--primary` e outros tokens em `src/styles.css` (temas :root e .dark).
- Refatorar componentes de UI (`Card`, `Button`) para refletir a nova estética Glassmorphism.
- Aplicar `framer-motion` em `src/routes/index.tsx` e `src/components/AppLayout.tsx` para transições suaves.
- Garantir que o contraste atenda aos padrões de acessibilidade, mantendo o aspecto luxuoso.
