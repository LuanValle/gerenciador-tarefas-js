# Gerenciador de Tarefas em JavaScript
Este projeto é um gerenciador de tarefas desenvolvido em JavaScript puro, 
com foco em manipulação de estado, DOM e boas práticas de frontend.

O objetivo principal foi consolidar conceitos fundamentais de JavaScript 
sem o uso de frameworks, simulando o funcionamento de aplicações modernas.

## Funcionalidades

- Adicionar tarefas com validações
- Marcar e desmarcar tarefas como concluídas
- Editar tarefas com duplo clique
- Remover a primeira e a última tarefa
- Remover todas as tarefas concluídas
- Contadores automáticos:
  - Total de tarefas
  - Tarefas pendentes
  - Tarefas concluídas
- Persistência de dados com localStorage
- Suporte a teclado (Enter para adicionar tarefas)

## Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript (ES6+)
- localStorage

## Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript (ES6+)
- localStorage

## Conceitos aplicados

- Gerenciamento de estado com array de objetos
- Separação entre lógica de estado e renderização
- Manipulação do DOM baseada em estado
- Programação funcional com map, filter e some
- Persistência de dados no navegador
- Tratamento de eventos e validações de entrada

## Como executar o projeto

1. Clone o repositório
2. Abra o arquivo `index.html` em qualquer navegador moderno

## Observação

Este projeto foi desenvolvido com foco em aprendizado e consolidação de 
fundamentos de JavaScript, servindo como base para projetos mais complexos 
e aplicações full stack no futuro.

## Preview

![Tela do aplicativo](assets/imagem1.png)

## Console e testes de regressão

Adicionar uma tarefa pelo botão ou por Enter não imprime automaticamente
a lista no console. Isso evita uma cópia desnecessária dos títulos em logs
durante o uso normal. Os botões educativos de consistência e conversão DOM
continuam exibindo conteúdo quando acionados explicitamente: use dados
fictícios ao compartilhar o console. Esta mudança não remove dados do
localStorage, não criptografa tarefas e não garante confidencialidade.

Execute `node --test tests/*.test.cjs` com Node 18 ou superior.
A suíte executa o script real com DOM e armazenamento simulados, verificando
adição, persistência, validações e diagnósticos explícitos. Não substitui teste
em navegador. HTML e CSS não foram alterados.

Produzido com auxílio de IA; não comprova domínio pessoal.
Exercício: explique a diferença entre salvar uma tarefa para o aplicativo
e criar uma cópia dela no console de desenvolvimento.
