# Image Generation API
A FastAPI-based API for generating images from text prompts using Stable Diffusion (CPU-optimized).

## Setup
1. Install dependencies: `pip install -r requirements.txt`
2. Run the API: `uvicorn main:app --host 0.0.0.0 --port 8000`

## Endpoints
- `GET /`: Check if API is running.
- `POST /generate-image/`: Generate image from a text prompt (JSON: `{"prompt": "your description"}`).