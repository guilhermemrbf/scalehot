# Flow Wise

CRIAÇÃO DE APLICATIVO - GESTOR FINANCEIRO INTELIGENTE

Crie um aplicativo completo chamado FinanceFlow (nome provisório), focado em controle de faturamento, fechamento de caixa e análise de taxas.

O aplicativo deve possuir um design moderno, profissional, responsivo e intuitivo, funcionando perfeitamente em dispositivos móveis e desktop.

OBJETIVO

Permitir que o usuário registre diariamente seu faturamento bruto e realize fechamentos financeiros em qualquer período (dia, semana, mês ou período personalizado).

O sistema deve calcular automaticamente:

Faturamento Bruto

Faturamento Líquido

Valor total das taxas

Percentual de taxas

Imposto fixo

Lucro real

REGISTRO DIÁRIO

Criar uma tela para lançamento diário contendo:

Campos:

Data

Faturamento Bruto

Botão:

Salvar Registro

Todos os registros devem ficar armazenados no banco de dados.

FECHAMENTO DE CAIXA

Criar uma tela chamada "Fechamento".

O usuário poderá selecionar:

Hoje

Esta Semana

Este Mês

Intervalo Personalizado

Após selecionar o período, o sistema deve:

Somar automaticamente todos os faturamentos brutos cadastrados naquele período.

Solicitar ao usuário:

Faturamento Líquido Recebido

Campo monetário editável.

Após informar o valor líquido, calcular:

Valor das Taxas

Taxas = Bruto - Líquido

Percentual de Taxas

(Taxas ÷ Bruto) × 100

Exibir sempre com duas casas decimais.

Lucro Real

Lucro Real = Líquido - Imposto

IMPOSTO FIXO

Adicionar nas configurações:

Imposto Fixo

Valor padrão:

R$ 8,50

O usuário poderá alterar futuramente.

O sistema deve descontar automaticamente esse valor do lucro real em todos os fechamentos.

DASHBOARD PRINCIPAL

Criar uma dashboard profissional contendo:

Cards:

📈 Faturamento Bruto Total

💰 Faturamento Líquido Total

💸 Total de Taxas Pagas

🏛️ Impostos

✅ Lucro Real

📊 Taxa Média %

Gráficos

Evolução diária do faturamento

Evolução semanal

Evolução mensal

Comparativo entre períodos

RELATÓRIOS

Criar uma tela de relatórios contendo:

Relatório Diário

Bruto

Líquido

Taxa

Lucro

Relatório Semanal

Bruto

Líquido

Taxa

Lucro

Relatório Mensal

Bruto

Líquido

Taxa

Imposto

Lucro Final

HISTÓRICO

Criar uma tabela contendo:

Data

Faturamento Bruto

Faturamento Líquido

Taxa

Percentual

Lucro

Permitir:

Editar

Excluir

Filtrar por período

METAS

Criar uma área chamada "Metas".

Campos:

Meta Mensal

Meta Semanal

Meta Diária

Exibir:

Valor Atual

Valor da Meta

Percentual Concluído

Barra visual de progresso.

EXPORTAÇÃO

Adicionar botão:

Exportar PDF

O PDF deve conter:

Período selecionado

Total Bruto

Total Líquido

Total de Taxas

Percentual Médio

Imposto

Lucro Real

Gráficos

BANCO DE DADOS

Estrutura mínima:

Tabela: faturamentos

id

data

faturamento_bruto

created_at

Tabela: fechamentos

id

data_inicio

data_fim

faturamento_bruto

faturamento_liquido

taxa_valor

taxa_percentual

imposto

lucro_real

created_at

Tabela: metas

id

meta_diaria

meta_semanal

meta_mensal

Tabela: configuracoes

id

imposto_fixo

EXPERIÊNCIA DO USUÁRIO

Interface moderna

Tema claro e escuro

Gráficos interativos

Animações suaves

Dashboard visual semelhante a aplicativos financeiros profissionais

Navegação simples

Dados atualizados em tempo real

TECNOLOGIAS

Utilizar:

React

TypeScript

Tailwind CSS

Supabase

Recharts para gráficos

RESULTADO ESPERADO

O aplicativo deve funcionar como um gestor financeiro inteligente, permitindo registrar faturamentos diariamente, realizar fechamentos em qualquer período, calcular automaticamente taxas e lucro real, acompanhar metas e visualizar toda a evolução financeira em dashboards e relatórios profissionais.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://scalehot.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e3968793-6951-43b6-8ee9-d636719809a5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
