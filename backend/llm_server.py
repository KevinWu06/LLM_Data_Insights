from fastapi import FastAPI, File, UploadFile, Form, Request
from pydantic import BaseModel
from fastapi.responses import JSONResponse

from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import uvicorn
import pandas as pd
import io
import uuid
from google import generativeai as genai

load_dotenv()


class AskRequest(BaseModel):
    question: str

class AskResponse(BaseModel):
    answer: str

app = FastAPI()

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with frontend domain in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# model setup
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
print(GEMINI_API_KEY)
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel(model_name="gemini-2.5-flash")

csv_data = {}

def get_intent(prompt: str) -> str:
    answer = model.generate_content(prompt)
    return answer.text

def call_llm(prompt: str) -> str:
    isQuestion = get_intent(prompt)
    return f"[LLM Answer based on prompt: {isQuestion}...]"

# Upload CSV endpoint
@app.post("/upload_csv")
async def upload_csv(file: UploadFile = File(...)):
    print("Filename:", file.filename)
    if not file.filename.endswith(".csv"):
        return JSONResponse(status_code=400, content={"error": "Only CSV files are supported."})
    content = await file.read()
    df = pd.read_csv(io.StringIO(content.decode()))
    session_id = str(uuid.uuid4())
    csv_data[session_id] = df
    return {"message": "CSV uploaded and stored successfully", 
            "columns": df.columns.tolist(), 
             "session_id": session_id, }

@app.post("/ask", response_model=AskResponse)
async def ask(request: AskRequest):
    print(f"Received question: {request.question}")
    answer = call_llm(request.question)
    return AskResponse(answer=answer)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
