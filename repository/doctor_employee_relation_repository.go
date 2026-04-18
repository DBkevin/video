package repository

import (
	"video-consult-mvp/model"

	"gorm.io/gorm"
)

type DoctorEmployeeRelationRepository struct {
	db *gorm.DB
}

func NewDoctorEmployeeRelationRepository(db *gorm.DB) *DoctorEmployeeRelationRepository {
	return &DoctorEmployeeRelationRepository{db: db}
}

func (r *DoctorEmployeeRelationRepository) WithDB(db *gorm.DB) *DoctorEmployeeRelationRepository {
	return &DoctorEmployeeRelationRepository{db: db}
}

func (r *DoctorEmployeeRelationRepository) Create(relation *model.DoctorEmployeeRelation) error {
	return r.db.Create(relation).Error
}

func (r *DoctorEmployeeRelationRepository) Update(relation *model.DoctorEmployeeRelation) error {
	return r.db.Save(relation).Error
}

func (r *DoctorEmployeeRelationRepository) DeleteByID(id uint64) error {
	return r.db.Delete(&model.DoctorEmployeeRelation{}, id).Error
}

func (r *DoctorEmployeeRelationRepository) GetByID(id uint64) (*model.DoctorEmployeeRelation, error) {
	var relation model.DoctorEmployeeRelation
	if err := r.db.Preload("Doctor").Preload("Employee").First(&relation, id).Error; err != nil {
		return nil, err
	}
	return &relation, nil
}

func (r *DoctorEmployeeRelationRepository) ExistsActive(doctorID, employeeID uint64) (bool, error) {
	var count int64
	if err := r.db.Model(&model.DoctorEmployeeRelation{}).
		Where("doctor_id = ? AND employee_id = ? AND status = ?", doctorID, employeeID, model.DoctorEmployeeRelationStatusActive).
		Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *DoctorEmployeeRelationRepository) List(doctorID, employeeID uint64, status string) ([]model.DoctorEmployeeRelation, error) {
	query := r.db.Model(&model.DoctorEmployeeRelation{})
	if doctorID > 0 {
		query = query.Where("doctor_id = ?", doctorID)
	}
	if employeeID > 0 {
		query = query.Where("employee_id = ?", employeeID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var relations []model.DoctorEmployeeRelation
	if err := query.Preload("Doctor").Preload("Employee").Order("id DESC").Find(&relations).Error; err != nil {
		return nil, err
	}
	return relations, nil
}
