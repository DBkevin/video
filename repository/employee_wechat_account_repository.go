package repository

import (
	"video-consult-mvp/model"

	"gorm.io/gorm"
)

type EmployeeWechatAccountRepository struct {
	db *gorm.DB
}

func NewEmployeeWechatAccountRepository(db *gorm.DB) *EmployeeWechatAccountRepository {
	return &EmployeeWechatAccountRepository{db: db}
}

func (r *EmployeeWechatAccountRepository) WithDB(db *gorm.DB) *EmployeeWechatAccountRepository {
	return &EmployeeWechatAccountRepository{db: db}
}

func (r *EmployeeWechatAccountRepository) Create(account *model.EmployeeWechatAccount) error {
	return r.db.Create(account).Error
}

func (r *EmployeeWechatAccountRepository) Update(account *model.EmployeeWechatAccount) error {
	return r.db.Save(account).Error
}

func (r *EmployeeWechatAccountRepository) GetByPlatformOpenID(platform, openID string) (*model.EmployeeWechatAccount, error) {
	var account model.EmployeeWechatAccount
	if err := r.db.Preload("Employee").Where("platform = ? AND openid = ?", platform, openID).First(&account).Error; err != nil {
		return nil, err
	}
	return &account, nil
}

func (r *EmployeeWechatAccountRepository) GetByPlatformOpenIDUnscoped(platform, openID string) (*model.EmployeeWechatAccount, error) {
	var account model.EmployeeWechatAccount
	if err := r.db.Unscoped().Preload("Employee").Where("platform = ? AND openid = ?", platform, openID).First(&account).Error; err != nil {
		return nil, err
	}
	return &account, nil
}

func (r *EmployeeWechatAccountRepository) ListByEmployeeID(employeeID uint64) ([]model.EmployeeWechatAccount, error) {
	var accounts []model.EmployeeWechatAccount
	if err := r.db.Where("employee_id = ?", employeeID).Order("is_primary DESC, id ASC").Find(&accounts).Error; err != nil {
		return nil, err
	}
	return accounts, nil
}

func (r *EmployeeWechatAccountRepository) CountByEmployeeIDs(employeeIDs []uint64) (map[uint64]int64, error) {
	result := make(map[uint64]int64)
	if len(employeeIDs) == 0 {
		return result, nil
	}

	type row struct {
		EmployeeID uint64
		Count      int64
	}

	var rows []row
	if err := r.db.Model(&model.EmployeeWechatAccount{}).
		Select("employee_id, COUNT(*) AS count").
		Where("employee_id IN ?", employeeIDs).
		Group("employee_id").
		Scan(&rows).Error; err != nil {
		return nil, err
	}

	for _, item := range rows {
		result[item.EmployeeID] = item.Count
	}
	return result, nil
}
