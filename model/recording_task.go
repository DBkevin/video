package model

import "time"

const (
	RecordingTaskModeMixed = "mixed"

	RecordingTaskStorageVOD = "vod"

	RecordingTaskStatusRecording = "recording"
	RecordingTaskStatusStopping  = "stopping"
	RecordingTaskStatusFinished  = "finished"
	RecordingTaskStatusFailed    = "failed"
)

type RecordingTask struct {
	BaseModel
	SessionID   uint64     `gorm:"not null;index;comment:面诊会话ID" json:"session_id"`
	TaskID      string     `gorm:"size:128;not null;uniqueIndex;comment:TRTC录制任务ID" json:"task_id"`
	RecordMode  string     `gorm:"size:32;not null;default:'mixed';comment:录制模式" json:"record_mode"`
	StorageType string     `gorm:"size:32;not null;default:'vod';comment:存储类型" json:"storage_type"`
	Status      string     `gorm:"size:32;not null;default:'recording';index;comment:录制状态" json:"status"`
	FileID      string     `gorm:"size:128;default:'';comment:VOD文件ID" json:"file_id"`
	VideoURL    string     `gorm:"size:1024;default:'';comment:录制播放地址" json:"video_url"`
	FileName    string     `gorm:"size:255;default:'';comment:录制文件名" json:"file_name"`
	StartedAt   *time.Time `gorm:"comment:录制开始时间" json:"started_at"`
	EndedAt     *time.Time `gorm:"comment:录制结束时间" json:"ended_at"`
	RawCallback string     `gorm:"type:longtext;comment:录制回调原始报文" json:"-"`
}

func (RecordingTask) TableName() string {
	return "recording_tasks"
}
