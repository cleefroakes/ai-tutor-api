from dotenv import load_dotenv
import os
load_dotenv()
import json
import base64
import io
from PIL import Image
from diffusers import StableDiffusionPipeline, StableVideoDiffusionPipeline
import torch
from diffusers.utils import export_to_video
import glob

# Debug tokenizer files and current directory
print(f"Current directory: {os.getcwd()}")
# Check local tokenizer files (optional, as we'll fetch online if missing)
tokenizer_files = glob.glob(r"C:\Users\User\Downloads\ai-tutor-api\models\runwayml\stable-diffusion-v1-5\tokenizer\*.*")
print(f"Found tokenizer files: {tokenizer_files}")

# Ensure CPU is used
device = torch.device("cpu")

# Load Stable Diffusion pipeline (fetch online, smaller model)
try:
    sd_pipe = StableDiffusionPipeline.from_pretrained(
        "stabilityai/stable-diffusion-2-1-base",  # Smaller model
        torch_dtype=torch.float32,
        safety_checker=None,
        use_auth_token=os.environ["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 "],
        cache_dir=r"C:\Users\User\Downloads\ai-tutor-api\models\cache",  # Cache to avoid re-downloading
        device_map=None
    ).to(device)
except Exception as e:
    print(f"Error loading StableDiffusionPipeline: {e}")
    raise

# Load Stable Video Diffusion pipeline (use local checkpoint)
svd_model_id = os.path.normpath(r"C:\Users\User\Downloads\ai-tutor-api\models\stabilityai\stable-video-diffusion-img2vid-xt")
if not os.path.exists(svd_model_id):
    raise FileNotFoundError(f"Stable Video Diffusion model directory not found: {svd_model_id}")
try:
    svd_pipe = StableVideoDiffusionPipeline.from_pretrained(
        svd_model_id,
        torch_dtype=torch.float32,
        variant="fp16",
        device_map=None
    ).to(device)
except Exception as e:
    print(f"Error loading StableVideoDiffusionPipeline: {e}")
    raise

def generate_image(prompt):
    try:
        image = sd_pipe(prompt, num_inference_steps=50).images[0]
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode('utf-8')
    except Exception as e:
        return f"Image generation error: {str(e)}"

def generate_video(prompt, initial_image=None):
    try:
        if initial_image is None:
            initial_image = sd_pipe(prompt, num_inference_steps=50).images[0]
            initial_image = initial_image.resize((1024, 576))
        generator = torch.manual_seed(42)
        frames = svd_pipe(initial_image, decode_chunk_size=2, generator=generator).frames[0]
        export_to_video(frames, "temp_video.mp4", fps=7)
        with open("temp_video.mp4", "rb") as video_file:
            video_data = base64.b64encode(video_file.read()).decode('utf-8')
        os.remove("temp_video.mp4")
        return video_data
    except Exception as e:
        return f"Video generation error: {str(e)}"

if __name__ == "__main__":
    while True:
        try:
            raw_input = input().strip()
            print(f"Received input: '{raw_input}'")
            if not raw_input:
                print("Error: Empty input received. Please provide valid JSON.")
                continue
            data = json.loads(raw_input)
            if data:
                prompt = data.get('prompt', 'default')
                is_video = prompt.startswith('!video')
                if is_video:
                    video_data = generate_video(prompt.replace('!video', '').strip())
                    print(video_data)
                else:
                    image_data = generate_image(prompt)
                    print(image_data)
            else:
                print("Error: No data in JSON input.")
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON input - {e}")
        except Exception as e:
            print(f"Error: {e}")