package repository

import (
	"video-consult-mvp/model"

	"gorm.io/gorm"
)

type ConsultRecordRepository struct {
	db *gorm.DB
}

func NewConsultRecordRepository(db *gorm.DB) *ConsultRecordRepository {
	return &ConsultRecordRepository{db: db}
}

func (r *ConsultRecordRepository) WithDB(db *gorm.DB) *ConsultRecordRepository {
	return &ConsultRecordRepository{db: db}
}

func (r *ConsultRecordRepository) Create(record *model.ConsultRecord) error {
	return r.db.Create(record).Error
}

func (r *ConsultRecordRepository) Update(record *model.ConsultRecord) error {
	return r.db.Save(record).Error
}

func (r *ConsultRecordRepository) GetBySessionID(sessionID uint64) (*model.ConsultRecord, error) {
	var record model.ConsultRecord
	if err := r.db.Where("session_id = ?", sessionID).First(&record).Error; err != nil {
		return nil, err
	}
	return &record, nil
}
