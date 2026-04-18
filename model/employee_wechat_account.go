package model

const (
	WechatPlatformMiniProgram = "wechat_miniprogram"

	EmployeeWechatAccountStatusActive   = "active"
	EmployeeWechatAccountStatusDisabled = "disabled"
)

// EmployeeWechatAccount 表示一个员工绑定的具体微信身份。
// 一个员工可以绑定多个平台身份，但同一个平台 openid 只能绑定到一个员工。
type EmployeeWechatAccount struct {
	BaseModel
	EmployeeID uint64   `gorm:"not null;index;comment:员工ID" json:"employee_id"`
	Platform   string   `gorm:"size:32;not null;default:'wechat_miniprogram';uniqueIndex:uk_employee_wechat_platform_openid;comment:平台标识" json:"platform"`
	OpenID     string   `gorm:"column:openid;size:64;not null;default:'';uniqueIndex:uk_employee_wechat_platform_openid;comment:微信OpenID" json:"openid"`
	UnionID    string   `gorm:"column:unionid;size:64;not null;default:'';index;comment:微信UnionID" json:"unionid"`
	Nickname   string   `gorm:"size:64;not null;default:'';comment:微信昵称" json:"nickname"`
	AvatarURL  string   `gorm:"size:255;not null;default:'';comment:微信头像" json:"avatar_url"`
	IsPrimary  bool     `gorm:"not null;default:false;comment:是否主微信身份" json:"is_primary"`
	Status     string   `gorm:"size:20;not null;default:'active';index;comment:状态" json:"status"`
	Employee   Employee `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
}

func (EmployeeWechatAccount) TableName() string {
	return "employee_wechat_accounts"
}
