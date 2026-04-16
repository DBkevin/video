package repository

import (
	"video-consult-mvp/model"

	"gorm.io/gorm"
)

type RecordingTaskRepository struct {
	db *gorm.DB
}

func NewRecordingTaskRepository(db *gorm.DB) *RecordingTaskRepository {
	return &RecordingTaskRepository{db: db}
}

func (r *RecordingTaskRepository) WithDB(db *gorm.DB) *RecordingTaskRepository {
	return &RecordingTaskRepository{db: db}
}

func (r *RecordingTaskRepository) Create(task *model.RecordingTask) error {
	return r.db.Create(task).Error
}

func (r *RecordingTaskRepository) Update(task *model.RecordingTask) error {
	return r.db.Save(task).Error
}

func (r *RecordingTaskRepository) GetLatestBySessionID(sessionID uint64) (*model.RecordingTask, error) {
	var task model.RecordingTask
	if err := r.db.Where("session_id = ?", sessionID).Order("id DESC").First(&task).Error; err != nil {
		return nil, err
	}
	return &task, nil
}

func (r *RecordingTaskRepository) GetByTaskID(taskID string) (*model.RecordingTask, error) {
	var task model.RecordingTask
	if err := r.db.Where("task_id = ?", taskID).First(&task).Error; err != nil {
		return nil, err
	}
	return &task, nil
}
