# LLM_Data_Insights
Web application to support LLM-driven data insights

# Banner Insights Chatbot

## Run Backend (FastAPI)

1. Navigate to `backend` directory:
   ```sh
   cd backend
   ```
2. (Optional) Create a virtual environment and activate it.
3. Install dependencies:
   ```sh
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```sh
   uvicorn llm_server:app --reload --port 8000
   ```

## Run Frontend (React)

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

## How To Use
#### Tabs

1. ##### Dashboard
    There are two tabs, one for AUV dashboard and one for Servier dashboard. 
    On the righthand side of each dashboard, there are various filters. 
    - The **Monthly > 10000** filter (both) will filter each banner to only show months where the number of impressions is greater than 10000. To show all months, check both true and false. 
    - The **Advertiser** filter (both) will filter to only show indications and banners under that advertiser.
    - The **Indication** filter (Servier only) will filter to only show banners under that indication.
    - The **Banners** filter (both) will filter to only display the graphs, charts, and visuals for the selected banners.
    
    Visuals for each banner will show up to the left of their corresponding graphs in the dashboard. To update the mapping between banner names and the visual links, go to the [Webapp Sharepoint Site](https://indegene123.sharepoint.com/sites/CopilotAPIWebApp/Shared%20Documents/Forms/AllItems.aspx) and find the Excel files called "Banner Visuals Servier" and "Banner Visuals AUV". After updating the mapping in oe of the files, the updated visual will reflect in the corresponding dashboard after a minute or so. 
    
    The banner name **should not** be changed, as it is directly extracted from the Tableau dashboard. Since the dashboard does not dynamically update with changes, modifying the banner name may cause mismatches between the dashboard and the lookup map.
3. ##### CSV Upload
    Click "Choose CSV File", select the desired file, ad then click "Upload". The CSV file will need to be uploaded before the chatbot and anomaly detection services can be used. If the user attempts to use the services when a CSV is not uploaded, then the user will be prompted to upload a CSV. 
4. ##### Chatbot
    The chatbot can be accessed via a circular icon with a message icon at the bottom right of the screen. Clicking the icon opens a chat window where the user can interact with the chatbot to ask questions about a dataset. The chatbot follows the below logic pipeline/flow in interacting with the user. 

    ![Chatbot Flow](https://i.imgur.com/GZAuKqQ.jpg)

    An example walkthough is below:

    Sample Input: 

    <pre style="white-space: pre-wrap;">
    Hi, how are you? The weather is beautiful today! How many columns are in the table? 
    Which banner (bannerCTA) had the highest CTR, defined by total clicks divided by total 
    impressions? Can you give me some insights about the data in the table?
    </pre>

    #### Logic Walkthough

    1. The prompt contains 4 questions
        - Hi, how are you?
        - How many columns are in the table?
        - Which banner (bannerCTA) had the highest CTR, defined by total clicks divided by total impressions?
        - Can you give me some insights about the data in the table?
    2. Split between questions answerable and not answerable with the data
        - Answerable
            - Which banner (bannerCTA) had the highest CTR, defined by total clicks divided by total impressions?
            - Can you give me some insights about the data in the table?
            - How many columns are in the table?
        - Nonanswerable
            - Hi, how are you?
    3. Address Nonanswerable question
        - It's a casual/general question, so a response is generated.
    4. Split Answerable questions
        - Table Structure Questions
            - How many columns are in the table? 
        - Data Questions
            - Which banner (bannerCTA) had the highest CTR, defined by total clicks divided by total impressions?
            - Can you give me some insights about the data in the table?
    5. Address Table Structure questions
        - Use information such as column names, first 10 rows. 
    6. Address Data questions
        1. Extract minimal set of necessary columns
        2. Pass in dataset into prompt (code can be modified in llm_server.py to pass partial dataset in case too large) along with data questions
    7. Stitch responses together

    Sample Output:

    <pre style="white-space: pre-wrap;">
    Q: Hi, how are you?
    A: I'm doing well, thank you for asking! How can I assist you today?

    Q: How many columns are in the table?
    A: There are 21 columns in the table.

    Q: Can you give me some insights about the data in the table?
    A: The dataset provides performance metrics (Impressions and Clicks) for various "BannerCTAs".
    Key insights include:
        - The data contains entries for many different banner types, some of which appear multiple times (e.g., "Improved mOS", "Now Approved (Anim.)", "Testing"). This suggests that the data might be aggregated from various campaigns or instances over time for the same banner.
        - There's a wide range in the volume of impressions, from as low as 0 or 1 to over 95,000 for a single banner entry.
        - A notable observation is the presence of data anomalies, specifically entries where "Impressions" are recorded as 0, but "Clicks" are positive (e.g., several "Invalid" entries, and one "US-00818" entry). This type of data might indicate issues in impression tracking or unusual click behavior, as a click without an impression is technically impossible in standard web analytics.
        - The "Invalid" and "Invalid 1x1" banner categories frequently appear and collectively account for a considerable number of impressions and clicks, and are also associated with the data anomalies mentioned.
        - Banners related to product status ("Now Approved (Anim.)", "Now Approved (Stat.)") and medical conditions ("Glioma DSA", "Improved mOS") are prominent, alongside general categories like "Testing" and "Unbranded".

    Q: Which banner (bannerCTA) had the highest CTR, defined by total clicks divided by total impressions?
    A: To determine the highest CTR, we first need to sum the total impressions and total clicks for each unique BannerCTA, and then calculate their CTR.

    Here are the top BannerCTAs by CTR based on aggregated data:
        - **Invalid**: Total Impressions = 169, Total Clicks = 589. CTR = (589 / 169) * 100% = 348.52%
        - **US-00818**: Total Impressions = 1, Total Clicks = 2. CTR = (2 / 1) * 100% = 200.00%
        - **#1 Prescribed**: Total Impressions = 28, Total Clicks = 1. CTR = (1 / 28) * 100% = 3.57%
        - **US-02033**: Total Impressions = 22, Total Clicks = 6. CTR = (6 / 22) * 100% = 27.27%
        - **Promotional HCP (Static)**: Total Impressions = 88, Total Clicks = 11. CTR = (11 / 88) * 100% = 12.50%
    
    The banner with the highest CTR is **Invalid** with a CTR of 348.52%.
    </pre>

    **Usage Guidelines**
    - Be specific as possible in the prompts that you give the LLM to decrease the change of hallucinations and generic answers. Define calculations explicitly — e.g., if asking for "CTR", include how to calculate it (CTR = Clicks / Impressions). The model does not assume.
    - The frequency for the Free Gemini Tier is about 1 request per minute. To maximize efficiency, try to bundle questions together when sending requests. This means sending multiple questions at once in a single prompt. 
    - The model is stateless — it does not retain memory across requests. If your prompt depends on prior answers or explanations, you need to re-include them explicitly.
    - If your dataset is large, take a random sample of ~500 rows to avoid exceeding input limits or causing timeouts. Gemini Free Tier cannot handle very large tables reliably.

    **Limitations**
     - The chatbot can take a while to generate a response, especially as the number of rows in the table increases. Generating responses for a random sample of 500 rows takes ~1 minute.
     - Free Gemini Tier is generally unable to process too many rows and data table sizes sent to the LLM should generally be limited to less than 500 rows. The LLM may also occasionally fail to return a response or timeout without error. Retrying may be necessary.
     - The chatbot is able to generate insights, but should not be relied on to perform extensive data analytics work.
     - The model can make arithmetic errors, especially with floating point divisions or large numbers. Always verify calculations if precision matters.
5. ##### Banner Visuals
    This is a display of all available banner visuals. There is a tab for AUV and a tab for Servier, and the corresponding banners are under the corresponding tabs.
6. ##### Anomaly Detection
    This uses daily banner data for clicks and impressions and detects whether or not there are any anomalies. An event is considered to be an anomaly if for two consecutive days (this can be changed in the code in anomaly_detection.py), the banner CTR falls outside X% within the moving average CTR (Total clicks / Total impressions) over the last Y days. X and Y, as well as the banner, are inputted by the user. 

    The following columns, with the exact names, MUST be present in the dataset:
    ```
    .BannerCTA
    Date
    Impressions
    Clicks
    ```
    Note: The "." must be present in front of BannerCTA

    To use, upload a CSV that contains the preceeding columns. Then, fill in the window size, over/under percentage, and banner. Finally, click "Detect Anomalies". The graph generated is interactable. 


The React app will run on `http://localhost:3000` and the FastAPI backend on `http://localhost:8000`.
