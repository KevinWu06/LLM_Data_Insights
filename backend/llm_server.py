from fastapi import FastAPI, File, UploadFile

from pydantic import BaseModel
from fastapi.responses import JSONResponse
from typing import Optional
import time
from google.api_core.exceptions import ResourceExhausted

from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from google import generativeai as genai
from anomoly_detection import detect_moving_average_anomalies

import os
import uvicorn
import pandas as pd
import io
import ast
import uuid
import logging


load_dotenv()

logging.basicConfig(
    level=logging.INFO,  
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)


class AskRequest(BaseModel):
    question: str
    session_id: Optional[str] = None

class AskResponse(BaseModel):
    answer: str

class AnomalyDetectionRequest(BaseModel):
    banner: str
    numDays: int
    session_id: str
    over_under: float

app = FastAPI()

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with frontend domain in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

"""
Model setup for Generative AI using Gemini 2.5 Flash.

This module initializes the GenAI model (currently Gemini 2.5 Flash) by configuring
the API key from environment variables and instantiating a GenerativeModel object.

To use a different model:
    1. Import the appropriate model from the GenAI SDK.
    2. Replace the model name in the GenerativeModel constructor.

Environment Variables:
    LLM_API_KEY: The API key used to authenticate with the GenAI service.
"""
LLM_API_KEY = os.getenv("LLM_API_KEY")
genai.configure(api_key=LLM_API_KEY)
model = genai.GenerativeModel(model_name="gemini-2.5-flash")





"""
In-memory dictionary storing uploaded datasets keyed by session_id.
    Keys: session_id (str)
    Values: pandas.DataFrame
"""
csv_data = {}

def getAnswerableQuestions(questions: str, session_id: str):
    """
    Filters a list of natural-language questions to only those that can be answered 
    using the dataset associated with a specific session.

    This function retrieves a table snippet (up to 100 rows) from a pre-loaded dataset 
    uploaded through the web app. It then uses a generative language model to determine 
    which of the provided questions are answerable based on the content of that snippet.

    A question is considered answerable if:
    - It refers to patterns, summaries, or insights inferable from the snippet.
    - It relies only on the data shown in the snippet, not on external knowledge.

    Args:
        questions (str): A newline-separated string of questions to evaluate.
        session_id (str): The session identifier used to look up the corresponding dataset.

    Returns:
        str: A newline-separated string of only the answerable questions, 
             or an empty string if none are answerable, input is invalid, or errors occur.
             Returns "Error" if the session_id is not found in the dataset mapping.

    Raises:
        None explicitly, but handles KeyError for missing session_id.
    """
    if not questions:
        logger.info("No questions provided")
        return ""
    try:
        currentTable = csv_data[session_id]
    except(KeyError):
        logger.error("No CSV file provided")
        return "Error"
    tableSnippet = currentTable.head(100)
    snippet_str = tableSnippet.to_string(index = False)
    query = f"""You are given a snippet of a dataset. Your task is to identify which of the following questions can reasonably be answered using the information in the dataset snippet.

            A question is considered answerable if:
            - The dataset contains enough relevant columns or data to explore or derive insights.
            - The question is about patterns, summaries, distributions, or insights that could be inferred from the snippet.
            - The question is general (e.g., "Can you give me some insights?") but still related to the table.

            Do NOT include questions that require information completely outside of what’s present in the table (e.g., external sources or personal opinions).

            Return only the answerable questions, exactly as they appear, one per line. Do not explain your reasoning.

            Dataset snippet:
            {snippet_str}

            Questions:
            {questions}
            """

    for attempt in range(3):
        try:
            response = model.generate_content(query)
            if not response.candidates or not response.candidates[0].content.parts:
                logger.info("No answer for getting answerable questions")
                return ""
            return response.text
        except Exception as e:
            error_msg = str(e).lower()
            if "quota" in error_msg or "rate limit" in error_msg:
                logger.warning(f"Quota limit hit: {e}. Retrying in 60 seconds... (attempt {attempt+1}/3)")
                time.sleep(60)
                continue
            logger.error(f"Unexpected error: {e}")
            break


    return ""

def getQuestions(prompt: str):
    """
    Extracts all original questions from the input text.

    Args:
        prompt (str): Text potentially containing questions.

    Returns:
        str: One question per line, or an empty string if none found.
    """

    if not prompt:
        logger.warning("No prompt provided")
        return ""
    query = f"""From the text below, extract ONLY the sentences that are actual questions (i.e., sentences that end with a question mark). 
                Do NOT make up or rephrase any new questions. Return each original question exactly as it appears, one per line.

                Text:
                {prompt}
            """

    for attempt in range(3):
        try:
            response = model.generate_content(query)
            if not response.candidates or not response.candidates[0].content.parts:
                logger.info("No answre for getting questions")
                return ""
            return response.text
        except Exception as e:
            error_msg = str(e).lower()
            if "quota" in error_msg or "rate limit" in error_msg:
                logger.warning(f"Quota limit hit: {e}. Retrying in 60 seconds... (attempt {attempt+1}/3)")
                time.sleep(60)
                continue
            logger.error(f"Unexpected error: {e}")
            break


    return ""

def getIntent(prompt: str) -> str:
    """
    Checks if the input text contains a question.

    Args:
        prompt (str): Text to evaluate.

    Returns:
        str: "Yes" or "No", or empty string on failure.
    """
        
    if not prompt:
        logger.warning("No prompt provided")
        return ""

    for attempt in range(3):
        try:
            response = model.generate_content("Does the following prompt contain a question? Yes or No:" + prompt)
            if not response.candidates or not response.candidates[0].content.parts:
                logger.info("No answer for get intent")
                return ""
            return response.text
        except Exception as e:
            error_msg = str(e).lower()
            if "quota" in error_msg or "rate limit" in error_msg:
                logger.warning(f"Quota limit hit: {e}. Retrying in 60 seconds... (attempt {attempt+1}/3)")
                time.sleep(60)
                continue
            logger.error(f"Unexpected error: {e}")
            break


    return ""

def respondNonAnswerable(questions: str) -> str:
    """
    Evaluates user questions and responds appropriately.

    For each question:
    - Replies "Outside dataset scope." if it asks about info not in the dataset.
    - Answers casual/general questions briefly.
    - Avoids making up answers for unanswerable dataset-related questions.

    Args:
        questions (str): List of user questions.

    Returns:
        str: Each question followed by its response, formatted with "Q:" and "A:" lines.
    """
        
    query = f"""You are given a list of user questions. For each question:

            - If it asks about information that is clearly outside the scope of the dataset (e.g. fields that are not mentioned in the dataset), respond: "Outside dataset scope."
            - If it is a casual or general question (e.g., "How are you?", "What do you think?"), answer it appropriately.
            - Do not make up answers to dataset-related questions that cannot be answered from the table.

            Questions:
            {questions}

            Respond with each question followed by your evaluation or answer.

            Format your output as follows:
            - Each question-answer pair should begin with "Q:" and "A:" on their own lines.
            - Add **one blank line** after each answer to separate it from the next question.

            Q: <question 1>
            A: <answer 1>

            Q: <question 2>
            A: <answer 2>

            """

    for attempt in range(3):
        try:
            response = model.generate_content(query)
            if not response.candidates or not response.candidates[0].content.parts:
                logger.info("No nonanswerable question response")
                return ""
            return response.text + "\n"
        except Exception as e:
            error_msg = str(e).lower()
            if "quota" in error_msg or "rate limit" in error_msg:
                logger.warning(f"Quota limit hit: {e}. Retrying in 60 seconds... (attempt {attempt+1}/3)")
                time.sleep(60)
                continue
            logger.error(f"Unexpected error: {e}")
            break


    return ""

def getTableStructureQuestions(questions: str) -> str:
    """
    Filters questions to those about the dataset's structure.

    Includes questions on columns, data types, field presence, and layout.
    Excludes questions about data values, summaries, or insights.

    Args:
        questions (str): List of user questions.

    Returns:
        str: Structure-related questions, one per line.
    """

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

    for attempt in range(3):
        try:
            response = model.generate_content(query)
            if not response.candidates or not response.candidates[0].content.parts:
                logger.info("No table structure questions")
                return ""
            return response.text
        except Exception as e:
            error_msg = str(e).lower()
            if "quota" in error_msg or "rate limit" in error_msg:
                logger.warning(f"Quota limit hit: {e}. Retrying in 60 seconds... (attempt {attempt+1}/3)")
                time.sleep(60)
                continue
            logger.error(f"Unexpected error: {e}")
            break


    return ""

def answerTableStructureQuestions(questions: str, session_id: str) -> str:
    """
    Answers structure-related questions about a dataset sample.

    Uses a snippet of the dataset to address questions about columns, data types,
    missing fields, and layout. Does not answer data-specific or trend questions.

    Args:
        questions (str): Structure-related questions to answer.
        session_id (str): Identifier to retrieve the dataset snippet.

    Returns:
        str: Answers to each question in "Q: ... A: ..." format,
             or "Not enough information" if the snippet is insufficient.
    """

    currentTable = csv_data[session_id]
    tableSnippet = currentTable.head(10)
    snippet_str = tableSnippet.to_string(index = False)
    query = f"""You are a data expert. Based on the following sample from a dataset, answer only structure-related questions — such as those about column names, data types, missing fields, and table layout.

            Do not answer questions about specific data values or trends beyond what is visible in the sample.

            Dataset snippet:
            {snippet_str}


            Questions:
            {questions}

            Answer each question clearly and accurately, one at a time. If a question cannot be answered from the snippet, respond with: "Not enough information".
            Format your output as follows:
            - Each question-answer pair should begin with "Q:" and "A:" on their own lines.
            - Add **one blank line** after each answer to separate it from the next question.

            Q: <question 1>
            A: <answer 1>

            Q: <question 2>
            A: <answer 2>

            """

    for attempt in range(3):
        try:
            response = model.generate_content(query)
            if not response.candidates or not response.candidates[0].content.parts:
                logger.info("No answer for table structure questions")
                return ""
            return response.text + "\n"
        except Exception as e:
            error_msg = str(e).lower()
            if "quota" in error_msg or "rate limit" in error_msg:
                logger.warning(f"Quota limit hit: {e}. Retrying in 60 seconds... (attempt {attempt+1}/3)")
                time.sleep(60)
                continue
            logger.error(f"Unexpected error: {e}")
            break


    return ""

def getReleventColumns(questions: str, session_id: str) -> str:
    """
    Identifies the minimal set of dataset columns required to answer given questions.

    Based on a dataset snippet, returns a Python list of column names needed to answer the questions,
    or indicates if none are sufficient.

    Args:
        questions (str): User questions to analyze.
        session_id (str): Identifier to access the dataset snippet.

    Returns:
        str: A Python list of relevant columns as a string,
             or "None of the available columns are sufficient."
    """

    currentTable = csv_data[session_id]
    tableSnippet = currentTable.head(5)
    snippet_str = tableSnippet.to_string(index = False)
    query = f"""You are a data analyst. Based on the sample of the dataset below and the user's questions, identify the **minimum set of columns** that are required to answer the questions.

        Do not guess beyond what is shown in the snippet. Only include columns that are clearly needed to answer the questions.
        Output columns exactly how they appear in the table. If a column appears as ".bannerCTA", DO NOT simplify and return "bannerCTA". Instead, return the full ".bannerCTA"

        Dataset snippet:
        {snippet_str}

        Question:
        {questions}

        Respond with the answer as a valid Python list of column names. For example: ['user_id', 'revenue']. 
        If the question cannot be answered with the available columns, respond: "None of the available columns are sufficient."
        """

    for attempt in range(3):
        try:
            response = model.generate_content(query)
            if not response.candidates or not response.candidates[0].content.parts:
                logger.info("No relevant columns")
                return ""
            return response.text
        except Exception as e:
            error_msg = str(e).lower()
            if "quota" in error_msg or "rate limit" in error_msg:
                logger.warning(f"Quota limit hit: {e}. Retrying in 60 seconds... (attempt {attempt+1}/3)")
                time.sleep(60)
                continue
            logger.error(f"Unexpected error: {e}")
            break


    return ""
    
def answerDataQuestions(questions: str, df) -> str:
    """
    Answers user questions using a dataset snippet.

    Uses up to 300 rows from the provided DataFrame to answer questions.
    Responds with "Cannot answer with the given data." if insufficient info.

    Args:
        questions (str): Questions to answer.
        df (pandas.DataFrame): DataFrame containing the dataset.

    Returns:
        str: Answers formatted with each question and answer pair,
             or an empty string if no valid response is generated.
    """

    tableSnippet = df.sample(n=min(300, len(df)), random_state=42)
    print(tableSnippet.head(10))
    # Can use code below and adjust number of rows if only a subset is desired
    # Free Gemini Tier cannot handle more than 20000 rows. 
    # tableSnippet = df.sample(n=min(300, len(df)), random_state=42)
    snippet_str = tableSnippet.to_string(index = False)
    query = f"""You are a knowledgeable data assistant. Use the dataset snippet below to answer the user's questions as accurately as possible.

            Dataset snippet:
            {snippet_str}

            Questions:
            {questions}

            Answer each question based solely on the information in the dataset snippet. If the question cannot be answered with the given data, respond with: "Cannot answer with the given data."

            Format your output as follows:
            - Each question-answer pair should begin with "Q:" and "A:" on their own lines.
            - Add **one blank line** after each answer to separate it from the next question. Add the blank line after each answer regardless of whether or not there is a next question.

            Q: <question 1>
            A: <answer 1>

            Q: <question 2>
            A: <answer 2>

            """

    for attempt in range(3):
        try:
            response = model.generate_content(query)
            if not response.candidates or not response.candidates[0].content.parts:
                logger.info("No answer for data questions")
                return ""
            return response.text
        except Exception as e:
            error_msg = str(e).lower()
            if "quota" in error_msg or "rate limit" in error_msg:
                logger.warning(f"Quota limit hit: {e}. Retrying in 60 seconds... (attempt {attempt+1}/3)")
                time.sleep(60)
                continue
            logger.error(f"Unexpected error: {e}")
            break

    return ""



def call_llm(request: AskRequest) -> str:
    """
    Processes a user prompt to generate context-aware responses using a language model.

    This function handles both question and non-question inputs by:
    - Detecting if the input contains a question.
    - Extracting individual questions from the input.
    - Identifying which questions are answerable based on a dataset session.
    - Separating answerable questions into structure-related and data-related.
    - Generating responses for non-answerable questions, dataset structure questions, and data questions.
    - Combining all responses into a single output string.

    Args:
        request (AskRequest): An object containing:
            - question (str): The user’s input prompt.
            - session_id (str): Identifier for accessing the relevant dataset.

    Returns:
        str: A combined response including:
            - Answers or remarks for non-answerable questions.
            - Answers to dataset structure questions.
            - Answers to data-related questions.
            If the input contains no questions, returns a general response to the prompt.
            Returns a prompt to upload a CSV if the session dataset is unavailable.
    """

    responseDQ = ""
    responseNAQ = ""
    responseTSQ = ""
    isQuestion = getIntent(request.question)
    if (isQuestion.lower() == "no"):
        logger.warning("No questions in request")
        for attempt in range(3):
            try:
                response = model.generate_content("Respond to the following prompt, and suggest that you can answer user inquiries about datasets: " + request.question)
                if not response.candidates or not response.candidates[0].content.parts:
                    logger.info("No answer for data questions")
                    return ""
                return response.text
            except Exception as e:
                error_msg = str(e).lower()
                if "quota" in error_msg or "rate limit" in error_msg:
                    logger.warning(f"Quota limit hit: {e}. Retrying in 60 seconds... (attempt {attempt+1}/3)")
                    time.sleep(60)
                    continue
                logger.error(f"Unexpected error: {e}")
                break

        return ""
    
    # the query contains a question
    questions = getQuestions(request.question)
    logger.info("Questions: %s", questions)
    if (questions != ""):
        answerableQuestions = getAnswerableQuestions(questions, request.session_id)
        if (answerableQuestions == "Error"):
            logger.warning("No CSV uploaded")
            response = "Please upload a CSV."
            return response
        logger.info("Answerable Questions: %s", answerableQuestions)

        questions_set = set(q.strip() for q in questions.split('\n') if q.strip())
        answerable_set = set(q.strip() for q in answerableQuestions.split('\n') if q.strip())

        nonAnswerable_set = questions_set - answerable_set
        nonanswerableQuestions = '\n'.join(nonAnswerable_set)
        logger.info("Nonanswerable Questions: %s", nonanswerableQuestions)

        if nonanswerableQuestions != "":
            # process non-answerable questions
            responseNAQ = respondNonAnswerable(nonanswerableQuestions)
            logger.info("Nonanswerable Response: %s", responseNAQ)
        if answerableQuestions != "":
            # process answerable questions
            # 1. About table structure
            tableStructureQuestions = getTableStructureQuestions(answerableQuestions)
            logger.info("Table Structure Questions: %s", tableStructureQuestions)

            if tableStructureQuestions != "":

                responseTSQ = answerTableStructureQuestions(tableStructureQuestions, request.session_id)
                logger.info("Table Structure Response: %s", responseTSQ)
            # 2. About data
            tableStructure_set = set(q.strip() for q in tableStructureQuestions.split('\n') if q.strip())
            
            data_set = answerable_set - tableStructure_set
            dataQuestions = '\n'.join(data_set)
            logger.info("Data Questions: %s", dataQuestions)

            if dataQuestions != "":

                releventColumns = getReleventColumns(dataQuestions, request.session_id)
                logger.info("Relevant Columns: %s", releventColumns)

                if isinstance(releventColumns, str):
                    releventColumns = releventColumns.strip()
                    if releventColumns.startswith("```"):
                        releventColumns = '\n'.join(
                            line for line in releventColumns.splitlines()
                            if not line.strip().startswith("```")
                        )
                    releventColumns = ast.literal_eval(releventColumns)

                df = csv_data[request.session_id]
                filtered_df = df[releventColumns]

                responseDQ = answerDataQuestions(dataQuestions, filtered_df)
                logger.info("Data Response: %s", responseDQ)
    response = responseNAQ + "\n" + responseTSQ + "\n" + responseDQ
    return response

@app.post("/api/upload_csv")
async def upload_csv(file: UploadFile = File(...)):
    """
    Endpoint to upload and register a CSV file for later analysis.

    Accepts a CSV file upload, decodes it using ISO-8859-1 encoding, loads it into a Pandas DataFrame,
    and stores it in memory under a unique session ID.

    Args:
        file (UploadFile): A `.csv` file uploaded by the client.

    Returns:
        dict: A JSON object containing:
            - 'message' (str): Success confirmation.
            - 'columns' (List[str]): Names of the columns in the uploaded CSV.
            - 'session_id' (str): A UUID string used to reference this dataset in future requests.

    Raises:
        400 Bad Request: If the uploaded file does not have a `.csv` extension.
    """

    logger.info("Received filename for upload: %s", file.filename)
    if not file.filename.endswith(".csv"):
        return JSONResponse(status_code=400, content={"error": "Only CSV files are supported"})
    content = await file.read()

    df = pd.read_csv(io.StringIO(content.decode("ISO-8859-1")))
    session_id = str(uuid.uuid4())
    csv_data[session_id] = df
    print(df.columns.tolist())
    return {"message": "CSV uploaded and stored successfully", 
            "columns": df.columns.tolist(), 
             "session_id": session_id, }

@app.post("/api/ask", response_model=AskResponse)
async def ask(request: AskRequest):
    """
    Endpoint to query the uploaded dataset using natural language.

    Passes the user's question and session ID to an LLM pipeline. The system classifies whether the prompt
    contains questions, identifies which questions are answerable based on the dataset, and generates answers.

    Args:
        request (AskRequest): An object with:
            - 'question' (str): The user’s natural language prompt.
            - 'session_id' (str): ID referencing the uploaded dataset.

    Returns:
        AskResponse: A structured response object containing:
            - 'answer' (str): AI-generated response answering dataset-related questions,
                              or guidance for unanswerable questions or missing files.
    """

    logger.info("Received request for chatbot: %s with session id: %s", request.question, request.session_id)
    answer = call_llm(request)
    return AskResponse(answer=answer)

@app.get("/api/get_banner_names")
async def get_banner_names(session_id: Optional[str] = None):
    """
    Endpoint to get the unique banner names for the uploaded dataset.
    """
    if not session_id or session_id not in csv_data:
        return JSONResponse(status_code=400, content={"error": "No CSV file uploaded"})

    unique_banners = csv_data[session_id]['.BannerCTA'].unique().tolist()
    return JSONResponse(status_code=200, content={"banner_names": unique_banners})

@app.post("/api/anomaly_detection")
async def anomalyDetection(request: AnomalyDetectionRequest):
    """
    Endpoint to detect anomalies in a numeric column using a moving average and over-under approach.

    Uses the dataset associated with the provided session ID. Applies a rolling window and flags
    data points that deviate beyond a specified percent over under.

    Args:
        request (AnomalyDetectionRequest): An object with:
            - 'session_id' (str): ID referencing the uploaded dataset.
            - 'banner' (str): Name of the numeric column to analyze.
            - 'numDays' (int): Size of the moving average window (in data rows).

    Returns:
        JSONResponse: A JSON object containing:
            - 'plot_data' (dict): Data formatted for visualization of trends and anomalies.
            - 'anomalies' (List[float/int]): List of values identified as anomalies.
            - 'anomaly_points' (List[int]): Row indices of the anomalies.
            - 'hover_data' (List[str]): Tooltip details for plotting.
            - 'method' (str): The method used (e.g., 'Moving Average ±30%').
            - 'answer' (str): Reserved for future use or extra feedback.
    """

    logger.info("Received anomaly detection request for %s", {request.banner})
    try:
        current_table = csv_data[request.session_id]
    except(KeyError):
        logger.error("No CSV file uploaded")
        return JSONResponse(status_code=400, content={"error": "Please upload a CSV"})
    result = detect_moving_average_anomalies(
        current_table,
        banner_name=request.banner,
        window=request.numDays,
        over_under=request.over_under,
    )
    return JSONResponse({
        "answer": "",
        "plot_data": result["plot_data"],
        "anomalies": result["anomalies"],
        "anomaly_points": result["anomaly_points"],
        "hover_data": result["hover_data"],
        "method": result["method"]
    })

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
