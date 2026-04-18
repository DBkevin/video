package model

import "time"

const (
	AdminUserStatusActive   = "active"
	AdminUserStatusDisabled = "disabled"
)

// AdminUser 表示 Web 管理后台管理员账号。
type AdminUser struct {
	BaseModel
	Username     string     `gorm:"size:64;not null;uniqueIndex;comment:登录用户名" json:"username"`
	DisplayName  string     `gorm:"size:64;not null;default:'';comment:显示名称" json:"display_name"`
	PasswordHash string     `gorm:"size:255;not null;comment:bcrypt密码哈希" json:"-"`
	Status       string     `gorm:"size:20;not null;default:'active';index;comment:状态" json:"status"`
	LastLoginAt  *time.Time `gorm:"comment:最后登录时间" json:"last_login_at"`
}

func (AdminUser) TableName() string {
	return "admin_users"
}
