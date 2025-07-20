from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from image_gen import generate_image
import base64
from io import BytesIO

app = FastAPI()

class ImageRequest(BaseModel):
    prompt: str

@app.get("/")
async def root():
    return {"message": "Image Generation API"}

@app.post("/generate-image/")
async def generate_image_endpoint(request: ImageRequest):
    try:
        image = generate_image(request.prompt)
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return JSONResponse(content={"image": img_str})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)