// 全局常量配置
const CLOUD_ENV = "cloud1-d5gyoiv955ef52486";

// 订阅消息模板ID（微信公众平台 mp.weixin.qq.com → 功能 → 订阅消息 配置）
// 新订单通知（发给商家），模板编号2047：下单时间date4/订单内容thing1/收货人thing8/地址thing11/订单金额amount13
const TEMPLATE_NEW_ORDER_ID = "0VLEcpXGMohB4WsR0oKSCEu18Kc-5RYCUS3zdRj9gN8";
// 订单状态通知（发给用户），模板编号9941：订单号character_string4/订单状态phrase2/操作时间time5
const TEMPLATE_ORDER_STATUS_ID = "nVZGi4Efh7MOyfMUIWhZK18l9jMCiNEJRgV1kvpTU0c";

const COLLECTIONS = {
  CATEGORIES: "categories",
  DISHES: "dishes",
  ORDERS: "orders",
  CONFIG: "config",
};

const ORDER_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

const ORDER_STATUS_TEXT = {
  pending: "待做",
  accepted: "烹饪中",
  completed: "已上桌",
  cancelled: "已取消",
};

module.exports = {
  CLOUD_ENV,
  TEMPLATE_NEW_ORDER_ID,
  TEMPLATE_ORDER_STATUS_ID,
  COLLECTIONS,
  ORDER_STATUS,
  ORDER_STATUS_TEXT,
};
