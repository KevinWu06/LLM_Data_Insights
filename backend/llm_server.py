from fastapi import FastAPI, File, UploadFile, Form, Request

from pydantic import BaseModel
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


load_dotenv()


class AskRequest(BaseModel):
    question: str
    session_id: str

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

def getAnswerableQuestions(questions: str, session_id: str):
    if not questions:
        return ""
    # This is a pandas dataframe
    currentTable = csv_data[session_id]
    tableSnippet = currentTable.head(100)
    snippet_str = tableSnippet.to_string(index = False)
    query = f"""Here is a snippet of the table: {snippet_str}. Which of the following questions are answerable using the table? Return only the
                questions, one per line, without any additional explanation. 

                Questions: 
                {questions}
            """
    response = model.generate_content(query)
    if not response.candidates or not response.candidates[0].content.parts:
            return ""
    return response.text

# def getNonAnswerableQuestions(questions: str, session_id: str):
#     if not questions:
#         return ""
#     # This is a pandas dataframe
#     currentTable = csv_data[session_id]
#     tableSnippet = currentTable.head(100)
#     snippet_str = tableSnippet.to_string(index = False)
#     query = f"""Here is a snippet of the table: {snippet_str}. Which of the following questions are NOT answerable using the table? Return only the
#                 questions, one per line, without any additional explanation. 

#                 Questions: 
#                 {questions}
#             """
#     return model.generate_content(query).text

def getQuestions(prompt: str):
    if not prompt:
        return ""
    query = f"""From the text below, extract ONLY the sentences that are actual questions (i.e., sentences that end with a question mark). 
                Do NOT make up or rephrase any new questions. Return each original question exactly as it appears, one per line.

                Text:
                {prompt}
            """
    
    response = model.generate_content(query)
    if not response.candidates or not response.candidates[0].content.parts:
        return ""
    return response.text

def getIntent(prompt: str) -> str:
    if not prompt:
        return ""
    response = model.generate_content("Does the following prompt contain a question? Yes or No:" + prompt)
    if not response.candidates or not response.candidates[0].content.parts:
        return ""
    return response.text

def respondNonAnswerable(questions: str) -> str:
    query = f"""You are given a list of user questions. For each question:

            - If it asks about information that is clearly outside the scope of the dataset (e.g., personal opinions, external facts, or vague queries), respond: "Outside dataset scope."
            - If it is a casual or general question (e.g., "How are you?", "What do you think?"), answer it appropriately.
            - Do not make up answers to dataset-related questions that cannot be answered from the table.

            Questions:
            {questions}

            Respond with each question followed by your evaluation or answer, in this format:

            Q: <original question>
            A: <"Outside dataset scope." or a short answer>
            """

    response = model.generate_content(query)
    if not response.candidates or not response.candidates[0].content.parts:
        return "" 
    return response.text

def getTableStructureQuestions(questions: str) -> str:
    query = f"""You are given a list of user questions, all of which can be answered using a dataset.

            Your task is to identify only the questions that are specifically about the **structure of the dataset** — such as questions about:
            - column names
            - number of columns
            - data types
            - presence or absence of certain fields
            - overall layout of the table

            Ignore questions that ask about specific data values, summaries, statistics, trends, or insights derived from the table contents.

            Return only the structure-related questions, one per line.

            Questions:
            {questions}
            
            """
    response = model.generate_content(query)
    if not response.candidates or not response.candidates[0].content.parts:
        return ""
    return response.text

def answerTableStructureQuestions(questions: str, session_id: str) -> str:
    currentTable = csv_data[session_id]
    tableSnippet = currentTable.head(5)
    snippet_str = tableSnippet.to_string(index = False)
    query = f"""You are a data expert. Based on the following sample from a dataset, answer only structure-related questions — such as those about column names, data types, missing fields, and table layout.

            Do not answer questions about specific data values or trends beyond what is visible in the sample.

            Dataset snippet:
            {snippet_str}


            Questions:
            {questions}

            Answer each question clearly and accurately, one at a time. If a question cannot be answered from the snippet, respond with: "Not enough information".
            Anwer in the below format:

            Q: <original question>
            A: <answer>
            """
    response = model.generate_content(query)
    if not response.candidates or not response.candidates[0].content.parts:
        return ""
    return response.text

def getReleventColumns(questions: str, session_id: str) -> str:
    currentTable = csv_data[session_id]
    tableSnippet = currentTable.head(5)
    snippet_str = tableSnippet.to_string(index = False)
    query = f"""You are a data analyst. Based on the sample of the dataset below and the user's questions, identify the **minimum set of columns** that are required to answer the questions.

        Do not guess beyond what is shown in the snippet. Only include columns that are clearly needed to answer the questions.

        Dataset snippet:
        {snippet_str}

        Question:
        {questions}

        Respond with the answer as a valid Python list of column names. For example: ['user_id', 'revenue']. 
        If the question cannot be answered with the available columns, respond: "None of the available columns are sufficient."
        """
    response = model.generate_content(query)
    if not response.candidates or not response.candidates[0].content.parts:
        return ""
    return response.text
    
def answerDataQuestions(questions: str, df) -> str:
    tableSnippet = df.head(300)
    snippet_str = tableSnippet.to_string(index = False)
    query = f"""You are a knowledgeable data assistant. Use the dataset snippet below to answer the user's questions as accurately as possible.

            Dataset snippet:
            {snippet_str}

            Questions:
            {questions}

            Answer each question based solely on the information in the dataset snippet. If the question cannot be answered with the given data, respond with: "Cannot answer with the given data."
            Answer in the below format:

            Q: <original question>
            A: <answer>
            """
    response = model.generate_content(query)
    if not response.candidates or not response.candidates[0].content.parts:
        return "" 
    return response.text



def call_llm(request: AskRequest) -> str:
    responseDQ = ""
    responseNAQ = ""
    responseTSQ = ""
    isQuestion = getIntent(request.question)
    if (isQuestion.lower() == "no"):
        answer = model.generate_content("Respond to the following prompt, and suggest that you can answer user inquiries about datasets: " + request.question)
        if not answer.candidates or not answer.candidates[0].content.parts:
            return ""
        return answer.text
    
    # the query contains a question
    # get questions
    questions = getQuestions(request.question)
    print("questions")
    print(questions)
    if (questions != ""):
        answerableQuestions = getAnswerableQuestions(questions, request.session_id)
        print("answerable questions")
        print(answerableQuestions)

        questions_set = set(q.strip() for q in questions.split('\n') if q.strip())
        answerable_set = set(q.strip() for q in answerableQuestions.split('\n') if q.strip())

        nonAnswerable_set = questions_set - answerable_set
        nonanswerableQuestions = '\n'.join(nonAnswerable_set)
        print("nonanswerable questions")
        print(nonanswerableQuestions)

        if nonanswerableQuestions != "":
            # process non-answerable questions
            responseNAQ = respondNonAnswerable(nonanswerableQuestions)
            print("Nonanswerable Response")
            print(responseNAQ)
        if answerableQuestions != "":
            # process answerable questions
            # 1. About table structure
            tableStructureQuestions = getTableStructureQuestions(answerableQuestions)
            print("table structure questions")
            print(tableStructureQuestions)

            if tableStructureQuestions != "":

                responseTSQ = answerTableStructureQuestions(tableStructureQuestions, request.session_id)
                print("Table Structure Response")
                print(responseTSQ)

            # 2. About data
            tableStructure_set = set(q.strip() for q in tableStructureQuestions.split('\n') if q.strip())
            
            data_set = answerable_set - tableStructure_set
            dataQuestions = '\n'.join(data_set)
            print("Data questions")
            print(dataQuestions)

            if dataQuestions != "":

                releventColumns = getReleventColumns(dataQuestions, request.session_id)
                print("Relevent columns")
                print(releventColumns)

                releventColumns = ast.literal_eval(releventColumns)
                df = csv_data[request.session_id]
                filtered_df = df[releventColumns]

                responseDQ = answerDataQuestions(dataQuestions, filtered_df)
                print("Data Response")
                print(responseDQ)
                
    response = responseNAQ + "\n" + responseTSQ + "\n" + responseDQ
    return response

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
    print(f"Received question: {request.question} with session id: {request.session_id}")
    answer = call_llm(request)
    return AskResponse(answer=answer)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
