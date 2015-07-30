var define = define || function(exports){
    module.exports = exports(require);
};
define(function(require){

var util = require('util');
var events = require('events');
var _ = require('underscore');

var SHAPES = [
    [
        [1, 1],
        [1, 1]
    ], [
        [1, 1, 0],
        [0, 1, 1]
    ], [
        [0, 1, 1],
        [1, 1, 0]
    ], [
        [0, 1, 0],
        [1, 1, 1]
    ], [
        [1, 0, 0],
        [1, 1, 1]
    ], [
        [0, 0, 1],
        [1, 1, 1]
    ], [
        [1, 1, 1, 1]
    ],
];
var OFFGRID = undefined;
var EMPTY = 0;
var FULL = 1;
var FULL_FLASH = 2;

function Game(cmdEmitter){
    var self = this;

    if (cmdEmitter) {
        this.obeyCommandsFrom(cmdEmitter);
    }

    this.board = new Board(10, 18);
    events.EventEmitter.apply(this);
}
util.inherits(Game, events.EventEmitter);

Game.prototype.run = function(){
    this.tickHandle = setInterval(this.onTick.bind(this), 1000);
    this.dropRandomOmino();
    return this;
}

Game.prototype.obeyCommandsFrom = function(cmds){
    if (this.alreadyObeying) throw new Error('already obeying');
    this.alreadyObeying = true;
    var self = this;

    cmds
    .on('moveLeft', function(){
        self.moveX(-1);
    })
    .on('moveRight', function(){
        self.moveX(1);
    })
    .on('moveDown', function(){
        self.moveDown();
    })
    .on('rotate', function(){
        self.rotate();
    });
}

// emits the entire game state.
// TODO: emit smaller deltas and more compact representations
Game.prototype.emitEntireState = function(){
    var state = this.getState();
    this.emit('state', state);
}

Game.prototype.getState = function(){
    return {
        board: {
            rows: this.board.rows
        },
        activeOmino: this.activeOmino
    };
}

// for a client, having received state update, to set local state
Game.prototype.setState = function(state){
    this.board.rows = state.board.rows;
    this.activeOmino = state.activeOmino;
    this.emit('tick'); // drawer draws on this event
}

Game.prototype.collides = function(board, omino){
    return _.any(omino.shape, function(row, rowNum){
        return _.any(row, function(col, colNum){
            if (!col) return;
            var point = board.getPoint(omino.y + rowNum, omino.x + colNum);
            return point === FULL || point === OFFGRID;
        })
    })
}

Game.prototype.onTick = function(){
    this.moveDown();
}

Game.prototype.cement = function(board, omino){
    _.each(omino.shape, function(row, rowNum){
        _.each(row, function(col, colNum){
            if (col)
                board.setPoint(omino.y + rowNum, omino.x + colNum, FULL);
        })
    })
}

Game.prototype.dropRandomOmino = function(){
    var newShape = _.sample(SHAPES);
    this.dropOmino(newShape);
}

Game.prototype.dropOmino = function(shape){
    if (this.activeOmino) {
        throw new Error("Can only have one active shape at a time");
    }
    this.activeOmino = {
        x: 4,
        y: 0,
        shape: shape
    };
    this.emitEntireState();
    if (this.collides(this.board, this.activeOmino)) {
        this.end();
    }
}

Game.prototype.isRunning = function(){
    return this.hasOwnProperty('tickHandle');
}

Game.prototype.end = function(){
    clearInterval(this.tickHandle);
    delete this.tickHandle;
    console.log('Game ended.')
}

Game.prototype.resolveCompletedRows = function(callback){
    var self = this;
    // find completed rows
    var completedRowNums = _.reduce(this.board.rows, function(memo, row, rownum){
        if (_.all(row))
            memo.push(rownum);
        return memo;
    }, []);
    if (!completedRowNums.length) {
        callback();
    } else {
        // flash them for a couple seconds
        _.each(completedRowNums, function(rownum){
            self.board.rows[rownum].forEach(function(col, colnum){
                self.board.rows[rownum][colnum] = FULL_FLASH;
            });
            self.emitEntireState();
        })
        setTimeout(function(){
            // remove them && compact the board
            // sort descending, so when we remove it doesn't fuck up indeces
            completedRowNums = completedRowNums.sort(function(a,b){
                return b-a;
            });
            _.each(completedRowNums, function(rownum){
                self.board.rows.splice(rownum, 1);
            });
            _.each(completedRowNums, function(rownum){
                self.board.pushNewRow();
            });
            callback();
        }, 1000)
    }
}

Game.prototype.moveX = function(cols){
    var omino = _.clone(this.activeOmino);
    if (!omino) return;
    omino.x += cols;
    if (this.collides(this.board, omino)) return;
    this.activeOmino.x = omino.x;
    this.emitEntireState();
}

Game.prototype.moveDown = function(){
    var self = this;
    var omino = this.activeOmino;
    if (!omino) return;
    omino.y += 1;
    if (this.collides(this.board, omino)) {
        this.activeOmino.y -= 1;
        delete this.activeOmino;
        this.cement(this.board, omino);
        this.resolveCompletedRows(function(){
            self.dropRandomOmino();
        })
    }
    this.emitEntireState();
}

Game.prototype.rotate = function(){
    var omino = _.clone(this.activeOmino);
    var newShape = [];
    _.each(omino.shape, function(row, rownum){
        _.each(row, function(col, colnum){
            newShape[colnum] = newShape[colnum] || [];
            newShape[colnum][rownum] = col;
        })
    })
    _.each(newShape, function(row, rownum){
        newShape[rownum].reverse();
    })
    if (!this.collides(this.board, omino)) {
        this.activeOmino.shape = newShape;
    }
    this.emitEntireState();
}

function Board(w, h){
    var self = this;
    this.width = w;
    this.height = h;
    self.rows = [];
    _.times(h, function(rowNum){
        self.pushNewRow();
    });
}

Board.prototype.pushNewRow = function(){
    var row = new Array();
    _.times(this.width, function(colNum){
        row.push(EMPTY);
    });
    this.rows.unshift(row);
}

Board.prototype.getPoint = function(row, col){
    if (row >= this.rows.length) return OFFGRID;
    return this.rows[row][col];
}

Board.prototype.setPoint = function(row, col, val){
    this.rows[row][col] = val;
}

Board.EMPTY = EMPTY;
Board.FULL = FULL;
Board.FULL_FLASH = FULL_FLASH;

return {
    Board: Board,
    Game: Game
};

})
