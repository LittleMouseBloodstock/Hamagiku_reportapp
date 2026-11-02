import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFrontend = createRequire(path.join(root, 'frontend/package.json'));
const { transform } = requireFrontend('esbuild');
const source = await readFile(path.join(root, 'frontend/lib/print-readiness.ts'), 'utf8');
const compiled = await transform(source, { loader: 'ts', format: 'esm', target: 'es2020' });
const { waitForPrintReady } = await import(`data:text/javascript;base64,${Buffer.from(compiled.code).toString('base64')}`);

const tick = () => new Promise((resolve) => setImmediate(resolve));

class FakeImage {
    complete = false;
    listeners = new Map();

    addEventListener(type, listener) {
        const callbacks = this.listeners.get(type) || new Set();
        callbacks.add(listener);
        this.listeners.set(type, callbacks);
    }

    removeEventListener(type, listener) {
        this.listeners.get(type)?.delete(listener);
    }

    dispatch(type) {
        this.complete = true;
        for (const listener of this.listeners.get(type) || []) listener();
    }
}

const fakeRoot = (...images) => ({
    querySelectorAll(selector) {
        assert.equal(selector, 'img');
        return images;
    },
});

test('waits for fonts, delayed images, and two animation frames', async () => {
    let resolveFonts;
    const fonts = { ready: new Promise((resolve) => { resolveFonts = resolve; }) };
    const image = new FakeImage();
    const frames = [];
    let finished = false;

    const pending = waitForPrintReady(fakeRoot(image), {
        fonts,
        requestAnimationFrame: (callback) => {
            frames.push(callback);
            return frames.length;
        },
    }).then(() => { finished = true; });

    await tick();
    assert.equal(finished, false);
    assert.equal(frames.length, 0);

    resolveFonts();
    await tick();
    assert.equal(finished, false);

    image.dispatch('load');
    await tick();
    assert.equal(frames.length, 1);
    assert.equal(finished, false);

    frames.shift()();
    await tick();
    assert.equal(frames.length, 1);
    assert.equal(finished, false);

    frames.shift()();
    await pending;
    assert.equal(finished, true);
});

test('resolves when an image is already complete or fails to load', async () => {
    const completeImage = new FakeImage();
    completeImage.complete = true;
    const failedImage = new FakeImage();
    const frames = [];
    const pending = waitForPrintReady(fakeRoot(completeImage, failedImage), {
        fonts: { ready: Promise.resolve() },
        requestAnimationFrame: (callback) => {
            frames.push(callback);
            return frames.length;
        },
    });

    await tick();
    failedImage.dispatch('error');
    await tick();
    frames.shift()();
    await tick();
    frames.shift()();
    await pending;
    assert.equal(failedImage.listeners.get('load')?.size || 0, 0);
    assert.equal(failedImage.listeners.get('error')?.size || 0, 0);
});

test('イベント登録中に読み込み終わった画像でも待機が停止しない', async () => {
    const image = new FakeImage();
    image.addEventListener = function (type, listener) {
        FakeImage.prototype.addEventListener.call(this, type, listener);
        this.complete = true;
    };
    await waitForPrintReady(fakeRoot(image), { fonts: { ready: Promise.resolve() } });
    assert.equal(image.listeners.get('load')?.size || 0, 0);
    assert.equal(image.listeners.get('error')?.size || 0, 0);
});
