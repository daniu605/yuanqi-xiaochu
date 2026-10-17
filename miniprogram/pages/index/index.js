const localCategories = require("../../data/categories");
const localDishes = require("../../data/dishes");
const { callFunction } = require("../../utils/cloud");

Page({
  data: {
    categories: [],
    dishes: [],
    dishesByCategory: {},
    activeCategoryId: "",
    cartList: [],
    cartCount: 0,
    scrollTop: 0,
    heightList: [],
    showToast: false,
    toastMessage: "",
    showFlyAnimation: false,
    flyAnimationData: { x: 0, y: 0 },
    showLargeImage: false,
    currentLargeImage: "",
    isMerchant: false,
  },
  // 防止滚动事件影响分类切换
  isManualSwitching: false,
  lastClickedCategoryId: "",

  onLoad: function () {
    this.loadMenu();
    this.checkMerchant();
  },

  onShow: function () {
    this.loadCartFromStorage();
  },

  // 从云端加载菜单，失败时回退本地数据
  loadMenu: function () {
    var that = this;
    wx.showLoading({ title: "加载中", mask: true });
    callFunction("getMenu")
      .then(function (res) {
        wx.hideLoading();
        if (res && res.success && res.categories && res.categories.length) {
          that.setMenuData(res.categories, res.dishes || []);
        } else {
          that.setMenuData(localCategories, localDishes);
        }
      })
      .catch(function () {
        wx.hideLoading();
        that.setMenuData(localCategories, localDishes);
      });
  },

  setMenuData: function (categories, dishes) {
    var that = this;
    this.setData(
      {
        categories: categories,
        dishes: dishes,
        activeCategoryId: categories.length ? categories[0].id : "",
      },
      function () {
        that.filterDishes();
      }
    );
  },

  // 判断当前用户是否为商家
  checkMerchant: function () {
    var that = this;
    callFunction("checkMerchant")
      .then(function (res) {
        if (res && res.success) {
          that.setData({ isMerchant: !!res.isMerchant });
          getApp().globalData.isMerchant = !!res.isMerchant;
        }
      })
      .catch(function () {});
  },

  loadCartFromStorage: function () {
    const cartList = wx.getStorageSync("cartList") || [];
    const cartCount = cartList.reduce(function (sum, item) {
      return sum + item.count;
    }, 0);
    this.setData({ cartList: cartList, cartCount: cartCount });
  },

  switchCategory: function (e) {
    const categoryId = e.currentTarget.dataset.id;
    this.lastClickedCategoryId = categoryId;
    this.isManualSwitching = true;
    this.setData({ activeCategoryId: categoryId });
    var that = this;
    setTimeout(function () {
      that.setData({ scrollTop: that.getScrollTopByCategoryId(categoryId) });
    }, 10);
    setTimeout(function () {
      if (that.lastClickedCategoryId === categoryId) {
        that.isManualSwitching = false;
      }
    }, 800);
  },

  getScrollTopByCategoryId: function (categoryId) {
    const heightList = this.data.heightList;
    const index = this.data.categories.findIndex(function (c) {
      return c.id === categoryId;
    });
    let top = 0;
    for (let i = 0; i < index; i++) top += heightList[i] || 0;
    return Math.max(0, top - 2);
  },

  onDishesScroll: function (e) {
    if (this.isManualSwitching) return;
    const scrollTop = e.detail.scrollTop;
    const heightList = this.data.heightList;
    const categories = this.data.categories;
    const activeCategoryId = this.data.activeCategoryId;
    let acc = 0;
    let target = activeCategoryId;
    for (let i = 0; i < heightList.length; i++) {
      const h = heightList[i] || 0;
      if (scrollTop <= acc + h + 10) {
        target = categories[i].id;
        break;
      }
      acc += h;
    }
    if (target !== activeCategoryId) {
      this.setData({ activeCategoryId: target });
    }
  },

  calculateHeight: function () {
    const query = wx.createSelectorQuery();
    query.selectAll(".category-section").boundingClientRect();
    var that = this;
    query.exec(function (res) {
      if (res && res[0]) {
        const heightList = res[0].map(function (r) {
          return r.height > 0 ? r.height : 0;
        });
        that.setData({ heightList: heightList });
      }
    });
  },

  filterDishes: function () {
    var that = this;
    const dishes = this.data.dishes;
    const categories = this.data.categories;
    const dishesByCategory = {};
    categories.forEach(function (c) {
      dishesByCategory[c.id] = dishes.filter(function (d) {
        return d.categoryId === c.id;
      });
    });
    this.setData({ dishesByCategory: dishesByCategory }, function () {
      that.calculateHeight();
    });
  },

  showCustomToast: function (message, duration) {
    duration = duration || 1500;
    this.setData({ showToast: true, toastMessage: message });
    var that = this;
    setTimeout(function () {
      that.setData({ showToast: false });
    }, duration);
  },

  addToCart: function (e) {
    const touch = e.touches[0];
    this.setData({
      showFlyAnimation: true,
      flyAnimationData: { x: touch.clientX, y: touch.clientY },
    });
    const dish = e.currentTarget.dataset.dish;
    let cartList = this.data.cartList;
    const index = cartList.findIndex(function (item) {
      return item.id === dish.id;
    });
    if (index > -1) {
      cartList[index].count++;
    } else {
      cartList.push(Object.assign({}, dish, { count: 1 }));
    }
    const cartCount = cartList.reduce(function (sum, item) {
      return sum + item.count;
    }, 0);
    this.setData({ cartList: cartList, cartCount: cartCount });
    wx.setStorageSync("cartList", cartList);

    const query = wx.createSelectorQuery();
    query.select(".cart-bar").boundingClientRect();
    var that = this;
    query.exec(function (res) {
      if (res && res[0]) {
        const x = res[0].left + res[0].width / 2;
        const y = res[0].top + res[0].height / 2;
        setTimeout(function () {
          that.setData({ "flyAnimationData.x": x, "flyAnimationData.y": y });
          setTimeout(function () {
            that.setData({ showFlyAnimation: false });
          }, 500);
        }, 50);
      } else {
        setTimeout(function () {
          that.setData({ showFlyAnimation: false });
        }, 500);
      }
    });
  },

  onImageError: function (e) {
    const id = e.currentTarget.dataset.id;
    const dishes = this.data.dishes.map(function (d) {
      return d.id === id ? Object.assign({}, d, { useDefaultImage: true }) : d;
    });
    const dishesByCategory = {};
    const old = this.data.dishesByCategory;
    Object.keys(old).forEach(function (key) {
      dishesByCategory[key] = old[key].map(function (d) {
        return d.id === id ? Object.assign({}, d, { useDefaultImage: true }) : d;
      });
    });
    this.setData({ dishes: dishes, dishesByCategory: dishesByCategory });
  },

  goToCart: function () {
    if (this.data.cartCount === 0) {
      return this.showCustomToast("先选几道想吃的菜吧");
    }
    wx.navigateTo({ url: "/packageA/pages/cart/cart" });
  },

  goMyOrders: function () {
    wx.navigateTo({ url: "/packageA/pages/my-orders/my-orders" });
  },

  goAdmin: function () {
    wx.navigateTo({ url: "/packageB/pages/admin-home/admin-home" });
  },

  showLargeImage: function (e) {
    const image = e.currentTarget.dataset.image;
    this.setData({ showLargeImage: true, currentLargeImage: image });
  },

  closeLargeImage: function () {
    this.setData({ showLargeImage: false });
  },
});
