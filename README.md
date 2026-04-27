Document processing application 

A production-ready full-stack application designed to handle mutliple document processing at a time. User's can upload multiple documents, track their processing in real-time, review extracted data, and export results in JSON and CSV formats.

*System Architecture
The system is built to ensure the user interface never freezes during heavy processing tasks.

=> Frontend: Next.js with TypeScript and Tailwind CSS.
=> Backend: FastAPI (Python) for managing multiple user's with multiple files at a time.
=> Worker: Used Celery for background processing of data with the "Genvet" for processing multiple data at a time.
=> Messaging in App: Used Redis to handle the documents in the que and also sharing the details of the work done on particular file.
=> Database: For storing the data and the output created in the JSON format.

* Key Features
=> Asynchronous Processing: Documents are offloaded to background workers immediately upon upload.
=> Real-time Progress tracking: Used redis Pub/Sub and polling, providing live update to the UI.
=> Multiple files processing: Supports processing of multiple files at a time.
=> UI features: Search, filter by status (Queued/Processing/Completed/Failed), and sort by oldest and newest.
=> Review & Edit feature: User's can check the ouput and edit the data and save the data and check summary before finalizing.
=> Failed and Retry support: If any file is failed in between the process is started on the same file and complete it.
=> Export feature: User's can save and export the file in both CSV and JSON format.

Prerequisites
- Python 3.10+
- Node.js 18+
- Redis Server (Running on `localhost:6379`)
- PostgreSQL (Running on `localhost:5432`)

Backend Setup:
cd backend
python -m venv venv
Activate venv:
Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload

Worker Setup:
cd backend
pip install gevent
python -m celery -A celery_worker worker --loglevel=info -P gevent --concurrency=3

Frontend Setup:
cd frontend
npm install
npm run dev