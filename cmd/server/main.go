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

	// 生产环境如果已通过 schema.sql 初始化表结构，可关闭自动迁移，
	// 避免 GORM 在已有索引/外键约束上做危险变更导致服务启动失败。
	if cfg.MySQL.AutoMigrate {
		if err := database.AutoMigrate(db); err != nil {
			log.Fatalf("自动迁移失败: %v", err)
		}
	} else {
		log.Printf("已跳过 MySQL 自动迁移，使用现有数据库结构启动服务")
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
