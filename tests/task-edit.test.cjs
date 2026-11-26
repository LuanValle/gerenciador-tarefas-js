const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Minimal DOM double: run the actual script and its registered handlers.
function startApp(initialTasks = [], answer = null, storage = { tasks: JSON.stringify(initialTasks) }) {
  class Element {
    constructor(tagName = 'div') {
      this.tagName = tagName;
      this.children = [];
      this.handlers = {};
      this.textContent = '';
      this.value = '';
      const classes = new Set();
      this.classList = {
        add: name => classes.add(name),
        contains: name => classes.has(name),
        toggle(name, force) {
          const enabled = force === undefined ? !classes.has(name) : Boolean(force);
          if (enabled) classes.add(name);
          else classes.delete(name);
          return enabled;
        },
      };
    }
    set textContent(value) { this.text = value; this.children = []; }
    get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
    set innerHTML(value) { this.children = []; }
    appendChild(child) { this.children.push(child); }
    addEventListener(type, handler) { this.handlers[type] = handler; }
    querySelectorAll(selector) {
      assert.equal(selector, 'li');
      return this.children.filter(child => child.tagName === 'li');
    }
    focus() {}
    click() { this.handlers.click(); }
  }
  const ids = ['itemInput', 'addBtn', 'list', 'total', 'done', 'pending',
    'removeLastBtn', 'removeFirstBtn', 'vconsistencia', 'dompraarray', 'removecompleted'];
  const elements = Object.fromEntries(ids.map(id => [id, new Element()]));
  const alerts = [];
  const logs = [];
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8'), {
    document: { getElementById: id => elements[id], createElement: tag => new Element(tag) },
    localStorage: {
      getItem: key => storage[key] ?? null,
      setItem: (key, value) => { storage[key] = value; },
    },
    alert: message => alerts.push(message), console: { log: (...args) => logs.push(args) },
    prompt: () => typeof answer === 'function' ? answer() : answer,
  });
  return { elements, alerts, logs, stored: () => JSON.parse(storage.tasks) };
}


const initial = [{ text: 'estudar', completed: true }, { text: 'treinar', completed: false }];
function edit(app, index = 0) {
  app.elements.list.children[index].handlers.dblclick({stopImmediatePropagation() {}});
}
for (const value of ['ab', 'abcdefghijklmnopqrstu', '123', '1 tarefa', '  TREINAR  ']) {
  test(`editing rejects invalid or duplicate title: ${value}`, () => {
    const app = startApp(initial, value);
    edit(app);
    assert.deepEqual(app.stored(), initial);
    assert.equal(app.alerts.length, 1);
  });
}
for (const value of [null, '', '   ']) {
  test(`cancel or blank edit does not mutate saved data: ${value}`, () => {
    const app = startApp(initial, value);
    edit(app);
    assert.deepEqual(app.stored(), initial);
  });
}
test('editing normalizes whitespace and case, preserves completion and order', () => {
  const app = startApp(initial, '  Ler Livro  ');
  edit(app);
  assert.deepEqual(app.stored(), [{text: 'ler livro', completed: true}, initial[1]]);
});
test('unchanged normalized title is allowed, even at capacity', () => {
  const values = [...initial, {text:'cozinhar',completed:false}, {text:'correr',completed:false}, {text:'dormir',completed:false}];
  const app = startApp(values, '  ESTUDAR  ');
  edit(app);
  assert.deepEqual(app.stored(), values);
  assert.equal(app.alerts.length, 0);
});
for (const value of ['ab','abcdefghijklmnopqrstu','123','1 tarefa',' ESTUDAR ']) {
 test(`adding still rejects invalid or duplicate title: ${value}`, () => {
   const app = startApp(initial);
   app.elements.itemInput.value = value;
   app.elements.addBtn.click();
   assert.deepEqual(app.stored(), initial);
   assert.equal(app.alerts.length, 1);
 });
}
test('adding a valid task normalizes its title', () => {
 const app = startApp(initial);
 app.elements.itemInput.value = ' Ler livro ';
 app.elements.addBtn.click();
 assert.deepEqual(app.stored(), [...initial, {text:'ler livro', completed:false}]);
});

for (const answer of [null, 'ab', 'Ler Livro']) {
 test(`click sequence keeps the same target and completion before edit: ${answer}`, () => {
   const app = startApp(initial, answer);
   const target = app.elements.list.children[0];
   target.click();
   assert.equal(app.elements.list.children[0], target);
   assert.equal(app.stored()[0].completed, false);
   assert.equal(app.elements.pending.textContent, 'Pendentes: 2');
   target.click();
   assert.equal(app.elements.list.children[0], target);
   target.handlers.dblclick({stopImmediatePropagation() {}});
   assert.equal(app.stored()[0].completed, true);
   assert.equal(app.stored()[0].text, answer === 'Ler Livro' ? 'ler livro' : 'estudar');
   assert.equal(app.elements.done.textContent, 'Concluidas: 1');
 });
}

for (const title of ['abc', 'abcdefghijklmnopqrst']) {
  test(`editing second item accepts exact length boundary: ${title.length}`, () => {
    const app = startApp(initial, title);
    edit(app, 1);
    assert.deepEqual(app.stored(), [initial[0], { text: title, completed: false }]);
    assert.equal(app.alerts.length, 0);
    assert.equal(app.elements.list.children[1].children[0].textContent, title);
  });
}
test('editing second item does not mistake itself for a duplicate', () => {
  const app = startApp(initial, '  TREINAR  ');
  edit(app, 1);
  assert.deepEqual(app.stored(), initial);
  assert.equal(app.alerts.length, 0);
});
test('editing second item still rejects the first item title', () => {
  const app = startApp(initial, '  ESTUDAR  ');
  edit(app, 1);
  assert.deepEqual(app.stored(), initial);
  assert.equal(app.alerts.length, 1);
});


// Check the class used by CSS as well as state; a no-op classList hid this regression.
for (const completed of [false, true]) {
  test(`completion class follows repeated clicks from completed=${completed}`, () => {
    const app = startApp([{ text: 'estudar', completed }]);
    const target = app.elements.list.children[0];
    assert.equal(target.classList.contains('completed'), completed);
    for (let count = 1; count <= 3; count++) {
      target.click();
      const expected = count % 2 ? !completed : completed;
      assert.equal(app.elements.list.children[0], target);
      assert.equal(target.classList.contains('completed'), expected);
      assert.equal(app.stored()[0].completed, expected);
      assert.equal(app.elements.done.textContent, `Concluidas: ${Number(expected)}`);
      assert.equal(app.elements.pending.textContent, `Pendentes: ${Number(!expected)}`);
    }
  });
}
test('editing reconstructs completion classes without marking the pending item', () => {
  const app = startApp(initial, 'ler livro');
  edit(app, 0);
  assert.equal(app.elements.list.children[0].classList.contains('completed'), true);
  assert.equal(app.elements.list.children[1].classList.contains('completed'), false);
  assert.deepEqual(app.stored(), [{ text: 'ler livro', completed: true }, initial[1]]);
});


const atCapacity = [
  ...initial,
  { text: 'cozinhar', completed: false },
  { text: 'correr', completed: false },
  { text: 'dormir', completed: false },
];
test('a new valid title can replace the fifth item at capacity', () => {
  const app = startApp(atCapacity, ' Ler Livro ');
  edit(app, 4);
  assert.deepEqual(app.stored(), [
    ...atCapacity.slice(0, 4), { text: 'ler livro', completed: false },
  ]);
  assert.equal(app.alerts.length, 0);
  assert.equal(app.elements.total.textContent, 'Total de tarefas: 5');
  assert.equal(app.elements.list.children[4].children[0].textContent, 'ler livro');
});
for (const method of ['button', 'Enter']) {
  test(`capacity rejects a sixth item via ${method} but removal frees a slot`, () => {
    const app = startApp(atCapacity);
    app.elements.itemInput.value = 'ler livro';
    const add = () => method === 'button'
      ? app.elements.addBtn.click()
      : app.elements.itemInput.handlers.keydown({ key: 'Enter' });
    add();
    assert.deepEqual(app.stored(), atCapacity);
    assert.equal(app.alerts.length, 1);
    assert.equal(app.alerts[0], 'limite de entradas excedida!');
    assert.equal(app.elements.itemInput.value, 'ler livro');
    assert.equal(app.elements.total.textContent, 'Total de tarefas: 5');

    app.elements.removeLastBtn.click();
    add();
    assert.deepEqual(app.stored(), [
      ...atCapacity.slice(0, 4), { text: 'ler livro', completed: false },
    ]);
    assert.equal(app.alerts.length, 1);
    assert.equal(app.elements.itemInput.value, '');
    assert.equal(app.elements.total.textContent, 'Total de tarefas: 5');
    assert.equal(app.elements.pending.textContent, 'Pendentes: 4');
    assert.equal(app.elements.done.textContent, 'Concluidas: 1');
  });
}

test('a fresh app restores the edited title, order and completion from saved JSON', () => {
  const storage = {};
  const app = startApp([], '  Ler Livro  ', storage);
  for (const title of ['estudar', 'treinar']) {
    app.elements.itemInput.value = title;
    app.elements.addBtn.click();
  }
  edit(app);
  app.elements.list.children[1].click();

  // New DOM and JS context, retaining only the same simulated storage.
  const reloaded = startApp([], null, storage);
  const rows = reloaded.elements.list.children;
  assert.notEqual(reloaded.elements.list, app.elements.list);
  assert.deepEqual(rows.map(row => row.textContent), ['ler livro', 'treinar']);
  assert.deepEqual(rows.map(row => row.classList.contains('completed')), [false, true]);
  assert.equal(reloaded.elements.total.textContent, 'Total de tarefas: 2');
  assert.equal(reloaded.elements.pending.textContent, 'Pendentes: 1');
  assert.equal(reloaded.elements.done.textContent, 'Concluidas: 1');
});

for (const [scenario, answer] of [['canceled', null], ['duplicate', '  TREINAR  ']]) {
  test(`a ${scenario} edit does not rewrite storage or rebuild the task list`, () => {
    const writes = [];
    const storage = new Proxy({ tasks: JSON.stringify(initial) }, {
      set(target, key, value) {
        writes.push(key);
        return Reflect.set(target, key, value);
      },
    });
    const app = startApp(initial, answer, storage);
    const writesBeforeEdit = writes.length;
    const savedBeforeEdit = storage.tasks;
    const rowsBeforeEdit = [...app.elements.list.children];

    edit(app);

    assert.equal(writes.length, writesBeforeEdit);
    assert.equal(storage.tasks, savedBeforeEdit);
    assert.equal(app.elements.list.children.length, rowsBeforeEdit.length);
    for (const [index, row] of rowsBeforeEdit.entries()) {
      assert.equal(app.elements.list.children[index], row);
    }
  });
}

for (const [scenario, firstAnswer, expectedAlerts] of [
  ['canceled', null, 0],
  ['duplicate', '  ESTUDAR  ', 1],
]) {
  test(`editing can succeed on the next attempt after a ${scenario} edit`, () => {
    const answers = [firstAnswer, '  Ler Livro  '];
    const app = startApp(initial, () => {
      assert.ok(answers.length, 'unexpected edit prompt');
      return answers.shift();
    });

    edit(app, 1);
    assert.deepEqual(app.stored(), initial);
    assert.equal(app.alerts.length, expectedAlerts);

    edit(app, 1);
    assert.equal(answers.length, 0);
    assert.equal(app.alerts.length, expectedAlerts);
    assert.deepEqual(app.stored(), [initial[0], { text: 'ler livro', completed: false }]);
    assert.deepEqual(app.elements.list.children.map(row => row.textContent), ['estudar', 'ler livro']);
    assert.equal(app.elements.pending.textContent, 'Pendentes: 1');
    assert.equal(app.elements.done.textContent, 'Concluidas: 1');
  });
}

test('creating a task can reuse the previous title after renaming', () => {
  const app = startApp(initial, '  Ler Livro  ');
  edit(app, 0);

  app.elements.itemInput.value = '  ESTUDAR  ';
  app.elements.addBtn.click();

  assert.deepEqual(app.stored(), [
    { text: 'ler livro', completed: true }, initial[1], { text: 'estudar', completed: false },
  ]);
  assert.deepEqual(app.elements.list.children.map(row => row.textContent), ['ler livro', 'treinar', 'estudar']);
  assert.equal(app.alerts.length, 0);
  assert.equal(app.elements.done.textContent, 'Concluidas: 1');
});

test('creating a task rejects the current title after renaming', () => {
  const app = startApp(initial, '  Ler Livro  ');
  edit(app, 0);

  app.elements.itemInput.value = '  LER LIVRO  ';
  app.elements.addBtn.click();

  assert.deepEqual(app.stored(), [{ text: 'ler livro', completed: true }, initial[1]]);
  assert.deepEqual(app.elements.list.children.map(row => row.textContent), ['ler livro', 'treinar']);
  assert.deepEqual(app.alerts, ['essa tarefa ja existe!']);
  assert.equal(app.elements.total.textContent, 'Total de tarefas: 2');
});

test('editing the new first row after removal targets the visible task', () => {
  const remaining = [
    { text: 'treinar', completed: true },
    { text: 'desenhar', completed: false },
  ];
  const app = startApp([{ text: 'estudar', completed: false }, ...remaining], '  Ler Livro  ');

  app.elements.removeFirstBtn.click();
  assert.deepEqual(app.stored(), remaining);
  assert.deepEqual(app.elements.list.children.map(row => row.textContent), ['treinar', 'desenhar']);

  edit(app, 0);

  assert.deepEqual(app.stored(), [{ text: 'ler livro', completed: true }, remaining[1]]);
  const rows = app.elements.list.children;
  assert.deepEqual(rows.map(row => row.textContent), ['ler livro', 'desenhar']);
  assert.deepEqual(rows.map(row => row.classList.contains('completed')), [true, false]);
  assert.equal(app.elements.total.textContent, 'Total de tarefas: 2');
  assert.equal(app.elements.done.textContent, 'Concluidas: 1');
  assert.equal(app.elements.pending.textContent, 'Pendentes: 1');
  assert.equal(app.alerts.length, 0);
});

test('the edited row still responds to a completion click', () => {
  const app = startApp(initial, '  Ler Livro  ');
  edit(app, 1);

  const row = app.elements.list.children[1];
  assert.equal(row.textContent, 'ler livro');
  assert.equal(row.classList.contains('completed'), false);

  row.click();

  assert.deepEqual(app.stored(), [initial[0], { text: 'ler livro', completed: true }]);
  assert.equal(app.elements.list.children[1], row);
  assert.equal(row.classList.contains('completed'), true);
  assert.equal(app.elements.done.textContent, 'Concluidas: 2');
  assert.equal(app.elements.pending.textContent, 'Pendentes: 0');
});

test('bulk removal removes a renamed completed task and preserves pending tasks', () => {
  const anotherDone = { text: 'desenhar', completed: true };
  const app = startApp([...initial, anotherDone], '  Ler Livro  ');
  edit(app, 0);

  assert.deepEqual(app.stored(), [{ text: 'ler livro', completed: true }, initial[1], anotherDone]);

  app.elements.removecompleted.click();

  assert.deepEqual(app.stored(), [initial[1]]);
  const rows = app.elements.list.children;
  assert.deepEqual(rows.map(row => row.textContent), ['treinar']);
  assert.equal(rows[0].classList.contains('completed'), false);
  assert.equal(app.elements.total.textContent, 'Total de tarefas: 1');
  assert.equal(app.elements.done.textContent, 'Concluidas: 0');
  assert.equal(app.elements.pending.textContent, 'Pendentes: 1');
});
