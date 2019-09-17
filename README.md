# Bot Messenger System Sample

This is a simple bot messenger system.

# Prerequites
* MySQL Server
* Node.js

# How to run
## Import database.
Import the database from the script inside folder ./database
update database connection in configuration file of each project.  

* messenger-bot-system-mixed/conf.js

## Start servers
### On Ubuntu
Start the Node.js apps as services.

1. copy service files into folder /etc/systemd/system

  * messenger-bot-system-mixed/unix/botmnt.service
2. run following commands

  ```
  sudo systemctl daemon-reload
  sudo systemctl start botmnt
  ```

3. enable services run on boot.

 ```
 sudo systemctl enable botmnt
 ```

4. view service log(optional)

 ```
 journalctl -u botmnt
 ```