package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"context"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/go-sql-driver/mysql"
)

type AskRequest struct {
	Question string `json:"question"`
}

type AskResponse struct {
	Answer string `json:"answer"`
}

func LLMToAnswer(prompt string) string {
	// Replace with real LLM API call using env vars if needed
	return fmt.Sprintf("[LLM Answer based on prompt: %.60s...]", prompt)
}
func QuestionToSQL(question string) string {
	//replace with real SQL query generation logic
	return fmt.Sprintf("[SQL Query based on question: %.60s...]", question)
}

func FormatSQLResult(rows *sql.Rows) []map[string]interface{} {
	columns, err := rows.Columns()
	if err != nil {
		log.Fatal(err)
	}

	rowsData := []map[string]interface{}{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range columns {
			valuePtrs[i] = &values[i]
		}
		if err := rows.Scan(valuePtrs...); err != nil {
			log.Printf("scan error: %v", err)
			continue
		}
		rowData := make(map[string]interface{})
		for i, col := range columns {
			val := values[i]
			b, ok := val.([]byte)
			if ok {
				rowData[col] = string(b)
			} else {
				rowData[col] = val
			}
		}
		rowsData = append(rowsData, rowData)
	}

	return rowsData
}

func main() {
	// Load .env
	ctx := context.Background()
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("No .env file found")
	}

	// MySQL connection string
	dbUser := os.Getenv("DB_USER")
	dbPass := os.Getenv("DB_PASSWORD")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s", dbUser, dbPass, dbHost, dbPort, dbName)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("Failed to connect to DB:", err)
	}
	defer db.Close()

    // Ping the database to check if the connection is working

    err = db.Ping()
	if err != nil {
		log.Fatal(ctx, "SQL DATABASE PING FAILED!", err)
	}

    
	r := gin.Default()
	r.POST("/ask", func(c *gin.Context) {
		var req AskRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
			return
		}
		sqlQuery := QuestionToSQL(req.Question)
		// Query banner data for last month (hardcoded for demo)
		rows, err := db.Query(sqlQuery)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "DB query failed"})
			return
		}
		defer rows.Close()

		bannerData := FormatSQLResult(rows)
		jsonBytes, err := json.MarshalIndent(bannerData, "", "  ")
		if err != nil {
			log.Fatalf("json error: %v", err)
		}
		prompt := fmt.Sprintf("Analyze this data:\n%s\n\n%s", string(jsonBytes), req.Question)

		// prompt := fmt.Sprintf("Here is the banner data for last month:\n%s\n%s", bannerData, req.Question)
		answer := LLMToAnswer(prompt)
		c.JSON(http.StatusOK, AskResponse{Answer: answer})
	})

	// CORS middleware for frontend access
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	r.Run(":8000")
}