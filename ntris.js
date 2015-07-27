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

function inherits(to, from){
    for (var k in from.prototype) {
        to.prototype[k] = from.prototype[k];
    }
}

function Game(){
    this.board = new Board(10, 18);
    this.tickHandle = setInterval(this.onTick.bind(this), 1000);
    this.dropRandomOmino();
    EventEmitter2.apply(this);
}

inherits(Game, EventEmitter2);

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
    this.emit('tick');
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
            self.emit('tick');
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
    this.emit('tick');
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
    this.emit('tick');
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
    this.emit('tick');
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

function Drawer(game, canvas){
    var self = this;
    var BLOCKSIZE = this.BLOCKSIZE = 30;
    this.game = game;
    this.canvas = canvas;
    this.STYLE = {
        board: {
            strokeStyle: 'gray',
            fillStyle: 'silver'
        },
        active: {
            fillStyle: 'white'
        }
    }

    canvas.width = BLOCKSIZE * this.game.board.width;
    canvas.height = BLOCKSIZE * this.game.board.height;

    var boardBuf = document.createElement('canvas');
    boardBuf.width = BLOCKSIZE * game.board.rows[0].length;
    boardBuf.height = BLOCKSIZE * game.board.rows.length;
    this.drawBoard(boardBuf);

    var staticBuf = document.createElement('canvas');
    staticBuf.width = boardBuf.width;
    staticBuf.height = boardBuf.height;

    var activeBuf = document.createElement('canvas');
    activeBuf.width = boardBuf.width;
    activeBuf.height = boardBuf.height;

    var ctx = canvas.getContext('2d');
    function draw(){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(boardBuf, 0, 0);
        self.drawStatic(staticBuf);
        ctx.drawImage(staticBuf, 0, 0);
        self.drawActive(activeBuf);
        ctx.drawImage(activeBuf, 0, 0);
    }
    draw();
    game.on('tick', draw);
}

Drawer.prototype.drawBoard = function(canvas){
    var BLOCKSIZE = this.BLOCKSIZE;
    var ctx = canvas.getContext('2d');
    ctx.strokeStyle = this.STYLE.board.strokeStyle;
    _.each(game.board.rows, function(row, rowNum){
        _.each(row, function(col, colNum){
            var x = BLOCKSIZE * colNum
            var y = BLOCKSIZE * rowNum;
            ctx.strokeRect(x, y, BLOCKSIZE, BLOCKSIZE);
        })
    })
}

Drawer.prototype.drawActive = function(canvas){
    var BLOCKSIZE = this.BLOCKSIZE;
    var ctx = canvas.getContext('2d');
    var omino = this.game.activeOmino;
    ctx.fillStyle = this.STYLE.active.fillStyle;
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!omino) return;
    _.each(omino.shape, function(row, rownum){
        var y = BLOCKSIZE * (rownum + omino.y);
        _.each(row, function(val, colnum){
            var x = BLOCKSIZE * (colnum + omino.x);
            if (val)
                ctx.fillRect(x, y, BLOCKSIZE, BLOCKSIZE);
        })
    })
}

Drawer.prototype.drawStatic = function(canvas){
    var BLOCKSIZE = this.BLOCKSIZE;
    var ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var row=0; row < this.game.board.rows.length; row++){
        for (var col=0; col < this.game.board.rows[row].length; col++){
            var point = this.game.board.getPoint(row, col);
            if (point) {
                var x = BLOCKSIZE * col;
                var y = BLOCKSIZE * row;
                if (point === FULL) {
                    ctx.fillStyle = this.STYLE.board.fillStyle;
                } else if (point === FULL_FLASH) {
                    ctx.fillStyle = 'chartreuse';
                }
                ctx.fillRect(x, y, BLOCKSIZE, BLOCKSIZE);
            }

        }
    }

}

var game = new Game();
var drawer = new Drawer(game, document.getElementsByTagName('canvas')[0]);

Mousetrap.bind('right', function(){
    game.moveX(1);
})
Mousetrap.bind('left', function(){
    game.moveX(-1);
})
Mousetrap.bind('down', function(){
    game.moveDown();
})
Mousetrap.bind('up', function(){
    game.rotate();
})
