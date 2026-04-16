package main

import (
	"log"

	"video-consult-mvp/config"
	"video-consult-mvp/pkg/database"
	"video-consult-mvp/router"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	gin.SetMode(cfg.Server.Mode)

	db, err := database.NewMySQL(cfg.MySQL)
	if err != nil {
		log.Fatalf("连接 MySQL 失败: %v", err)
	}

	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("自动迁移失败: %v", err)
	}

	rdb, err := database.NewRedis(cfg.Redis)
	if err != nil {
		log.Fatalf("连接 Redis 失败: %v", err)
	}

	engine := router.NewRouter(cfg, db, rdb)
	if err := engine.Run(cfg.Server.Addr); err != nil {
		log.Fatalf("启动服务失败: %v", err)
	}
}
