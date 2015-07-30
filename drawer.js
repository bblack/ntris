define(function(require){
    var ntris = require('ntris');
    var FULL = ntris.Board.FULL;
    var FULL_FLASH = ntris.Board.FULL_FLASH;

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
            if (game.ended) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
        draw();
        game.on('tick', draw);
    }

    Drawer.prototype.drawBoard = function(canvas){
        var BLOCKSIZE = this.BLOCKSIZE;
        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = this.STYLE.board.strokeStyle;
        _.each(this.game.board.rows, function(row, rowNum){
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

    return Drawer;
});
