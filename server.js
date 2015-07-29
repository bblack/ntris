var path = require('path');
var fs = require('fs');
var http = require('http');
var socketio = require('socket.io');
var ntris = require('./ntris');

var app = http.createServer(function(req, res){
    var filepath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    fs.readFile(filepath, function(err, data){
        if (err) {
            res.writeHead(500);
            return res.end('Error loading index.html');
        }
        res.writeHead(200);
        res.end(data);
    });
});
var io = socketio(app);
app.listen(process.env.PORT || 7777);
console.log('Listening on', app.address());
var clients = [];

io.on('connection', function(socket){
    socket.on('error', function(e){
        console.error(e);
        if (e.stack) console.error(e.stack);
    })
    console.log('client connected');
    clients.push(socket);
    if (clients.length == 1) {
        var game = new ntris.Game(socket);
        game.run();
        // TODO: listen for any event on an 'updates' channel
        io.emit('foo', 'bar');
        game.on('state', function(state){
            io.emit('state', state); // to everyone
        });
        socket.emit('msg', 'You are now playing!');
        console.log('player playing')
    } else {
        socket.emit('msg', 'You are watching another game already in progress.');
        console.log('player watching')
    }
})
