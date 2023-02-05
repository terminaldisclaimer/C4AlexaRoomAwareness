const AlexaIntegration = require("./AlexaIntegration.js");
const http = require("http");
const url = require('url');
const WebSocketServer = require('ws');

const wss = new WebSocketServer.Server({ port: 8080 })
var ws;
var DEBUG = false;

const host = 'localhost';
const port = 3000;
var deasync = require('deasync');
const { Console } = require("console");
var alexa = null;
var restart =0;
var httpServer = null;


function requestListener(req, res) {
    res.writeHead(200);
    var pathname = url.parse(req.url).pathname;
    switch (pathname) {
        case '/routines':
            res.end(JSON.stringify(alexa.getRoutines()));
            break;
        case '/devices':
            res.end(JSON.stringify(alexa.getDevices()));
            break;
        default:
            res.end('default');
            break;
    }
}

function sendAmazonStatus(loggedIn, err){
    debug("sendAmazonStatus:" + loggedIn +" : " + err);
    var response = new Object();
    response.type = "amazonStatus";
    if (loggedIn){
        response.status = "LoggedIn";
    }else if(err =="ProxyRunning"){
        response.status = "ProxyRunning";
    }else if(err=="Invalid"){
        response.status = "Invalid Cookie. Deleting and Restarting";
    }else{
        response.status = "Error";
    }
    if(ws !=null){
        ws.send(JSON.stringify(response));
    }
}

function handleWSMessage(data){
    console.log('Received WebSocket Message %s', data);
    var message;
    try{
        message = JSON.parse(data);
    }catch(err){
        console.log("Error parsing: " +err);
    }
    if(message != null && message.cmd != null){
        switch(message.cmd){
            case "queryAmazonStatus":
                sendAmazonStatus(alexa.getLoggedIn(),alexa.getError());
                break;
            case "getRoutines":
                var response = new Object();
                response.type="getRoutines";
                response.data = alexa.getRoutines();
                ws.send(JSON.stringify(response));
                break;
            case "ping":
                console.log("received ping");
                var response = new Object();
                response.type="pong";
                response.data = "pong";
                ws.send(JSON.stringify(response));
                break;
            case "getDevices":
                var response = new Object();
                response.type="getDevices";
                response.data = alexa.getDevices();
                ws.send(JSON.stringify(response));
                break;
            default:
                console.log("Command not known: " + message.cmd);
        }
    }
}
function debug(string){
    if(DEBUG){
        console.log(string);
    }
}
function log(string){
    console.log(string)
}
function initWSServer(){

console.log("Initializing Websocket");
wss.on('connection', function connection(_ws) {
    log("Connection Established");
    ws = _ws;
  _ws.on('error', console.error);

  _ws.on('message', function message(data) {
    handleWSMessage(data);
  });

});

}

function initHTTPServer() {
    if(httpServer !=null){
        //already initted http server
        try{
            httpServer.closeAllConnections();
            httpServer.close();
        }catch(err){
            console.log("Error closing HTTP Server " + err);
        }
    }
    httpServer = http.createServer(requestListener);
   
    httpServer.listen(port, () => {
       console.log(`Server is running on http://localhost:${port}`);
    });

}

function loginCallback(loggedIn, err){
    if(loggedIn){
        restart =0;
        initHTTPServer();
        alexa.initRoutines();
        alexa.initDevices();
    }else if(err =="Invalid"){
       /* if (restart < 3){
            restart++
            main();
        }*/
        process.exit();
    }

    sendAmazonStatus(loggedIn,err); 

}

function activityCallback(routine, deviceName, deviceSerial){
    console.log("ROUTINE: " + routine.name + " called on: " + deviceName + " with serial number: " + deviceSerial);
    var response = new Object();
    response.type="activityStatus";
    response.routineName = routine.name;
    response.routineID = routine.id; 
    response.deviceName = deviceName;
    response.deviceSerial = deviceSerial;
    response.automationId = routine.automationId;
    ws.send(JSON.stringify(response));
}

function main() {
    restart = 0;

    var alexaServiceHost,amazonPage, acceptLanguage,amazonProxyLanguage;
    const args = require('yargs').argv;
    if( args["debug"] != null && args["debug"] == "true"){
        DEBUG = true;
    }else{
        DEBUG = false;
    }

    alexaServiceHost = args["alexaServiceHost"] || "pitangui.amazon.com";
    amazonPage = args["amazonPage"] || "amazon.com";
    acceptLanguage = args["acceptLanguage"] || "en-US";
    amazonProxyLanguage = args["amazonPageProxyLanguage"] || "en-US";

    alexa = new AlexaIntegration(DEBUG,alexaServiceHost, amazonPage, acceptLanguage, amazonProxyLanguage);
    
    try {
	initWSServer();
    alexa.init(loginCallback,activityCallback);
   
    } catch (err) {
        console.log("ERROR!!: " + err);
    }
}

process.on('SIGINT', function() {
    process.exit();
});

if (require.main === module) {
    main();
}
