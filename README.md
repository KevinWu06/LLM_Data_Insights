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
4. Start server:
   ```sh
   go run main.go
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
4. (If you want to run on different port)
   ```sh
   PORT=YOUR_PORT_NUM npm start
   ```

The React app will run on `http://localhost:3000` and the backend server on `http://localhost:8000`. If you want to change the backend port, adjust PORT in .env and make the port in services.js point to your desired port number
