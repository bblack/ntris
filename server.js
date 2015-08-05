var path = require('path');
var fs = require('fs');
var http = require('http');
var socketio = require('socket.io');
var ntris = require('./ntris');

var app = http.createServer(function(req, res){
    if (req.url === '/favicon.ico') {
        res.writeHead(200);
        res.end();
        return;
    }
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
var games = [];

io.on('connection', function(socket){
    socket.on('error', function(e){
        console.error(e);
        if (e.stack) console.error(e.stack);
    })
    console.log('client connected');
    clients.push(socket);

    var game = new ntris.Game(socket);
    var gameId = games.push(game) - 1;
    socket.broadcast.emit('newgame', {id: gameId, state: game.getState()});
    game.run()
    .on('rowcleared', function(){
        var l = (gameId - 1 + games.length) % games.length;
        var r = (gameId + 1) % games.length;
        var neighbors = [games[l], games[r]];
        if (neighbors[0] === neighbors[1]) {
            neighbors.pop();
        }
        var blocksPerNeighbor = game.board.width / 2;
        neighbors.forEach(function(neighborGame){
            neighborGame.enqueuePartialRow(blocksPerNeighbor);
        });
    })
    .on('state', function(state){
        io.emit('state', {id: gameId, state: state});
    })
    .on('end', function(){
        io.emit('end', {id: gameId});
    });

    var world = games.map(function(game, id){
        return {id: id, state: game.getState()};
    });
    socket.emit('world', world);
    socket.emit('msg', 'You are now playing!');
    console.log('player playing');
})
