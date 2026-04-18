package repository

import (
	"video-consult-mvp/model"

	"gorm.io/gorm"
)

type SessionLogRepository struct {
	db *gorm.DB
}

func NewSessionLogRepository(db *gorm.DB) *SessionLogRepository {
	return &SessionLogRepository{db: db}
}

func (r *SessionLogRepository) WithDB(db *gorm.DB) *SessionLogRepository {
	return &SessionLogRepository{db: db}
}

func (r *SessionLogRepository) Create(log *model.SessionLog) error {
	return r.db.Create(log).Error
}

func (r *SessionLogRepository) ListBySessionID(sessionID uint64) ([]model.SessionLog, error) {
	var logs []model.SessionLog
	if err := r.db.Where("session_id = ?", sessionID).Order("id ASC").Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}
