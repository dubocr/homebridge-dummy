"use strict";

var Service, Characteristic, HomebridgeAPI;

module.exports = function(homebridge) {

  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  HomebridgeAPI = homebridge;
  homebridge.registerAccessory("homebridge-dummy", "DummySwitch", DummySwitch);
}

function DummySwitch(log, config) {
  this.log = log;
  this.name = config.name;
  this.stateful = config.stateful;
  this.reverse = config.reverse;
  this.time = config.time ? config.time : 1000;	
  this.states = config.states ? config.states : [config.name];
  this._services = [];

  this.cacheDirectory = HomebridgeAPI.user.persistPath();
  this.storage = require('node-persist');
  this.storage.initSync({dir:this.cacheDirectory, forgiveParseErrors: true});

  for(let i=0; i < this.states.length; i++) {
    const service = new Service.Switch(this.states[i], 'state_'+i);
    this._services.push(service);

    service.getCharacteristic(Characteristic.On)
      .on('set', this._setOn.bind(this, i));

    if (this.reverse) service.setCharacteristic(Characteristic.On, true);

    if (this.stateful) {
      var cachedState = this.storage.getItemSync(service.displayName);
      if((cachedState === undefined) || (cachedState === false)) {
        service.setCharacteristic(Characteristic.On, false);
      } else {
        service.setCharacteristic(Characteristic.On, true);
      }

      if(this._services.length > 1) {
        this._services[0].setCharacteristic(Characteristic.On, !this.reverse);
      }
    }
  }
}

DummySwitch.prototype.getServices = function() {
  return this._services;
}

DummySwitch.prototype._setOn = function(i, on, callback) {

  this.log("Setting switch to " + on);

  if (on && !this.reverse && !this.stateful) {
    setTimeout(function() {
      this._services[i].setCharacteristic(Characteristic.On, false);
    }.bind(this), this.time);
  } else if (!on && this.reverse && !this.stateful) {
    setTimeout(function() {
      this._services[i].setCharacteristic(Characteristic.On, true);
    }.bind(this), this.time);
  }
  
  if (this.stateful) {
    this.storage.setItemSync(this._services[i].displayName, on);
    
    if((on && !this.reverse) || (!on && this.reverse)) {
      for(let j=0; j < this._services.length; j++) {
        if(j != i) {
          this._services[j].getCharacteristic(Characteristic.On).updateValue(!on);
          this.storage.setItemSync(this._services[j].displayName, !on);
        }
      }
    }
  }

  callback();
}
