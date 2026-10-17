const { callFunction } = require("../../../utils/cloud");

Page({
  data: {
    addresses: [],
    loading: true,
    selectMode: false,
    showForm: false,
    isEdit: false,
    saving: false,
    form: {
      _id: "",
      name: "",
      phone: "",
      address: "",
      isDefault: false,
    },
  },

  onLoad(query) {
    this.setData({ selectMode: query.select === "1" });
  },

  onShow() {
    this.loadList();
  },

  loadList() {
    var that = this;
    this.setData({ loading: true });
    callFunction("manageAddress", { action: "list" })
      .then(function (res) {
        that.setData({
          loading: false,
          addresses: (res && res.success && res.addresses) || [],
        });
      })
      .catch(function (err) {
        console.error("地址列表加载失败详情", err);
        that.setData({ loading: false, addresses: [] });
      });
  },

  // 选择模式下：点地址卡片即选中并返回
  onItemTap(e) {
    if (!this.data.selectMode) return;
    const item = e.currentTarget.dataset.item;
    wx.setStorageSync("checkoutAddress", item);
    wx.navigateBack();
  },

  onAdd() {
    this.setData({
      showForm: true,
      isEdit: false,
      form: { _id: "", name: "", phone: "", address: "", isDefault: false },
    });
  },

  onEdit(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      showForm: true,
      isEdit: true,
      form: {
        _id: item._id,
        name: item.name,
        phone: item.phone,
        address: item.address,
        isDefault: !!item.isDefault,
      },
    });
  },

  onDelete(e) {
    var that = this;
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: "删除地址",
      content: "确定要删除该地址吗？",
      success: function (res) {
        if (!res.confirm) return;
        callFunction("manageAddress", { action: "remove", _id: id }).then(
          function (r) {
            if (r && r.success) {
              // 若删除的是当前选中的下单地址，同步清除
              const chosen = wx.getStorageSync("checkoutAddress");
              if (chosen && chosen._id === id) {
                wx.removeStorageSync("checkoutAddress");
              }
              wx.showToast({ title: "已删除", icon: "success" });
              that.loadList();
            } else {
              wx.showToast({
                title: (r && r.errMsg) || "删除失败",
                icon: "none",
              });
            }
          }
        );
      },
    });
  },

  onSetDefault(e) {
    var that = this;
    const id = e.currentTarget.dataset.id;
    callFunction("manageAddress", { action: "setDefault", _id: id }).then(
      function (r) {
        if (r && r.success) {
          wx.showToast({ title: "已设为默认", icon: "success" });
          that.loadList();
        } else {
          wx.showToast({ title: (r && r.errMsg) || "操作失败", icon: "none" });
        }
      }
    );
  },

  closeForm() {
    this.setData({ showForm: false });
  },

  onNameInput(e) {
    this.setData({ "form.name": e.detail.value });
  },

  onPhoneInput(e) {
    this.setData({ "form.phone": e.detail.value });
  },

  onAddrInput(e) {
    this.setData({ "form.address": e.detail.value });
  },

  onDefaultChange(e) {
    this.setData({ "form.isDefault": e.detail.value });
  },

  saveAddress() {
    var that = this;
    const f = this.data.form;
    if (!f.name) return wx.showToast({ title: "请填写用餐人称呼", icon: "none" });
    if (f.phone && !/^1\d{10}$/.test(f.phone)) {
      return wx.showToast({ title: "电话格式不正确", icon: "none" });
    }
    if (!f.address) return wx.showToast({ title: "请填写具体位置", icon: "none" });
    this.setData({ saving: true });
    const params = {
      action: this.data.isEdit ? "update" : "add",
      address: {
        name: f.name,
        phone: f.phone,
        address: f.address,
        isDefault: f.isDefault,
      },
    };
    if (this.data.isEdit) params.address._id = f._id;
    callFunction("manageAddress", params)
      .then(function (res) {
        that.setData({ saving: false });
        if (res && res.success) {
          wx.showToast({ title: "已保存", icon: "success" });
          that.setData({ showForm: false });
          that.loadList();
        } else {
          wx.showToast({
            title: (res && res.errMsg) || "保存失败",
            icon: "none",
          });
        }
      })
      .catch(function (err) {
        that.setData({ saving: false });
        console.error("保存地址失败详情", err);
        wx.showModal({
          title: "保存失败(" + ((err && err.errCode) || "?") + ")",
          content: (err && (err.errMsg || err.message)) || "未知错误",
          showCancel: false,
        });
      });
  },

  noop() {},
});
