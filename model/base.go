package model

import (
	"time"

	"gorm.io/gorm"
)

type BaseModel struct {
	ID        uint64         `gorm:"primaryKey;autoIncrement;comment:主键ID" json:"id"`
	CreatedAt time.Time      `gorm:"not null;comment:创建时间" json:"created_at"`
	UpdatedAt time.Time      `gorm:"not null;comment:更新时间" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index;comment:软删除时间" json:"-"`
}
