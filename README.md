# C4AlexaRoomAwareness

The docker image can be found at:

https://hub.docker.com/repository/docker/terminaldisclaimer/alexa_room_awareness/general

This repository includes the C4Z files and the original source code for Alexa Room Awareness driver for C4. 

This will allow you to have room context information in C4 for Alexa Routines. Basically, what you need to do is:

1. Install the docker image and ensure you are logged into amazon and it is working. You'll know that because you will see a "Logged In" show up in the logs. 
2. Install a MQTT broker and ensure it is working. 
3. Install Berto Agent(https://prod.berto.io/c4z/) and configure it to connect to your MQTT broker.
4. Then you need to install the C4Z file, and hit connect under the Actions tab. For every routine you want to have handled in C4 add a copy of the driver. 
5. The driver will need to be configured for a specific routine. To do this, under the actions tab click "Get Routines." This will print a table mapping automatinoIDs to Routines. The automationId will look something like "amzn1.alexa.automation.7813ada9-92f0-4bcf-88dd-36130b69d8bf" Copy and paste the full automationId into the automationID property. THEN HIT CONNECT TO MQTT BROKER again. 
6. If at any point, you add routines or delete routines in Amazon it's probably easiest to restart the docker container for AlexaRoomAwareness.
7. For programming, each Routine Driver will fire a "TRIGGERED" event when the routine is exectuted in Alexa. At the same time, two variables will be automatically set in the Routine driver:LAST_DEVICE_SERIAL and LAST_DEVICE_NAME, which correspond to the serial and name of the device that fired the routine. You can figure out these mappings by runnung the "Print Devices" action in thr Actions tab in the primary Alexa Room Awareness driver. You can then attach C4 programming the "TRIGGERED" event in the appropriate Routine driver,  which checks one of these variables when the routine is triggered to dictate what happens in each room.
