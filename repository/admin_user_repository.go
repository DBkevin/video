package repository

import (
	"video-consult-mvp/model"

	"gorm.io/gorm"
)

type AdminUserRepository struct {
	db *gorm.DB
}

func NewAdminUserRepository(db *gorm.DB) *AdminUserRepository {
	return &AdminUserRepository{db: db}
}

func (r *AdminUserRepository) WithDB(db *gorm.DB) *AdminUserRepository {
	return &AdminUserRepository{db: db}
}

func (r *AdminUserRepository) Create(admin *model.AdminUser) error {
	return r.db.Create(admin).Error
}

func (r *AdminUserRepository) Update(admin *model.AdminUser) error {
	return r.db.Save(admin).Error
}

func (r *AdminUserRepository) GetByUsername(username string) (*model.AdminUser, error) {
	var admin model.AdminUser
	if err := r.db.Where("username = ?", username).First(&admin).Error; err != nil {
		return nil, err
	}
	return &admin, nil
}
