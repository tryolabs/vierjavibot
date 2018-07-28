datachannel = null;

function onDataChannel(event) {
    console.log("onDataChannel()");
    datachannel = event.channel;

    event.channel.onopen = function () {
        console.log("Data Channel is open!");
        document.getElementById('datachannels').disabled = false;
    };

    event.channel.onerror = function (error) {
        console.error("Data Channel Error:", error);
    };

    event.channel.onmessage = function (event) {
        console.log("Got Data Channel Message:", event.data);
    };

    event.channel.onclose = function () {
        datachannel = null;
        console.log("The Data Channel is Closed");
    };
}

function stop() {
    if (datachannel) {
        console.log("closing data channels");
        datachannel.close();
        datachannel = null;
    }
    if (localdatachannel) {
        console.log("closing local data channels");
        localdatachannel.close();
        localdatachannel = null;
    }
}
function handleDataAvailable(event) {
    //console.log(event);
    if (event.data && event.data.size > 0) {
        recordedBlobs.push(event.data);
    }
}

function send_message(msg) {
    datachannel.send(msg);
    console.log("message sent: ", msg);
}

function create_localdatachannel() {
    if (pc && localdatachannel)
        return;
    localdatachannel = pc.createDataChannel('datachannel');
    localdatachannel.onopen = function(event) {
        if (localdatachannel.readyState === "open") {
            localdatachannel.send("datachannel created!");
        }
    };
    console.log("data channel created");
}

function close_localdatachannel() {
    if (localdatachannel) {
        localdatachannel.close();
        localdatachannel = null;
    }
    console.log("local data channel closed");
}

function keyToCommand(keyCode) {
    switch (keyCode) {
        case 38:
            return "FORDWARD"
        case 40:
            return "BACKWARD"
        case 39:
            return "RIGHT"
        case 37:
            return "LEFT"
        case 33:
            return "UP"
        case 34:
            return "DOWN"
        default:
            return false
    }
}

var commands = []

function sendCommands(){
  console.log(JSON.stringify({commands: commands}))
  send_message(JSON.stringify({commands: commands}))
}

function keydown(e) {
    command = keyToCommand(e.keyCode)
    if (! command) {
        return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (commands.indexOf(command) === -1){
        commands.push(command)
    }
    sendCommands()
}

function keyup(e) {
    command = keyToCommand(e.keyCode)
    if (! command) {
        return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    var index = commands.indexOf(command);
    if (index > -1) {
      commands.splice(index, 1);
    }
    sendCommands()
}


// listen to key events
window.addEventListener('keydown', keydown, true);
window.addEventListener('keyup', keyup, true);
