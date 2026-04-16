package database

import (
	"video-consult-mvp/config"
	"video-consult-mvp/model"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func NewMySQL(cfg config.MySQLConfig) (*gorm.DB, error) {
	return gorm.Open(mysql.Open(cfg.DSN), &gorm.Config{})
}

func AutoMigrate(db *gorm.DB) error {
	return db.Set("gorm:table_options", "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4").
		AutoMigrate(
			&model.User{},
			&model.Doctor{},
			&model.ConsultSession{},
			&model.ConsultRecord{},
			&model.RecordingTask{},
		)
}
