import { test } from 'node:test';
import assert from 'node:assert/strict';
import router from '../routes/authentication.js';
import { authLimiter } from '../middleware/rateLimiter/index.js';

function handlersFor(method, path) {
    const layer = router.stack.find(l => l.route?.path === path && l.route.methods[method]);
    assert.ok(layer, `${method.toUpperCase()} ${path} is registered`);
    return layer.route.stack.map(s => s.handle);
}

test('sign-in is rate limited', () => {
    assert.ok(handlersFor('post', '/google').includes(authLimiter));
});

test('the profile read does not spend the sign-in budget', () => {
    assert.ok(!handlersFor('get', '/user/:id').includes(authLimiter));
});
