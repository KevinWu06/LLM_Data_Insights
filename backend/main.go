package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

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

func callLLM(prompt string) string {
	// Replace with real LLM API call using env vars if needed
	return fmt.Sprintf("[LLM Answer based on prompt: %.60s...]", prompt)
}

func main() {
	// Load .env
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

    err := db.Ping()
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

		// Query banner data for last month (hardcoded for demo)
		rows, err := db.Query("SELECT name, impressions, ctr FROM banners WHERE month = '2024-05'")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "DB query failed"})
			return
		}
		defer rows.Close()

		var bannerLines []string
		for rows.Next() {
			var name string
			var impressions int
			var ctr float64
			if err := rows.Scan(&name, &impressions, &ctr); err != nil {
				continue
			}
			bannerLines = append(bannerLines, fmt.Sprintf("%s: %d impressions, %.1f%% CTR", name, impressions, ctr))
		}
		bannerData := strings.Join(bannerLines, "\n")
		prompt := fmt.Sprintf("Here is the banner data for last month:\n%s\n%s", bannerData, req.Question)
		answer := callLLM(prompt)
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