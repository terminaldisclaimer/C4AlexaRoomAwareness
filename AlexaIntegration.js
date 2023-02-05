let Alexa = require('alexa-remote2');
let fs = require('fs');
const vary = require('vary');

unparsed_routines = "";
unparsed_devices = "";
devices_updated = false;
routines_updated = false;
logged_in = false;
error = "";

class AlexaIntegration {


  constructor(debug,_alexaServiceHost, _amazonPage, _acceptLanguage, _amazonProxyLanguage) {
    this.alexa = new Alexa();
    this.cookie = null;
    this.routines = new Array();
    this.devices = new Array();
    this.routinesByUtterance = new Map();
    console.log("DEBUGGING is " + debug);
    this.DEBUG = debug;
    this.alexaServiceHost = _alexaServiceHost;
    this.amazonPage = _amazonPage;
    this.acceptLanguage = _acceptLanguage;
    this.amazonPageProxyLanguage = _amazonProxyLanguage;
    console.log("Using AlexaServiceHost: " + this.alexaServiceHost);
    console.log("Using AmazonPage: " + this.amazonPage);
    console.log("Using AcceptLanguage: " + this.acceptLanguage);
    console.log("Using AmazonPageProxyLanguage: " + this.amazonPageProxyLanguage);

  }

  loadCookie() {
    try {
      this.cookie = JSON.parse(fs.readFileSync('config/cookie.dat', 'utf8'));
    } catch (err) {
      console.error(err);
      this.cookie = null;
    }
  }

  getRoutine(utterance) {
    return this.routinesByUtterance.get(utterance);
  }

  debug(string) {
    if(this.DEBUG){
      console.log(string);
    }
  }
  

  config(activityCallback) {

    this.alexa.on('cookie', (cookie, csrf, macDms) => {
      try {
        fs.writeFileSync('cookie.dat', JSON.stringify(this.alexa.cookieData));
        // file written successfully
      } catch (err) {
        console.error("Cookie Write: " + err);
      }
    });

    this.alexa.on('ws-device-activity', (activity) => {
      this.debug("RECEIVED ACTIVITY");
      //console.log(activity);
      if (activity != null && activity.data != null && activity.data.intent != null && activity.data.intent == "InvokeRoutineIntent") {
        if (activity.description != null && activity.description.summary != null) {
          var r = this.getRoutine(activity.description.summary);
          this.debug("ROUTINE:" + r.name);
          activityCallback(r, activity.name, activity.deviceSerialNumber);
        }
      }
    });

  }

  getRoutines() {
    return this.routines;
  }

  getDevices() {
    return this.devices;
  }

  initDevices() {
    devices_updated = false;
    this.alexa.getDevices(function (err, devices) {
      unparsed_devices = devices;
      devices_updated = true;
    });
    require('deasync').loopWhile(function () { return !devices_updated; });
    let deviceArray = unparsed_devices.devices
    if (deviceArray != null) {
      for (var i = 0; i < deviceArray.length; i++) {
        let device = new Object();
        device.name = deviceArray[i].accountName;
        device.serial = deviceArray[i].serialNumber;
        this.devices.push(device);
      }
    }
    this.debug("DEVICES JSON:" + JSON.stringify(this.devices));
    return this.devices;

  }

  createShortName(str) {
    str = str.replace(/[^\s]+/g, function (word) {
      return word.replace(/^./, function (first) {
        return first.toUpperCase();
      });
    });
    str = str.replace(/[^a-zA-Z0-9]/g, "");
    return str;
  }


  initRoutines() {
    routines_updated = false;
    this.alexa.getAutomationRoutines(function (err, routines) {
      unparsed_routines = routines;
      routines_updated = true;
    });
    require('deasync').loopWhile(function () { return !routines_updated; });
    var id = 0;
    for (var i = 0; i < unparsed_routines.length; i++) {
      if (unparsed_routines[i].status == "ENABLED") {
        //console.log(unparsed_routines[i].name);
        for (var j = 0; j < unparsed_routines[i].triggers.length; j++) {
          if (unparsed_routines[i].triggers[j].type == "CustomUtterance") {
            let routine = new Object();
            routine.id = id;
            routine.name = unparsed_routines[i].name;
            routine.automationId = unparsed_routines[i].automationId
            routine.shortName = this.createShortName(routine.name);
            routine.utterances = new Array();
            if (unparsed_routines[i].triggers[j].payload.utterances != null) {
              for (var k = 0; k < unparsed_routines[i].triggers[j].payload.utterances.length; k++) {
                //console.log("\t" + unparsed_routines[i].triggers[j].payload.utterances[k]);
                routine.utterances.push(unparsed_routines[i].triggers[j].payload.utterances[k]);
                this.routinesByUtterance.set(unparsed_routines[i].triggers[j].payload.utterances[k], routine);
              }
            } else {
              //console.log("\t" + unparsed_routines[i].triggers[j].payload.utterance);
              routine.utterances.push(unparsed_routines[i].triggers[j].payload.utterance);
              this.routinesByUtterance.set(unparsed_routines[i].triggers[j].payload.utterance, routine);
            }
            this.routines.push(routine);
            id++;
          }
        }
      }
    }

  }
  getLoggedIn() {
    return logged_in;
  }

  getError() {
    return error;
  }

 

  init(_callback, activityCallback) {
    this.loadCookie();
    this.config(activityCallback);
    this.alexa.init({
      cookie: this.cookie,  // cookie if already known, else can be generated using proxy
      proxyOnly: true,
      proxyOwnIp: '192.168.100.161',
      proxyPort: 3001,
      proxyLogLevel: 'info',
      bluetooth: false,
      logger: (this.DEBUG) ? console.log : null,
      alexaServiceHost: this.alexaServiceHost, // optional, e.g. "pitangui.amazon.com" for amazon.com, default is "layla.amazon.de"
      amazonPage: this.amazonPage,
      acceptLanguage: this.acceptLanguage,
      amazonPageProxyLanguage: this.amazonPageProxyLanguage,
      //        userAgent: '...', // optional, override used user-Agent for all Requests and Cookie determination
      //        acceptLanguage: '...', // optional, override Accept-Language-Header for cookie determination
      //        amazonPage: '...', // optional, override Amazon-Login-Page for cookie determination and referer for requests
      useWsMqtt: true, // optional, true to use the Websocket/MQTT direct push connection
      cookieRefreshInterval: 7 * 24 * 60 * 1000, // optional, cookie refresh intervall, set to 0 to disable refresh
      deviceAppName: 'AlexaRoomAwareness', // optional: name of the device app name which will be registered with Amazon, leave empty to use a default one
    }, function (err) {
      if (err) {
        console.log("ERROR!!!" + err);

        if (err.toString().includes("401 Unauthorized")) { //something is wrong with the cookie, so delete it
          console.log("INVALID COOKIE. Deleting File...");
          try {
            fs.unlinkSync('cookie.dat');
          } catch (err) {

          }
          _callback(false, "Invalid");
          return;

        } else if (err.toString().includes("You can try to get the cookie manually")) {//start up the proxy
          //ok so the proxy is started up
          error = "ProxyRunning"
          _callback(false, "ProxyRunning");
          return;
        }
        error = "Invalid";
        return;
      }
      logged_in = true;
      error = "";
      console.log("LOGGED_IN TO AMAZON!!");
      _callback(true, "");

    });
    /* //wait for either a log in event or an error
     require('deasync').loopWhile(function(){return !logged_in && !error;});
     if(!error && logged_in){//if everything is ok initialize the routines
       this.initRoutines(); 
     }*/
  }

}
module.exports = AlexaIntegration;
