import json
import redis
import os
from fastapi import Body, FastAPI, UploadFile, File, Depends
from sqlalchemy.orm import Session
from database import init_db, SessionLocal, Document
from celery_worker import process_document_task
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- SAFETY-PROOF REDIS URL ---
raw_redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
if raw_redis_url and not raw_redis_url.startswith(("redis://", "rediss://", "valkey://")):
    redis_url = f"redis://{raw_redis_url}"
else:
    redis_url = raw_redis_url

redis_client = redis.from_url(redis_url, decode_responses=True)

@app.get("/")
def read_root():
    return {"message": "Server is Online"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    new_doc = Document(filename=file.filename, status="Queued")
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    process_document_task.delay(new_doc.id, file.filename)
    return {"id": new_doc.id, "status": "Queued", "filename": file.filename}

@app.get("/status/{doc_id}")
def get_status(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        return {"error": "Document not found"}
    return {
        "id": doc.id,
        "filename": doc.filename,
        "status": doc.status,
        "result": doc.result
    }

@app.get("/stream-progress/{doc_id}") 
def get_live_progress(doc_id: int):
    data = redis_client.get(f"job_progress_{doc_id}")    
    if data:
        return json.loads(data) 
    return {"message": "No progress reported yet."}  

@app.put("/update-result/{doc_id}")
def update_result(doc_id: int, new_data: dict = Body(...), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()  
    if not doc:
        return {"error": "Document not found"}
    doc.result = new_data
    db.commit()    
    return {"message": "Result updated successfully", "data": doc.result}
    
@app.get("/export/{doc_id}")
def export_data(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc or doc.status != "Completed":
        return {"error": "Document not ready for export"}
    return JSONResponse(
        content=doc.result,
        headers={"Content-Disposition": f"attachment; filename=result_{doc_id}.json"}
    )