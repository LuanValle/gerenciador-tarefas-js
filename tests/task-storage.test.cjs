const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Execute the real app with an in-memory DOM and storage, never browser/user data.
function startApp({ raw = null, readError = false, writeError = false, accessError = false } = {}) {
  class Element {
    constructor(tagName = 'div') {
      this.tagName = tagName;
      this.children = [];
      this.handlers = {};
      this.textContent = '';
      this.value = '';
      this.hidden = true;
      this.classList = { add() {} };
    }
    set textContent(value) { this.text = value; this.children = []; }
    get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
    set innerHTML(value) { this.children = []; }
    appendChild(child) { this.children.push(child); }
    addEventListener(type, handler) { this.handlers[type] = handler; }
    focus() { this.focused = true; }
    click() { this.handlers.click(); }
  }
  const ids = ['itemInput', 'addBtn', 'list', 'total', 'done', 'pending',
    'removeLastBtn', 'removeFirstBtn', 'vconsistencia', 'dompraarray',
    'removecompleted', 'storageStatus'];
  const elements = Object.fromEntries(ids.map(id => [id, new Element()]));
  const writes = [];
  let stored = raw;
  let failWrites = writeError;
  const context = {
    document: { getElementById: id => elements[id], createElement: tag => new Element(tag) },
    localStorage: {
      getItem: () => { if (readError) throw new Error('blocked'); return stored; },
      setItem: (key, value) => {
        writes.push({key, value});
        if (failWrites) throw new Error('quota exceeded');
        stored = value;
      },
    },
    alert() {}, console: { log() {} }, prompt: () => 'novo titulo',
  };
  if (accessError) {
    Object.defineProperty(context, 'localStorage', {get() { throw new Error('access blocked'); }});
  }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8'), context);
  return {
    elements, writes, raw: () => stored,
    failWrites: () => { failWrites = true; },
    add(text = 'estudar') { elements.itemInput.value = text; elements.addBtn.click(); },
  };
}

const initial = [{text: 'estudar', completed: true}, {text: 'treinar', completed: false}];
function assertWarning(app) {
  assert.equal(app.elements.storageStatus.hidden, false);
  assert.match(app.elements.storageStatus.textContent, /sessão/);
}

test('missing storage starts empty and persists a new task', () => {
  const app = startApp();
  app.add();
  assert.deepEqual(JSON.parse(app.raw()), [{text:'estudar', completed:false}]);
  assert.equal(app.elements.storageStatus.hidden, true);
});

test('valid stored tasks preserve text, completion and order', () => {
  const app = startApp({raw: JSON.stringify(initial)});
  assert.deepEqual(JSON.parse(app.raw()), initial);
  assert.equal(app.elements.list.children[0].textContent, 'estudar');
  assert.equal(app.elements.pending.textContent, 'Pendentes: 1');
  assert.equal(app.elements.done.textContent, 'Concluidas: 1');
  assert.equal(app.elements.storageStatus.hidden, true);
});

for (const raw of ['{invalid', '', 'null', '{}', '"text"', '[null]',
  '[{"text":123,"completed":false}]', '[{"text":"estudar","completed":"false"}]',
  '[{"text":"estudar"}]', JSON.stringify([...initial, null])]) {
  test(`invalid saved data remains untouched and the app stays usable: ${raw}`, () => {
    const app = startApp({raw});
    assertWarning(app);
    assert.match(app.elements.storageStatus.textContent, /salvo não será alterado/);
    app.add();
    assert.equal(app.elements.total.textContent, 'Total de tarefas: 1');
    app.elements.list.children[0].click();
    assert.equal(app.elements.done.textContent, 'Concluidas: 1');
    app.elements.list.children[0].handlers.dblclick({stopImmediatePropagation() {}});
    assert.equal(app.elements.list.children[0].textContent, 'novo titulo');
    app.elements.removecompleted.click();
    assert.equal(app.elements.total.textContent, 'Total de tarefas: 0');
    assert.equal(app.raw(), raw);
    assert.equal(app.writes.length, 0);
  });
}

test('blocked reading keeps the app usable without attempting to write', () => {
  const app = startApp({raw: JSON.stringify(initial), readError: true});
  assertWarning(app);
  app.add();
  app.elements.removeFirstBtn.click();
  app.add('treinar');
  app.elements.removeLastBtn.click();
  assert.equal(app.elements.total.textContent, 'Total de tarefas: 0');
  assert.equal(app.raw(), JSON.stringify(initial));
  assert.equal(app.writes.length, 0);
});

test('write failure at startup keeps restored data and warns without repeated writes', () => {
  const app = startApp({raw: JSON.stringify(initial), writeError: true});
  assertWarning(app);
  assert.match(app.elements.storageStatus.textContent, /recarregar/);
  app.add('ler livro');
  assert.equal(app.elements.total.textContent, 'Total de tarefas: 3');
  assert.equal(app.raw(), JSON.stringify(initial));
  assert.equal(app.writes.length, 1);
});

test('write failure after startup does not interrupt input cleanup or subsequent actions', () => {
  const app = startApp();
  const saved = app.raw();
  const previousWrites = app.writes.length;
  app.failWrites();
  app.add();
  assertWarning(app);
  assert.equal(app.elements.itemInput.value, '');
  assert.equal(app.elements.itemInput.focused, true);
  app.elements.list.children[0].click();
  assert.equal(app.elements.done.textContent, 'Concluidas: 1');
  app.elements.removeLastBtn.click();
  app.add('treinar');
  assert.equal(app.elements.total.textContent, 'Total de tarefas: 1');
  assert.equal(app.raw(), saved);
  assert.equal(app.writes.length, previousWrites + 1);
});

test('normal add, toggle, edit and removal still save the latest state', () => {
  const app = startApp();
  app.add();
  app.elements.list.children[0].click();
  assert.deepEqual(JSON.parse(app.raw()), [{text:'estudar', completed:true}]);
  app.elements.list.children[0].handlers.dblclick({stopImmediatePropagation() {}});
  assert.deepEqual(JSON.parse(app.raw()), [{text:'novo titulo', completed:true}]);
  app.elements.removecompleted.click();
  assert.deepEqual(JSON.parse(app.raw()), []);
});


test('blocked localStorage property access does not prevent startup or adding', () => {
  const app = startApp({accessError: true});
  assertWarning(app);
  app.add();
  assert.equal(app.elements.total.textContent, 'Total de tarefas: 1');
  assert.equal(app.writes.length, 0);
});

test('HTML includes an initially hidden status region for storage messages', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.match(html, /<p id="storageStatus" role="status" hidden><\/p>/);
});
