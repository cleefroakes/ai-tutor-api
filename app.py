from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from diffusers import StableDiffusionPipeline, StableVideoDiffusionPipeline
import torch
from PIL import Image
import io
import base64
import os
import time
from moviepy.editor import ImageSequenceClip

app = FastAPI()

# Configuration
hf_token = os.getenv("HF_TOKEN")  # Load from environment variable
if not hf_token:
    raise ValueError("HF_TOKEN environment variable not set")
image_model_id = "CompVis/stable-diffusion-v1-4"
video_model_id = "stabilityai/stable-video-diffusion-img2vid"
num_inference_steps = 50
cache_dir = "./models/cache"

# Create cache directory
os.makedirs(cache_dir, exist_ok=True)

# Load image pipeline
print("Loading Stable Diffusion pipeline...")
image_pipe = StableDiffusionPipeline.from_pretrained(
    image_model_id,
    torch_dtype=torch.float16,
    token=hf_token,
    cache_dir=cache_dir,
    safety_checker=None
).to("cuda")
image_pipe.enable_attention_slicing()
print("Image pipeline loaded successfully.")

# Load video pipeline
print("Loading Stable Video Diffusion pipeline...")
video_pipe = StableVideoDiffusionPipeline.from_pretrained(
    video_model_id,
    torch_dtype=torch.float16,
    token=hf_token,
    cache_dir=cache_dir
).to("cuda")
print("Video pipeline loaded successfully.")

class ImageRequest(BaseModel):
    prompts: list[str]
    height: int = 512
    width: int = 512
    wwe_style: bool = False

class VideoRequest(BaseModel):
    prompt: str
    height: int = 512
    width: int = 512
    num_frames: int = 24
    fps: int = 24
    wwe_style: bool = False

@app.post("/generate")
async def generate_image(request: ImageRequest):
    results = []
    for prompt in request.prompts:
        try:
            if request.wwe_style:
                prompt = f"Hyper-realistic {prompt} in a WWE wrestling ring, cinematic lighting, 8k resolution, detailed facial features"
            print(f"Generating image for prompt: {prompt}")
            image = image_pipe(
                prompt,
                num_inference_steps=num_inference_steps,
                height=request.height,
                width=request.width,
                guidance_scale=7.5
            ).images[0]
            output_file = f"output/trump_image_{int(time.time())}.png"
            os.makedirs("output", exist_ok=True)
            image.save(output_file)
            buffered = io.BytesIO()
            image.save(buffered, format="PNG")
            results.append({
                "prompt": prompt,
                "image_base64": base64.b64encode(buffered.getvalue()).decode('utf-8'),
                "file_path": output_file
            })
        except Exception as e:
            results.append({"prompt": prompt, "error": f"Image generation error: {str(e)}"})
    return results

@app.post("/generate-video")
async def generate_video(request: VideoRequest):
    try:
        # Generate image first
        if request.wwe_style:
            prompt = f"Hyper-realistic {request.prompt} in a WWE wrestling ring, cinematic lighting, 8k resolution, detailed facial features"
        else:
            prompt = request.prompt
        print(f"Generating image for prompt: {prompt}")
        image = image_pipe(
            prompt,
            num_inference_steps=num_inference_steps,
            height=request.height,
            width=request.width,
            guidance_scale=7.5
        ).images[0]
        temp_image_file = f"temp/trump_image_{int(time.time())}.png"
        os.makedirs("temp", exist_ok=True)
        image.save(temp_image_file)

        # Generate video from image
        print("Generating video...")
        input_image = Image.open(temp_image_file).resize((request.width, request.height))
        video_frames = video_pipe(
            input_image,
            num_frames=request.num_frames,
            num_inference_steps=num_inference_steps,
            fps=request.fps
        ).frames[0]
        output_file = f"output/trump_video_{int(time.time())}.mp4"
        os.makedirs("output", exist_ok=True)
        clip = ImageSequenceClip(video_frames, fps=request.fps)
        clip.write_videofile(output_file, codec="libx264")
        print(f"Video saved to {output_file}")
        return {"prompt": prompt, "video_path": output_file}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video generation error: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}