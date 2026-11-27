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

function checkProjection(app, expected) {
  app.elements.vconsistencia.click();
  assert.equal(app.alerts.at(-1), 'tudo esta consistente!');
  app.elements.dompraarray.click();
  assert.deepEqual(Array.from(app.logs.at(-1)[1]), expected);
}

test('empty placeholder is not a task in consistency check or DOM projection', () => {
  const app = startApp();
  assert.equal(app.elements.list.children[0].tagName, 'p');
  checkProjection(app, []);
});

test('populated list preserves task order and completed tasks', () => {
  const app = startApp([{ text: 'estudar', completed: true }, { text: 'treinar', completed: false }]);
  checkProjection(app, ['estudar', 'treinar']);
  assert.equal(app.elements.total.textContent, 'Total de tarefas: 2');
});

for (const button of ['removeFirstBtn', 'removeLastBtn', 'removecompleted']) {
  test(`removing the last task with ${button} keeps projection consistent`, () => {
    const app = startApp([{ text: 'estudar', completed: true }]);
    app.elements[button].click();
    checkProjection(app, []);
    assert.deepEqual(app.stored(), []);
  });
}

test('adding after empty state restores a real task, without including placeholder', () => {
  const app = startApp();
  app.elements.itemInput.value = 'Estudar';
  app.elements.addBtn.click();
  checkProjection(app, ['estudar']);
  assert.deepEqual(app.stored(), [{ text: 'estudar', completed: false }]);
});
