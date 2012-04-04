var expressions = require('./expressions'),
	each = require('std/each'),
	curry = require('std/curry'),
	throttle = require('std/throttle')

;(function() {
	if (typeof fun == 'undefined') { fun = {} }
	var _unique, _hooks, _hookCallbacks
	
	fun.reset = function() {
		_unique = 0
		_hooks = {}
		_hookCallbacks = {}
	}
	
	fun.name = function(readable) { return '_' + (readable || '') + '_' + (_unique++) }

	fun.expressions = expressions
	
	fun.invoke = function(operand, args) {
		operand = operand.evaluate()
		// TODO Observe operand
		// TODO Observe arguments
		switch (operand.getType()) {
			case 'Handler': return operand.handle(args)
			case 'Function': return operand.invoke(args)
			case 'Template': throw new Error("Implement Template invokation"); // return operand.render()
			default: throw new Error('Attempted to invoke a non-invocable: '+operand.inspect())
		}
	}
	
/* Values
 ********/
	fun.emit = function(parentHookName, value) {
		var hookName = fun.hook(fun.name(), parentHookName)
		value.observe(function() {
			_hooks[hookName].innerHTML = ''
			_hooks[hookName].appendChild(document.createTextNode(value.asString()))
		})
	}
	
/* Hooks
 *******/
	fun.setHook = function(name, dom) { _hooks[name] = dom }
	fun.hook = function(name, parentName, opts) {
		if (_hooks[name]) { return name }
		opts = opts || {}
		var parent = _hooks[parentName],
			hook = _hooks[name] = document.createElement(opts.tagName || 'hook')
		
		for (var key in opts.attrs) { fun.attr(name, key, opts.attrs[key]) }
		
		if (_hookCallbacks[name]) {
			for (var i=0, callback; callback = _hookCallbacks[name][i]; i++) {
				callback(hook)
			}
		}
		
		if (!parent.childNodes.length || !opts.prepend) { parent.appendChild(hook) }
		else { parent.insertBefore(hook, parent.childNodes[0]) }
		
		return name
	}
	fun.destroyHook = function(hookName) {
		if (!_hooks[hookName]) { return }
		_hooks[hookName].innerHTML = ''
	}
	fun.withHook = function(hookName, callback) {
		if (_hooks[hookName]) { return callback(_hooks[hookName]) }
		else if (_hookCallbacks[hookName]) { _hookCallbacks[hookName].push(callback) }
		else { _hookCallbacks[hookName] = [callback] }
	}

	fun.attr = function(hookName, key, value) {
		if (key == 'data') {
			fun.reflectInput(hookName, value)
			return
		}
		value.observe(function() {
			if (match = key.match(/^on(\w+)$/)) {
				// Todo remove event listeners
				var eventName = match[1].toLowerCase()
				if (value.getType() != 'Handler') {
					console.warn('Event attribute', eventName, 'value is not a Handler')
					return
				}
				fun.on(_hooks[hookName], eventName, function(e) {
					var event = expressions.fromJsValue({
						keyCode:e.keyCode,
						type:e.type,
						cancel:fun.expressions.Function(function() {
							if (e.preventDefault) { e.preventDefault() }
							else { e.returnValue = false }
						})
					})
					value.invoke(event)
				})
			} else if (match = key.match(/^style\.(\w+)$/)) {
				fun.setStyle(hookName, match[1], value)
			} else if (key == 'style') {
				each(value.getContent(), function(val, key) {
					fun.setStyle(hookName, key, val)
				})
			} else {
				_hooks[hookName].setAttribute(key, value.getContent())
			}
		})
	}

	fun.setStyle = function(hookName, key, value) {
		var rawValue = value.evaluate().asString()
		if (value.getType() == 'Number' || rawValue.match(/^\d+$/)) { rawValue = rawValue + 'px' }
		if (key == 'float') { key = 'cssFloat' }
		_hooks[hookName].style[key] = rawValue
	}
	
	fun.on = function(element, eventName, handler) {
		if (element.addEventListener) {
			element.addEventListener(eventName, handler, false)
		} else if (element.attachEvent){
			element.attachEvent("on"+eventName, handler)
		}
	}
	
	fun.reflectInput = function(hookName, property) {
		var input = _hooks[hookName]
		if (input.type == 'checkbox') {
			property.observe(function() {
				input.checked = property.getContent() ? true : false
			})
			fun.on(input, 'change', function() {
				setTimeout(function() {
					property.set(null, input.checked ? fun.expressions.Yes : fun.expressions.No)
				})
			})
		} else {
			property.observe(function() {
				input.value = property.evaluate().asString()
			})
			fun.on(input, 'keypress', update)
			fun.on(input, 'keyup', update)
			fun.on(input, 'keydown', function(e) {
				if (e.keyCode == 86) { update(e) } // catch paste events
			})
			function update(e) {
				setTimeout(function() {
					var value = input.value
					if (property.getContent() === value) { return }
					property.set(null, fun.expressions.Text(input.value))
					input.value = value
				}, 0)
			}
		}
	}

/* init & export
 ***************/
	fun.reset()
	if (typeof module != 'undefined') { module.exports = fun }
})()
