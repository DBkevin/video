package service

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"net/http"
	"strings"
	"testing"

	"video-consult-mvp/config"
	"video-consult-mvp/model"
	"video-consult-mvp/repository"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestHandleRecordingCallbackRejectsInvalidSignature(t *testing.T) {
	service, repo := newTestTRTCRecordingService(t, "callback-secret")

	task := &model.RecordingTask{
		SessionID:   1,
		TaskID:      "task-invalid-sign",
		RecordMode:  model.RecordingTaskModeMixed,
		StorageType: model.RecordingTaskStorageVOD,
		Status:      model.RecordingTaskStatusRecording,
	}
	if err := repo.Create(task); err != nil {
		t.Fatalf("create task failed: %v", err)
	}

	rawPayload := []byte(`{"EventType":311,"EventInfo":{"TaskId":"task-invalid-sign","Payload":{"Status":0,"TencentVod":{"FileId":"file-1","VideoUrl":"https://example.com/playback.mp4"},"FileMessage":[{"FileName":"consult.mp4","EndTimeStamp":1713230400000}]}}}`)
	result, err := service.HandleRecordingCallback(context.Background(), rawPayload, http.Header{
		"Sign": []string{"invalid-signature"},
	})
	if err != nil {
		t.Fatalf("HandleRecordingCallback returned error: %v", err)
	}
	if result == nil {
		t.Fatal("HandleRecordingCallback returned nil result")
	}
	if result.Handled {
		t.Fatal("expected handled=false when signature validation fails")
	}
	if !strings.Contains(result.Message, "签名校验失败") {
		t.Fatalf("unexpected message: %s", result.Message)
	}

	storedTask, err := repo.GetByTaskID(task.TaskID)
	if err != nil {
		t.Fatalf("query task failed: %v", err)
	}
	if storedTask.Status != model.RecordingTaskStatusRecording {
		t.Fatalf("expected task status to remain recording, got %s", storedTask.Status)
	}
	if storedTask.FileID != "" || storedTask.VideoURL != "" || storedTask.RawCallback != "" {
		t.Fatal("expected task data to stay unchanged when signature validation fails")
	}
}

func TestHandleRecordingCallbackPersistsTaskAfterValidSignature(t *testing.T) {
	service, repo := newTestTRTCRecordingService(t, "callback-secret")

	task := &model.RecordingTask{
		SessionID:   2,
		TaskID:      "task-valid-sign",
		RecordMode:  model.RecordingTaskModeMixed,
		StorageType: model.RecordingTaskStorageVOD,
		Status:      model.RecordingTaskStatusRecording,
	}
	if err := repo.Create(task); err != nil {
		t.Fatalf("create task failed: %v", err)
	}

	rawPayload := []byte(`{"EventType":311,"EventInfo":{"TaskId":"task-valid-sign","Payload":{"Status":0,"TencentVod":{"FileId":"file-2","VideoUrl":"https://example.com/finished.mp4"},"FileMessage":[{"FileName":"consult-finished.mp4","EndTimeStamp":1713230400000}]}}}`)
	result, err := service.HandleRecordingCallback(context.Background(), rawPayload, http.Header{
		"Sign": []string{buildTestCallbackSignature(rawPayload, "callback-secret")},
	})
	if err != nil {
		t.Fatalf("HandleRecordingCallback returned error: %v", err)
	}
	if result == nil {
		t.Fatal("HandleRecordingCallback returned nil result")
	}
	if !result.Handled {
		t.Fatal("expected handled=true when signature validation passes")
	}
	if result.TaskID != task.TaskID {
		t.Fatalf("expected task id %s, got %s", task.TaskID, result.TaskID)
	}

	storedTask, err := repo.GetByTaskID(task.TaskID)
	if err != nil {
		t.Fatalf("query task failed: %v", err)
	}
	if storedTask.Status != model.RecordingTaskStatusFinished {
		t.Fatalf("expected task status to become finished, got %s", storedTask.Status)
	}
	if storedTask.FileID != "file-2" {
		t.Fatalf("expected file id to be updated, got %s", storedTask.FileID)
	}
	if storedTask.VideoURL != "https://example.com/finished.mp4" {
		t.Fatalf("expected video url to be updated, got %s", storedTask.VideoURL)
	}
	if storedTask.FileName != "consult-finished.mp4" {
		t.Fatalf("expected file name to be updated, got %s", storedTask.FileName)
	}
	if strings.TrimSpace(storedTask.RawCallback) != string(rawPayload) {
		t.Fatal("expected raw callback to be stored after successful validation")
	}
}

func newTestTRTCRecordingService(t *testing.T, callbackKey string) (*TRTCRecordingService, *repository.RecordingTaskRepository) {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}
	if err := db.AutoMigrate(&model.RecordingTask{}); err != nil {
		t.Fatalf("migrate recording task failed: %v", err)
	}

	repo := repository.NewRecordingTaskRepository(db)
	service, err := NewTRTCRecordingService(
		db,
		config.TRTCConfig{},
		config.TRTCRecordingConfig{CallbackKey: callbackKey},
		repo,
	)
	if err != nil {
		t.Fatalf("new recording service failed: %v", err)
	}

	return service, repo
}

func buildTestCallbackSignature(rawPayload []byte, callbackKey string) string {
	mac := hmac.New(sha256.New, []byte(callbackKey))
	_, _ = mac.Write(rawPayload)
	return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}
