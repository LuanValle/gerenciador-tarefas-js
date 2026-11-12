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

## Entrada por teclado e testes

Enter adiciona a tarefa, exceto enquanto um IME (editor de método de entrada)
está compondo texto. Nessa etapa, Enter confirma um candidato do teclado,
não o envio da tarefa. Um novo Enter depois da composição adiciona normalmente.
O código 229 é mantido apenas como fallback de compatibilidade com IMEs.

Execute `node --test tests/*.test.cjs` com Node 18 ou superior.
Os testes usam o script real com DOM e armazenamento simulados, sem dados reais.
Não comprovam o comportamento de um IME nativo: verifique manualmente com um
teclado de composição que confirmar o texto não limpa o campo nem adiciona a
tarefa, e que o próximo Enter adiciona uma vez.

Esta melhoria e seus testes foram produzidos com auxílio de IA; não constituem
evidência de domínio pessoal. Exercício: explique por que verificar apenas
`event.key === "Enter"` não distingue confirmação de texto e envio.
