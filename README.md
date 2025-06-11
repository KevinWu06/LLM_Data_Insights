# LLM_Data_Insights
Web application to support LLM-driven data insights

# Banner Insights Chatbot

## Backend (FastAPI)

1. Navigate to `backend` directory:
   ```sh
   cd backend
   ```
2. (Optional) Create a virtual environment and activate it.
3. Install dependencies:
   ```sh
   pip install -r requirements.txt
   ```
4. Initialize the database:
   ```sh
   python init_db.py
   ```
5. Start the FastAPI server:
   ```sh
   uvicorn main:app --reload
   ```

## Frontend (React)

1. Navigate to `frontend` directory:
   ```sh
   cd frontend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the React app:
   ```sh
   npm start
   ```

The React app will run on `http://localhost:3000` and the FastAPI backend on `http://localhost:8000`.
