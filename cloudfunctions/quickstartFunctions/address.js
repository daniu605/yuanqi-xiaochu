const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();
const auth = require("./auth");

/**
 * 收货地址簿模块（每个用户只管理自己的地址，跨用户完全隔离）
 */

/**
 * 取消该用户当前所有默认地址（用于切换默认地址前清场）
 * @param {string} openid - 用户 openid
 */
async function clearDefault(openid) {
  try {
    await db
      .collection("addresses")
      .where({ openid: openid, isDefault: true })
      .update({ data: { isDefault: false } });
  } catch (e) {}
}

/**
 * 收货地址簿管理入口（增删改查 / 设默认）
 * 所有操作都以云函数上下文中的 OPENID 归属校验，防止越权改他人地址
 * @param {Object} event - 云函数入参
 * @param {string} event.action - 操作类型：list / add / update / remove / setDefault
 * @param {Object} [event.address] - 地址数据 {name, phone, address, isDefault}
 * @param {string} [event._id] - 目标地址记录 _id（update / remove / setDefault 时必传）
 * @returns {{success: boolean, addresses?: Array, _id?: string, errMsg?: string}}
 */
async function manageAddress(event) {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const action = event.action;

  try {
    await auth.ensureCollections();

    switch (action) {
      case "list": {
        const res = await db
          .collection("addresses")
          .where({ openid: openid })
          .limit(50)
          .get();
        // 默认地址排前面
        const addresses = res.data.sort(function (a, b) {
          return (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0);
        });
        return { success: true, addresses: addresses };
      }
      case "add": {
        const d = event.address || {};
        if (!d.name || !d.address) {
          return { success: false, errMsg: "请填写用餐人和具体位置" };
        }
        if (d.isDefault) await clearDefault(openid);
        // 首个地址自动设为默认
        const count = await db
          .collection("addresses")
          .where({ openid: openid })
          .count();
        const isDefault = !!d.isDefault || count.total === 0;
        const addRes = await db.collection("addresses").add({
          data: {
            openid: openid,
            name: d.name,
            phone: d.phone,
            address: d.address,
            isDefault: isDefault,
            createTime: Date.now(),
          },
        });
        return { success: true, _id: addRes._id };
      }
      case "update": {
        const d = event.address || {};
        const own = await db.collection("addresses").doc(d._id).get();
        if (own.data.openid !== openid) {
          return { success: false, errMsg: "无权限" };
        }
        if (d.isDefault) await clearDefault(openid);
        await db
          .collection("addresses")
          .doc(d._id)
          .update({
            data: {
              name: d.name,
              phone: d.phone,
              address: d.address,
              isDefault: !!d.isDefault,
            },
          });
        return { success: true };
      }
      case "remove": {
        const own = await db.collection("addresses").doc(event._id).get();
        if (own.data.openid !== openid) {
          return { success: false, errMsg: "无权限" };
        }
        await db.collection("addresses").doc(event._id).remove();
        return { success: true };
      }
      case "setDefault": {
        const own = await db.collection("addresses").doc(event._id).get();
        if (own.data.openid !== openid) {
          return { success: false, errMsg: "无权限" };
        }
        await clearDefault(openid);
        await db
          .collection("addresses")
          .doc(event._id)
          .update({ data: { isDefault: true } });
        return { success: true };
      }
      default:
        return { success: false, errMsg: "unknown action: " + action };
    }
  } catch (e) {
    return { success: false, errMsg: String(e) };
  }
}

module.exports = {
  manageAddress: manageAddress,
};
