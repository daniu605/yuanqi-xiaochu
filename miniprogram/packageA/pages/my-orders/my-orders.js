const { callFunction } = require("../../../utils/cloud");
const { ORDER_STATUS_TEXT } = require("../../../utils/constants");

Page({
  data: {
    orders: [],
    loading: true,
    statusText: ORDER_STATUS_TEXT,
  },

  onShow() {
    this.loadOrders();
  },

  loadOrders() {
    var that = this;
    this.setData({ loading: true });
    callFunction("getOrders", { role: "user" })
      .then(function (res) {
        that.setData({
          loading: false,
          orders: (res && res.success && res.orders) || [],
        });
      })
      .catch(function () {
        that.setData({ loading: false, orders: [] });
      });
  },

  goHome() {
    wx.reLaunch({ url: "/pages/index/index" });
  },
});
