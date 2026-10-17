const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();
const auth = require("./auth");

/**
 * 订单模块：下单 / 状态流转 / 订单查询 / 订阅消息通知
 *
 * 订单状态机：pending（待接单）→ accepted（已接单）→ completed（已完成）
 *                                  ↘ cancelled（已取消）
 */

// 订阅消息模板ID（与小程序端 constants.js 保持一致）
// 新订单通知（模板2047）：date4下单时间/thing1订单内容/thing8收货人/thing11地址/amount13订单金额
const TEMPLATE_NEW_ORDER_ID = "0VLEcpXGMohB4WsR0oKSCEu18Kc-5RYCUS3zdRj9gN8";
// 订单状态通知（模板9941）：character_string4订单号/phrase2订单状态/time5操作时间
const TEMPLATE_ORDER_STATUS_ID = "nVZGi4Efh7MOyfMUIWhZK18l9jMCiNEJRgV1kvpTU0c";

const ORDER_STATUS_TEXT = {
  pending: "待接单",
  accepted: "已接单",
  completed: "已完成",
  cancelled: "已取消",
};

function pad(n) {
  return n < 10 ? "0" + n : n;
}

function formatTime(d) {
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    " " +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}

// date 类型字段仅支持日期
function formatDate(d) {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

/**
 * 提交订单并通知商家
 * 写入 orders 集合（状态 pending），随后向掌勺人发送新订单订阅消息；
 * 通知失败不影响下单结果（仅记录日志）。
 * @param {Object} event - 云函数入参
 * @param {Array}  event.items   - 订单条目 [{name, count, ...}]，不能为空
 * @param {string} [event.remark] - 订单备注
 * @param {Object} event.address  - 收货信息 {name, phone, address}，必填
 * @returns {{success: boolean, orderId?: string, orderNo?: string, errMsg?: string}}
 */
async function sendOrderNotification(event) {
  const wxContext = cloud.getWXContext();
  const items = event.items || [];
  const remark = event.remark || "";
  const address = event.address || null;

  if (!items.length) {
    return { success: false, errMsg: "订单为空" };
  }
  if (!address || !address.name || !address.phone || !address.address) {
    return { success: false, errMsg: "请先填写收货地址" };
  }

  const now = new Date();
  const orderNo = "ORD" + now.getTime();

  try {
    const addRes = await db.collection("orders").add({
      data: {
        orderNo: orderNo,
        userOpenid: wxContext.OPENID,
        items: items,
        remark: remark,
        address: {
          name: address.name,
          phone: address.phone || "",
          address: address.address,
        },
        status: "pending",
        createTime: formatTime(now),
        createTs: now.getTime(),
      },
    });

    // 通知商家（模板ID未配置时自动跳过）
    try {
      const merchantOpenid = await auth.getMerchantOpenid();
      if (
        merchantOpenid &&
        TEMPLATE_NEW_ORDER_ID.indexOf("TEMPLATE_") !== 0
      ) {
        const dishSummary = items
          .map(function (i) {
            return i.name + "x" + i.count;
          })
          .join("、")
          .slice(0, 20);
        await cloud.openapi.subscribeMessage.send({
          touser: merchantOpenid,
          templateId: TEMPLATE_NEW_ORDER_ID,
          page: "packageB/pages/admin-orders/admin-orders",
          data: {
            date4: { value: formatDate(now) },
            thing1: { value: dishSummary || "有新的点菜" },
            thing8: { value: (address.name || "家人").slice(0, 20) },
            thing11: { value: (address.address || "未填写").slice(0, 20) },
          },
        });
      }
    } catch (e) {
      console.error("发送新订单通知失败", e);
    }

    return { success: true, orderId: addRes._id, orderNo: orderNo };
  } catch (e) {
    return { success: false, errMsg: String(e) };
  }
}

/**
 * 更新订单状态（仅商家）并通知下单用户
 * 合法状态：accepted / completed / cancelled（pending 只在下单时产生）
 * @param {Object} event - 云函数入参
 * @param {string} event.orderId - 订单记录 _id
 * @param {string} event.status  - 目标状态
 * @returns {{success: boolean, errMsg?: string}}
 */
async function updateOrderStatus(event) {
  const wxContext = cloud.getWXContext();
  const orderId = event.orderId;
  const status = event.status;

  if (["accepted", "completed", "cancelled"].indexOf(status) === -1) {
    return { success: false, errMsg: "非法状态" };
  }

  const perm = await auth.getPermission(wxContext.OPENID);
  if (!perm.isAdmin) {
    return { success: false, errMsg: "无后台管理权限" };
  }

  try {
    const orderRes = await db.collection("orders").doc(orderId).get();
    const orderData = orderRes.data;

    await db
      .collection("orders")
      .doc(orderId)
      .update({
        data: {
          status: status,
          updateTime: formatTime(new Date()),
        },
      });

    // 通知用户（模板ID未配置时自动跳过）
    try {
      if (TEMPLATE_ORDER_STATUS_ID.indexOf("TEMPLATE_") !== 0) {
        await cloud.openapi.subscribeMessage.send({
          touser: orderData.userOpenid,
          templateId: TEMPLATE_ORDER_STATUS_ID,
          page: "packageA/pages/my-orders/my-orders",
          data: {
            character_string4: { value: orderData.orderNo },
            phrase2: { value: ORDER_STATUS_TEXT[status] || status },
            time5: { value: formatTime(new Date()) },
          },
        });
      }
    } catch (e) {
      console.error("发送订单状态通知失败", e);
    }

    return { success: true };
  } catch (e) {
    return { success: false, errMsg: String(e) };
  }
}

/**
 * 查询订单：商家（role=merchant）可看全部，普通用户只能看自己的
 * 按创建时间倒序返回最近 50 条，可按状态过滤
 * @param {Object} event - 云函数入参
 * @param {string} [event.role]   - 传 "merchant" 表示以商家身份查询（需后台权限）
 * @param {string} [event.status] - 按订单状态过滤，缺省返回全部状态
 * @returns {{success: boolean, orders?: Array, errMsg?: string}}
 */
async function getOrders(event) {
  const wxContext = cloud.getWXContext();

  const condition = {};
  if (event.role === "merchant") {
    const perm = await auth.getPermission(wxContext.OPENID);
    if (!perm.isAdmin) {
      return { success: false, errMsg: "无后台管理权限" };
    }
  } else {
    condition.userOpenid = wxContext.OPENID;
  }
  if (event.status) {
    condition.status = event.status;
  }

  try {
    const res = await db
      .collection("orders")
      .where(condition)
      .orderBy("createTs", "desc")
      .limit(50)
      .get();
    return { success: true, orders: res.data };
  } catch (e) {
    return { success: false, errMsg: String(e) };
  }
}

module.exports = {
  sendOrderNotification: sendOrderNotification,
  updateOrderStatus: updateOrderStatus,
  getOrders: getOrders,
};
