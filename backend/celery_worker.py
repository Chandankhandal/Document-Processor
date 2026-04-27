import redis
import json
from celery import Celery
import time
from database import SessionLocal, Document # Import the DB tools

redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

celery_app = Celery(
    "worker",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

@celery_app.task(name="process_document_task")
def process_document_task(doc_id, filename):
    # 1. Connect to the Database
    db = SessionLocal()
    doc = None

    try:
        # Update status to "Processing"
        doc = db.query(Document).filter(Document.id == doc_id).first()

        if doc:
            #Starting
            doc.status = "Processing"
            db.commit()

            # Sharing into the Pub Sub
            progress_msg = {"status": "Parsing started...", "progress": 30}
            redis_client.publish(f"job_progress_{doc_id}", json.dumps(progress_msg))
            redis_client.set(f"job_progress_{doc_id}", json.dumps(progress_msg))

            print(f"Chef is parsing: {filename}")
            time.sleep(5) # Simulating work

            progress_msg = {"status": "Extracting text...", "progress": 60}
            redis_client.publish(f"job_progress_{doc_id}", json.dumps(progress_msg))
            redis_client.set(f"job_progress_{doc_id}", json.dumps(progress_msg))

            print(f"Chef is extracting: {filename}")
            time.sleep(5) # Simulating work

            # Finishing
            doc.status = "Completed"

            file_extension = filename.split('.')[-1].upper()
            file_name_clean = filename.split('.')[0].replace('_', '').capitalize()

            doc.result = {
                "title": file_name_clean,
                "summary": f"This {file_extension} document was successfully processed. It contains structured data for {file_name_clean}.",
                "metadata": {
                    "extension": file_extension,
                    "processed_at": time.strftime("%Y-%m-%d %H:%M:%S")
                }
            }
            db.commit()

            progress_msg = {"status": "Completed", "progress": 100}
            redis_client.publish(f"job_progress_{doc_id}", json.dumps(progress_msg))
            redis_client.set(f"job_progress_{doc_id}", json.dumps(progress_msg))
            print(f"Doc {doc_id} marked as Completed.")
       

    except Exception as e:
        # If something goes wrong, mark it as Failed
        if doc:
            doc.status = "Failed"
            db.commit()
        print(f"Error occurred: {e}")
    finally:
        db.close() # Always close the connection!