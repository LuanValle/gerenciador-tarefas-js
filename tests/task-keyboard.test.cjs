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
    key(event) { elements.itemInput.handlers.keydown(event); },
    failWrites: () => { failWrites = true; },
    add(text = 'estudar') { elements.itemInput.value = text; elements.addBtn.click(); },
  };
}


test('Enter during composition preserves unfinished input and does not save', () => {
  const app = startApp();
  app.elements.itemInput.value = 'estudar';
  const writes = app.writes.length;
  app.key({key: 'Enter', isComposing: true});
  assert.deepEqual(JSON.parse(app.raw()), []);
  assert.equal(app.elements.itemInput.value, 'estudar');
  assert.equal(app.writes.length, writes);
});
test('IME keyCode 229 fallback also preserves input', () => {
  const app = startApp();
  app.elements.itemInput.value = 'estudar';
  app.key({key: 'Enter', isComposing: false, keyCode: 229});
  assert.deepEqual(JSON.parse(app.raw()), []);
  assert.equal(app.elements.itemInput.value, 'estudar');
});
test('a fresh Enter after composition adds exactly once', () => {
  const app = startApp();
  app.elements.itemInput.value = 'estudar';
  app.key({key: 'Enter', isComposing: true});
  app.key({key: 'Enter', isComposing: false, keyCode: 13});
  assert.deepEqual(JSON.parse(app.raw()), [{text:'estudar', completed:false}]);
  assert.equal(app.elements.itemInput.value, '');
});
test('ordinary Enter remains supported', () => {
  const app = startApp();
  app.elements.itemInput.value = 'treinar';
  app.key({key: 'Enter'});
  assert.deepEqual(JSON.parse(app.raw()), [{text:'treinar', completed:false}]);
});
test('other keys do not submit and Add button remains supported', () => {
  const app = startApp();
  app.elements.itemInput.value = 'estudar';
  app.key({key: 'a'});
  assert.deepEqual(JSON.parse(app.raw()), []);
  app.elements.addBtn.click();
  assert.deepEqual(JSON.parse(app.raw()), [{text:'estudar', completed:false}]);
});
