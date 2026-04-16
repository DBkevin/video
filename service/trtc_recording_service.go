package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"video-consult-mvp/config"
	"video-consult-mvp/model"
	"video-consult-mvp/pkg/usersig"
	"video-consult-mvp/repository"

	"github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common"
	profile "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common/profile"
	trtc "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/trtc/v20190722"
	"gorm.io/gorm"
)

type RecordingInfo struct {
	Status   string `json:"record_status"`
	VideoURL string `json:"record_video_url"`
	FileID   string `json:"record_file_id"`
}

type RecordingCallbackHandleResult struct {
	TaskID  string `json:"task_id"`
	Message string `json:"-"`
}

type TRTCRecordingService struct {
	db           *gorm.DB
	trtcCfg      config.TRTCConfig
	recordingCfg config.TRTCRecordingConfig
	taskRepo     *repository.RecordingTaskRepository
	client       *trtc.Client
}

type recordingCallbackPayload struct {
	EventType int `json:"EventType"`
	EventInfo struct {
		TaskID  flexibleString `json:"TaskId"`
		Payload struct {
			Status      int                        `json:"Status"`
			TencentVod  recordingCallbackVODInfo   `json:"TencentVod"`
			FileMessage []recordingCallbackFileMsg `json:"FileMessage"`
		} `json:"Payload"`
	} `json:"EventInfo"`
}

type recordingCallbackVODInfo struct {
	FileID         flexibleString `json:"FileId"`
	VideoURL       flexibleString `json:"VideoUrl"`
	CacheFile      flexibleString `json:"CacheFile"`
	StartTimeStamp flexibleInt64  `json:"StartTimeStamp"`
	EndTimeStamp   flexibleInt64  `json:"EndTimeStamp"`
}

type recordingCallbackFileMsg struct {
	FileName flexibleString `json:"FileName"`
}

type flexibleString string

func (s *flexibleString) UnmarshalJSON(data []byte) error {
	text := strings.TrimSpace(string(data))
	if text == "" || text == "null" {
		*s = ""
		return nil
	}

	if strings.HasPrefix(text, "\"") {
		var decoded string
		if err := json.Unmarshal(data, &decoded); err != nil {
			return err
		}
		*s = flexibleString(decoded)
		return nil
	}

	*s = flexibleString(text)
	return nil
}

type flexibleInt64 int64

func (n *flexibleInt64) UnmarshalJSON(data []byte) error {
	text := strings.Trim(strings.TrimSpace(string(data)), "\"")
	if text == "" || text == "null" {
		*n = 0
		return nil
	}

	parsed, err := strconv.ParseInt(text, 10, 64)
	if err != nil {
		return err
	}
	*n = flexibleInt64(parsed)
	return nil
}

func NewTRTCRecordingService(
	db *gorm.DB,
	trtcCfg config.TRTCConfig,
	recordingCfg config.TRTCRecordingConfig,
	taskRepo *repository.RecordingTaskRepository,
) (*TRTCRecordingService, error) {
	service := &TRTCRecordingService{
		db:           db,
		trtcCfg:      trtcCfg,
		recordingCfg: recordingCfg,
		taskRepo:     taskRepo,
	}

	if !recordingCfg.Enabled {
		return service, nil
	}

	client, err := service.buildClient()
	if err != nil {
		return nil, err
	}
	service.client = client

	return service, nil
}

func (s *TRTCRecordingService) StartRecording(ctx context.Context, session *model.ConsultSession) (*model.RecordingTask, error) {
	if err := s.ensureReady(); err != nil {
		return nil, err
	}
	if session == nil || session.ID == 0 {
		return nil, NewBizError(http.StatusBadRequest, "缺少有效会话，无法启动录制")
	}

	latestTask, err := s.taskRepo.WithDB(s.db.WithContext(ctx)).GetLatestBySessionID(session.ID)
	if err == nil && latestTask != nil {
		switch latestTask.Status {
		case model.RecordingTaskStatusRecording, model.RecordingTaskStatusStopping:
			// 已存在进行中的录制任务时直接复用，避免医生重复 start 导致重复录制。
			return latestTask, nil
		}
	} else if err != nil && err != gorm.ErrRecordNotFound {
		return nil, err
	}

	recordUserID := s.buildRecordUserID(session.ID)
	recordUserSig, err := s.buildRecordUserSig(recordUserID)
	if err != nil {
		return nil, err
	}

	request := trtc.NewCreateCloudRecordingRequest()
	request.SdkAppId = common.Uint64Ptr(uint64(s.trtcCfg.SDKAppID))
	request.RoomId = common.StringPtr(strconv.FormatInt(int64(session.RoomID), 10))
	request.RoomIdType = common.Uint64Ptr(1)
	request.UserId = common.StringPtr(recordUserID)
	request.UserSig = common.StringPtr(recordUserSig)
	request.ResourceExpiredHour = common.Uint64Ptr(uint64(s.recordingCfg.ResourceExpiredHour))
	request.PrivateMapKey = common.StringPtr("")
	request.RecordParams = &trtc.RecordParams{
		RecordMode:  common.Uint64Ptr(2),
		StreamType:  common.Uint64Ptr(0),
		MaxIdleTime: common.Uint64Ptr(uint64(s.recordingCfg.MaxIdleTime)),
	}
	request.StorageParams = &trtc.StorageParams{
		CloudVod: &trtc.CloudVod{
			TencentVod: &trtc.TencentVod{
				SubAppId:   common.Uint64Ptr(s.recordingCfg.VODSubAppID),
				ExpireTime: common.Uint64Ptr(uint64(s.recordingCfg.VODExpireTime)),
			},
		},
	}
	request.MixLayoutParams = &trtc.MixLayoutParams{
		MixLayoutMode: common.Uint64Ptr(uint64(s.recordingCfg.MixLayoutMode)),
	}
	request.MixTranscodeParams = &trtc.MixTranscodeParams{
		VideoParams: &trtc.VideoParams{
			Width:   common.Uint64Ptr(uint64(s.recordingCfg.MixWidth)),
			Height:  common.Uint64Ptr(uint64(s.recordingCfg.MixHeight)),
			Fps:     common.Uint64Ptr(uint64(s.recordingCfg.MixFPS)),
			BitRate: common.Uint64Ptr(uint64(s.recordingCfg.MixBitrate)),
			Gop:     common.Uint64Ptr(10),
		},
	}

	response, err := s.client.CreateCloudRecording(request)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	task := &model.RecordingTask{
		SessionID:   session.ID,
		TaskID:      derefStringPtr(response.Response.TaskId),
		RecordMode:  model.RecordingTaskModeMixed,
		StorageType: model.RecordingTaskStorageVOD,
		Status:      model.RecordingTaskStatusRecording,
		StartedAt:   &now,
	}

	if task.TaskID == "" {
		return nil, NewBizError(http.StatusInternalServerError, "TRTC 录制启动成功但未返回任务ID")
	}

	if err := HandleDBError(s.taskRepo.WithDB(s.db.WithContext(ctx)).Create(task), "录制任务创建失败，请稍后重试"); err != nil {
		return nil, err
	}

	return task, nil
}

func (s *TRTCRecordingService) StopRecording(ctx context.Context, session *model.ConsultSession) (*model.RecordingTask, error) {
	if err := s.ensureReady(); err != nil {
		return nil, err
	}
	if session == nil || session.ID == 0 {
		return nil, NewBizError(http.StatusBadRequest, "缺少有效会话，无法停止录制")
	}

	task, err := s.taskRepo.WithDB(s.db.WithContext(ctx)).GetLatestBySessionID(session.ID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	switch task.Status {
	case model.RecordingTaskStatusFinished:
		return task, nil
	case model.RecordingTaskStatusStopping:
		return task, nil
	}

	request := trtc.NewDeleteCloudRecordingRequest()
	request.SdkAppId = common.Uint64Ptr(uint64(s.trtcCfg.SDKAppID))
	request.TaskId = common.StringPtr(task.TaskID)

	if _, err := s.client.DeleteCloudRecording(request); err != nil {
		task.Status = model.RecordingTaskStatusFailed
		_ = s.taskRepo.WithDB(s.db.WithContext(ctx)).Update(task)
		return nil, err
	}

	now := time.Now()
	task.Status = model.RecordingTaskStatusStopping
	task.EndedAt = &now
	if err := s.taskRepo.WithDB(s.db.WithContext(ctx)).Update(task); err != nil {
		return nil, err
	}

	return task, nil
}

func (s *TRTCRecordingService) HandleRecordingCallback(ctx context.Context, rawPayload []byte) (*RecordingCallbackHandleResult, error) {
	var payload recordingCallbackPayload
	if err := json.Unmarshal(rawPayload, &payload); err != nil {
		return nil, NewBizError(http.StatusBadRequest, "录制回调报文不合法")
	}

	taskID := string(payload.EventInfo.TaskID)
	if strings.TrimSpace(taskID) == "" {
		return &RecordingCallbackHandleResult{
			TaskID:  "",
			Message: "未携带录制任务ID，已忽略",
		}, nil
	}

	task, err := s.taskRepo.WithDB(s.db.WithContext(ctx)).GetByTaskID(taskID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return &RecordingCallbackHandleResult{
				TaskID:  taskID,
				Message: "未找到关联录制任务，已忽略",
			}, nil
		}
		return nil, err
	}

	task.RawCallback = string(rawPayload)

	switch payload.EventType {
	case 311:
		task.FileID = string(payload.EventInfo.Payload.TencentVod.FileID)
		task.VideoURL = string(payload.EventInfo.Payload.TencentVod.VideoURL)
		task.FileName = firstNonEmpty(
			string(payload.EventInfo.Payload.TencentVod.CacheFile),
			extractCallbackFileName(payload.EventInfo.Payload.FileMessage),
		)
		task.Status = model.RecordingTaskStatusFinished
		if endedAt := parseCallbackTime(payload.EventInfo.Payload.TencentVod.EndTimeStamp); endedAt != nil {
			task.EndedAt = endedAt
		} else {
			now := time.Now()
			task.EndedAt = &now
		}
	case 310:
		task.FileName = firstNonEmpty(task.FileName, extractCallbackFileName(payload.EventInfo.Payload.FileMessage))
	default:
		// 其他回调类型暂时只保留原始报文，方便后续排查录制问题。
	}

	if err := s.taskRepo.WithDB(s.db.WithContext(ctx)).Update(task); err != nil {
		return nil, err
	}

	return &RecordingCallbackHandleResult{
		TaskID:  taskID,
		Message: "录制回调处理成功",
	}, nil
}

func (s *TRTCRecordingService) GetRecordingInfo(ctx context.Context, sessionID uint64) (*RecordingInfo, error) {
	if s.taskRepo == nil {
		return &RecordingInfo{}, nil
	}

	task, err := s.taskRepo.WithDB(s.db.WithContext(ctx)).GetLatestBySessionID(sessionID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return &RecordingInfo{}, nil
		}
		return nil, err
	}

	return &RecordingInfo{
		Status:   task.Status,
		VideoURL: task.VideoURL,
		FileID:   task.FileID,
	}, nil
}

func (s *TRTCRecordingService) buildClient() (*trtc.Client, error) {
	if s.recordingCfg.SecretID == "" || s.recordingCfg.SecretKey == "" {
		return nil, NewBizError(http.StatusInternalServerError, "TRTC 录制云 API 密钥未配置")
	}

	credential := common.NewCredential(s.recordingCfg.SecretID, s.recordingCfg.SecretKey)
	clientProfile := profile.NewClientProfile()
	clientProfile.HttpProfile.Endpoint = "trtc.tencentcloudapi.com"

	return trtc.NewClient(credential, s.recordingCfg.Region, clientProfile)
}

func (s *TRTCRecordingService) ensureReady() error {
	if !s.recordingCfg.Enabled {
		return NewBizError(http.StatusServiceUnavailable, "TRTC 录制能力未开启")
	}
	if s.client == nil {
		return NewBizError(http.StatusInternalServerError, "TRTC 录制客户端未初始化")
	}
	if s.trtcCfg.SDKAppID == 0 || s.trtcCfg.SecretKey == "" {
		return NewBizError(http.StatusInternalServerError, "TRTC SDK 配置未完成，无法生成录制用户签名")
	}
	return nil
}

func (s *TRTCRecordingService) buildRecordUserID(sessionID uint64) string {
	return fmt.Sprintf("record_bot_%d", sessionID)
}

func (s *TRTCRecordingService) buildRecordUserSig(userID string) (string, error) {
	return usersig.Generate(s.trtcCfg.SDKAppID, userID, s.trtcCfg.SecretKey, s.trtcCfg.UserSigExpireIn)
}

func parseCallbackTime(callbackValue flexibleInt64) *time.Time {
	if callbackValue <= 0 {
		return nil
	}

	timestamp := time.Unix(int64(callbackValue), 0)
	return &timestamp
}

func extractCallbackFileName(fileMessages []recordingCallbackFileMsg) string {
	if len(fileMessages) == 0 {
		return ""
	}
	return string(fileMessages[0].FileName)
}

func derefStringPtr(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" {
			return value
		}
	}
	return ""
}
