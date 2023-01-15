
const js1Text = "js1_button"
const js2text = "js2_button"

function contains(line, key) {
  return line.indexOf(key) > 0;
}

function migrateLine(line, key) {
  // find numeric value
  //    <rebind input="js1_button10"/> (find 10)
  var chunkStart = line.indexOf(key);
  var chunkEnd = line.indexOf('"', chunkStart);

  //jsX_buttonNUM
  var oldValue = line.substring(chunkStart, chunkEnd);
  var numOnly = oldValue.replaceAll(key, "");
  var newValue = key + (parseInt(numOnly) + 1);


  return line.replace(oldValue, newValue);
}

/**
 * 
 * @param {string} oldXml old text
 * @return new text value
 */
function migrate(oldXml) {
  var lines = oldXml.split('\n');

  var newText = ``;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    if (contains(line, js1Text)) {
      newText += migrateLine(line, js1Text);
    } else if (contains(line, js2text)) {
      newText += migrateLine(line, js2text);
    }
    else {
      newText += line;
    }

    newText += '\n';
  }


  return newText;
}


document.getElementById("migrator").onclick = () => {
  var oldText = document.getElementById('old').value;

  var newText = migrate(oldText);
  console.log(newText);
  document.getElementById('new').value = newText;
}
