# homecloud-controller
API for the controller communication with the cloud server using the homecloud protocol

##Documentation
For documentation on how to use the API, refer to [this](https://github.com/HomeSkyLtd/homecloud-controller/blob/master/documentation.MD)

##Usage
Here's an example, sending a message an listening for a notification:
```javascript
var home = new Homecloud({
    username: "login123",
    password: "pass123",
    websocket: {
        address: "ws://localhost:8092/ws"
    },
    address: "http://localhost:8093"
});

home.onAction((message) => {
    //Received action! 
});

home.getRules((message) => {
    //Got rules
});
```