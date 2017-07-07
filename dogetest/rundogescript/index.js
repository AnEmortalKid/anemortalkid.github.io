// get that dogescript
var dogescript = require('dogescript');

// define a global function that can run text dogescript
dogerunner = function(ds)
{
  eval(dogescript(ds));
}


var input  = document.getElementById('doge-input');
var output = document.getElementById('js-output');

input.addEventListener('keyup', function () {
    output.value = dogescript(input.value, true);
});

output.value = dogescript(input.value, true);


// try to process script tags with type=text/dogescript
var xhr = require('xhr');
if (typeof window !== 'undefined' && window !== null) {

    var queue = [];
    var seen = [];

    var stepQueue = function () {
        while (queue.length > 0 && queue[0].ready) {
            var script = queue.shift();
            exec(script.text);
        }
    }

    var exec = function (source) {
        // this is the bit that refers to dogescript instead of parse
        var js = ';\n' + dogescript(source);
        if (js) {
            with (window) {
                eval(js);
            }
        }
    }

    var getLoadEval = function (script) {
        var res = {
            type: 'load',
            ready: false,
            text: ''
        };

        xhr(script.getAttribute('src'), function (err, resp, body) {
            if (err) {
                throw err;
            }
            res.ready = true;
            if (body) {
                res.text = body;
            }
            stepQueue();
        });
        return res;
    }

    var getInlineEval = function (script) {
        return {
            type: 'inline',
            ready: true,
            text: script.innerHTML
        };
    }

    var processTags = function () {
        var scripts = document.getElementsByTagName('script');

        for (var i = 0; i < scripts.length; i++) {
            var script = scripts[i];
            if (seen.indexOf(script) > -1) {
                continue;
            }
            seen.push(script);

            if (script.getAttribute('type') === 'text/dogescript') {
                if (script.getAttribute('src')) {
                    queue.push(getLoadEval(script));
                } else {
                    queue.push(getInlineEval(script));
                }
            }
        }
        stepQueue();
    }

    if (window.addEventListener) {
      window.addEventListener('DOMContentLoaded', processTags);
    } else {
      window.attachEvent('onload', processTags);
    }
}