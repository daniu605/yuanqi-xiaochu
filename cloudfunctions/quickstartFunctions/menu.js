const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();
const auth = require("./auth");

// 兼容导出（实际逻辑已迁移至 auth.js，保留旧接口避免调用方报错）
async function getMerchantOpenid() {
  return auth.getMerchantOpenid();
}

/**
 * 获取完整菜单（分类 + 菜品），所有用户可读
 * @param {Object} event - 云函数入参（本函数不使用，保持签名统一）
 * @returns {{success: boolean, categories?: Array, dishes?: Array, errMsg?: string}}
 */
async function getMenu(event) {
  try {
    const categories = await db
      .collection("categories")
      .orderBy("order", "asc")
      .limit(100)
      .get();
    const dishes = await db
      .collection("dishes")
      .orderBy("order", "asc")
      .limit(100)
      .get();
    return {
      success: true,
      categories: categories.data,
      dishes: dishes.data,
    };
  } catch (e) {
    return { success: false, errMsg: String(e) };
  }
}

/**
 * 校验当前用户的后台权限（RBAC：owner 或受邀成员）
 * @param {Object} event - 云函数入参（本函数不使用，保持签名统一）
 * @returns {{success: boolean, isMerchant: boolean, role: string, hasOwner: boolean}}
 *          hasOwner 表示厨房是否已初始化（是否存在掌勺人）
 */
async function checkMerchant(event) {
  const wxContext = cloud.getWXContext();
  await auth.ensureCollections();
  const perm = await auth.getPermission(wxContext.OPENID);
  return {
    success: true,
    isMerchant: perm.isAdmin,
    role: perm.role,
    hasOwner: perm.hasOwner,
  };
}

/**
 * 菜品 / 分类管理，写操作需要后台权限（RBAC）
 * @param {Object} event - 云函数入参
 * @param {string} event.action - 操作类型：addDish / updateDish / deleteDish / addCategory / deleteCategory
 * @param {Object} [event.dish] - 菜品数据（addDish / updateDish 时必传）
 * @param {string} [event.name] - 分类名称（addCategory 时必传）
 * @param {string} [event._id]  - 目标记录 ID（delete 类操作时必传）
 * @returns {{success: boolean, errMsg?: string}}
 */
async function manageDish(event) {
  const wxContext = cloud.getWXContext();
  const perm = await auth.getPermission(wxContext.OPENID);
  const action = event.action;

  const writeActions = [
    "addDish",
    "updateDish",
    "deleteDish",
    "addCategory",
    "deleteCategory",
  ];
  if (writeActions.indexOf(action) > -1 && !perm.isAdmin) {
    return { success: false, errMsg: "无后台管理权限" };
  }

  try {
    switch (action) {
      case "addDish": {
        const d = event.dish || {};
        await db.collection("dishes").add({
          data: {
            id: "d" + Date.now(),
            categoryId: d.categoryId,
            name: d.name,
            image: d.image || "",
            description: d.description || "",
            portion: d.portion || "",
            isPopular: !!d.isPopular,
            order: Date.now() % 100000,
          },
        });
        return { success: true };
      }
      case "updateDish": {
        const d = event.dish || {};
        await db
          .collection("dishes")
          .doc(d._id)
          .update({
            data: {
              name: d.name,
              portion: d.portion || "",
              description: d.description || "",
              categoryId: d.categoryId,
              image: d.image || "",
              isPopular: !!d.isPopular,
            },
          });
        return { success: true };
      }
      case "deleteDish": {
        await db.collection("dishes").doc(event._id).remove();
        return { success: true };
      }
      case "addCategory": {
        const cnt = await db.collection("categories").count();
        await db.collection("categories").add({
          data: {
            id: "c" + Date.now(),
            name: event.name,
            order: cnt.total + 1,
          },
        });
        return { success: true };
      }
      case "deleteCategory": {
        await db.collection("categories").doc(event._id).remove();
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
  getMenu: getMenu,
  checkMerchant: checkMerchant,
  manageDish: manageDish,
  getMerchantOpenid: getMerchantOpenid,
  auth: auth,
};
