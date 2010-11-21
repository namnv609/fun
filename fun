#!/usr/bin/env node

var fs = require('fs'),
	sys = require('sys'),
	http = require('http')

/* Commandline options
 *********************/
var argv = require('./lib/node-optimist')
	.usage('Usage: $0 app.fun [--host=127.0.0.1 --port=1764 --engine=[development,redis]]')
	.demandCount(1)
	.argv

var sourceFile = argv._[0],
	port = argv.port || 1764, // sum('fun', function(letter) { return letter.charCodeAt(0) - 'a'.charCodeAt(0) + 1 }
	host = argv.host || '127.0.0.1',
	engine = argv.engine || 'development'

fs.writeFileSync('index.html', '<script>document.location="//'+host+':'+port+'"</script>')

/* HTTP server
 *************/
void(function() {
	var funJS = fs.readFileSync(__dirname + '/language/lib.js')
	http.createServer(function(req, res) {
		var match
		if (match = req.url.match(/\/fin\/(.*)/)) {
			res.writeHead(200, {'Content-Type':'application/javascript'})
			fs.readFile(__dirname + '/lib/fin/' + match[1], function(err, text) {
				res.end(text)
			})
		} else if (req.url == '/fun/fun.js') {
			res.writeHead(200, {'Content-Type':'application/javascript'})
			res.end(funJS)
		} else if (match = req.url.match(/(.*\.css)$/)) {
			res.writeHead(200, {})
			fs.readFile(__dirname + match[1], function(err, text) {
				res.end(text)
			})
		} else {
			res.writeHead(200, {'Content-Type':'text/html'})
			res.end(htmlOutput)
		}
	}).listen(port, host)
})();

/* Fin/js.io server
 ******************/
void(function() {
	require('./lib/fin/lib/js.io/packages/jsio')
	
	jsio.addPath('lib/fin/js', 'shared')
	jsio.addPath('lib/fin/js', 'server')
	
	jsio('import server.Server')
	jsio('import server.Connection')
	
	var storageEngine
	switch (engine) {
		case 'development':
			storageEngine = require('./lib/fin/engines/development')
			break
		case 'redis':
			storageEngine = require('./lib/fin/engines/redis')
			break
		default:
			throw new Error('Unkown store "'+store+'"')
	}
	var finServer = new server.Server(server.Connection, storageEngine)
	
	// for browser clients
	finServer.listen('csp', { port: 5555 }) 
	
	// // for robots
	// finServer.listen('tcp', { port: 5556, timeout: 0 }) 
})();

/* Compilation
 *************/
var tokenizer = require('./language/tokenizer'),
	parser = require('./language/parser'),
	resolver = require('./language/resolver'),
	compiler = require('./language/compiler')

var compiledJS, htmlOutput
function compile() {
	sys.puts('tokenize...')
	var tokens = tokenizer.tokenize(sourceFile)
	sys.puts('parse...')
	var ast = parser.parse(tokens)
	sys.puts('resolve...')
	var resolved = resolver.resolve(ast)
	sys.puts('compile...')
	
	compiledJS = compiler.compile(resolved.ast, resolved.modules, resolved.declarations)
	htmlOutput = [
		'<!doctype html>',
		'<html>',
		'<head>',
		'	<script src="/fin/fin.js"></script>',
		'	<script src="/fun/fun.js"></script>',
		'</head>',
		'<body>',
		'	<script>' + compiledJS + '</script>',
		'</body>',
		'</html>'
	].join('\n')
}

fs.watchFile(sourceFile, function(currStat, prevStat) {
	if (currStat.mtime.getTime() == prevStat.mtime.getTime()) { return }
	sys.puts('detected change to ' + sourceFile + ' - recompiling')
	compile()
	sys.puts('done recompiling')
})

compile()

sys.puts('\nWoot!! ' + sourceFile + ' is running using the '+engine+' engine. Now point your browser to ' + host + ':' + port)
