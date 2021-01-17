import { toDurationString } from "./durationParser";

export default class RunView {
  layout(runs) {
    var table = document.getElementById("runs-table");

    var tableBody = table.getElementsByTagName("tbody")[0];

    while (tableBody.firstChild) {
      tableBody.firstChild.remove();
    }

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
      timeRemaining.textContent = toDurationString(remainingSeconds);
      row.appendChild(timeRemaining);

      var yieldData = document.createElement("td");
      yieldData.textContent = run.yieldAmount;
      row.appendChild(yieldData);

      var status = document.createElement("td");
      var statusTag = document.createElement("span");
      statusTag.classList = ["w3-tag"];
      if (remainingSeconds > 1) {
        statusTag.classList.add("w3-orange");
        statusTag.textContent = "In Progress";
      } else {
        statusTag.classList.add("w3-green");
        statusTag.textContent = "Done";
      }
      status.appendChild(statusTag);
      row.appendChild(status);

      // TODO actions

      tableBody.appendChild(row);
      console.log(run.uuid);
    });
  }
}
