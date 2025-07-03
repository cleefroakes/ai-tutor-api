import json
import base64
import io
from PIL import Image
from diffusers import StableDiffusionPipeline, StableVideoDiffusionPipeline
import torch
import os
from diffusers.utils import export_to_video

# Load Stable Diffusion pipeline for images
sd_model_id = "runwayml/stable-diffusion-v1-5"
sd_pipe = StableDiffusionPipeline.from_pretrained(sd_model_id, torch_dtype=torch.float16)
sd_pipe = sd_pipe.to("cuda")  # Use "cpu" if no GPU on Render

# Load Stable Video Diffusion pipeline (optional, for video)
svd_model_id = "stabilityai/stable-video-diffusion-img2vid-xt"
svd_pipe = StableVideoDiffusionPipeline.from_pretrained(svd_model_id, torch_dtype=torch.float16, variant="fp16")
svd_pipe = svd_pipe.to("cuda")  # Use "cpu" if no GPU

def generate_image(prompt):
    # Generate image using Stable Diffusion
    image = sd_pipe(prompt).images[0]
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode('utf-8')

def generate_video(prompt, initial_image=None):
    # Generate video using Stable Video Diffusion
    if initial_image is None:
        # Generate initial image from prompt if not provided
        initial_image = sd_pipe(prompt).images[0]
        initial_image = initial_image.resize((1024, 576))  # Match SVD input size

    generator = torch.manual_seed(42)
    frames = svd_pipe(initial_image, decode_chunk_size=8, generator=generator).frames[0]
    export_to_video(frames, "temp_video.mp4", fps=7)
    
    # Read video and encode to base64 (simplified for now, may need chunking for large files)
    with open("temp_video.mp4", "rb") as video_file:
        video_data = base64.b64encode(video_file.read()).decode('utf-8')
    os.remove("temp_video.mp4")  # Clean up
    return video_data

if __name__ == "__main__":
    while True:
        data = json.loads(input())  # Receive JSON data from Node.js
        if data:
            prompt = data.get('prompt', 'default')
            is_video = prompt.startswith('!video')  # Trigger video with !video prefix
            
            if is_video:
                video_data = generate_video(prompt.replace('!video', '').strip())
                print(video_data)  # Send base64 video data
            else:
                image_data = generate_image(prompt)
                print(image_data)  # Send base64 image data