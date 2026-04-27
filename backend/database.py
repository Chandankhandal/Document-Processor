from sqlalchemy import create_engine, Column, Integer, String, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# --- CHANGE THIS PART ---
# It tries to find the 'DATABASE_URL' environment variable first.
# If it's not found (like when you are working locally), it uses your Docker URL.
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://admin:password123@localhost:5432/document_vault")
# ------------------------

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    status = Column(String, default="Queued")
    result = Column(JSON, nullable=True)

def init_db():
    Base.metadata.create_all(bind=engine)