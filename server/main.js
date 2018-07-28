(function () {
    var signalObj = null;
    var counter = 0;
    const minPoseConfidence = 0.2; // 0.15
    const minPartConfidence = 0.15; // 0.10
    const skip_frame_detection = 3; //
    var last_poses = null;
    var toggleSkeleton = null;
    var net = null;

    window.addEventListener('DOMContentLoaded', function () {
        var isStreaming = false;
        var start = document.getElementById('start');
        var stop = document.getElementById('stop');
        var load_net = document.getElementById('load_net');
        var video = document.getElementById('v');
        var canvas = document.getElementById('c');
        var ctx = canvas.getContext('2d');
        var effect = document.getElementById('effect');
        var isEffectActive = false;

        // Start Streaming
        start.addEventListener('click', function (e) {
            var address = document.getElementById('address').value;
            var protocol = location.protocol === "https:" ? "wss:" : "ws:";
            var wsurl = protocol + '//' + address;

            if (!isStreaming) {
                signalObj = new signal(wsurl,
                    function (stream) {
                        console.log('got a stream!');
                        //var url = window.URL || window.webkitURL;
                        //video.src = url ? url.createObjectURL(stream) : stream; // deprecated
                        video.srcObject = stream;
                        video.play();
                    },
                    function (error) {
                        alert(error);
                    },
                    function () {
                        console.log('websocket closed. bye bye!');
                        video.srcObject = null;
                        //video.src = ''; // deprecated
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        isStreaming = false;
                    },
                    function (message) {
                        alert(message);
                    }
                );
            }
        }, false);

        // Stop Streaming
        stop.addEventListener('click', function (e) {
            if (signalObj) {
                signalObj.hangup();
                signalObj = null;
            }
        }, false);

        // Load Net
        load_net.addEventListener('click', function (e) {
            if (!net) {
                console.log("Creating the Body detector");
                net = loadNet().then(function (result) {
                    console.log("LoadNet:", result);
                    net = result;
                });
            } else {
                console.log("Already loaded");
            }
        }, false);

        // toggleSkeleton
        toggleSkeletonButton.addEventListener('click', function () {
            toggleSkeleton = !toggleSkeleton;
            console.log("toggleSkeleton:", toggleSkeleton);
        }, false);

        // Wait until the video stream can play
        video.addEventListener('canplay', function (e) {
            if (!isStreaming) {
                canvas.setAttribute('width', video.videoWidth);
                canvas.setAttribute('height', video.videoHeight);
                isStreaming = true;
            }
        }, false);


        // Wait for the video to start to play
        video.addEventListener('play', function () {

            // Every 33 milliseconds copy the video image to the canvas
            setInterval(function () {

                if (video.paused || video.ended) {
                    return;
                }
                var w = canvas.getAttribute('width');
                var h = canvas.getAttribute('height');
                ctx.fillRect(0, 0, w, h);
                ctx.drawImage(video, 0, 0, w, h);

                // run detector and draw on canvas
                if (isEffectActive) {
                    if ((counter % skip_frame_detection) == 0) {
                        counter = 0;
                        const poses = detectBody(canvas, net).then(function (inner_poses) {
                            console.log(inner_poses);
                            last_poses = inner_poses;
                        });
                    }
                    if (last_poses) {
                        last_poses.forEach(({ score, keypoints }) => {
                            if (score >= minPoseConfidence) {
                                if (toggleSkeleton){
                                    drawSkeleton(keypoints, minPartConfidence, ctx);
                                } else {
                                    drawKeypoints(keypoints, minPartConfidence, ctx);
                                }
                            } else {
                                console.log("discarded due to low confidence")
                            }
                        });
                    }
                }
                counter += 1;

            }, 33);
        }, false);

        // Detection
        effect.addEventListener('click', function () {
            isEffectActive = !isEffectActive;
            console.log("isEffectActive:", isEffectActive);
        }, false);
    });
})();
