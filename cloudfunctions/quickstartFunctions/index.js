/**
 * 云函数入口（单函数路由模式）
 *
 * 整个小程序的所有后端能力收敛到一个云函数 quickstartFunctions，
 * 前端通过 event.type 字段路由到对应的处理函数，省去多函数部署与维护成本。
 *
 * 路由表：
 *   getOpenId            → 获取当前用户的 openid / appid / unionid
 *   initData             → 数据库初始化（首个调用者自动成为掌勺人 owner）
 *   getMenu              → 获取菜单（分类 + 菜品，所有用户可读）
 *   checkMerchant        → 校验当前用户是否有后台权限（RBAC）
 *   manageDish           → 菜品 / 分类管理（增删改，写操作需后台权限）
 *   sendOrderNotification→ 提交订单并触发商家订阅消息通知
 *   updateOrderStatus    → 商家更新订单状态并通知用户
 *   getOrders            → 查询订单（商家看全部，用户只看自己的）
 *   manageAdmin          → 后台成员管理（列表 / 移除 / 邀请码加入）
 *   manageAddress        → 收货地址簿管理（增删改查 / 设默认）
 */
const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const menu = require("./menu");
const order = require("./order");
const auth = require("./auth");
const initData = require("./initData");
const { manageAddress } = require("./address");

/**
 * 获取当前调用者的身份信息
 * 云函数环境下微信会自动注入 OPENID 等上下文，无需前端传参
 */
const getOpenId = async () => {
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case "getOpenId":
      return await getOpenId();
    case "initData":
      return await initData(event);
    case "getMenu":
      return await menu.getMenu(event);
    case "checkMerchant":
      return await menu.checkMerchant(event);
    case "manageDish":
      return await menu.manageDish(event);
    case "sendOrderNotification":
      return await order.sendOrderNotification(event);
    case "updateOrderStatus":
      return await order.updateOrderStatus(event);
    case "getOrders":
      return await order.getOrders(event);
    case "manageAdmin":
      return await auth.manageAdmin(event);
    case "manageAddress":
      return await manageAddress(event);
    default:
      return { success: false, errMsg: "unknown type: " + event.type };
  }
};
