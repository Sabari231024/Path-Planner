from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
import ollama
import os

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Download sentiment model
nltk.download('vader_lexicon')
sia = SentimentIntensityAnalyzer()

# In-memory storage
meetings = []
notifications = []

# Chat file storage
CHAT_FILES = {
    'group': 'group_chat.txt',
    'private': 'private_chat.txt'
}

@app.route('/')
def index():
    """Render the chat page."""
    return render_template('index.html')

@socketio.on('join')
def on_join(data):
    """Handles when a client joins a chat room."""
    room = data['chatType']
    join_room(room)
    print(f"Client joined room: {room}")

    # Send chat history to user upon joining
    chat_history = []
    if os.path.exists(CHAT_FILES[room]):
        with open(CHAT_FILES[room], 'r') as f:
            chat_history = [msg.strip() for msg in f.readlines()]
    
    emit('chat_history', {'chatType': room, 'messages': chat_history}, room=room)

@socketio.on('message')
def handle_message(data):
    """Handles messages, sentiment analysis, and notifications."""
    msg = data['msg']
    chat_type = data['chatType']

    # Sentiment Analysis
    sentiment_score = sia.polarity_scores(msg)['compound']
    sentiment = "Positive" if sentiment_score > 0.05 else "Negative" if sentiment_score < -0.05 else "Neutral"

    # Mention detection for notifications
    if '@' in msg:
        user_mentioned = msg.split('@')[1].split()[0]
        notification = f"You were mentioned in a message: {msg}"
        notifications.append(notification)
        emit('notification', {'message': notification}, broadcast=True)

    # Save message in chat log
    with open(CHAT_FILES[chat_type], 'a') as f:
        f.write(msg + '\n')

    # Emit message to all clients
    emit('message', {'msg': msg, 'sentiment': sentiment, 'chatType': chat_type}, room=chat_type)

@app.route('/schedule_meeting', methods=['POST'])
def schedule_meeting():
    """Schedules a meeting and notifies all clients."""
    data = request.json
    meeting = {
        "title": data["title"],
        "date": data["date"],
        "time": data["time"]
    }
    meetings.append(meeting)
    socketio.emit('new_meeting', meeting, broadcast=True)
    return jsonify({"message": "Meeting scheduled successfully!"})

@app.route('/get_meetings', methods=['GET'])
def get_meetings():
    """Returns scheduled meetings."""
    return jsonify(meetings)

@app.route('/get_notifications', methods=['GET'])
def get_notifications():
    """Returns notifications."""
    return jsonify(notifications)

@app.route('/summarize_chat', methods=['POST'])
def summarize_chat():
    """Summarizes chat history using Ollama AI with Qwen2.5-1.5B."""
    print("Summarize endpoint called!")
    data = request.json
    print(f"Received data: {data}")
    chat_type = data['chatType']
    print(f"Chat type: {chat_type}")

    if os.path.exists(CHAT_FILES[chat_type]):
        with open(CHAT_FILES[chat_type], 'r') as f:
            chat_text = f.read()
        print(f"Chat content length: {len(chat_text)}")

        try:
            print("Calling Ollama API...")
            response = ollama.chat(model="qwen2.5:1.5b", messages=[{"role": "user", "content": f"Summarize the following chat:\n{chat_text}"}])
            print(f"Ollama response: {response}")
            summary = response.get('message', {}).get('content', 'No summary generated.')
        except Exception as e:
            print(f"Ollama API Error: {str(e)}")
            summary = f"Error generating summary: {str(e)}"
    else:
        summary = "No chat history found."
        print("No chat file found")

    print(f"Returning summary: {summary}")
    return jsonify({"summary": summary})

if __name__ == "__main__":
    socketio.run(app, debug=True, host="127.0.0.1", port=5000)
