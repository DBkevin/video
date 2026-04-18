package database

import (
	"errors"

	"video-consult-mvp/config"
	"video-consult-mvp/model"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// EnsureDefaultAdmin 在后台首次启动时补一个默认管理员，便于 Web 后台开箱登录。
// 如果管理员已存在，则仅保持现有账号，不强制覆盖密码。
func EnsureDefaultAdmin(db *gorm.DB, cfg config.AdminConfig) error {
	if db == nil || !cfg.AutoSeed || cfg.DefaultUsername == "" || cfg.DefaultPassword == "" {
		return nil
	}

	var admin model.AdminUser
	err := db.Where("username = ?", cfg.DefaultUsername).First(&admin).Error
	if err == nil {
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(cfg.DefaultPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	admin = model.AdminUser{
		Username:     cfg.DefaultUsername,
		DisplayName:  cfg.DefaultName,
		PasswordHash: string(passwordHash),
		Status:       model.AdminUserStatusActive,
	}
	return db.Create(&admin).Error
}
