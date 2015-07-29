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
  var ntris;
  require(['util', 'drawer'], function(util, Drawer){
    var ntris = require('ntris');
    var game = new ntris.Game();
    var drawer = new Drawer(game, document.getElementsByTagName('canvas')[0]);
    var socket = io('http://localhost:7777')
    .on('state', function(state){
      game.setState(state);
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
