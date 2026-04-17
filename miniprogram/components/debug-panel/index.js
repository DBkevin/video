const debugLog = require('../../utils/debug-log')

Component({
  properties: {
    pageName: {
      type: String,
      value: ''
    }
  },

  data: {
    expanded: true,
    logs: []
  },

  lifetimes: {
    attached() {
      this.unsubscribe = debugLog.subscribe((logs) => {
        this.setData({
          logs
        })
      })
    },

    detached() {
      if (this.unsubscribe) {
        this.unsubscribe()
        this.unsubscribe = null
      }
    }
  },

  methods: {
    handleToggle() {
      this.setData({
        expanded: !this.data.expanded
      })
    },

    handleClear() {
      debugLog.clearLogs()
      wx.showToast({
        title: '日志已清空',
        icon: 'success'
      })
    },

    handleCopy() {
      const text = debugLog.getLogText()
      if (!text) {
        wx.showToast({
          title: '暂无可复制日志',
          icon: 'none'
        })
        return
      }

      wx.setClipboardData({
        data: text
      })
    }
  }
})
