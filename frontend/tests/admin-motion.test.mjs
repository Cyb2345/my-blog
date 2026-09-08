import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real component's effects with a small deterministic hook harness.
function harness() {
  const refs = [], effects = [], animations = [];
  let refIndex = 0, effectIndex = 0, observerCount = 0;
  const media = { matches: false, addEventListener(_, fn) { this.listener = fn; }, removeEventListener() { this.listener = null; } };
  const node = { animate(frames, options) {
    const animation = { frames, options, cancelled: false, cancel() { this.cancelled = true; } };
    animations.push(animation);
    return animation;
  } };
  const react = {
    useRef(value) { const index = refIndex++; return refs[index] ??= { current: value }; },
    useEffect(fn, deps) {
      const index = effectIndex++, previous = effects[index];
      if (!previous || deps.some((value, i) => value !== previous.deps[i])) {
        effects[index] = { deps, fn, cleanup: previous?.cleanup, pending: true };
      }
    },
  };
  const compiledModule = { exports: {} };
  const source = fs.readFileSync(new URL('../components/admin/AdminPageTransition.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(compiled, {
    module: compiledModule, exports: compiledModule.exports,
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type, props, key) => ({ type, props, key }) };
      if (name.includes('AdminLayoutContext')) return { useAdminLayout: () => ({ locale: 'zh-CN' }) };
      throw new Error('Unexpected dependency: ' + name);
    },
    window: { matchMedia: () => media },
    getComputedStyle: () => ({ getPropertyValue: key => key === '--admin-motion-enter' ? '160ms' : 'ease-out' }),
    MutationObserver: class { constructor() { observerCount++; } },
  });
  return {
    media, animations,
    get observers() { return observerCount; },
    render(route, children = 'content') {
      refIndex = effectIndex = 0;
      const result = compiledModule.exports.AdminPageTransition({ transitionKey: route, children });
      result.props.ref.current = node;
      for (const effect of effects) if (effect.pending) {
        effect.cleanup?.(); effect.cleanup = effect.fn(); effect.pending = false;
      }
      return result;
    },
    dispose() { for (const effect of effects) effect.cleanup?.(); },
  };
}

test('first render is visible, unkeyed and avoids Chinese DOM observation', () => {
  const h = harness(), view = h.render('/admin');
  assert.equal(view.type, 'div'); assert.equal(view.key, undefined);
  assert.equal(h.animations.length, 0); assert.equal(h.observers, 0);
});
test('route commits use one opacity-only animation; data renders do not replay', () => {
  const h = harness(); h.render('/admin'); h.render('/admin/content/posts');
  h.render('/admin/content/posts', 'loaded data');
  assert.equal(h.animations.length, 1);
  assert.equal(h.animations[0].options.duration, 160);
  assert.deepEqual(Object.keys(h.animations[0].frames[0]), ['opacity']);
  assert.equal(h.animations[0].frames[0].opacity, 0.94);
});
test('rapid navigation cancels superseded animations and unmount cleans up', () => {
  const h = harness(); h.render('/admin'); h.render('/admin/categories'); h.render('/admin/tags');
  assert.equal(h.animations[0].cancelled, true); h.dispose();
  assert.equal(h.animations[1].cancelled, true);
});
test('reduced motion suppresses new animations', () => {
  const h = harness(); h.render('/admin'); h.media.matches = true; h.render('/admin/tags');
  assert.equal(h.animations.length, 0);
});
test('enabling reduced motion cancels an active animation', () => {
  const h = harness(); h.render('/admin'); h.render('/admin/tags');
  h.media.matches = true; h.media.listener();
  assert.equal(h.animations[0].cancelled, true);
});
