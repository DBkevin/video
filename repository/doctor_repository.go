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

func (r *DoctorRepository) Update(doctor *model.Doctor) error {
	return r.db.Save(doctor).Error
}
