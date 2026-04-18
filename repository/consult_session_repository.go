package repository

import (
	"video-consult-mvp/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ConsultSessionRepository struct {
	db *gorm.DB
}

func NewConsultSessionRepository(db *gorm.DB) *ConsultSessionRepository {
	return &ConsultSessionRepository{db: db}
}

func (r *ConsultSessionRepository) WithDB(db *gorm.DB) *ConsultSessionRepository {
	return &ConsultSessionRepository{db: db}
}

func (r *ConsultSessionRepository) Create(session *model.ConsultSession) error {
	return r.db.Create(session).Error
}

func (r *ConsultSessionRepository) Update(session *model.ConsultSession) error {
	return r.db.Save(session).Error
}

func (r *ConsultSessionRepository) GetByID(id uint64) (*model.ConsultSession, error) {
	var session model.ConsultSession
	if err := r.db.Preload("Doctor").Preload("Customer").Preload("OperatorEmployee").First(&session, id).Error; err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *ConsultSessionRepository) GetByIDForUpdate(id uint64) (*model.ConsultSession, error) {
	var session model.ConsultSession
	if err := r.db.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Doctor").Preload("Customer").Preload("OperatorEmployee").First(&session, id).Error; err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *ConsultSessionRepository) GetByShareToken(token string) (*model.ConsultSession, error) {
	var session model.ConsultSession
	if err := r.db.Preload("Doctor").Preload("Customer").Preload("OperatorEmployee").Where("share_token = ?", token).First(&session).Error; err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *ConsultSessionRepository) ExistsByRoomID(roomID int32) (bool, error) {
	var count int64
	if err := r.db.Model(&model.ConsultSession{}).Where("room_id = ?", roomID).Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *ConsultSessionRepository) List(query func(*gorm.DB) *gorm.DB, offset, limit int) ([]model.ConsultSession, int64, error) {
	db := r.db.Model(&model.ConsultSession{})
	if query != nil {
		db = query(db)
	}

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var sessions []model.ConsultSession
	if err := db.Preload("Doctor").
		Preload("Customer").
		Preload("OperatorEmployee").
		Order("id DESC").
		Offset(offset).
		Limit(limit).
		Find(&sessions).Error; err != nil {
		return nil, 0, err
	}
	return sessions, total, nil
}
