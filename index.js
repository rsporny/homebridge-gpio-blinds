var rpio = require("rpio");
var Service, Characteristic;

const STATE_DECREASING = 0;
const STATE_INCREASING = 1;
const STATE_STOPPED = 2;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-gpio-blinds", "Blinds", BlindsAccessory);
}

function BlindsAccessory(log, config) {
  this.log = log;
  this.name = config['name'];
  this.pinUp = config["pinUp"];
  this.pinDown = config["pinDown"];
  this.durationUp = config['durationUp'];
  this.durationDown = config['durationDown'];

  this.currentPosition = 0; // down by default
  this.targetPosition = 0; // down by default
  this.positionState = STATE_STOPPED; // stopped by default

  this.service = new Service.WindowCovering(this.name);

  this.infoService = new Service.AccessoryInformation();
  this.infoService
    .setCharacteristic(Characteristic.Manufacturer, "Radoslaw Sporny")
    .setCharacteristic(Characteristic.Model, "RaspberryPi GPIO Blinds")
    .setCharacteristic(Characteristic.SerialNumber, "Version 1.0.0");

  // use gpio pin numbering
  rpio.init({
    mapping: 'gpio'
  });
  rpio.open(this.pinUp, rpio.OUTPUT, rpio.HIGH);
  rpio.open(this.pinDown, rpio.OUTPUT, rpio.HIGH);

  this.service
    .getCharacteristic(Characteristic.CurrentPosition)
    .on('get', this.getCurrentPosition.bind(this));

  this.service
    .getCharacteristic(Characteristic.PositionState)
    .on('get', this.getPositionState.bind(this));

  this.service
    .getCharacteristic(Characteristic.TargetPosition)
    .on('get', this.getTargetPosition.bind(this))
    .on('set', this.setTargetPosition.bind(this));
}

BlindsAccessory.prototype.getPositionState = function(callback) {
  this.log("Position state: %s", this.positionState);
  callback(null, this.positionState);
}

BlindsAccessory.prototype.getCurrentPosition = function(callback) {
  this.log("Current position: %s", this.currentPosition);
  callback(null, this.currentPosition);
}

BlindsAccessory.prototype.getTargetPosition = function(callback) {
  this.log("Target position: %s", this.targetPosition);
  callback(null, this.targetPosition);
}

BlindsAccessory.prototype.setTargetPosition = function(position, callback) {
  this.log("Setting target position to %s", position);

  if (this.currentPosition == position) {
    this.log("Current position already matches target position. There is nothing to do.");
    callback();
    return true;
  }

  if (this.positionState != STATE_STOPPED) {
    this.log("Blinds are moving. You need to wait. I will do nothing.");
    callback();
    return false;
  }

  this.targetPosition = position;
  var moveUp = (this.targetPosition >= this.currentPosition);
  var duration;
  if (moveUp) {
    duration = (this.targetPosition - this.currentPosition) / 100 * this.durationUp;
  } else {
    duration = (this.currentPosition - this.targetPosition) / 100 * this.durationDown;
  }

  this.log("Duration: %s ms", duration);
  this.log(moveUp ? "Moving up" : "Moving down");

  this.service.setCharacteristic(Characteristic.PositionState, (moveUp ? STATE_INCREASING : STATE_DECREASING));
  this.positionState = (moveUp ? STATE_INCREASING : STATE_DECREASING);

  setTimeout(this.setFinalBlindsState.bind(this), duration);
  this.togglePin((moveUp ? this.pinUp : this.pinDown), duration);

  callback();
  return true;
}

BlindsAccessory.prototype.togglePin = function(pin, duration) {
  rpio.write(pin, rpio.LOW);
  setTimeout(function() {
    rpio.write(pin, rpio.HIGH);
  }.bind(this), duration);
}

BlindsAccessory.prototype.setFinalBlindsState = function() {
  this.positionState = STATE_STOPPED;
  this.service.setCharacteristic(Characteristic.PositionState, STATE_STOPPED);
  this.service.setCharacteristic(Characteristic.CurrentPosition, this.targetPosition);
  this.currentPosition = this.targetPosition;
  this.log("Successfully moved to target position: %s", this.targetPosition);
}

BlindsAccessory.prototype.getServices = function() {
  return [this.infoService, this.service];
}
