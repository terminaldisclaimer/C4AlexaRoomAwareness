const AlexaIntegration = require("./AlexaIntegration.js");
const mqtt = require('mqtt');

var ws;
var DEBUG = false;
var mqttClient;
var alexa = null;
var restart = 0;

var deasync = require('deasync');
const { Console, table } = require("console");



function sendAmazonStatus(loggedIn, err) {
    debug("sendAmazonStatus:" + loggedIn + " : " + err);
    var response = new Object();
    response.type = "amazonStatus";
    if (loggedIn) {
        response.status = "LoggedIn";
    } else if (err == "ProxyRunning") {
        response.status = "ProxyRunning";
    } else if (err == "Invalid") {
        response.status = "Invalid Cookie. Deleting and Restarting";
    } else {
        response.status = "Error";
    }
    if (ws != null) {
        ws.send(JSON.stringify(response));
    }
}

function handleWSMessage(data) {
    console.log('Received WebSocket Message %s', data);
    var message;
    try {
        message = JSON.parse(data);
    } catch (err) {
        console.log("Error parsing: " + err);
    }
    if (message != null && message.cmd != null) {
        switch (message.cmd) {
            case "queryAmazonStatus":
                sendAmazonStatus(alexa.getLoggedIn(), alexa.getError());
                break;
            case "getRoutines":
                var response = new Object();
                response.type = "getRoutines";
                response.data = alexa.getRoutines();
                ws.send(JSON.stringify(response));
                break;
            case "ping":
                console.log("received ping");
                var response = new Object();
                response.type = "pong";
                response.data = "pong";
                ws.send(JSON.stringify(response));
                break;
            case "getDevices":
                var response = new Object();
                response.type = "getDevices";
                response.data = alexa.getDevices();
                ws.send(JSON.stringify(response));
                break;
            default:
                console.log("Command not known: " + message.cmd);
        }
    }
}
function debug(string) {
    if (DEBUG) {
        console.log(string);
    }
}
function log(string) {
    console.log(string)
}




//called when Alexa is successfully logged in
function loginCallback(loggedIn, err) {
    if (loggedIn) {
        restart = 0;
        alexa.updateRoutines();
        alexa.updateDevices();
        subscribeMQTT("AlexaRoomAwareness/command");
        publishMQTT("AlexaRoomAwareness/connected", "true");

    } else if (err == "Invalid") {
        /* if (restart < 3){
             restart++
             main();
         }*/
        process.exit();
    }
    sendAmazonStatus(loggedIn, err);
}

function activityCallback(routine, deviceName, deviceSerial) {
    console.log("ROUTINE: " + routine.name + " called on: " + deviceName + " with serial number: " + deviceSerial);
    var response = new Object();
    response.deviceName = deviceName;
    response.deviceSerial = deviceSerial;
    publishMQTT("AlexaRoomAwareness/Routines/"+routine.automationId+"/triggeredBy", JSON.stringify(response));
}


function sendInChunks(topic, data){
    var count =0;
    var beginPos =0;
    var chunks = 1;
    for(var i=0;i<data.length;i++){
        var jsonSTR = JSON.stringify(data[i]);
        count+=jsonSTR.length;
        if(count > 900){
            var rout = data.slice(beginPos,i)
            publishMQTT(topic +"/" + chunks,JSON.stringify(rout));
            chunks++;
            beginPos =i;
            count =0;
        }else{
            if(i == data.length -1){
                var rout = data.slice(beginPos,data.length)
                publishMQTT(topic +"/" + chunks,JSON.stringify(rout));
            }
        }
    }
}

function routinesCallback(routines){
    debug("routine callback" + routines);
    sendInChunks("AlexaRoomAwareness/Routines/All",routines);
    //publishMQTT("AlexaRoomAwareness/Routines/All",JSON.stringify(routines).substring(1,990));

    for(var i=0;i<routines.length;i++){
        publishMQTT("AlexaRoomAwareness/Routines/"+routines[i].automationId+"/triggeredBy", "f");
        publishMQTT("AlexaRoomAwareness/Routines/"+routines[i].automationId+"/shortName", routines[i].shortName);
        publishMQTT("AlexaRoomAwareness/Routines/"+routines[i].automationId+"/name", routines[i].name);
        publishMQTT("AlexaRoomAwareness/Routines/"+routines[i].automationId+"/utterances", JSON.stringify(routines[i].utterances));
    }
}

function deviceCallback(devices){
    debug("device callback" + devices);
    sendInChunks("AlexaRoomAwareness/Devices/All",devices);
   // publishMQTT("AlexaRoomAwareness/Devices/All", JSON.stringify(devices));
}

function publishMQTT(topic, data){
    var options={
        retain:true,
        qos:1};
    if (mqttClient != null && mqttClient.connected==true){
        mqttClient.publish(topic,data),options;
    }
}

function subscribeMQTT(topic){
    console.log("Subscribing to topic: " + topic);
    if (mqttClient != null && mqttClient.connected==true){
        mqttClient.subscribe(topic,{qos:1});
    }
}

function handleMQTTMessage(topic, message, packet){
    if (topic!=null && topic == "AlexaRoomAwareness/command"){
        var msg = message.toString().trim();
        switch(msg){
            case "updateRoutines":
                alexa.updateRoutines();
                publishMQTT("AlexaRoomAwareness/command",""); //reset back to nothing
                break;
            case "getDevices":
                alexa.updateDevices();
                publishMQTT("AlexaRoomAwareness/command",""); //reset back to nothing
            case "":
                //cmd reset--do nothing
                break;
            default:
                console.log("Unknown Command: " + message);
        }
    }
    console.log("message is "+ message);
    console.log("topic is "+ topic);
}

function initMQTT(broker){
    console.log("Connecting to MQTT Broker: " + broker);
    try {
        
        options={
            clientId:"mqttjs-alexa",
            //username:"ntlord",
            //password:"vZe2rdwx",
            clean:true};
        
        mqttClient = mqtt.connect("mqtt://" + broker,options);
        mqttClient.on("connect",function(){	
            console.log("MQTT connected to broker");
         
        });
        
        //if can't connect let's exit
        mqttClient.on("error",function(error){
            console.log("Can't connect to MQTT broker" + error);
            process.exit(1)});
        
        mqttClient.on('message',handleMQTTMessage);



    } catch (err) {
        console.log("ERROR!!: " + err);
    }
}

function main() {
    restart = 0;

    var alexaServiceHost, amazonPage, acceptLanguage, amazonProxyLanguage, host, dockerHost;
    const args = require('yargs').argv;
    if (args["debug"] != null && args["debug"] == "true") {
        DEBUG = true;
    } else {
        DEBUG = false;
    }

    alexaServiceHost = args["alexaServiceHost"] || "pitangui.amazon.com";
    amazonPage = args["amazonPage"] || "amazon.com";
    acceptLanguage = args["acceptLanguage"] || "en-US";
    amazonProxyLanguage = args["amazonPageProxyLanguage"] || "en-US";
    host = args["host"] || "localhost";
    dockerHost = args["dockerHost"] || "localhost";
    console.log("Connecting to Docker Host: " + dockerHost);
    alexa = new AlexaIntegration(DEBUG, host,alexaServiceHost, amazonPage, acceptLanguage, amazonProxyLanguage);

    try {
     
        
        initMQTT(dockerHost);
        alexa.init(loginCallback, activityCallback, routinesCallback.bind(this),deviceCallback.bind(this));

    } catch (err) {
        console.log("ERROR!!: " + err);
    }
}

process.on('SIGINT', function () {
    process.exit();
});

if (require.main === module) {
    main();
}
