const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Minimal DOM double: run the actual script and its registered handlers.
function startApp(initialTasks = []) {
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
    prompt: () => null,
  });
  return { elements, alerts, logs, stored: () => JSON.parse(stored) };
}


for (const trigger of ['button', 'Enter']) {
  test('adding by ' + trigger + ' saves and renders without automatic console output', () => {
    const app = startApp();
    app.elements.itemInput.value = 'Estudar';
    if (trigger === 'button') app.elements.addBtn.click();
    else app.elements.itemInput.handlers.keydown({key: 'Enter'});
    assert.deepEqual(app.stored(), [{text:'estudar', completed:false}]);
    assert.equal(app.elements.list.children[0].textContent, 'estudar');
    assert.equal(app.elements.total.textContent, 'Total de tarefas: 1');
    assert.equal(app.elements.itemInput.value, '');
    assert.deepEqual(app.logs, []);
  });
}
test('invalid and duplicate attempts preserve tasks without logging', () => {
  const app = startApp([{text:'estudar', completed:false}]);
  for (const value of ['', 'ab', '123', 'Estudar']) {
    app.elements.itemInput.value = value;
    app.elements.addBtn.click();
  }
  assert.equal(app.alerts.length, 4);
  assert.deepEqual(app.stored(), [{text:'estudar', completed:false}]);
  assert.deepEqual(app.logs, []);
});
test('explicit educational diagnostics remain available', () => {
  const app = startApp([{text:'estudar', completed:false}]);
  assert.deepEqual(app.logs, []);
  app.elements.vconsistencia.click();
  assert.equal(app.alerts.at(-1), 'tudo esta consistente!');
  app.elements.dompraarray.click();
  assert.deepEqual(Array.from(app.logs.at(-1)[1]), ['estudar']);
});
