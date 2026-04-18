package model

const (
	DoctorEmployeeRelationStatusActive   = "active"
	DoctorEmployeeRelationStatusDisabled = "disabled"
)

// DoctorEmployeeRelation 表示医生与员工之间的服务关系。
// 一个医生可服务多个员工，一个员工也可配置多个医生。
type DoctorEmployeeRelation struct {
	BaseModel
	DoctorID   uint64   `gorm:"not null;uniqueIndex:uk_doctor_employee_relation;index;comment:医生ID" json:"doctor_id"`
	EmployeeID uint64   `gorm:"not null;uniqueIndex:uk_doctor_employee_relation;index;comment:员工ID" json:"employee_id"`
	Status     string   `gorm:"size:20;not null;default:'active';index;comment:状态" json:"status"`
	Doctor     Doctor   `gorm:"foreignKey:DoctorID" json:"doctor,omitempty"`
	Employee   Employee `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
}

func (DoctorEmployeeRelation) TableName() string {
	return "doctor_employee_relations"
}
