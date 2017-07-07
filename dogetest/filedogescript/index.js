dogescript = require('dogescript');

// use fs (and browserify brfs) to load some dogefile
var fs = require('fs');
doge = fs.readFileSync(__dirname + '/colorp.djs', 'utf8');

var converted = dogescript(doge)
eval(converted);

console.log("Compiled Dogescript:" + converted);