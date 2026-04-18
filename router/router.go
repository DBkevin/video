package router

import (
	"net/http"

	"video-consult-mvp/config"
	"video-consult-mvp/controller"
	"video-consult-mvp/middleware"
	jwtpkg "video-consult-mvp/pkg/jwt"
	"video-consult-mvp/pkg/wechat"
	"video-consult-mvp/repository"
	"video-consult-mvp/service"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

func NewRouter(cfg *config.Config, db *gorm.DB, rdb *redis.Client) *gin.Engine {
	engine := gin.New()
	engine.Use(gin.Logger(), middleware.Recovery())

	jwtManager := jwtpkg.NewManager(cfg.JWT)
	authMiddleware := middleware.NewAuthMiddleware(jwtManager)

	userRepo := repository.NewUserRepository(db)
	doctorRepo := repository.NewDoctorRepository(db)
	adminRepo := repository.NewAdminUserRepository(db)
	employeeRepo := repository.NewEmployeeRepository(db)
	employeeAccountRepo := repository.NewEmployeeWechatAccountRepository(db)
	employeeBindRequestRepo := repository.NewEmployeeBindRequestRepository(db)
	doctorEmployeeRelationRepo := repository.NewDoctorEmployeeRelationRepository(db)
	sessionRepo := repository.NewConsultSessionRepository(db)
	recordRepo := repository.NewConsultRecordRepository(db)
	recordingTaskRepo := repository.NewRecordingTaskRepository(db)
	sessionLogRepo := repository.NewSessionLogRepository(db)
	miniProgramClient := wechat.NewMiniProgramClient(cfg.WeChat)

	authService := service.NewAuthService(userRepo, doctorRepo, jwtManager, miniProgramClient)
	rtcService := service.NewRTCService(cfg.TRTC, rdb)
	recordingService, err := service.NewTRTCRecordingService(db, cfg.TRTC, cfg.TRTCRecording, recordingTaskRepo)
	if err != nil {
		panic(err)
	}
	consultService := service.NewConsultService(db, cfg.Consult, userRepo, doctorRepo, employeeRepo, sessionRepo, recordRepo, sessionLogRepo, rtcService, recordingService)
	employeeService := service.NewEmployeeService(db, employeeRepo, employeeAccountRepo, employeeBindRequestRepo, doctorEmployeeRelationRepo, doctorRepo, jwtManager, miniProgramClient, consultService)
	adminService := service.NewAdminService(db, adminRepo, employeeRepo, employeeAccountRepo, employeeBindRequestRepo, doctorRepo, doctorEmployeeRelationRepo, jwtManager, consultService)

	authController := controller.NewAuthController(authService)
	consultController := controller.NewConsultController(consultService)
	rtcController := controller.NewRTCController(rtcService)
	recordingController := controller.NewRecordingController(recordingService)
	employeeController := controller.NewEmployeeController(employeeService)
	adminController := controller.NewAdminController(adminService)

	engine.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "ok"})
	})

	api := engine.Group("/api/v1")
	{
		authGroup := api.Group("/auth")
		authGroup.POST("/user/login", authController.UserLogin)
		authGroup.POST("/doctor/login", authController.DoctorLogin)
		authGroup.POST("/wx-login", authController.WXLogin)

		adminAuthGroup := api.Group("/admin/auth")
		adminAuthGroup.POST("/login", adminController.Login)

		employeeAuthGroup := api.Group("/employee/auth")
		employeeAuthGroup.POST("/wx-login", employeeController.WXLogin)

		rtcGroup := api.Group("/rtc", authMiddleware.Handle())
		rtcGroup.POST("/usersig", rtcController.GenerateUserSig)

		api.POST("/trtc/recording/callback", recordingController.HandleTRTCRecordingCallback)

		api.GET("/consult-entry", consultController.GetConsultEntry)

		userConsultGroup := api.Group("/consult-sessions", authMiddleware.Handle(), authMiddleware.RequireRole("user"))
		userConsultGroup.POST("/:id/join", consultController.JoinConsultSession)
		userConsultGroup.POST("/:id/leave", consultController.LeaveConsultSession)

		doctorConsultGroup := api.Group("/consult-sessions", authMiddleware.Handle(), authMiddleware.RequireRole("doctor"))
		doctorConsultGroup.POST("", consultController.CreateConsultSession)
		doctorConsultGroup.GET("/:id", consultController.GetConsultSession)
		doctorConsultGroup.POST("/:id/share", consultController.ShareConsultSession)
		doctorConsultGroup.POST("/:id/start", consultController.StartConsultSession)
		doctorConsultGroup.POST("/:id/finish", consultController.FinishConsultSession)
		doctorConsultGroup.POST("/:id/cancel", consultController.CancelConsultSession)

		employeeGroup := api.Group("/employee", authMiddleware.Handle())
		employeeGroup.GET("/bind-status", authMiddleware.RequireRoles(service.EmployeeTokenRoleBound, service.EmployeeTokenRolePending, service.EmployeeTokenRoleGuest), employeeController.GetBindStatus)
		employeeGroup.POST("/bind-request", authMiddleware.RequireRoles(service.EmployeeTokenRoleBound, service.EmployeeTokenRolePending, service.EmployeeTokenRoleGuest), employeeController.SubmitBindRequest)
		employeeGroup.GET("/doctors", authMiddleware.RequireRole(service.EmployeeTokenRoleBound), employeeController.GetDoctors)
		employeeGroup.POST("/consult-sessions", authMiddleware.RequireRole(service.EmployeeTokenRoleBound), employeeController.CreateConsultSession)
		employeeGroup.GET("/consult-sessions", authMiddleware.RequireRole(service.EmployeeTokenRoleBound), employeeController.ListConsultSessions)
		employeeGroup.GET("/consult-sessions/:id", authMiddleware.RequireRole(service.EmployeeTokenRoleBound), employeeController.GetConsultSession)

		adminGroup := api.Group("/admin", authMiddleware.Handle(), authMiddleware.RequireRole("admin"))
		adminGroup.GET("/employees", adminController.ListEmployees)
		adminGroup.POST("/employees", adminController.CreateEmployee)
		adminGroup.PUT("/employees/:id", adminController.UpdateEmployee)
		adminGroup.GET("/employee-bind-requests", adminController.ListBindRequests)
		adminGroup.POST("/employee-bind-requests/:id/approve", adminController.ApproveBindRequest)
		adminGroup.POST("/employee-bind-requests/:id/reject", adminController.RejectBindRequest)
		adminGroup.GET("/doctors", adminController.ListDoctors)
		adminGroup.POST("/doctors", adminController.CreateDoctor)
		adminGroup.PUT("/doctors/:id", adminController.UpdateDoctor)
		adminGroup.GET("/doctor-employee-relations", adminController.ListDoctorEmployeeRelations)
		adminGroup.POST("/doctor-employee-relations", adminController.CreateDoctorEmployeeRelation)
		adminGroup.DELETE("/doctor-employee-relations/:id", adminController.DeleteDoctorEmployeeRelation)
		adminGroup.GET("/consult-sessions", adminController.ListConsultSessions)
		adminGroup.GET("/consult-sessions/:id", adminController.GetConsultSession)
	}

	return engine
}
