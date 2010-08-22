require('./lib/pegjs/lib/compiler') // util PEG to global obj
require('./lib/pegjs/lib/metagrammar')
var fs = require('fs'),
	util = exports

util.generateParser = function(path) {
	var grammar = fs.readFileSync(path).toString(),
		parser = PEG.buildParser(grammar)
	
	return parser
}

util.errorMsg = function(type, e) {
	var msg = (e.line !== undefined && e.column !== undefined)
		? ("Line " + e.line + ", column " + e.column + ": " + e.message)
		: e.message;
	
	return 'util.errorMsg: ' + type + ' error: ' + msg
}

util.parseWithGrammar = function(code, grammarPath) {
	var grammar = fs.readFileSync(grammarPath).toString(),
		parser,
		ast
	
	try { parser = PEG.buildParser(grammar) }
	catch(e) { return { error: util.errorMsg('Grammar', e) } }
	
	try { ast = parser.parse(code) }
	catch(e) { return { error: util.errorMsg('Code', e) } }
	
	return { ast: ast }
}

util.prettyPrint = function(ast, indent) {
	if (ast instanceof Array) {
		var result = []
		for (var i=0; i < ast.length; i++) {
			result.push(util.prettyPrint(ast[i], indent))
		}
		return "\n" + result.join('')
	} else if (typeof ast == 'object') {
		indent = (typeof indent == 'undefined' ? '' : indent + '\t')
		var result = []
		for (var key in ast) {
			result.push(indent + key + ':' + util.prettyPrint(ast[key], indent))
		}
		return "\n" + result.join('')
	} else {
		return JSON.stringify(ast) + "\n"
	}
}
