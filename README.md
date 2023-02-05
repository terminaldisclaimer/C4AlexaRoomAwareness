# C4AlexaRoomAwareness

The docker image can be found at:

https://hub.docker.com/repository/docker/terminaldisclaimer/alexa_room_awareness/general

This repository includes the C4Z files and the original source code for Alexa Room Awareness driver for C4. 

This will allow you to have room context information in C4 for Alexa Routines. Basically, what you need to do is:

1. Install the docker image and ensure you are logged into amazon and it is working. You'll know that because you will see a "Logged In" show up in the logs. 
2. Then you need to install both C4Z files in C4. I would load them both into a project in their own room (e.g. Alexa, although it doesn't matter and it's not requires)
3. In the AlexaRoomAwareNess driver, add the IP and port to your docker image. Default port is 8080. And if you used the command I put in DockerHub, the IP should be the IP of the host you have running docker.
4. When you add the IP and port, the driver will sense this and auto set it self up. This includes instantiating copies of AlexaRoomAwareNess_Routine driver for each routine that you have configured in Alexa. It automatically shortenns the names of the routines just to make things easier. DO NOT CHANGE THE NAME OF ANY OF THESE DRIVERS. The driver also sets up all of the bindings. Do not mess with them.
5. If at any point, you add routines or delete routines in Amazon, just re-run the Auto Setup command under Actions. To the extent, that the driver can reuse previous AlexaRoomAwareness_Routine drivers already in the project it will. But if you have any extra because you ultimately end having less routines than driver (e.g. you deleted routines). The driver will re-name these extra drivers as "DELETE." You can delete these if you'd like. 


For programming, each Routine Driver will fire a "TRIGGERED" event when the routine is exectuted in Alexa. At the same time, two variables will be automatically set in the Routine driver:LAST_DEVICE_SERIAL and LAST_DEVICE_NAME, which correspond to the serial and name of the device that fired the routine. You can figure out these mappings by runnung the Print Devices action in thr Actions tab in the primary Alexa Room Awareness driver. You can then add C4 programming which checks one of these variables when the routine is triggered to dictate what happens in each room.
