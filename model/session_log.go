package model

const (
	SessionLogActorAdmin    = "admin"
	SessionLogActorDoctor   = "doctor"
	SessionLogActorEmployee = "employee"
	SessionLogActorCustomer = "customer"
	SessionLogActorSystem   = "system"
)

// SessionLog 记录会话关键动作，便于后台查看是谁在何时执行了什么操作。
type SessionLog struct {
	BaseModel
	SessionID uint64         `gorm:"not null;index;comment:会话ID" json:"session_id"`
	ActorType string         `gorm:"size:20;not null;index;comment:操作者类型" json:"actor_type"`
	ActorID   uint64         `gorm:"not null;default:0;comment:操作者ID" json:"actor_id"`
	Action    string         `gorm:"size:64;not null;index;comment:动作标识" json:"action"`
	Payload   string         `gorm:"type:longtext;comment:动作附加信息" json:"payload"`
	Session   ConsultSession `gorm:"foreignKey:SessionID" json:"session,omitempty"`
}

func (SessionLog) TableName() string {
	return "session_logs"
}
