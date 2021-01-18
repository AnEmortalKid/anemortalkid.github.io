export default class Run {
  constructor(
    uuid,
    location,
    duration,
    durationSeconds,
    yieldAmount,
    entryTime
  ) {
    this.uuid = uuid;
    this.location = location;
    this.duration = duration;
    this.durationSeconds = durationSeconds;
    this.yieldAmount = yieldAmount;
    this.entryTime = entryTime;
  }
}
