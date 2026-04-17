package model

import "time"

const (
	UserStatusEnabled  = "enabled"
	UserStatusDisabled = "disabled"
)

type User struct {
	BaseModel
	UnionID      string     `gorm:"size:64;default:'';index;comment:微信UnionID" json:"union_id"`
	// OpenID 对应数据库列名是 openid，不是 GORM 默认推导出来的 open_id。
	// 这里必须显式指定 column:openid，否则微信登录时会写错列并触发唯一索引冲突。
	OpenID       string     `gorm:"column:openid;size:64;default:'';uniqueIndex;comment:微信OpenID" json:"openid"`
	Mobile       string     `gorm:"size:20;not null;uniqueIndex;comment:手机号" json:"mobile"`
	Nickname     string     `gorm:"size:64;default:'';comment:用户昵称" json:"nickname"`
	AvatarURL    string     `gorm:"size:255;default:'';comment:头像地址" json:"avatar_url"`
	PasswordHash string     `gorm:"size:255;not null;comment:bcrypt密码哈希" json:"-"`
	Status       string     `gorm:"size:20;not null;default:'enabled';index;comment:状态" json:"status"`
	LastLoginAt  *time.Time `gorm:"comment:最后登录时间" json:"last_login_at"`
}

func (User) TableName() string {
	return "users"
}
