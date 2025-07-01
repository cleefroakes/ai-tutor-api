import json
import base64
import numpy as np

def generate_audio(text):
    # Mock TTS (replace with Mozilla TTS or eSpeak later)
    audio = np.random.bytes(1024)  # 1KB mock audio
    return base64.b64encode(audio).decode('utf-8')

if __name__ == "__main__":
    while True:
        data = json.loads(input())  # Simplified input for now
        if data:
            text = data.get('text', 'default')
            audio_data = generate_audio(text)
            print(audio_data)  # Output to stdout