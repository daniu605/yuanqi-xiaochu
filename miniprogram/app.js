/**
 * 小程序入口
 * 启动时初始化微信云开发环境，并在全局数据中缓存环境 ID 与用户身份。
 * 注意：openid / isMerchant 由各页面按需通过云函数（getOpenId / checkMerchant）获取后回填。
 */
App({
  onLaunch: function () {
    // 基础库 2.2.3 起才提供 wx.cloud 能力
    if (!wx.cloud) {
      console.error("使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: "cloud1-d5gyoiv955ef52486",
        traceUser: true,
      });
    }

    // 全局共享数据：环境 ID 与当前用户身份缓存
    this.globalData = {
      env: "cloud1-d5gyoiv955ef52486",
      openid: "",
      isMerchant: false,
    };
  },
});
