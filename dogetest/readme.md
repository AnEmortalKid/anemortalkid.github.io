# dogetest

Dogetest is a descent into the madness of [dogescript](https://github.com/dogescript/dogescript/). 

As I attempted to get a page to run dogescript "natively", and by natively I mean just either:
* a script tag with dogescript ran through dogescript.parse and then through eval
* a script tag with src pointing to dogescript
* or loading a .djs file and running that

I ended up descending into the crazyness that is webpack,browserify and all that jazz.

However, the index.html page that you see in this repo is the finished playground of getting something to run.


# instructions

1. Get NPM if you don't have it, you can find that guy [here](https://www.npmjs.com/) since most of the things you'll need get installed with node.
2. Get [dogescript](https://github.com/dogescript/dogescript/) which you will install with npm (globally using the -g flag)
`npm install -g dogescript`
3. Get [browserify](http://browserify.org/) as all the samples use `require` and then bundle everything with browserify into a `bundle.js` file
`npm install browserify`

Each additional sample will add some more instructions on how to get that particular piece working

## samples

The following folders contain enough javascript/html to just load the sample in a page and nothing fancy.

The console will log the converted dogescript with a `"Compiled Dogescript:"` message.

### Run string based dogescript

`basedogescript`:
* `index.js`: contains a `require('dogescript')` call and uses eval and dogescript to display an alert
```
dogescript = require('dogescript');
eval(dogescript("plz alert with 'have dogescript'"));
```
* `index.html`: a blank page to load the `bundle.js` file
* `bundle.js`: a generated bundle.js file with browserify:
`browserify index.js > bunde.js`

Required npm install:
- dogescript
- browserify


### Run dogescript from a file

`filedogescript`:
* `index.js`: contains a `require('dogescript')` call, a `require('fs')` and uses [brfs](https://github.com/substack/brfs) to load a file with dogescript in it and then eval it.
* `colorp.djs`: dogescript file that changes div#diverino .p to font-color red
* `index.html`: page that loads `bundle.js` file and has the div and paragraph to colorize
* `bundle.js`: a generated bundle.js file with browserify
`browserify -t brfs index.js > bundle.js`

Required npm install:
- dogescript
- browserify
- brfs

### Run dogescript in script tag
`tagdogescript`:
* `index.js`:
** contains the required imports: `require('dogescript')` and `require('xhr')` when attempting to load tags with a `src` attribute. This probably won't work locally, but it might when pushed on git.
** also, it will contain modified code to attempt to `eval` and `dogescript` dogescript text embedded in script tags, this chunk can be found [here](https://github.com/dogescript/dogescript/blob/master/index.js) and was supposed to end up being released in 2.4.0, but 2.4.0 never happened.
** a slight modification has been made, to refer to parse as `dogescript` based on the aliasing of `dogescript=require('dogescript')`
* `index.html`: page to load the bundle file, as well as code in embedded script tags. One of them will change the paragraph text and the other (the src based one) will append a new element to the div
```
<div id="diverino">
<p>Some paragraph text</p>
</div>

<script src="bundle.js"></script>

<script type="text/dogescript">
very divy is document dose getElementById with 'diverino'
very pary is divy.children[0]
pary.textContent is 'changed with doge'
</script>

<script src="dogeappend.djs" type="text/dogescript"></script>
```
* `dogeappend.djs`: a file that will append a second paragraph to diverino with content "i am appended"
