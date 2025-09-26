let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let model;
let isDetecting = false;
let lastSpokenObject = "";
let alertSound = new Audio('nuclear-alarm-14008.mp3');

// Load AI Model
async function loadModel() {
    model = await cocoSsd.load();
    console.log("COCO-SSD Model Loaded!");
}

// Access Rear Camera
async function setupCamera() {
    try {
        let stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: "environment" } }
        });
        video.srcObject = stream;
    } catch (err) {
        console.error("Error accessing camera: ", err);
        alert("Camera access denied or not available.");
    }
}

// Estimate Distance
function estimateDistance(bboxWidth) {
    let referenceWidth = 200;
    let knownDistance = 2;
    return ((referenceWidth / bboxWidth) * knownDistance).toFixed(2);
}

// Object Detection
async function detectObjects() {
    if (!isDetecting) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    let predictions = await model.detect(video);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (predictions.length === 0) {
        lastSpokenObject = "";
        requestAnimationFrame(detectObjects);
        return;
    }

    let detectedObject = predictions[0].class;
    let [x, y, width, height] = predictions[0].bbox;
    let distance = estimateDistance(width);

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    ctx.fillStyle = 'red';
    ctx.fillText(`${detectedObject} (${distance}m)`, x, y - 5);

    let position = x + width / 2;
    let screenCenter = canvas.width / 2;
    let direction = position < screenCenter ? "on your left" : "on your right";

    if (detectedObject !== lastSpokenObject) {
        window.speechSynthesis.cancel();
        speak(`${detectedObject} is ${direction} and about ${distance} meters away`);
        lastSpokenObject = detectedObject;
    }

    if (distance < 1) {
        if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
        alertSound.play();
    }

    requestAnimationFrame(detectObjects);
}

// Speak
function speak(text) {
    let speech = new SpeechSynthesisUtterance(text);
    speech.rate = 1;
    speech.pitch = 1;
    window.speechSynthesis.speak(speech);
}

// Voice Commands
function startVoiceRecognition() {
    let recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.lang = "en-IN";

    recognition.onresult = function (event) {
        let command = event.results[event.results.length - 1][0].transcript.toLowerCase();
        console.log("Voice Command: ", command);

        if (command.includes("start")) {
            document.getElementById('startBtn').click();
            speak("Starting object detection");
        } else if (command.includes("stop")) {
            document.getElementById('stopBtn').click();
            speak("Stopping object detection");
        }
    };

    recognition.start();
    speak("Voice control enabled. Say Start or Stop to control detection.");
}

// Buttons
document.getElementById('startBtn').addEventListener('click', () => {
    isDetecting = true;
    detectObjects();
});

document.getElementById('stopBtn').addEventListener('click', () => {
    isDetecting = false;
    lastSpokenObject = "";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    window.speechSynthesis.cancel();
});

document.getElementById('voiceBtn').addEventListener('click', () => {
    startVoiceRecognition();
});

// Init
setupCamera();
loadModel();
