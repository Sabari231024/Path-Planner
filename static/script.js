const socket = io();
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = true;
recognition.lang = 'en-US';

// Start Voice Control
function startVoiceControl() {
    recognition.start();
    alert("Voice control activated! Say commands like 'Send message', 'Schedule meeting', 'Show notifications', or 'Check tasks'.");
}

recognition.onresult = function(event) {
    const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
    console.log("Recognized:", transcript);

    if (transcript.startsWith("send message")) {
        const message = transcript.replace("send message", "").trim();
        if (message) {
            socket.send(message);
            console.log("Message sent:", message);
        }
    } else if (transcript.startsWith("schedule meeting")) {
        processMeetingCommand(transcript);
    } else if (transcript.includes("show notifications")) {
        fetchNotifications();
        alert("Notifications displayed.");
    } else if (transcript.includes("check tasks")) {
        document.getElementById("taskChart").scrollIntoView({ behavior: "smooth" });
    }
};

function processMeetingCommand(transcript) {
    let details = transcript.replace("schedule meeting", "").trim().split(" on ");
    if (details.length === 2) {
        let title = details[0].trim();
        let dateTime = details[1].trim().split(" at ");
        if (dateTime.length === 2) {
            let date = dateTime[0].trim();
            let time = dateTime[1].trim();
            fetch('/schedule_meeting', {
                method: 'POST',
                body: JSON.stringify({ title, date, time }),
                headers: { 'Content-Type': 'application/json' }
            })
            .then(response => response.json())
            .then(data => alert(data.message))
            .catch(error => console.error("Error scheduling meeting:", error));
        }
    }
}

function stopVoiceControl() {
    recognition.stop();
    alert("Voice control deactivated.");
}

// ✅ WebGazer Eye Tracking Fix
function startEyeTracking() {
    if (typeof webgazer === "undefined") {
        console.error("WebGazer.js is not loaded. Make sure it's included in index.html.");
        alert("WebGazer.js is missing. Check console for details.");
        return;
    }

    webgazer.clearData(); // Clears previous calibration
    webgazer.setGazeListener((data) => {
        if (data) {
            console.log(`Eye Tracking - X: ${data.x}, Y: ${data.y}`);
        }
    }).begin();
    alert("Eye tracking started.");
}

function stopEyeTracking() {
    if (typeof webgazer !== "undefined") {
        webgazer.end();
        alert("Eye tracking stopped.");
    }
}

// ✅ Ensure WebGazer is loaded before using it
window.onload = function() {
    setTimeout(() => {
        if (typeof webgazer !== "undefined") {
            startEyeTracking();
        } else {
            console.warn("WebGazer.js not found. Eye tracking won't work.");
        }
    }, 1000);
};

// Chart Creation Functions
function createChart(ctx, type, labels, data, title, colors = []) {
    return new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: data,
                backgroundColor: colors.length ? colors : undefined,
                borderColor: 'blue',
                fill: type === 'radar' || type === 'line'
            }]
        }
    });
}

// Chart Instances
const taskCtx = document.getElementById('taskChart').getContext('2d');
createChart(taskCtx, 'bar', ['High Priority', 'Medium Priority', 'Low Priority'], [10, 20, 15], 'Pending Tasks', ['red', 'orange', 'green']);

const workloadCtx = document.getElementById('workloadChart').getContext('2d');
createChart(workloadCtx, 'bar', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], [10, 30, 20, 50, 40], 'Workload', ['blue', 'yellow', 'orange', 'red', 'green']);

const pieCtx = document.getElementById('taskDistributionChart').getContext('2d');
createChart(pieCtx, 'pie', ['Completed', 'In Progress', 'Not Started'], [40, 35, 25], 'Task Distribution');

const lineCtx = document.getElementById('taskTrendChart').getContext('2d');
createChart(lineCtx, 'line', ['Week 1', 'Week 2', 'Week 3', 'Week 4'], [5, 10, 15, 20], 'Task Trends');

const radarCtx = document.getElementById('skillChart').getContext('2d');
createChart(radarCtx, 'radar', ['Python', 'ML', 'Data Science', 'AI', 'Cloud'], [80, 75, 90, 70, 85], 'Skill Assessment');

// Auto Refresh Data
setInterval(fetchNotifications, 5000);
setInterval(fetchMeetings, 5000);

// UI Buttons for Voice Control & Eye Tracking
function createButton(text, onClickHandler) {
    let button = document.createElement("button");
    button.textContent = text;
    button.onclick = onClickHandler;
    document.body.appendChild(button);
}

document.addEventListener("DOMContentLoaded", function() {
    createButton("Activate Voice Control", startVoiceControl);
    createButton("Stop Voice Control", stopVoiceControl);
    createButton("Start Eye Tracking", startEyeTracking);
    createButton("Stop Eye Tracking", stopEyeTracking);
});
