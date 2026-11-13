// 🔹 1) PEGAR OS ELEMENTOS DO HTML
const input = document.getElementById("itemInput");
const addBtn = document.getElementById("addBtn");
const list = document.getElementById("list");
const total = document.getElementById("total");
const done = document.getElementById("done");
const pending = document.getElementById("pending");
const ultimo = document.getElementById("removeLastBtn");
const primeiro = document.getElementById("removeFirstBtn");
const vconsistencia = document.getElementById("vconsistencia");
const domarray = document.getElementById("dompraarray");
const removeCompleted = document.getElementById("removecompleted");

// 🔹 ESTADO (array)
let tasks = [];


function saveTasks(){
  localStorage.setItem("tasks", JSON.stringify(tasks));
}
//funçao que pega o que fica salvo
const savedTasks = localStorage.getItem("tasks");
if(savedTasks){
  tasks = JSON.parse(savedTasks);
}
renderTasks();

// 🔹 FUNÇÃO QUE DESENHA A TELA
function renderTasks() {
  list.innerHTML = "";

  if (tasks.length === 0) {
  const empty = document.createElement("p");
  empty.className = "empty";
  empty.textContent = "Nenhuma tarefa adicionada ainda.";
  list.appendChild(empty);
}


  for (let i = 0; i < tasks.length; i++) {
    const li = document.createElement("li");
    const span = document.createElement("span");

    span.textContent = tasks[i].text;

    //se estiver concluida, aplica a classe:
    if(tasks[i].completed){
      li.classList.add("completed");
    }

    //clique simples: alterna concluido / nao concluido:
    li.addEventListener("click", function(){
      tasks[i].completed = !tasks[i].completed;
      renderTasks();
    });

    //clique duplo para editar
    li.addEventListener("dblclick", function(event){
      event.stopImmediatePropagation();
      const textoNovo = prompt("editar texto ");
      if(textoNovo === null)return;
      if(textoNovo.trim() === "")return;

      tasks[i].text = textoNovo.toLowerCase();
      saveTasks();
      renderTasks();
    })


    li.appendChild(span);
    list.appendChild(li);
  }

  //total
  total.textContent = "Total de tarefas: " + tasks.length;

  //filtra as nao concluidas econta
  pending.textContent = "Pendentes: " + tasks.filter(task => !task.completed).length;

  //filtra as concluidas e exibe na tela.
  done.textContent = "Concluidas: " + tasks.filter(task => task.completed).length;



  localStorage.setItem("tasks",JSON.stringify(tasks));
}

// 🔹 4) FUNÇÃO DE ADICIONAR
function addItem() {
  const text = input.value.trim();

  if (text === "") {
    alert("Digite um item válido");
    return;
  }

  //nao deixa entrar com menos de 3 caracteres
  if(text.length < 3){
    alert("digite um valor maior que 3 caracteres!");
    return;
  }

  //nao adciona se for maior que 20 caracteres
  if(text.length > 20){
    alert("limite de caracteres atingido!");
    return;
  }

    //nao permite apenas numero
  if(!isNaN(text)){
    alert("não é permitido apenas numeros!");
    return;
  }

    //nao permite primeiro caracter como numero
  if(!isNaN(text[0])){
    alert("nao pode começar com numero!");
    return;
  }

    //B2 verifica duplicado:
  if (tasks.some(task => task.text === text.toLowerCase())){
    alert("essa tarefa ja existe!");
    return;
  }

  //limite de 5 entradas de dados
  if(tasks.length >= 5){
    alert("limite de entradas excedida!");
    return;
  }

 


  tasks.push({
    text: text.toLowerCase(),
    completed: false
  });

  renderTasks();

  input.value = "";
  input.focus();
}

//adciona os itens apertando Enter
input.addEventListener("keydown", function(event){
  if(event.key === "Enter"){
    addItem();
  }
});

//verificar tasks
vconsistencia.addEventListener("click", function(){
  //mostrar o array tasks no console.
  console.log("Arrays: `task`: ", tasks);

  //mostrar tarefas renderizadas no DOM.
  const renderdItems = Array.from(list.children).map(item => item.textContent.trim());
  console.log("Itens renderizados no DOM: ", renderdItems);

  //veridicar se o array e o DOM sao iguais.
  const tasksTexts = tasks.map(task => task.text);
  if(JSON.stringify(tasksTexts) === JSON.stringify(renderdItems)){
    alert("tudo esta consistente!");
  }else{
    alert("ha inconsistencias entre o array e o DOM!");
  }
});

//converter dom pra array
domarray.addEventListener("click", function(){
  const listChildren = Array.from(list.children);
  console.log(listChildren)

  const textos = listChildren.map(item => item.textContent.trim());
  console.log("converter dom pra array: ",textos)
})

 //remove a primeira tarefa.
  primeiro.addEventListener("click", function(){
    tasks.shift();
    renderTasks();
  });

  //remover a ultima tarefa
  ultimo.addEventListener("click",function(){
    tasks.pop();
    renderTasks();
  });

  //
  removeCompleted.addEventListener("click", function(){
    tasks = tasks.filter(task => !task.completed);
    renderTasks();
  });

  //contagem, quantas faltam.


  //total



// 🔹 5) LIGAR O BOTÃO À FUNÇÃO
addBtn.addEventListener("click", addItem);
