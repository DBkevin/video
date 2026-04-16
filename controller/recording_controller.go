package controller

import (
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
		response.BadRequest(c, "读取录制回调失败")
		return
	}

	result, err := ctl.recordingService.HandleRecordingCallback(c.Request.Context(), rawPayload)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, fallbackMessage(result.Message, "录制回调处理成功"), result)
}
