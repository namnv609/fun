var std = require('std'),
	a = require('../resolver-mocks'),
	resolver = require('../../src/resolver'),
	parser = require('../../src/parser'),
	tokenizer = require('../../src/tokenizer'),
	util = require('../../src/util')

test("a declared alias for a string")
	.code(
		'var guy = "Marcus"',
		'guy'
	)
	.declarations(a.variable('guy', a.literal('Marcus')))
	.expressions(a.reference('guy'))

test("an empty div")
	.code(
		'<div/>'
	)
	.expressions(a.xml('div'))

test("nested aliases")
	.code(
		'var foo = { bar:1, cat:"cat" }',
		'foo foo.bar foo.cat'
	)
	.declarations(a.variable('foo', a.object({ bar:a.literal(1), cat:a.literal('cat') })))
	.expressions(
		a.reference('foo'),
		a.reference('foo.bar'),
		a.reference('foo.cat')
	)

// test('nested values and references of references')
// 	.code(
// 		'var foo = { nested: { cat:"yay" } }')
// 		'var bar = foo.nested',
// 		'var cat = bar.cat',
// 		'var cat2 = foo.nested.cat',
// 		'foo.nested.cat bar.cat cat bar')
// 	.declarations(
// 		ref(1, a.variable('foo', a.object({ nested:a.object({ cat:a.literal('yay') }) })))
// 	)
// 	.expressions(a.reference(), ref(1), ref(1), ref(4))
// 
// all values are typed at runtime, and can change type. there are
// 	atomics: numbers, text, bool, null
// 	collections: list, object
// 	collection references: foo.bar.cat, taw[1][4]
// 	do we want dynamic dereferencing?: foo[bar]
// an expression is
	
test('clicking a button updates the UI')
	.code(
		'var foo = "bar"',
		'var qwe = "cat"',
		'<div id="output">foo</div>',
		'<button id="button">"Click me"</button onClick=handler() {',
		'	foo.set("cat")',
		'	qwe.set(foo)',
		'}>')
	.declarations(
		a.variable('foo', 'bar'),
		a.variable('qwe', 'cat'),
		ref(1, a.handler([], [
			a.mutation(a.reference('foo'), 'set', [a.literal('cat')]),
			a.mutation(a.reference('qwe'), 'set', [a.reference('foo')])
		]))
	)
	.expressions(
		a.xml('div', { id:a.literal('output') }, [ a.reference('foo') ]),
		a.xml('button', { id:a.literal('button'), onclick:ref(1) }, [ a.literal('Click me') ])
	)

// Boolean values
// Null values
// Handlers, Functions and Templates as expressions and being emitted
// 
// test('typed value values')
// 	.code(
// 		'let Response = { error:Text, result:Text }',
// 		'let Response response = { error:"foo", result:"bar" }',
// 		'response'
// 	)
// 	.expect(
// 		a.declaration('Response', a.interface({ error:a.Text, result:a.Text })),
// 		a.declaration('response', a.object({ error:a.literal('foo'), result:a.literal('bar') }), a.alias('Response')),
// 		a.alias('response')
// 	)
// 
// test('typed function declaration and invocation')
// 	.code(
// 		'let Response = { error:Text, result:Text }',
// 		'let Response post = function(Text path, Anything params) {',
// 		'	return { error:"foo", response:"bar" }',
// 		'}',
// 		'let response = post("/test", { foo:"bar" })'
// 	)
// 	.expect(
// 		a.declaration('Response', a.interface({ error:a.Text, result:a.Text })),
// 		a.declaration('post', a.function([a.argument('path', a.Text), a.argument('params', a.Anything)], [
// 			a.return(a.object({ error:a.literal('foo'), response:a.literal('bar') }))
// 		]), a.alias('Response')),
// 		a.declaration('response', a.invocation(a.alias('post'), a.literal('/test'), a.object({ foo:a.literal('bar')})))
// 	)

// TODO test file imports

/* Util
 ******/
function test(name) {
	util.resetUniqueID()
	ref.references = {}
	var inputCode
	return {
		code: function(/* line1, line2, ... */) {
			inputCode = std.slice(arguments).join('\n')
			return this
		},
		expressions: function() {
			runTest('expressions', std.slice(arguments))
			return this
		},
		declarations: function() {
			runTest('declarations', std.slice(arguments))
			return this
		}
	}
	function runTest(type, expectedAST) {
		var inputAST = parser.parse(tokenizer.tokenize(inputCode))
		util.resetUniqueID() // TODO the unique IDs function should probably be on the resolver
		var count = 1,
			testName = type+'\t'+'"'+name+'" ' + (count++ == 1 ? '' : count)
		while (module.exports[testName]) {
			testName = type+'\t'+'"'+name+'" ' + (count++)
		}
		module.exports[testName] = function(assert) {
			try {
				var actualAST = resolver.resolve(inputAST)[type]
				assert.deepEqual(expectedAST, actualAST)
				assert.done()
			} catch(e) {
				console.log('resolver threw', e.stack)
			}
		}
	}
}

function ref(id, value) {
	var references = ref.references
	if (value) {
		if (references[id]) { throw new Error("Same test reference declared twice") }
		references[id] = value
	} else {
		if (!references[id]) { throw new Error("Referenced undeclared test reference") }
	}
	return references[id]
}