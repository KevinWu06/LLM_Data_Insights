package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
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
	port := os.Getenv("PORT")

	// // MySQL connection string
	// dbUser := os.Getenv("DB_USER")
	// dbPass := os.Getenv("DB_PASSWORD")
	// dbHost := os.Getenv("DB_HOST")
	// dbPort := os.Getenv("DB_PORT")
	// dbName := os.Getenv("DB_NAME")
	// port := os.Getenv("PORT")
	// dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s", dbUser, dbPass, dbHost, dbPort, dbName)

	// db, err := sql.Open("mysql", dsn)
	// if err != nil {
	// 	log.Fatal("Failed to connect to DB:", err)
	// }
	// defer db.Close()

	// // Ping the database to check if the connection is working

	// err = db.Ping()
	// if err != nil {
	// 	log.Fatal("Connection Failed:", err)
	// }

	r := gin.Default()

	// CORS middleware for frontend access
	r.Use(func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Vary", "Origin") // for caching/proxies
		}
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	r.POST("/ask", func(c *gin.Context) {
		var req AskRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
			return
		}
		log.Printf("Received question: %s", req.Question)
		answer := callLLM(req.Question)
		log.Printf("Successfully generated answer")
		c.JSON(http.StatusOK, AskResponse{Answer: answer})
	})

	r.Run(":" + port)
}
