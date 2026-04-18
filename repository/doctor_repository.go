package repository

import (
	"video-consult-mvp/model"

	"gorm.io/gorm"
)

type DoctorRepository struct {
	db *gorm.DB
}

func NewDoctorRepository(db *gorm.DB) *DoctorRepository {
	return &DoctorRepository{db: db}
}

func (r *DoctorRepository) WithDB(db *gorm.DB) *DoctorRepository {
	return &DoctorRepository{db: db}
}

func (r *DoctorRepository) GetByID(id uint64) (*model.Doctor, error) {
	var doctor model.Doctor
	if err := r.db.First(&doctor, id).Error; err != nil {
		return nil, err
	}
	return &doctor, nil
}

func (r *DoctorRepository) GetByEmployeeNo(employeeNo string) (*model.Doctor, error) {
	var doctor model.Doctor
	if err := r.db.Where("employee_no = ?", employeeNo).First(&doctor).Error; err != nil {
		return nil, err
	}
	return &doctor, nil
}

func (r *DoctorRepository) Create(doctor *model.Doctor) error {
	return r.db.Create(doctor).Error
}

func (r *DoctorRepository) Update(doctor *model.Doctor) error {
	return r.db.Save(doctor).Error
}

func (r *DoctorRepository) List(keyword, status string, offset, limit int) ([]model.Doctor, int64, error) {
	query := r.db.Model(&model.Doctor{})
	if keyword != "" {
		likeKeyword := "%" + keyword + "%"
		query = query.Where("name LIKE ? OR employee_no LIKE ? OR mobile LIKE ?", likeKeyword, likeKeyword, likeKeyword)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var doctors []model.Doctor
	if err := query.Order("id DESC").Offset(offset).Limit(limit).Find(&doctors).Error; err != nil {
		return nil, 0, err
	}
	return doctors, total, nil
}
