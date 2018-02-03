var _ = require('underscore');
var rpio = require('rpio');
var Service, Characteristic;

const STATE_DECREASING = 0;
const STATE_INCREASING = 1;
const STATE_STOPPED = 2;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory('homebridge-gpio-blinds', 'Blinds', BlindsAccessory);
}

function BlindsAccessory(log, config) {
  _.defaults(config, {activeLow: true, reedSwitchActiveLow: true});

  this.log = log;
  this.name = config['name'];
  this.pinUp = config['pinUp'];
  this.pinDown = config['pinDown'];
  this.durationUp = config['durationUp'];
  this.durationDown = config['durationDown'];
  this.pinClosed = config['pinClosed'];
  this.pinOpen = config['pinOpen'];
  this.initialState = config['activeLow'] ? rpio.HIGH : rpio.LOW;
  this.activeState = config['activeLow'] ? rpio.LOW : rpio.HIGH;
  this.reedSwitchActiveState = config['reedSwitchActiveLow'] ? rpio.LOW : rpio.HIGH;

  this.currentPosition = 0; // down by default
  this.targetPosition = 0; // down by default
  this.positionState = STATE_STOPPED; // stopped by default

  this.service = new Service.WindowCovering(this.name);

  this.infoService = new Service.AccessoryInformation();
  this.infoService
    .setCharacteristic(Characteristic.Manufacturer, 'Radoslaw Sporny')
    .setCharacteristic(Characteristic.Model, 'RaspberryPi GPIO Blinds')
    .setCharacteristic(Characteristic.SerialNumber, 'Version 1.0.1');

  // use gpio pin numbering
  rpio.init({
    mapping: 'gpio'
  });
  rpio.open(this.pinUp, rpio.OUTPUT, this.initialState);
  rpio.open(this.pinDown, rpio.OUTPUT, this.initialState);
  if (this.pinClosed) rpio.open(this.pinClosed, rpio.INPUT, rpio.PULL_UP);
  if (this.pinOpen) rpio.open(this.pinOpen, rpio.INPUT, rpio.PULL_UP);

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
  if (this.closedAndOutOfSync()) {
    this.log("Current position is out of sync, setting to 0");
    this.currentPosition = 0;
    this.targetPosition = 0;
  } else if (this.openAndOutOfSync()) {
    this.log("Current position is out of sync, setting to 100");
    this.currentPosition = 100;
    this.targetPosition = 100;
  } else if (this.partiallyOpenAndOutOfSync()) {
    this.log("Current position is out of sync, setting to 50");
    this.currentPosition = 50;
    this.targetPosition = 50;
  }
  this.log("Target position: %s", this.targetPosition);
  callback(null, this.targetPosition);
}

BlindsAccessory.prototype.setTargetPosition = function(position, callback) {
  this.log("Setting target position to %s", position);

  if (this.positionState != STATE_STOPPED) {
    this.log('Blinds are moving. You need to wait. I will do nothing.');
    callback();
    return false;
  }

  if (this.currentPosition == position) {
    this.log('Current position already matches target position. There is nothing to do.');
    callback();
    return true;
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
  this.log(moveUp ? 'Moving up' : 'Moving down');

  this.service.setCharacteristic(Characteristic.PositionState, (moveUp ? STATE_INCREASING : STATE_DECREASING));
  this.positionState = (moveUp ? STATE_INCREASING : STATE_DECREASING);

  setTimeout(this.setFinalBlindsState.bind(this), duration);
  this.togglePin((moveUp ? this.pinUp : this.pinDown), duration);

  callback();
  return true;
}

BlindsAccessory.prototype.togglePin = function(pin, duration) {
  rpio.write(pin, this.activeState);
  setTimeout(function() {
    rpio.write(pin, this.initialState);
  }.bind(this), duration);
}

BlindsAccessory.prototype.setFinalBlindsState = function() {
  this.positionState = STATE_STOPPED;
  this.service.setCharacteristic(Characteristic.PositionState, STATE_STOPPED);
  this.service.setCharacteristic(Characteristic.CurrentPosition, this.targetPosition);
  this.currentPosition = this.targetPosition;
  this.log("Successfully moved to target position: %s", this.targetPosition);
}

BlindsAccessory.prototype.closedAndOutOfSync = function() {
  return this.currentPosition != 0 && this.pinClosed && (rpio.read(this.pinClosed) == this.reedSwitchActiveState);
}

BlindsAccessory.prototype.openAndOutOfSync = function() {
  return this.currentPosition != 100 && this.pinOpen && (rpio.read(this.pinOpen) == this.reedSwitchActiveState);
}

BlindsAccessory.prototype.partiallyOpenAndOutOfSync = function() {
  return (this.currentPosition == 0 && this.pinClosed && (rpio.read(this.pinClosed) != this.reedSwitchActiveState)) ||
         (this.currentPosition == 100 && this.pinOpen && (rpio.read(this.pinOpen) != this.reedSwitchActiveState));
}

BlindsAccessory.prototype.getServices = function() {
  return [this.infoService, this.service];
}
