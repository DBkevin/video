package model

import "time"

const (
	ConsultSessionStatusCreated   = "created"
	ConsultSessionStatusShared    = "shared"
	ConsultSessionStatusJoined    = "joined"
	ConsultSessionStatusInConsult = "in_consult"
	ConsultSessionStatusFinished  = "finished"
	ConsultSessionStatusExpired   = "expired"
	ConsultSessionStatusCancelled = "cancelled"
)

type ConsultSession struct {
	BaseModel
	SessionNo    string     `gorm:"size:32;not null;uniqueIndex;comment:会话编号" json:"session_no"`
	DoctorID     uint64     `gorm:"not null;index;comment:医生ID" json:"doctor_id"`
	CustomerID   *uint64    `gorm:"index;comment:顾客ID" json:"customer_id"`
	RoomID       int32      `gorm:"type:int;not null;uniqueIndex;comment:TRTC房间号" json:"room_id"`
	ShareToken   *string    `gorm:"size:128;uniqueIndex;comment:分享令牌" json:"-"`
	ShareURLPath string     `gorm:"size:255;not null;default:'';comment:小程序分享路径" json:"share_url_path"`
	Status       string     `gorm:"size:20;not null;default:'created';index;comment:会话状态" json:"status"`
	ExpiredAt    time.Time  `gorm:"not null;index;comment:过期时间" json:"expired_at"`
	StartedAt    *time.Time `gorm:"comment:开始时间" json:"started_at"`
	EndedAt      *time.Time `gorm:"comment:结束时间" json:"ended_at"`
	Doctor       Doctor     `gorm:"foreignKey:DoctorID" json:"doctor,omitempty"`
	Customer     User       `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
}

func (ConsultSession) TableName() string {
	return "consult_sessions"
}
