dogescript = require('dogescript');

// define a global function that can run text dogescript
dogerunner = function(ds)
{
  eval(dogescript(ds));
}

var converted = dogescript("plz alert with 'have dogescript'")
eval(converted);
console.log("Compiled Dogescript:" + converted);