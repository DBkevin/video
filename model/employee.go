package model

const (
	EmployeeStatusActive   = "active"
	EmployeeStatusDisabled = "disabled"
)

// Employee 表示后台维护的员工档案。
// 员工通过多个微信身份绑定到同一个员工档案后，系统内部都按 employee_id 识别。
type Employee struct {
	BaseModel
	RealName     string `gorm:"size:64;not null;comment:真实姓名" json:"real_name"`
	Mobile       string `gorm:"size:20;not null;default:'';comment:手机号" json:"mobile"`
	EmployeeCode string `gorm:"size:32;not null;default:'';index;comment:员工编号" json:"employee_code"`
	Status       string `gorm:"size:20;not null;default:'active';index;comment:状态" json:"status"`
	Remark       string `gorm:"size:255;not null;default:'';comment:备注" json:"remark"`
}

func (Employee) TableName() string {
	return "employees"
}
