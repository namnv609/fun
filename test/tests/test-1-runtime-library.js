var fun = require('../../src/runtime/library'),
	slice = require('std/slice'),
	a = require('../runtime-mocks'),
	isArray = require('std/isArray'),
	each = require('std/each'),
	map = require('std/map'),
	deepEqual = require('std/assert/deepEqual')

test('set and get simple', function(assert) {
	var bar = a.variable({ cat:{ asd:2 } })
	a.reference(bar, 'cat').mutate('set', [a.value('asd'), a.value(3)])
	bar.mutate('set', [a.value('hi')])
})

test('sets and gets', function(assert) {
	var foo = a.variable(1),
		bar = a.variable({ cat:{ asd:2 } }),
		error
	assert.equals(a.value(1), foo)
	assert.equals(foo, a.value(1))
	assert.equals(a.value(null), a.reference(foo, 'cat'))
	
	assert.equals(a.value(2), a.reference(bar, 'cat.asd'))
	assert.equals(a.value({ asd:2 }), a.reference(bar, 'cat'))
	
	assert.throws(function() { fun.set(foo, 'chain', a.value('break')) })
	assert.throws(function() { fun.set(foo, 'deeper.chain', a.value('break')) })
	
	a.reference(bar, 'cat').mutate('set', [a.value('asd'), a.value(3)])
	assert.equals(a.value(3), a.reference(bar, 'cat.asd'))
	assert.equals(a.value({ asd:3 }), a.reference(bar, 'cat'))
	
	foo.mutate('set', [a.value({ nested:{ deeper:{ yet:'qwe' } } })])
	bar.mutate('set', [a.value('hi')])
	
	assert.equals(a.value({ nested:{ deeper:{ yet:'qwe' } } }), foo)
	assert.equals(a.value({ deeper:{ yet:'qwe' } }), a.reference(foo, 'nested'))
	assert.equals(a.value({ yet:'qwe' }), a.reference(foo, 'nested.deeper'))
	assert.equals(a.value('qwe'), a.reference(foo, 'nested.deeper.yet'))
	assert.equals(a.value('hi'), bar)
	assert.equals(a.value(null), a.reference(bar, 'qweqweqwe'))
	assert.equals(a.value(null), a.reference(bar, 'qweqweqwe.asdasd'))
	
	assert.equals(a.reference(bar, 'qweqweqwe.asdasd').evaluate(true).getType(), 'Null')
})

test('observe value', function(assert) {
	var v1 = a.variable({ foo:null })
	observeExpect(v1, 'foo', assert, [null, 1, 2, { ned:'teq'}, 'qwe', null])
	observeExpect(v1, null, assert, [{ foo:null }, { foo:1 }, { foo:2 }, { foo:{ ned:'teq'}, blah:'wab' }, { foo:'qwe', blah:'wab' }, null])
	observeExpect(v1, 'foo.ned', assert, [null, 'teq', null])
	
	v1.mutate('set', [a.value({ foo:1 })])
	v1.evaluate().mutate('set', [a.value('foo'), a.value(2)])
	v1.mutate('set', [a.value({ foo:2 })])
	v1.evaluate().mutate('set', [a.value('blah'), a.value('wab')])
	v1.evaluate().mutate('set', [a.value('foo'), a.value({ ned:'teq' })])
	v1.evaluate().mutate('set', [a.value('foo'), a.value('qwe')])
	v1.mutate('set', [a.value(null)])
})

test('observe subvalue', function(assert) {
	var v = a.variable(null)
	observeExpect(v, 'b.c', assert, [null, 1, null, 2, null, 3])
	v.mutate('set', [a.value({ b:{ c:1 }})])
	v.mutate('set', [a.value(9)])
	v.mutate('set', [a.value({ b:{ c:2 } })])
	a.reference(v, 'b').mutate('set', [a.value('c'), a.value(null)])
	a.reference(v, 'b').mutate('set', [a.value('c'), a.value(3)])
})

test('evaluate binary operator expressions', function(assert) {
	var v1 = a.variable(1),
		v2 = a.variable(2),
		v3 = a.variable(3),
		v4 = a.variable('4')
	assert.equals(a.binaryOp(v1, '+', v2), a.value(3))
	assert.equals(a.binaryOp(v1, '+', v2), v3)
	assert.equals(a.binaryOp(v4, '+', v1), a.value('41'))
	assert.equals(v3, a.binaryOp(v1, '+', v2))
	assert.equals(a.value(true), a.binaryOp(a.value(4), '==', a.binaryOp(v1, '+', v3)))
	assert.equals(a.value(false), v3.equals(a.binaryOp(v1, '+', v1)))
})

test('observing and dismissing', function(assert) {
	var v1 = a.variable(1)
	var observationID = observeExpect(v1, null, assert, [1,2], true)
	v1.mutate('set', [a.value(2)])
	assert.throws(function() {
		// We expected exactly 2 observation callbacks
		v1.mutate('set', [a.value(3)])
	})
	v1.dismiss(observationID)
	// Should no longer throw, since the observation was dismissed
	v1.mutate('set', [a.value(4)])
	
	var v2 = a.variable('a')
	var d2 = a.value({ v2:v2 })
	d2.observe(expectCalls(assert, 3)) // Call 1
	v2.mutate('set', [a.value('b')]) // Call 2
	d2.mutate('set', [a.value('v2'), a.value('new value that should automatically dismiss v2 observation')]) // Call 3
	v2.mutate('set', [a.value('c')]) // Should not result in call 4
})

test('observing a sub-property', function(assert) {
	var v1 = a.variable({ foo:'bar', cat:'tag' })
	var d1_1 = a.reference(v1, 'foo')
	var d1_2 = a.reference(v1, 'cat')
	d1_1.observe(expectCalls(assert, 1)) // Call 1.1
	d1_2.observe(expectCalls(assert, 2)) // Call 2.1
	fun.dictSet(v1, 'cat', 'qwe') // Call 2.2
})

var expectCalls = function(assert, expectedCalls) {
	var count = 0
	assert.blocks.add(expectedCalls)
	return function() {
		assert.blocks.subtract()
		if (++count > expectedCalls) {
			throw new Error("Expected only "+expectedCalls+" call"+(expectedCalls == 1 ? '' : 's'))
		}
	}
}

var q = function(val) { return JSON.stringify(val) }

var waitingFor = []
var observeExpect = function(variable, chain, assert, values, throwOnExtraMutations) {
	assert.blocks.add(values.length)
	values = map(values, a.value)
	waitingFor.push({ original:map(values, a.value), now:values })
	if (chain) { variable = a.reference(variable, chain) }
	return variable.observe(function() {
		if (!values[0]) {
			if (throwOnExtraMutations) { throw new Error("Received unexpected mutation") }
			return
		}
		var logic = variable.equals(values[0])
		if (!logic.getContent()) { return }
		values.shift()
		assert.blocks.subtract()
	})
}

function test(name, fn) {
	module.exports[name] = function(assert) {
		fun.reset()
		assert.blocks = {
			_count: 0,
			_done: false,
			add: function(num) { this._count += (typeof num == 'number' ? num : 1) },
			subtract: function(num) {
				this._count--
				this.tryNow()
			},
			tryNow: function() {
				if (this._count || this._done) { return }
				this._done = true
				assert.done()
			}
		}
		assert.equals = function(val1, val2) {
			if (fun.expressions.base.isPrototypeOf(val1) || fun.expressions.base.isPrototypeOf(val2)) {
				return this.ok(val1.equals(val2).getContent())
			} else {
				return this.deepEqual(val1, val2)
			}
		}
		assert.throws = function(fn) {
			var didThrow = false
			try { fn() }
			catch(e) { didThrow = true }
			this.ok(didThrow)
		}
		try { fn(assert) }
		catch(e) { console.log('ERROR', e.stack || e); assert.fail('Test threw: ' + e.message) }
		each(waitingFor, function(waitingFor) {
			if (!waitingFor.now.length) { return }
			console.log("Still waiting for:", waitingFor)
		})
		assert.blocks.tryNow()
	}
}
