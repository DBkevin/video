package service

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"video-consult-mvp/config"
	"video-consult-mvp/model"
	"video-consult-mvp/pkg/usersig"
	"video-consult-mvp/repository"

	"gorm.io/gorm"
)

const (
	trtcRecordingServiceName    = "trtc"
	trtcRecordingHost           = "trtc.tencentcloudapi.com"
	trtcRecordingEndpoint       = "https://trtc.tencentcloudapi.com"
	trtcRecordingVersion        = "2019-07-22"
	trtcRecordingAlgorithm      = "TC3-HMAC-SHA256"
	trtcRecordingRecordModeMix  = 2
	trtcRecordingRoomIDTypeInt  = 1
	trtcRecordingStreamTypeAuto = 0
)

type RecordingTaskInfo struct {
	Status    string     `json:"status"`
	TaskID    string     `json:"task_id"`
	FileID    string     `json:"file_id"`
	VideoURL  string     `json:"video_url"`
	StartedAt *time.Time `json:"started_at"`
	EndedAt   *time.Time `json:"ended_at"`
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
	httpClient   *http.Client
}

type createCloudRecordingRequest struct {
	SdkAppId            uint64                              `json:"SdkAppId"`
	RoomId              string                              `json:"RoomId"`
	RoomIdType          uint64                              `json:"RoomIdType"`
	UserId              string                              `json:"UserId"`
	UserSig             string                              `json:"UserSig"`
	ResourceExpiredHour uint64                              `json:"ResourceExpiredHour"`
	PrivateMapKey       string                              `json:"PrivateMapKey,omitempty"`
	RecordParams        createCloudRecordingRecordParams    `json:"RecordParams"`
	StorageParams       createCloudRecordingStorageParams   `json:"StorageParams"`
	MixLayoutParams     createCloudRecordingMixLayoutParams `json:"MixLayoutParams"`
	MixTranscodeParams  createCloudRecordingMixTransParams  `json:"MixTranscodeParams"`
}

type createCloudRecordingRecordParams struct {
	RecordMode  uint64 `json:"RecordMode"`
	MaxIdleTime uint64 `json:"MaxIdleTime"`
	StreamType  uint64 `json:"StreamType"`
}

type createCloudRecordingStorageParams struct {
	CloudVod createCloudRecordingCloudVod `json:"CloudVod"`
}

type createCloudRecordingCloudVod struct {
	TencentVod createCloudRecordingTencentVOD `json:"TencentVod"`
}

type createCloudRecordingTencentVOD struct {
	SubAppId   *uint64 `json:"SubAppId,omitempty"`
	ExpireTime uint64  `json:"ExpireTime"`
}

type createCloudRecordingMixLayoutParams struct {
	MixLayoutMode uint64 `json:"MixLayoutMode"`
}

type createCloudRecordingMixTransParams struct {
	VideoParams createCloudRecordingVideoParams `json:"VideoParams"`
}

type createCloudRecordingVideoParams struct {
	Width   uint64 `json:"Width"`
	Height  uint64 `json:"Height"`
	BitRate uint64 `json:"BitRate"`
	Fps     uint64 `json:"Fps"`
	Gop     uint64 `json:"Gop"`
}

type createCloudRecordingResponse struct {
	Response struct {
		TaskId    string `json:"TaskId"`
		RequestId string `json:"RequestId"`
	} `json:"Response"`
}

type stopCloudRecordingRequest struct {
	SdkAppId uint64 `json:"SdkAppId"`
	TaskId   string `json:"TaskId"`
}

type stopCloudRecordingResponse struct {
	Response struct {
		RequestId string `json:"RequestId"`
	} `json:"Response"`
}

type tencentCloudAPIResponse struct {
	Response struct {
		Error *struct {
			Code    string `json:"Code"`
			Message string `json:"Message"`
		} `json:"Error,omitempty"`
		RequestId string `json:"RequestId"`
	} `json:"Response"`
}

type recordingCallbackPayload struct {
	EventType int `json:"EventType"`
	EventInfo struct {
		TaskID  flexibleString `json:"TaskId"`
		Payload struct {
			Status      int                        `json:"Status"`
			ErrMsg      flexibleString             `json:"ErrMsg"`
			TencentVod  recordingCallbackVODInfo   `json:"TencentVod"`
			FileMessage []recordingCallbackFileMsg `json:"FileMessage"`
		} `json:"Payload"`
	} `json:"EventInfo"`
}

type recordingCallbackVODInfo struct {
	FileID   flexibleString `json:"FileId"`
	VideoURL flexibleString `json:"VideoUrl"`
}

type recordingCallbackFileMsg struct {
	FileName       flexibleString `json:"FileName"`
	StartTimeStamp flexibleInt64  `json:"StartTimeStamp"`
	EndTimeStamp   flexibleInt64  `json:"EndTimeStamp"`
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
	return &TRTCRecordingService{
		db:           db,
		trtcCfg:      trtcCfg,
		recordingCfg: recordingCfg,
		taskRepo:     taskRepo,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}, nil
}

func (s *TRTCRecordingService) CreateCloudRecordingForSession(ctx context.Context, session *model.ConsultSession) (*model.RecordingTask, error) {
	if err := s.ensureReady(); err != nil {
		return nil, err
	}
	if session == nil || session.ID == 0 {
		return nil, NewBizError(http.StatusBadRequest, "缺少有效会话，无法启动录制")
	}

	latestTask, err := s.taskRepo.WithDB(s.db.WithContext(ctx)).GetLatestBySessionID(session.ID)
	if err == nil && latestTask != nil {
		switch latestTask.Status {
		case model.RecordingTaskStatusRecording, model.RecordingTaskStatusStopping, model.RecordingTaskStatusFinished:
			// 已存在有效任务时直接复用，避免医生重复 start 时生成多条录制任务。
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

	requestBody := createCloudRecordingRequest{
		SdkAppId:            uint64(s.trtcCfg.SDKAppID),
		RoomId:              strconv.FormatInt(int64(session.RoomID), 10),
		RoomIdType:          trtcRecordingRoomIDTypeInt,
		UserId:              recordUserID,
		UserSig:             recordUserSig,
		ResourceExpiredHour: s.normalizeResourceExpiredHour(),
		RecordParams: createCloudRecordingRecordParams{
			RecordMode:  trtcRecordingRecordModeMix,
			MaxIdleTime: s.normalizeMaxIdleTime(),
			StreamType:  trtcRecordingStreamTypeAuto,
		},
		StorageParams: createCloudRecordingStorageParams{
			CloudVod: createCloudRecordingCloudVod{
				TencentVod: createCloudRecordingTencentVOD{
					SubAppId:   s.optionalVODSubAppID(),
					ExpireTime: s.normalizeVODExpireTime(),
				},
			},
		},
		MixLayoutParams: createCloudRecordingMixLayoutParams{
			MixLayoutMode: s.normalizeMixLayoutMode(),
		},
		MixTranscodeParams: createCloudRecordingMixTransParams{
			VideoParams: createCloudRecordingVideoParams{
				Width:   s.normalizeMixWidth(),
				Height:  s.normalizeMixHeight(),
				BitRate: s.normalizeMixBitrate(),
				Fps:     s.normalizeMixFPS(),
				Gop:     10,
			},
		},
	}

	var response createCloudRecordingResponse
	if err := s.invokeTRTCRestAPI(ctx, "CreateCloudRecording", requestBody, &response); err != nil {
		return nil, err
	}

	taskID := strings.TrimSpace(response.Response.TaskId)
	if taskID == "" {
		return nil, NewBizError(http.StatusBadGateway, "TRTC 录制创建成功但未返回 TaskId")
	}

	now := time.Now()
	task := &model.RecordingTask{
		SessionID:   session.ID,
		TaskID:      taskID,
		RecordMode:  model.RecordingTaskModeMixed,
		StorageType: model.RecordingTaskStorageVOD,
		Status:      model.RecordingTaskStatusRecording,
		StartedAt:   &now,
	}

	if err := HandleDBError(s.taskRepo.WithDB(s.db.WithContext(ctx)).Create(task), "录制任务创建失败，请稍后重试"); err != nil {
		return nil, err
	}

	return task, nil
}

func (s *TRTCRecordingService) StopCloudRecordingForSession(ctx context.Context, session *model.ConsultSession) (*model.RecordingTask, error) {
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
	case model.RecordingTaskStatusFinished, model.RecordingTaskStatusStopping:
		return task, nil
	}
	if strings.TrimSpace(task.TaskID) == "" {
		return task, nil
	}

	requestBody := stopCloudRecordingRequest{
		SdkAppId: uint64(s.trtcCfg.SDKAppID),
		TaskId:   task.TaskID,
	}

	var response stopCloudRecordingResponse
	if err := s.invokeTRTCRestAPI(ctx, "DeleteCloudRecording", requestBody, &response); err != nil {
		task.Status = model.RecordingTaskStatusFailed
		_ = s.taskRepo.WithDB(s.db.WithContext(ctx)).Update(task)
		return nil, err
	}

	now := time.Now()
	task.Status = model.RecordingTaskStatusStopping
	if task.EndedAt == nil {
		task.EndedAt = &now
	}
	if err := s.taskRepo.WithDB(s.db.WithContext(ctx)).Update(task); err != nil {
		return nil, err
	}

	return task, nil
}

func (s *TRTCRecordingService) HandleRecordingCallback(ctx context.Context, rawPayload []byte, headers http.Header) (*RecordingCallbackHandleResult, error) {
	// 当前先不对回调签名做校验，headers 参数预留给后续做来源校验与链路追踪。
	_ = headers

	var payload recordingCallbackPayload
	if err := json.Unmarshal(rawPayload, &payload); err != nil {
		return &RecordingCallbackHandleResult{
			TaskID:  "",
			Message: "录制回调报文解析失败，已忽略",
		}, nil
	}

	taskID := strings.TrimSpace(string(payload.EventInfo.TaskID))
	if taskID == "" {
		return &RecordingCallbackHandleResult{
			TaskID:  "",
			Message: "未携带 TaskId，已忽略",
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

	// 原始报文无论成功失败都保留，方便后续排查录制回调问题。
	task.RawCallback = string(rawPayload)

	switch payload.EventType {
	case 311:
		if payload.EventInfo.Payload.Status == 0 {
			task.Status = model.RecordingTaskStatusFinished
			task.FileID = strings.TrimSpace(string(payload.EventInfo.Payload.TencentVod.FileID))
			task.VideoURL = strings.TrimSpace(string(payload.EventInfo.Payload.TencentVod.VideoURL))
			task.FileName = firstNonEmpty(task.FileName, extractCallbackFileName(payload.EventInfo.Payload.FileMessage))
			task.EndedAt = firstNonNilTime(task.EndedAt, extractCallbackEndedAt(payload.EventInfo.Payload.FileMessage), timePtr(time.Now()))
		} else {
			task.Status = model.RecordingTaskStatusFailed
		}
	case 310:
		task.FileName = firstNonEmpty(task.FileName, extractCallbackFileName(payload.EventInfo.Payload.FileMessage))
		task.EndedAt = firstNonNilTime(task.EndedAt, extractCallbackEndedAt(payload.EventInfo.Payload.FileMessage))
		if payload.EventInfo.Payload.Status != 0 {
			task.Status = model.RecordingTaskStatusFailed
		}
	default:
		// 其他事件类型先只落原始报文，避免因为未知事件打断回调链路。
	}

	if err := s.taskRepo.WithDB(s.db.WithContext(ctx)).Update(task); err != nil {
		return nil, err
	}

	return &RecordingCallbackHandleResult{
		TaskID:  taskID,
		Message: "录制回调处理成功",
	}, nil
}

func (s *TRTCRecordingService) GetRecordingInfo(ctx context.Context, sessionID uint64) (*RecordingTaskInfo, error) {
	if s.taskRepo == nil {
		return nil, nil
	}

	task, err := s.taskRepo.WithDB(s.db.WithContext(ctx)).GetLatestBySessionID(sessionID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return &RecordingTaskInfo{
		Status:    task.Status,
		TaskID:    task.TaskID,
		FileID:    task.FileID,
		VideoURL:  task.VideoURL,
		StartedAt: task.StartedAt,
		EndedAt:   task.EndedAt,
	}, nil
}

func (s *TRTCRecordingService) invokeTRTCRestAPI(ctx context.Context, action string, payload any, out any) error {
	if s.httpClient == nil {
		s.httpClient = &http.Client{Timeout: 10 * time.Second}
	}

	requestBody, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	timestamp := time.Now().Unix()
	authorization := s.buildTC3Authorization(action, requestBody, timestamp)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, trtcRecordingEndpoint, bytes.NewReader(requestBody))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", authorization)
	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	req.Header.Set("Host", trtcRecordingHost)
	req.Header.Set("X-TC-Action", action)
	req.Header.Set("X-TC-Timestamp", strconv.FormatInt(timestamp, 10))
	req.Header.Set("X-TC-Version", trtcRecordingVersion)
	req.Header.Set("X-TC-Region", s.recordingCfg.Region)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode != http.StatusOK {
		return NewBizError(http.StatusBadGateway, fmt.Sprintf("TRTC %s 请求失败: HTTP %d", action, resp.StatusCode))
	}

	var apiResponse tencentCloudAPIResponse
	if err := json.Unmarshal(responseBody, &apiResponse); err != nil {
		return err
	}
	if apiResponse.Response.Error != nil {
		return NewBizError(http.StatusBadGateway, fmt.Sprintf("TRTC %s 失败: %s(%s)", action, apiResponse.Response.Error.Message, apiResponse.Response.Error.Code))
	}

	if out == nil {
		return nil
	}

	return json.Unmarshal(responseBody, out)
}

func (s *TRTCRecordingService) buildTC3Authorization(action string, requestBody []byte, timestamp int64) string {
	// 这里按腾讯云 API3-TC3-HMAC-SHA256 规则手动签名，确保录制走的是 RESTful API 链路。
	date := time.Unix(timestamp, 0).UTC().Format("2006-01-02")
	canonicalHeaders := "content-type:application/json; charset=utf-8\n" +
		"host:" + trtcRecordingHost + "\n" +
		"x-tc-action:" + strings.ToLower(action) + "\n"
	signedHeaders := "content-type;host;x-tc-action"

	hashedPayload := sha256Hex(requestBody)
	canonicalRequest := strings.Join([]string{
		http.MethodPost,
		"/",
		"",
		canonicalHeaders,
		signedHeaders,
		hashedPayload,
	}, "\n")

	credentialScope := date + "/" + trtcRecordingServiceName + "/tc3_request"
	stringToSign := strings.Join([]string{
		trtcRecordingAlgorithm,
		strconv.FormatInt(timestamp, 10),
		credentialScope,
		sha256Hex([]byte(canonicalRequest)),
	}, "\n")

	secretDate := hmacSHA256([]byte("TC3"+s.recordingCfg.SecretKey), date)
	secretService := hmacSHA256(secretDate, trtcRecordingServiceName)
	secretSigning := hmacSHA256(secretService, "tc3_request")
	signature := hex.EncodeToString(hmacSHA256(secretSigning, stringToSign))

	return fmt.Sprintf("%s Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		trtcRecordingAlgorithm,
		s.recordingCfg.SecretID,
		credentialScope,
		signedHeaders,
		signature,
	)
}

func (s *TRTCRecordingService) ensureReady() error {
	if !s.recordingCfg.Enabled {
		return NewBizError(http.StatusServiceUnavailable, "TRTC 录制能力未开启")
	}
	if s.recordingCfg.SecretID == "" || s.recordingCfg.SecretKey == "" {
		return NewBizError(http.StatusInternalServerError, "TRTC 录制 REST API 密钥未配置")
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

func (s *TRTCRecordingService) normalizeResourceExpiredHour() uint64 {
	if s.recordingCfg.ResourceExpiredHour > 0 {
		return uint64(s.recordingCfg.ResourceExpiredHour)
	}
	return 72
}

func (s *TRTCRecordingService) normalizeMaxIdleTime() uint64 {
	if s.recordingCfg.MaxIdleTime > 0 {
		return uint64(s.recordingCfg.MaxIdleTime)
	}
	return 30
}

func (s *TRTCRecordingService) normalizeMixWidth() uint64 {
	if s.recordingCfg.MixWidth > 0 {
		return uint64(s.recordingCfg.MixWidth)
	}
	return 720
}

func (s *TRTCRecordingService) normalizeMixHeight() uint64 {
	if s.recordingCfg.MixHeight > 0 {
		return uint64(s.recordingCfg.MixHeight)
	}
	return 1280
}

func (s *TRTCRecordingService) normalizeMixFPS() uint64 {
	if s.recordingCfg.MixFPS > 0 {
		return uint64(s.recordingCfg.MixFPS)
	}
	return 15
}

func (s *TRTCRecordingService) normalizeMixBitrate() uint64 {
	bitRate := s.recordingCfg.MixBitrate
	if bitRate <= 0 {
		return 1200000
	}

	// 环境变量更便于按 kbps 录入，因此当数值较小时自动转成 bps。
	if bitRate < 64000 {
		return uint64(bitRate * 1000)
	}
	return uint64(bitRate)
}

func (s *TRTCRecordingService) normalizeMixLayoutMode() uint64 {
	if s.recordingCfg.MixLayoutMode > 0 {
		return uint64(s.recordingCfg.MixLayoutMode)
	}
	return 3
}

func (s *TRTCRecordingService) normalizeVODExpireTime() uint64 {
	if s.recordingCfg.VODExpireTime > 0 {
		return uint64(s.recordingCfg.VODExpireTime)
	}
	return 0
}

func (s *TRTCRecordingService) optionalVODSubAppID() *uint64 {
	if s.recordingCfg.VODSubAppID == 0 {
		return nil
	}
	value := s.recordingCfg.VODSubAppID
	return &value
}

func extractCallbackFileName(fileMessages []recordingCallbackFileMsg) string {
	for _, item := range fileMessages {
		if value := strings.TrimSpace(string(item.FileName)); value != "" {
			return value
		}
	}
	return ""
}

func extractCallbackEndedAt(fileMessages []recordingCallbackFileMsg) *time.Time {
	for _, item := range fileMessages {
		if item.EndTimeStamp > 0 {
			// TRTC 录制回调中的时间戳字段为毫秒时间戳。
			timestamp := time.UnixMilli(int64(item.EndTimeStamp))
			return &timestamp
		}
	}
	return nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if text := strings.TrimSpace(value); text != "" {
			return text
		}
	}
	return ""
}

func firstNonNilTime(values ...*time.Time) *time.Time {
	for _, value := range values {
		if value != nil {
			return value
		}
	}
	return nil
}

func timePtr(value time.Time) *time.Time {
	return &value
}

func sha256Hex(data []byte) string {
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}

func hmacSHA256(key []byte, msg string) []byte {
	mac := hmac.New(sha256.New, key)
	_, _ = mac.Write([]byte(msg))
	return mac.Sum(nil)
}
