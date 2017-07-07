dogescript = require('dogescript');

// define a global function that can run text dogescript
dogerunner = function(ds)
{
  eval(dogescript(ds));
}