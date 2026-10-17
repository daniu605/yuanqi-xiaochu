const { callFunction } = require("../../../utils/cloud");
const { TEMPLATE_NEW_ORDER_ID } = require("../../../utils/constants");

Page({
  data: {
    checking: true,
    // RBAC 状态
    hasOwner: false, // 是否已有商家初始化过
    isAdmin: false, // 当前用户是否为后台成员
    role: "", // owner / staff
    inviteCode: "", // 邀请码（仅owner可见）
    members: [], // 成员列表（仅owner展示）
    joinCode: "", // 非管理员输入的邀请码
  },

  onLoad() {
    this.refresh();
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    var that = this;
    callFunction("checkMerchant")
      .then(function (res) {
        if (!(res && res.success)) {
          that.setData({ checking: false, hasOwner: false, isAdmin: false });
          return;
        }
        that.setData({
          checking: false,
          hasOwner: !!res.hasOwner,
          isAdmin: !!res.isMerchant,
          role: res.role || "",
        });
        if (res.isMerchant) {
          that.loadMembers();
        }
      })
      .catch(function () {
        that.setData({ checking: false, hasOwner: false, isAdmin: false });
      });
  },

  // 加载成员列表与邀请码
  loadMembers() {
    var that = this;
    callFunction("manageAdmin", { action: "list" })
      .then(function (res) {
        if (res && res.success) {
          that.setData({
            members: res.members || [],
            inviteCode: res.inviteCode || "",
          });
        }
      })
      .catch(function () {});
  },

  // 初始化数据（首次使用时调用，调用者成为 owner）
  initData() {
    var that = this;
    wx.showModal({
      title: "初始化数据",
      content:
        "将创建数据库集合并导入默认菜单，首次初始化者将成为掌勺人（owner）。是否继续？",
      success: function (res) {
        if (!res.confirm) return;
        wx.showLoading({ title: "初始化中", mask: true });
        callFunction("initData")
          .then(function (r) {
            wx.hideLoading();
            wx.showToast({
              title: (r && r.message) || "初始化完成",
              icon: "none",
              duration: 2500,
            });
            that.refresh();
          })
          .catch(function () {
            wx.hideLoading();
            wx.showToast({ title: "初始化失败", icon: "none" });
          });
      },
    });
  },

  onJoinCodeInput(e) {
    this.setData({ joinCode: e.detail.value });
  },

  // 凭邀请码加入后台
  joinByInvite() {
    var that = this;
    const code = this.data.joinCode;
    if (!code) {
      return wx.showToast({ title: "请输入邀请码", icon: "none" });
    }
    wx.showLoading({ title: "验证中", mask: true });
    callFunction("manageAdmin", { action: "joinByInvite", code: code })
      .then(function (res) {
        wx.hideLoading();
        if (res && res.success) {
          wx.showToast({ title: "已加入后台", icon: "success" });
          that.refresh();
        } else {
          wx.showToast({
            title: (res && res.errMsg) || "加入失败",
            icon: "none",
          });
        }
      })
      .catch(function () {
        wx.hideLoading();
        wx.showToast({ title: "网络异常", icon: "none" });
      });
  },

  // 移除成员（仅owner）
  removeMember(e) {
    var that = this;
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: "移除成员",
      content: "确定要将该成员移出后台吗？",
      success: function (res) {
        if (!res.confirm) return;
        callFunction("manageAdmin", { action: "remove", _id: id }).then(
          function (r) {
            if (r && r.success) {
              wx.showToast({ title: "已移除", icon: "success" });
              that.loadMembers();
            } else {
              wx.showToast({
                title: (r && r.errMsg) || "移除失败",
                icon: "none",
              });
            }
          }
        );
      },
    });
  },

  copyInviteCode() {
    if (!this.data.inviteCode) return;
    wx.setClipboardData({ data: this.data.inviteCode });
  },

  // 订阅新订单通知（商家接收下单提醒）
  subscribeNotice() {
    wx.requestSubscribeMessage({
      tmplIds: [TEMPLATE_NEW_ORDER_ID],
      complete: function () {},
    });
  },

  goOrders() {
    wx.navigateTo({ url: "/packageB/pages/admin-orders/admin-orders" });
  },

  goDishes() {
    wx.navigateTo({ url: "/packageB/pages/admin-dishes/admin-dishes" });
  },

  goHome() {
    wx.reLaunch({ url: "/pages/index/index" });
  },
});
