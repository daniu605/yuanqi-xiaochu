const { callFunction } = require("../../../utils/cloud");
const {
  TEMPLATE_NEW_ORDER_ID,
  TEMPLATE_ORDER_STATUS_ID,
} = require("../../../utils/constants");

Page({
  data: {
    cartList: [],
    totalCount: 0,
    remark: "",
    loading: false,
    toastVisible: false,
    toastContent: "",
    address: null,
  },

  onLoad() {
    this.loadCartData();
  },

  onShow() {
    this.loadCartData();
    this.loadAddress();
  },

  // 加载收货地址：优先用地址页选中的，否则取默认地址
  loadAddress() {
    var that = this;
    const chosen = wx.getStorageSync("checkoutAddress");
    if (chosen && chosen._id) {
      this.setData({ address: chosen });
      return;
    }
    callFunction("manageAddress", { action: "list" })
      .then(function (res) {
        if (res && res.success && res.addresses && res.addresses.length) {
          const def =
            res.addresses.find(function (a) {
              return a.isDefault;
            }) || res.addresses[0];
          that.setData({ address: def });
        } else {
          that.setData({ address: null });
        }
      })
      .catch(function () {
        that.setData({ address: null });
      });
  },

  // 去地址页选择/新增用餐位置
  goAddress() {
    wx.navigateTo({ url: "/packageA/pages/address/address?select=1" });
  },

  loadCartData() {
    const cartList = wx.getStorageSync("cartList") || [];
    const totalCount = cartList.reduce(function (sum, item) {
      return sum + item.count;
    }, 0);
    this.setData({ cartList: cartList, totalCount: totalCount });
  },

  increaseCount(e) {
    const index = e.currentTarget.dataset.index;
    let cartList = this.data.cartList;
    cartList[index].count += 1;
    this.updateCart(cartList);
  },

  decreaseCount(e) {
    const index = e.currentTarget.dataset.index;
    let cartList = this.data.cartList;
    if (cartList[index].count > 1) {
      cartList[index].count -= 1;
      this.updateCart(cartList);
    } else {
      this.removeItem(index);
    }
  },

  removeItem(index) {
    let cartList = this.data.cartList;
    cartList.splice(index, 1);
    this.updateCart(cartList);
  },

  updateCart(cartList) {
    const totalCount = cartList.reduce(function (sum, item) {
      return sum + item.count;
    }, 0);
    this.setData({ cartList: cartList, totalCount: totalCount });
    wx.setStorageSync("cartList", cartList);
  },

  clearCart() {
    this.setData({ cartList: [], totalCount: 0 });
    wx.setStorageSync("cartList", []);
    this.showCustomToast("选菜清单已清空");
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  // 提交订单：地址校验 + 防重复点击 + 60秒冷却 + 订阅消息授权
  submitOrder() {
    // 提交中锁定，防止连点
    if (this.data.loading) {
      return;
    }
    if (this.data.cartList.length === 0) {
      return this.showCustomToast("先选几道想吃的菜吧");
    }
    if (!this.data.address) {
      this.showCustomToast("请先填写用餐位置");
      return this.goAddress();
    }
    // 60秒内防重复提交
    const lastSubmitTs = wx.getStorageSync("lastSubmitTs") || 0;
    if (Date.now() - lastSubmitTs < 60 * 1000) {
      return this.showCustomToast("刚提交过啦，1分钟内不用重复提交");
    }
    var that = this;
    wx.requestSubscribeMessage({
      tmplIds: [TEMPLATE_NEW_ORDER_ID, TEMPLATE_ORDER_STATUS_ID],
      complete: function () {
        that.processOrder();
      },
    });
  },

  processOrder() {
    this.setData({ loading: true });
    var that = this;
    const items = this.data.cartList;
    const address = this.data.address;
    callFunction("sendOrderNotification", {
      items: items,
      remark: this.data.remark,
      address: {
        name: address.name,
        phone: address.phone,
        address: address.address,
      },
    })
      .then(function (res) {
        that.setData({ loading: false });
        if (res && res.success) {
          wx.setStorageSync("lastSubmitTs", Date.now());
          wx.setStorageSync(
            "lastOrder",
            {
              orderNo: res.orderNo,
              items: items,
              remark: that.data.remark,
              address: {
                name: address.name,
                phone: address.phone,
                address: address.address,
              },
              createTime: new Date().toLocaleString(),
            }
          );
          wx.setStorageSync("cartList", []);
          wx.removeStorageSync("checkoutAddress");
          wx.showToast({ title: "提交成功", icon: "success", duration: 800 });
          setTimeout(function () {
            wx.redirectTo({
              url: "/packageA/pages/order-success/order-success",
            });
          }, 800);
        } else {
          that.showCustomToast((res && res.errMsg) || "下单失败，请重试");
        }
      })
      .catch(function (err) {
        that.setData({ loading: false });
        console.error("下单失败详情", err);
        const detail =
          (err && (err.errMsg || err.message)) || "未知错误";
        wx.showModal({
          title: "下单失败(" + ((err && err.errCode) || "?") + ")",
          content: detail,
          showCancel: false,
        });
      });
  },

  showCustomToast(content) {
    this.setData({ toastVisible: true, toastContent: content });
    var that = this;
    setTimeout(function () {
      that.setData({ toastVisible: false });
    }, 2000);
  },

  goHome() {
    wx.reLaunch({ url: "/pages/index/index" });
  },
});
