package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/codepilot/backend/internal/api"
	"github.com/codepilot/backend/internal/db"
	"github.com/codepilot/backend/internal/queue"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env in development
	_ = godotenv.Load()

	// Init database
	database, err := db.New(os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("db init failed: %v", err)
	}
	defer database.Close()

	if err := database.Migrate(); err != nil {
		log.Fatalf("migration failed: %v", err)
	}

	// Init Redis queue
	q, err := queue.New(os.Getenv("REDIS_URL"))
	if err != nil {
		log.Fatalf("redis init failed: %v", err)
	}
	defer q.Close()

	// Start background worker (consumes PR review jobs)
	workerCtx, workerCancel := context.WithCancel(context.Background())
	defer workerCancel()
	go q.StartWorker(workerCtx, database)

	// Setup router
	if os.Getenv("ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := api.NewRouter(database, q)

	srv := &http.Server{
		Addr:         ":" + port(),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("CodePilot backend listening on %s", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	<-quit
	log.Println("Shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	workerCancel() // stop worker first
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("forced shutdown: %v", err)
	}

	log.Println("Server stopped cleanly.")
}

func port() string {
	if p := os.Getenv("PORT"); p != "" {
		return p
	}
	return "8080"
}
