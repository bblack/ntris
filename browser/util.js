define(function(require){
    return {
        inherits: function(to, from){
            for (var k in from.prototype) {
                to.prototype[k] = from.prototype[k];
            }
        }
    };
});
