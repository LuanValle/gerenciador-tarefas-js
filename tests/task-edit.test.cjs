const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Minimal DOM double: run the actual script and its registered handlers.
function startApp(initialTasks = [], answer = null) {
  class Element {
    constructor(tagName = 'div') {
      this.tagName = tagName;
      this.children = [];
      this.handlers = {};
      this.textContent = '';
      this.value = '';
      this.classList = { add() {} };
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
  let stored = JSON.stringify(initialTasks);
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8'), {
    document: { getElementById: id => elements[id], createElement: tag => new Element(tag) },
    localStorage: { getItem: () => stored, setItem: (_, value) => { stored = value; } },
    alert: message => alerts.push(message), console: { log: (...args) => logs.push(args) },
    prompt: () => answer,
  });
  return { elements, alerts, logs, stored: () => JSON.parse(stored) };
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
