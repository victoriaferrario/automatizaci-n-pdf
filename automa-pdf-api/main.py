import json
import shutil
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from filler import fill_pdf

app = FastAPI()

# Permitir requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")

@app.post("/fill-pdf")
async def fill_pdf_endpoint(
    template: UploadFile = File(...),       # PDF en blanco
    field_map: str = Form(...),             # String de JSON para los campos 
    row_data: str = Form(...),              # String de JSON para UNA fila de datos 
):
    # Guardar el template temporalmente
    template_path = UPLOAD_DIR / template.filename
    with open(template_path, "wb") as f:
        shutil.copyfileobj(template.file, f)

    field_map_parsed = json.loads(field_map)
    row_data_parsed = json.loads(row_data)

    filled_bytes = fill_pdf(str(template_path), field_map_parsed, row_data_parsed)

    return Response(
        content=filled_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=filled.pdf"}
    )