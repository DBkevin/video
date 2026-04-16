package model

import "time"

type ConsultRecord struct {
	BaseModel
	SessionID       uint64    `gorm:"not null;uniqueIndex;comment:会话ID" json:"session_id"`
	CustomerID      *uint64   `gorm:"index;comment:顾客ID" json:"customer_id"`
	DoctorID        uint64    `gorm:"not null;index;comment:医生ID" json:"doctor_id"`
	Summary         string    `gorm:"type:text;not null;comment:接诊摘要" json:"summary"`
	Diagnosis       string    `gorm:"type:text;not null;comment:初步诊断" json:"diagnosis"`
	Advice          string    `gorm:"type:text;not null;comment:医生建议" json:"advice"`
	DurationSeconds int64     `gorm:"not null;default:0;comment:面诊时长(秒)" json:"duration_seconds"`
	EndedAt         time.Time `gorm:"not null;comment:结束时间" json:"ended_at"`
}

func (ConsultRecord) TableName() string {
	return "consult_records"
}
