package repository

import (
	"video-consult-mvp/model"

	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) WithDB(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) GetByID(id uint64) (*model.User, error) {
	var user model.User
	if err := r.db.First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetByMobile(mobile string) (*model.User, error) {
	var user model.User
	if err := r.db.Where("mobile = ?", mobile).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetByMobileUnscoped(mobile string) (*model.User, error) {
	var user model.User
	if err := r.db.Unscoped().Where("mobile = ?", mobile).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetByOpenID(openID string) (*model.User, error) {
	var user model.User
	if err := r.db.Where("openid = ?", openID).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetByOpenIDUnscoped(openID string) (*model.User, error) {
	var user model.User
	if err := r.db.Unscoped().Where("openid = ?", openID).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) Create(user *model.User) error {
	return r.db.Create(user).Error
}

func (r *UserRepository) Update(user *model.User) error {
	return r.db.Save(user).Error
}

func (r *UserRepository) Restore(userID uint64) error {
	return r.db.Unscoped().Model(&model.User{}).Where("id = ?", userID).Update("deleted_at", nil).Error
}
