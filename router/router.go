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
	sessionRepo := repository.NewConsultSessionRepository(db)
	recordRepo := repository.NewConsultRecordRepository(db)
	miniProgramClient := wechat.NewMiniProgramClient(cfg.WeChat)

	authService := service.NewAuthService(userRepo, doctorRepo, jwtManager, miniProgramClient)
	rtcService := service.NewRTCService(cfg.TRTC, rdb)
	consultService := service.NewConsultService(db, cfg.Consult, userRepo, doctorRepo, sessionRepo, recordRepo, rtcService)

	authController := controller.NewAuthController(authService)
	consultController := controller.NewConsultController(consultService)
	rtcController := controller.NewRTCController(rtcService)

	engine.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "ok"})
	})

	api := engine.Group("/api/v1")
	{
		authGroup := api.Group("/auth")
		authGroup.POST("/user/login", authController.UserLogin)
		authGroup.POST("/doctor/login", authController.DoctorLogin)
		authGroup.POST("/wx-login", authController.WXLogin)

		rtcGroup := api.Group("/rtc", authMiddleware.Handle())
		rtcGroup.POST("/usersig", rtcController.GenerateUserSig)

		api.GET("/consult-entry", consultController.GetConsultEntry)

		userConsultGroup := api.Group("/consult-sessions", authMiddleware.Handle(), authMiddleware.RequireRole("user"))
		userConsultGroup.POST("/:id/join", consultController.JoinConsultSession)

		doctorConsultGroup := api.Group("/consult-sessions", authMiddleware.Handle(), authMiddleware.RequireRole("doctor"))
		doctorConsultGroup.POST("", consultController.CreateConsultSession)
		doctorConsultGroup.GET("/:id", consultController.GetConsultSession)
		doctorConsultGroup.POST("/:id/share", consultController.ShareConsultSession)
		doctorConsultGroup.POST("/:id/start", consultController.StartConsultSession)
		doctorConsultGroup.POST("/:id/finish", consultController.FinishConsultSession)
	}

	return engine
}
