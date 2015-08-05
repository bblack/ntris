requirejs.config({
  paths: {
    EventEmitter2: 'bower_components/eventemitter2/lib/eventemitter2',
    io: '/socket.io/socket.io.js',
    mousetrap: 'bower_components/mousetrap/mousetrap.min',
    events: 'browser/events',
    underscore: 'bower_components/underscore/underscore-min',
    util: 'browser/util'
  }
});

define(function(require){
  var io = require('io')
  var Mousetrap = require('mousetrap');
  require(['util', 'drawer'], function(util, Drawer){
    var ntris = require('ntris');
    var games = [];

    function addGame(args){
      var game = new ntris.Game();
      games[args.id] = game;
      var canvas = document.createElement('canvas');
      document.body.appendChild(canvas);
      var drawer = new Drawer(game, canvas)
      game.setState(args.state);
    }

    var socket = io(window.location.origin)
    .once('world', function(gameStates){
      gameStates.forEach(function(gameState){
        addGame(gameState);
      });
    })
    .on('newgame', function(args){
      addGame(args);
    })
    .on('state', function(args){
      games[args.id].setState(args.state);
    })
    .on('end', function(args){
      games[args.id].end();
    });

    Mousetrap.bind('right', function(){
      socket.emit('moveRight');
    })
    Mousetrap.bind('left', function(){
      socket.emit('moveLeft');
    })
    Mousetrap.bind('down', function(){
      socket.emit('moveDown');
    })
    Mousetrap.bind('up', function(){
      socket.emit('rotate');
    })
  });
});
