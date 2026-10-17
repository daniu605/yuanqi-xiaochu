const { callFunction } = require("../../../utils/cloud");

Page({
  data: {
    categories: [],
    dishes: [],
    filteredDishes: [],
    activeCategoryId: "",
    categoryIndex: 0,
    showForm: false,
    isEdit: false,
    saving: false,
    form: {
      _id: "",
      name: "",
      portion: "",
      description: "",
      categoryId: "",
      image: "",
      isPopular: false,
    },
  },

  onShow() {
    this.loadMenu();
  },

  loadMenu() {
    var that = this;
    callFunction("getMenu")
      .then(function (res) {
        if (res && res.success) {
          const categories = res.categories || [];
          that.setData(
            {
              categories: categories,
              dishes: res.dishes || [],
              activeCategoryId:
                that.data.activeCategoryId ||
                (categories.length ? categories[0].id : ""),
            },
            function () {
              that.filterDishes();
            }
          );
        }
      })
      .catch(function () {});
  },

  filterDishes() {
    var that = this;
    const filtered = this.data.dishes.filter(function (d) {
      return d.categoryId === that.data.activeCategoryId;
    });
    this.setData({ filteredDishes: filtered });
  },

  switchCategory(e) {
    this.setData({ activeCategoryId: e.currentTarget.dataset.id });
    this.filterDishes();
  },

  // 打开新增表单
  onAdd() {
    const categories = this.data.categories;
    const categoryId =
      this.data.activeCategoryId || (categories.length ? categories[0].id : "");
    this.setData({
      showForm: true,
      isEdit: false,
      categoryIndex: Math.max(
        0,
        categories.findIndex(function (c) {
          return c.id === categoryId;
        })
      ),
      form: {
        _id: "",
        name: "",
        portion: "",
        description: "",
        categoryId: categoryId,
        image: "",
        isPopular: false,
      },
    });
  },

  // 打开编辑表单
  onEdit(e) {
    const dish = e.currentTarget.dataset.dish;
    const categoryIndex = Math.max(
      0,
      this.data.categories.findIndex(function (c) {
        return c.id === dish.categoryId;
      })
    );
    this.setData({
      showForm: true,
      isEdit: true,
      categoryIndex: categoryIndex,
      form: {
        _id: dish._id,
        name: dish.name,
        portion: dish.portion || "",
        description: dish.description || "",
        categoryId: dish.categoryId,
        image: dish.image || "",
        isPopular: !!dish.isPopular,
      },
    });
  },

  onDelete(e) {
    var that = this;
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: "删除菜品",
      content: "确定要删除该菜品吗？",
      success: function (res) {
        if (!res.confirm) return;
        callFunction("manageDish", { action: "deleteDish", _id: id }).then(
          function (r) {
            if (r && r.success) {
              wx.showToast({ title: "已删除", icon: "success" });
              that.loadMenu();
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

  onAddCategory() {
    var that = this;
    wx.showModal({
      title: "新增分类",
      editable: true,
      placeholderText: "请输入分类名称",
      success: function (res) {
        if (!res.confirm || !res.content) return;
        callFunction("manageDish", {
          action: "addCategory",
          name: res.content,
        }).then(function (r) {
          if (r && r.success) {
            wx.showToast({ title: "已新增", icon: "success" });
            that.loadMenu();
          } else {
            wx.showToast({
              title: (r && r.errMsg) || "新增失败",
              icon: "none",
            });
          }
        });
      },
    });
  },

  // 长按分类标签删除（分类下有菜品时禁止删除）
  onDeleteCategory(e) {
    var that = this;
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    const dishCount = this.data.dishes.filter(function (d) {
      return d.categoryId === id;
    }).length;
    if (dishCount > 0) {
      return wx.showToast({
        title: "该分类下还有" + dishCount + "道菜品，请先删除或移走",
        icon: "none",
        duration: 2000,
      });
    }
    wx.showModal({
      title: "删除分类",
      content: '确定要删除分类「' + name + "」吗？",
      success: function (res) {
        if (!res.confirm) return;
        callFunction("manageDish", { action: "deleteCategory", _id: id }).then(
          function (r) {
            if (r && r.success) {
              wx.showToast({ title: "已删除", icon: "success" });
              if (that.data.activeCategoryId === id) {
                that.setData({ activeCategoryId: "" });
              }
              that.loadMenu();
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

  closeForm() {
    this.setData({ showForm: false });
  },

  onNameInput(e) {
    this.setData({ "form.name": e.detail.value });
  },

  onPortionInput(e) {
    this.setData({ "form.portion": e.detail.value });
  },

  onDescInput(e) {
    this.setData({ "form.description": e.detail.value });
  },

  onCategoryChange(e) {
    const index = Number(e.detail.value);
    this.setData({
      categoryIndex: index,
      "form.categoryId": this.data.categories[index].id,
    });
  },

  onPopularChange(e) {
    this.setData({ "form.isPopular": e.detail.value });
  },

  // 选择图片并上传到云存储
  chooseImage() {
    var that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      success: function (res) {
        const filePath = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: "上传中", mask: true });
        wx.cloud.uploadFile({
          cloudPath:
            "dishes/" +
            Date.now() +
            "-" +
            Math.floor(Math.random() * 10000) +
            ".jpg",
          filePath: filePath,
          success: function (r) {
            wx.hideLoading();
            that.setData({ "form.image": r.fileID });
          },
          fail: function () {
            wx.hideLoading();
            wx.showToast({ title: "上传失败", icon: "none" });
          },
        });
      },
    });
  },

  saveDish() {
    var that = this;
    const f = this.data.form;
    if (!f.name) {
      return wx.showToast({ title: "请填写菜名", icon: "none" });
    }
    if (!f.categoryId) {
      return wx.showToast({ title: "请选择分类", icon: "none" });
    }
    this.setData({ saving: true });
    const dish = {
      name: f.name,
      portion: f.portion || "",
      description: f.description,
      categoryId: f.categoryId,
      image: f.image,
      isPopular: f.isPopular,
    };
    const params = {
      action: this.data.isEdit ? "updateDish" : "addDish",
      dish: dish,
    };
    if (this.data.isEdit) {
      params.dish._id = f._id;
    }
    callFunction("manageDish", params)
      .then(function (res) {
        that.setData({ saving: false });
        if (res && res.success) {
          wx.showToast({ title: "已保存", icon: "success" });
          that.setData({ showForm: false });
          that.loadMenu();
        } else {
          wx.showToast({
            title: (res && res.errMsg) || "保存失败",
            icon: "none",
          });
        }
      })
      .catch(function () {
        that.setData({ saving: false });
        wx.showToast({ title: "网络异常", icon: "none" });
      });
  },

  noop() {},
});
