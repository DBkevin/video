package repository

import (
	"video-consult-mvp/model"

	"gorm.io/gorm"
)

type EmployeeRepository struct {
	db *gorm.DB
}

func NewEmployeeRepository(db *gorm.DB) *EmployeeRepository {
	return &EmployeeRepository{db: db}
}

func (r *EmployeeRepository) WithDB(db *gorm.DB) *EmployeeRepository {
	return &EmployeeRepository{db: db}
}

func (r *EmployeeRepository) Create(employee *model.Employee) error {
	return r.db.Create(employee).Error
}

func (r *EmployeeRepository) Update(employee *model.Employee) error {
	return r.db.Save(employee).Error
}

func (r *EmployeeRepository) GetByID(id uint64) (*model.Employee, error) {
	var employee model.Employee
	if err := r.db.First(&employee, id).Error; err != nil {
		return nil, err
	}
	return &employee, nil
}

func (r *EmployeeRepository) List(keyword, status string, offset, limit int) ([]model.Employee, int64, error) {
	query := r.db.Model(&model.Employee{})
	if keyword != "" {
		likeKeyword := "%" + keyword + "%"
		query = query.Where("real_name LIKE ? OR mobile LIKE ? OR employee_code LIKE ?", likeKeyword, likeKeyword, likeKeyword)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var employees []model.Employee
	if err := query.Order("id DESC").Offset(offset).Limit(limit).Find(&employees).Error; err != nil {
		return nil, 0, err
	}
	return employees, total, nil
}
