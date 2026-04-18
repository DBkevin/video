package model

import "time"

const (
	EmployeeBindRequestStatusPending  = "pending"
	EmployeeBindRequestStatusApproved = "approved"
	EmployeeBindRequestStatusRejected = "rejected"
)

// EmployeeBindRequest 表示员工扫码固定二维码后提交的绑定申请。
// 申请可以在后台审核时直接绑定到已有员工，或审核通过时自动创建新员工。
type EmployeeBindRequest struct {
	BaseModel
	Platform     string     `gorm:"size:32;not null;default:'wechat_miniprogram';index;comment:平台标识" json:"platform"`
	OpenID       string     `gorm:"column:openid;size:64;not null;default:'';index;comment:微信OpenID" json:"openid"`
	UnionID      string     `gorm:"column:unionid;size:64;not null;default:'';index;comment:微信UnionID" json:"unionid"`
	Nickname     string     `gorm:"size:64;not null;default:'';comment:微信昵称" json:"nickname"`
	AvatarURL    string     `gorm:"size:255;not null;default:'';comment:微信头像" json:"avatar_url"`
	RealName     string     `gorm:"size:64;not null;default:'';comment:申请人填写的真实姓名" json:"real_name"`
	Mobile       string     `gorm:"size:20;not null;default:'';comment:申请人填写的手机号" json:"mobile"`
	EmployeeCode string     `gorm:"size:32;not null;default:'';comment:申请人填写的员工编号" json:"employee_code"`
	Status       string     `gorm:"size:20;not null;default:'pending';index;comment:审核状态" json:"status"`
	EmployeeID   *uint64    `gorm:"index;comment:审核通过后绑定的员工ID" json:"employee_id"`
	ReviewedBy   *uint64    `gorm:"index;comment:审核管理员ID" json:"reviewed_by"`
	ReviewedAt   *time.Time `gorm:"comment:审核时间" json:"reviewed_at"`
	RejectReason string     `gorm:"size:255;not null;default:'';comment:驳回原因" json:"reject_reason"`
	Employee     Employee   `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
}

func (EmployeeBindRequest) TableName() string {
	return "employee_bind_requests"
}
