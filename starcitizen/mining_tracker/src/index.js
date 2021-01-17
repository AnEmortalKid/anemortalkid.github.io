import "./css/w3.css";
import Run from "./run";

import RunView from "./runView";
import RunEntry from "./runEntry";

import { get as getController } from "./runController";

export function submitEntry() {
  var form = document.getElementById("entry-form");
  var elements = form.elements;

  var obj = {};
  for (var i = 0; i < elements.length; i++) {
    var item = elements.item(i);
    if (item.name) {
      obj[item.name] = item.value;
    }
  }

  // todo convert to runEntry
  var runEntry = new RunEntry(
    obj["location"],
    obj["duration"],
    obj["yieldAmount"]
  );
  getController().store(runEntry);
}

export function startApp() {
  var runView = new RunView();
  runView.layout(getController().fetch());
}
