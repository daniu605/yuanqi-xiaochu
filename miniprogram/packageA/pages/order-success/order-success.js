Page({
  data: {
    orderNo: "",
    orderTime: "",
    orderItems: [],
    remark: "",
    address: null,
    totalAmount: 0,
    showToast: false,
    toastMessage: "",
  },

  onLoad: function () {
    const order = wx.getStorageSync("lastOrder") || {};
    this.setData({
      orderNo: order.orderNo || "",
      orderTime: order.createTime || new Date().toLocaleString(),
      orderItems: order.items || [],
      remark: order.remark || "",
      address: order.address || null,
      totalAmount: order.totalAmount || 0,
    });
  },

  backToHome: function () {
    wx.reLaunch({ url: "/pages/index/index" });
  },

  goMyOrders: function () {
    wx.redirectTo({ url: "/packageA/pages/my-orders/my-orders" });
  },
});
