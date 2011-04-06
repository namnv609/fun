/* Mouse.x and Mouse.y
 *********************/
fun.on(document, 'mousemove', function(e) {
	fun.mutate('SET', fun.local, '__Mouse_x__', [e.clientX])
	fun.mutate('SET', fun.local, '__Mouse_y__', [e.clientY])
})
fun.mutate('SET', fun.local, '__Mouse_x__', [0])
fun.mutate('SET', fun.local, '__Mouse_y__', [0])

/* Mouse.isDown
 **************/
fun.on(document, 'mousedown', function() {
	fun.mutate('SET', fun.local, '__Mouse_isDown__', [true])
})
fun.on(document, 'mouseup', function() {
	fun.mutate('SET', fun.local, '__Mouse_isDown__', [false])
})
fun.mutate('SET', fun.local, '__Mouse_isDown__', [false])