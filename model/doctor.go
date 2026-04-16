package model

import "time"

const (
	DoctorStatusEnabled  = "enabled"
	DoctorStatusDisabled = "disabled"
)

type Doctor struct {
	BaseModel
	Name         string     `gorm:"size:64;not null;comment:医生姓名" json:"name"`
	Mobile       string     `gorm:"size:20;not null;uniqueIndex;comment:手机号" json:"mobile"`
	Title        string     `gorm:"size:64;default:'';comment:医生职称" json:"title"`
	Department   string     `gorm:"size:64;default:'';comment:所属科室" json:"department"`
	Introduction string     `gorm:"type:text;comment:医生简介" json:"introduction"`
	EmployeeNo   string     `gorm:"size:32;not null;uniqueIndex;comment:工号" json:"employee_no"`
	PasswordHash string     `gorm:"size:255;not null;comment:bcrypt密码哈希" json:"-"`
	Status       string     `gorm:"size:20;not null;default:'enabled';index;comment:状态" json:"status"`
	LastLoginAt  *time.Time `gorm:"comment:最后登录时间" json:"last_login_at"`
}

func (Doctor) TableName() string {
	return "doctors"
}
