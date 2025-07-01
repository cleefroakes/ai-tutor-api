import json
import numpy as np
import base64

def generate_image(prompt):
    # Mock diffusion (replace with trained U-Net later)
    image = np.random.rand(64, 64, 3) * 255
    image_flat = image.tobytes()
    return base64.b64encode(image_flat).decode('utf-8')

if __name__ == "__main__":
    while True:
        data = json.loads(input())  # Simplified input for now
        if data:
            prompt = data.get('prompt', 'default')
            image_data = generate_image(prompt)
            print(image_data)  # Output to stdout