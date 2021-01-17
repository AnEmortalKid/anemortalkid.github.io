import { toDurationString } from "./durationParser";

export default class RunView {
  layout(runs) {
    var table = document.getElementById("runs-table");

    var tableBody = table.getElementsByTagName("tbody")[0];

    runs.forEach((run) => {
      var row = document.createElement("tr");

      var location = document.createElement("td");
      location.textContent = run.location;
      row.appendChild(location);

      var duration = document.createElement("td");
      duration.textContent = run.duration;
      row.appendChild(duration);

      var now = new Date();
      var nowSeconds = Math.round(now.getTime() / 1000);

      var entrySeconds = Math.round(new Date(run.entryTime).getTime() / 1000);
      var ellapsedSeconds = nowSeconds - entrySeconds;
      var remainingSeconds = run.durationSeconds - ellapsedSeconds;

      var timeRemaining = document.createElement("td");
      // todo transform to string
      timeRemaining.textContent = toDurationString(remainingSeconds);
      row.appendChild(timeRemaining);

      var yieldData = document.createElement("td");
      yieldData.textContent = run.yieldAmount;
      row.appendChild(yieldData);

      tableBody.appendChild(row);
      console.log(run.uuid);
    });
  }
}
