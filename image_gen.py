from diffusers import StableDiffusionPipeline
import torch

model_id = "stabilityai/stable-diffusion-2-1-base"
pipe = StableDiffusionPipeline.from_pretrained(
    model_id,
    torch_dtype=torch.float32,
    use_auth_token=False,
    low_cpu_mem_usage=True
).to("cpu")  # Explicitly move to CPU
pipe.enable_attention_slicing()

def generate_image(prompt: str):
    image = pipe(
        prompt,
        num_inference_steps=15,
        height=128,
        width=128,
        guidance_scale=7.5
    ).images[0]
    return image