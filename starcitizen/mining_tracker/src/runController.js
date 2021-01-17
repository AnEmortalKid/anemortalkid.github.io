/**
 * Component responsible for fetching and storing runs
 */
import Run from "./run";
import { v4 as uuidv4 } from "uuid";
import CookieJar from "./cookieJar";
import { toSeconds } from "./durationParser";

function toRun(runEntry) {
  var entryTime = new Date();
  var uuid = uuidv4();

  var durationSeconds = toSeconds(runEntry.duration);

  var run = new Run(
    uuid,
    runEntry.location,
    runEntry.duration,
    durationSeconds,
    runEntry.yieldAmount,
    entryTime
  );

  return run;
}

function loadRuns() {
  var raw = localStorage.getItem("mining_tracker.runs");

  if (!raw) {
    return [];
  }

  if (raw === "") {
    return [];
  }

  var runs = JSON.parse(raw);
  return runs;
}

function storeRuns(runData) {
  localStorage.setItem("mining_tracker.runs", JSON.stringify(runData));
}

class RunController {
  constructor() {
    if (!RunController.instance) {
      // TODO eventually make pluggable storage
      this.runs = loadRuns();
      RunController.instance = this;
    }

    return RunController.instance;
  }

  store(runEntry) {
    this.runs.push(toRun(runEntry));
    storeRuns(this.runs);
  }

  fetch() {
    return this.runs;
  }

  remove(runId) {
    // remove
  }
}

export function get() {
  return new RunController();
}
