const { callFunction } = require("../../../utils/cloud");
const {
  ORDER_STATUS_TEXT,
  TEMPLATE_NEW_ORDER_ID,
} = require("../../../utils/constants");

Page({
  data: {
    tabs: [
      { key: "all", name: "全部" },
      { key: "pending", name: "待接单" },
      { key: "accepted", name: "已接单" },
      { key: "completed", name: "已完成" },
      { key: "cancelled", name: "已取消" },
    ],
    activeTab: "all",
    orders: [],
    loading: false,
    statusText: ORDER_STATUS_TEXT,
  },

  onShow() {
    this.loadOrders();
  },

  onTabChange(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ activeTab: key });
    this.loadOrders();
  },

  loadOrders() {
    var that = this;
    this.setData({ loading: true });
    const params = { role: "merchant" };
    if (this.data.activeTab !== "all") {
      params.status = this.data.activeTab;
    }
    callFunction("getOrders", params)
      .then(function (res) {
        that.setData({
          loading: false,
          orders: (res && res.success && res.orders) || [],
        });
        if (res && !res.success) {
          wx.showToast({ title: res.errMsg || "加载失败", icon: "none" });
        }
      })
      .catch(function () {
        that.setData({ loading: false, orders: [] });
      });
  },

  subscribeNotice() {
    wx.requestSubscribeMessage({
      tmplIds: [TEMPLATE_NEW_ORDER_ID],
      complete: function () {},
    });
  },

  onAccept(e) {
    this.updateStatus(e.currentTarget.dataset.id, "accepted");
  },

  onComplete(e) {
    this.updateStatus(e.currentTarget.dataset.id, "completed");
  },

  onCancel(e) {
    var that = this;
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: "取消订单",
      content: "确定要取消该订单吗？",
      success: function (res) {
        if (res.confirm) {
          that.updateStatus(id, "cancelled");
        }
      },
    });
  },

  updateStatus(orderId, status) {
    var that = this;
    wx.showLoading({ title: "处理中", mask: true });
    callFunction("updateOrderStatus", { orderId: orderId, status: status })
      .then(function (res) {
        wx.hideLoading();
        if (res && res.success) {
          wx.showToast({ title: "操作成功", icon: "success" });
          that.loadOrders();
        } else {
          wx.showToast({
            title: (res && res.errMsg) || "操作失败",
            icon: "none",
          });
        }
      })
      .catch(function () {
        wx.hideLoading();
        wx.showToast({ title: "网络异常", icon: "none" });
      });
  },
});
