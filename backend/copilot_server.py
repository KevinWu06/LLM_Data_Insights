from fastapi import FastAPI, File, UploadFile, Form, Request

from pydantic import BaseModel
from typing import List, Dict, Any
from fastapi.responses import JSONResponse

from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from google import generativeai as genai

import os
import uvicorn
import pandas as pd
import io
import ast
import uuid
import requests


load_dotenv()


class AskRequest(BaseModel):
    question: str
    accessToken: str

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



def call_copilot_retrieval_api(
    access_token: str,
    query_string: str,
    data_source: str = "sharePoint",
    resource_metadata: list = None,
    max_results: int = 10
):
    """
    Call the Microsoft 365 Copilot Retrieval API to get relevant text extracts.

    Args:
      access_token (str): OAuth2 Bearer token with Files.Read.All and Sites.Read.All delegated permissions.
      query_string (str): Natural language query (max 1500 chars).
      data_source (str): Either "sharePoint" or "externalItem".
      resource_metadata (list): Optional list of metadata fields to retrieve.
      max_results (int): Max number of documents to return (max 25).

    Returns:
      dict: Parsed JSON response from API or None on failure.
    """
    if resource_metadata is None:
        resource_metadata = ["title", "author"] 

    url = "https://graph.microsoft.com/beta/copilot/retrieval"

    print(access_token)

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    payload = {
    "queryString": query_string,
    "dataSource": data_source,
    # if necessary for filter, use "filterExpression": 'SiteID:"indegene123.sharepoint.com,6dcf4e01-398b-4875-8cc5-8cc4318d78de,6c7a8d20-7f29-4a20-969e-499bc710c6a1"',
    "resourceMetadata": resource_metadata,
    "maximumNumberOfResults": max_results
    }

    response = requests.post(url, headers=headers, json=payload)

    if response.status_code == 200:
        print("Copilot API response:", response.json())
        return response.json()
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return None

def parse_retrieval_response(response: dict) -> str:
    hits = response.get("retrievalHits", [])
    if not hits:
        return "No relevant content found."

    texts = []
    for hit in hits:
        for extract in hit.get("extracts", []):
            texts.append(extract.get("text", ""))

    return "\n\n".join(texts)

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

@app.post("/kb_ask", response_model=AskResponse)
async def ask(request: AskRequest):
    print(f"Received question: {request.question}")
    raw_response = call_copilot_retrieval_api(request.accessToken, request.question)
    parsed_text = parse_retrieval_response(raw_response)
    return AskResponse(answer=parsed_text)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
