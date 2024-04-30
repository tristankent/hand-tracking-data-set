import { GestureRecognizer, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

const signSection = document.getElementById("sign");
let gestureRecognizer;
let runningMode = "IMAGE";
let enableWebcamButton;
let webcamRunning = false;
const videoHeight = "360px";
const videoWidth = "480px";
const player = document.getElementById("webcam");

let gestureLog = [];

const updateGestureLog = (gestureName, confidence, handedness) => {
    const logEntry = {
        gestureName,
        confidence,
        handedness,
        timestamp: new Date().toLocaleTimeString()
    };
    gestureLog.push(logEntry);
 
    if (gestureLog.length > 25) {
        gestureLog.shift();
    }

    updatePopupContent();
};

const updatePopupContent = () => {
    const logContainer = document.getElementById("gestureLogContainer");
    logContainer.innerHTML = ""; 
    gestureLog.forEach(entry => {
        const logEntry = document.createElement("div");
        logEntry.textContent = `[${entry.timestamp}] Gesture: ${entry.gestureName}, Confidence: ${entry.confidence}, Handedness: ${entry.handedness}`;
     
        logEntry.style.color = "green";
        logContainer.appendChild(logEntry);
    });
};

const togglePopup = () => {
    const popup = document.getElementById("popup");
    if (popup.style.display === "block") {
        popup.style.display = "none";
    } else {
        popup.style.display = "block";
    }
};

const showPopup = () => {
    const popup = document.getElementById("popup");
    popup.style.display = "block";
};

const closePopup = () => {
    const popup = document.getElementById("popup");
    popup.style.display = "none";
};


  
document.addEventListener("mousemove", handleMouseMove);
document.addEventListener("keydown", handleKeyDown);

function handleMouseMove(event) {
    const sensitivity = 0.2;
    const rotationSpeed = 0.5;
    const deltaX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    const deltaY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
    const rotationX = parseFloat(player.getAttribute("rotation-x")) || 0;
    const rotationY = parseFloat(player.getAttribute("rotation-y")) || 0;
    const newRotationX = Math.max(-90, Math.min(90, rotationX - deltaY * sensitivity));
    const newRotationY = (rotationY - deltaX * sensitivity + 360) % 360;
    player.setAttribute("rotation-x", newRotationX);
    player.setAttribute("rotation-y", newRotationY);
}

function handleKeyDown(event) {
    if (event.ctrlKey && event.key.toLowerCase() === "f") {
        toggleFullScreen();
    }
    else if (event.ctrlKey && event.key.toLowerCase() === "v") {
        toggleVrMode();
    }
}

document.addEventListener("fullscreenchange", handleFullscreenChange);

function handleFullscreenChange() {
    if (document.fullscreenElement === player) {
        updateCanvasSize();
        predictWebcam();
    }
}

window.addEventListener("resize", updateCanvasSize);

function updateCanvasSize() {
    const canvasElement = document.getElementById("output_canvas");
    canvasElement.width = player.clientWidth;
    canvasElement.height = player.clientHeight;
}

const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
        player.requestFullscreen().then(() => {
            updateCanvasSize();
            predictWebcam();
        });
    }
    else {
        document.exitFullscreen();
    }
};

const speechSynthesis = window.speechSynthesis;
let lastGestureTime = 0;

const createGestureRecognizer = async () => {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "./testtt.task",
            delegate: "GPU"
        },
        runningMode
   
});

    signSection.classList.remove("invisible");
};

createGestureRecognizer();

let speakEnabled = true; 

const speakGesture = (gestureName, confidence, handedness) => {
    const now = Date.now();
    if (now - lastGestureTime >= 5000 && speakEnabled) { 
        let textToSpeak = "";
        const cleanGestureName = gestureName.split(',').join(' ');
        if (cleanGestureName.toLowerCase() !== "none") {
            textToSpeak = `: ${cleanGestureName}.`;
            if (speakConfidence) { 
                textToSpeak += ` Confidence: ${confidence} percent.`;
            }
            if (speakHandedness) { 
                textToSpeak += ` Handedness: ${handedness}.`;
            }
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            speechSynthesis.speak(utterance);
            lastGestureTime = now;
            return true; // Speech synthesis occurred
        } else {
            lastGestureTime = now;
            return false; // No gesture recognized
        }
    }
    return false; // Speech synthesis not enabled or too soon since last gesture
};

const updateGestureLogFromSpeech = (gestureName, confidence, handedness) => {
    const spoken = speakGesture(gestureName, confidence, handedness);
    if (spoken) {
        updateGestureLog(gestureName, confidence, handedness);
    }
};

let speakConfidence = false;
let speakHandedness = false;

function toggleSpeak() {
    const checkbox = document.getElementById('speakCheckbox');
    speakEnabled = checkbox.checked;
}

const aFrameVrControls = document.createElement("a-entity");
aFrameVrControls.setAttribute("camera", "");
aFrameVrControls.setAttribute("look-controls", "");
aFrameVrControls.setAttribute("wasd-controls", "");
document.body.appendChild(aFrameVrControls);

const toggleVrMode = () => {
    if (navigator.getVRDisplays) {
        navigator.getVRDisplays().then(displays => {
            if (displays.length > 0) {
                const vrDisplay = displays[0];
                vrDisplay.requestPresent([{ source: player }]).then(() => {
                    console.log("Entered VR mode");
                }).catch(error => {
                    console.error("Error entering VR mode:", error);
                });
            }
            else {
                console.warn("No VR displays available");
            }
        }).catch(error => {
            console.error("Error getting VR displays:", error);
        });
    }
    else {
        console.warn("WebVR is not supported in this browser");
    }
};

const handleClick = async (event) => {
    if (!gestureRecognizer) {
        alert("Please wait for gestureRecognizer to load");
        return;
    }
    if (runningMode === "VIDEO") {
        runningMode = "IMAGE";
        await gestureRecognizer.setOptions({ runningMode: "IMAGE" });
    }
    const allCanvas = event.target.parentNode.getElementsByClassName("canvas");
    for (let i = allCanvas.length - 1; i >= 0; i--) {
        const n = allCanvas[i];
        n.parentNode.removeChild(n);
    }
    const results = gestureRecognizer.recognize(event.target);
    console.log(results);
    if (results.gestures.length > 0) {
        const p = event.target.parentNode.childNodes[3];
        p.setAttribute("class", "info");
        const categoryName = results.gestures[0][0].categoryName;
        let additionalInfo = "";
        if (document.getElementById("confidenceCheckbox").checked) {
            const categoryScore = parseFloat(results.gestures[0][0].score * 100).toFixed(2);
            additionalInfo += ` Confidence: ${categoryScore}%`;
        }
        if (document.getElementById("handednessCheckbox").checked) {
            const handedness = results.handednesses[0][0].displayName;
            additionalInfo += ` Handedness: ${handedness}`;
        }
        p.innerText = `GestureRecognizer: ${categoryName}${additionalInfo}`;
        p.style = "left: 0px;" +
            "top: " +
            event.target.height +
            "px; " +
            "width: " +
            (event.target.width - 10) +
            "px;";
        const canvas = document.createElement("canvas");
        canvas.setAttribute("class", "canvas");
        canvas.setAttribute("width", event.target.naturalWidth + "px");
        canvas.setAttribute("height", event.target.naturalHeight + "px");
        canvas.style = "left: 0px;" +
            "top: 0px;" +
            "width: " +
            event.target.width +
            "px;" +
            "height: " +
            event.target.height +
            "px;";
        event.target.parentNode.appendChild(canvas);
        const canvasCtx = canvas.getContext("2d");
        const drawingUtils = new DrawingUtils(canvasCtx);
        for (const landmarks of results.landmarks) {
            drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, {
                color: "#00FF00",
                lineWidth: 5
            });
            drawingUtils.drawLandmarks(landmarks, {
                color: "#FF0000",
                lineWidth: 1
            });
        }
        updateGestureLogFromSpeech(categoryName, categoryScore, handedness); // Updated to include speech synthesis
        showPopup();
    } else {
        alert("Sign not recognized!");
    }
};

const enableCam = async (event) => {
    if (!gestureRecognizer) {
        alert("Please wait for gestureRecognizer to load");
        return;
    }
    if (webcamRunning === true) {
        webcamRunning = false;
        enableWebcamButton.innerText = "ENABLE PREDICTIONS";
    }
    else {
        webcamRunning = true;
        enableWebcamButton.innerText = "DISABLE PREDICTIONS";
    }
    const constraints = {
        video: true
    };
    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        const video = document.getElementById("webcam");
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
    });
};

let lastVideoTime = -1;
let results = undefined;

const predictWebcam = async () => {
    const webcamElement = document.getElementById("webcam");
    const canvasElement = document.getElementById("output_canvas");
    const canvasCtx = canvasElement.getContext("2d");
    if (runningMode === "IMAGE") {
        runningMode = "VIDEO";
        await gestureRecognizer.setOptions({ runningMode: "VIDEO" });
    }
    let nowInMs = Date.now();
    if (webcamElement.currentTime !== lastVideoTime) {
        lastVideoTime = webcamElement.currentTime;
        results = gestureRecognizer.recognizeForVideo(webcamElement, nowInMs);
    }
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    const drawingUtils = new DrawingUtils(canvasCtx);
    canvasElement.style.height = videoHeight;
    webcamElement.style.height = videoHeight;
    canvasElement.style.width = videoWidth;
    webcamElement.style.width = videoWidth;
    if (results.landmarks) {
        for (const landmarks of results.landmarks) {
            drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, {
                color: "#00FF00",
                lineWidth: 5
            });
            drawingUtils.drawLandmarks(landmarks, {
                color: "#FF0000",
                lineWidth: 2
            });
        }
    }
    canvasCtx.restore();
    if (results.gestures.length > 0) {
        const gestureOutput = document.getElementById("gesture_output");
        gestureOutput.style.display = "block";
        gestureOutput.style.width = videoWidth;
        const categoryName = results.gestures[0][0].categoryName;
        const categoryScore = parseFloat(results.gestures[0][0].score * 100).toFixed(2);
        const handedness = results.handednesses[0][0].displayName;
        gestureOutput.innerText = `GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${handedness}`;
        updateGestureLogFromSpeech(categoryName, categoryScore, handedness); // Updated to include speech synthesis
        showPopup();
    }
    else {
        const gestureOutput = document.getElementById("gesture_output");
        gestureOutput.style.display = "none";
    }
    if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
    }
};

const hasGetUserMedia = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

if (hasGetUserMedia()) {
    enableWebcamButton = document.getElementById("webcamButton");
    enableWebcamButton.addEventListener("click", enableCam);
    const captureImageButton = document.getElementById("captureImageButton");
    captureImageButton.addEventListener("click", () => {
        if (webcamRunning) {
            captureImage();
        }
        else {
            alert("Please enable webcam predictions first.");
        }
    });
}
else {
    console.warn("getUserMedia() is not supported by your browser");
}

const captureImage = () => {
    if (!gestureRecognizer) {
        alert("Please wait for gestureRecognizer to load");
        return;
    }
    const webcamElement = document.getElementById("webcam");
    const canvasElement = document.createElement("canvas");
    canvasElement.width = webcamElement.videoWidth;
    canvasElement.height = webcamElement.videoHeight;
    const canvasCtx = canvasElement.getContext("2d");
    canvasCtx.drawImage(webcamElement, 0, 0, canvasElement.width, canvasElement.height);
    const dataUrl = canvasElement.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "captured_image.png";
    link.click();
};
