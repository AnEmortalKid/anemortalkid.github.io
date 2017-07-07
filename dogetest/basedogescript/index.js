dogescript = require('dogescript');

var converted = dogescript("plz alert with 'have dogescript'")
eval(converted);
console.log("Compiled Dogescript:" + converted);