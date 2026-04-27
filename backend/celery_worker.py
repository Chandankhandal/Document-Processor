import redis
import json
from celery import Celery
import time
import os
from database import SessionLocal, Document 

# --- SAFETY-PROOF REDIS URL ---
raw_redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
if raw_redis_url and not raw_redis_url.startswith(("redis://", "rediss://", "valkey://")):
    redis_url = f"redis://{raw_redis_url}"
else:
    redis_url = raw_redis_url

# Setup for Pub/Sub progress tracking
redis_client = redis.from_url(redis_url, decode_responses=True)

# Setup for Celery Task Queue
celery_app = Celery(
    "worker",
    broker=redis_url,
    backend=redis_url
)

@celery_app.task(name="process_document_task")
def process_document_task(doc_id, filename):
    db = SessionLocal()
    doc = None
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            doc.status = "Processing"
            db.commit()

            progress_msg = {"status": "Parsing started...", "progress": 30}
            redis_client.publish(f"job_progress_{doc_id}", json.dumps(progress_msg))
            redis_client.set(f"job_progress_{doc_id}", json.dumps(progress_msg))

            time.sleep(5) 

            progress_msg = {"status": "Extracting text...", "progress": 60}
            redis_client.publish(f"job_progress_{doc_id}", json.dumps(progress_msg))
            redis_client.set(f"job_progress_{doc_id}", json.dumps(progress_msg))

            time.sleep(5) 

            doc.status = "Completed"
            file_extension = filename.split('.')[-1].upper()
            file_name_clean = filename.split('.')[0].replace('_', '').capitalize()

            doc.result = {
                "title": file_name_clean,
                "summary": f"This {file_extension} document was successfully processed.",
                "metadata": {
                    "extension": file_extension,
                    "processed_at": time.strftime("%Y-%m-%d %H:%M:%S")
                }
            }
            db.commit()

            progress_msg = {"status": "Completed", "progress": 100}
            redis_client.publish(f"job_progress_{doc_id}", json.dumps(progress_msg))
            redis_client.set(f"job_progress_{doc_id}", json.dumps(progress_msg))
    except Exception as e:
        if doc:
            doc.status = "Failed"
            db.commit()
        print(f"Error occurred: {e}")
    finally:
        db.close()