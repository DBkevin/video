package controller

import (
	"net/http"

	"video-consult-mvp/pkg/response"
	"video-consult-mvp/service"

	"github.com/gin-gonic/gin"
)

type RecordingController struct {
	recordingService *service.TRTCRecordingService
}

func NewRecordingController(recordingService *service.TRTCRecordingService) *RecordingController {
	return &RecordingController{recordingService: recordingService}
}

func (ctl *RecordingController) HandleTRTCRecordingCallback(c *gin.Context) {
	rawPayload, err := c.GetRawData()
	if err != nil {
		response.JSON(c, http.StatusOK, "读取录制回调失败，已忽略", gin.H{"handled": false, "task_id": ""})
		return
	}

	result, err := ctl.recordingService.HandleRecordingCallback(c.Request.Context(), rawPayload, c.Request.Header)
	if err != nil {
		// 录制回调接口要求始终返回 HTTP 200，避免腾讯云因为非 200 状态反复重试。
		response.JSON(c, http.StatusOK, err.Error(), gin.H{"handled": false, "task_id": ""})
		return
	}

	response.JSON(c, http.StatusOK, fallbackMessage(result.Message, "录制回调处理成功"), result)
}
