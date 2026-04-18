package repository

import (
	"video-consult-mvp/model"

	"gorm.io/gorm"
)

type EmployeeBindRequestRepository struct {
	db *gorm.DB
}

func NewEmployeeBindRequestRepository(db *gorm.DB) *EmployeeBindRequestRepository {
	return &EmployeeBindRequestRepository{db: db}
}

func (r *EmployeeBindRequestRepository) WithDB(db *gorm.DB) *EmployeeBindRequestRepository {
	return &EmployeeBindRequestRepository{db: db}
}

func (r *EmployeeBindRequestRepository) Create(request *model.EmployeeBindRequest) error {
	return r.db.Create(request).Error
}

func (r *EmployeeBindRequestRepository) Update(request *model.EmployeeBindRequest) error {
	return r.db.Save(request).Error
}

func (r *EmployeeBindRequestRepository) GetByID(id uint64) (*model.EmployeeBindRequest, error) {
	var request model.EmployeeBindRequest
	if err := r.db.Preload("Employee").First(&request, id).Error; err != nil {
		return nil, err
	}
	return &request, nil
}

func (r *EmployeeBindRequestRepository) GetLatestByPlatformOpenID(platform, openID string) (*model.EmployeeBindRequest, error) {
	var request model.EmployeeBindRequest
	if err := r.db.Preload("Employee").Where("platform = ? AND openid = ?", platform, openID).Order("id DESC").First(&request).Error; err != nil {
		return nil, err
	}
	return &request, nil
}

func (r *EmployeeBindRequestRepository) List(status string, offset, limit int) ([]model.EmployeeBindRequest, int64, error) {
	query := r.db.Model(&model.EmployeeBindRequest{})
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var requests []model.EmployeeBindRequest
	if err := query.Preload("Employee").Order("id DESC").Offset(offset).Limit(limit).Find(&requests).Error; err != nil {
		return nil, 0, err
	}
	return requests, total, nil
}
