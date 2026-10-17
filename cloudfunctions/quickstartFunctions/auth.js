const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();

/**
 * 权限与成员管理模块
 *
 * 权限模型（RBAC）：
 *   - owner（掌勺人）：首次初始化数据库的用户，记录在 config 集合的 merchant_openid 键下
 *   - staff（厨房成员）：凭掌勺人生成的邀请码加入，记录在 admin_users 集合
 *   - 两者均视为后台管理员（isAdmin=true），owner 额外拥有成员管理权
 */

/**
 * 获取掌勺人(owner)的 openid
 * @returns {Promise<string>} 掌勺人 openid，未初始化或读取失败时返回空字符串
 */
async function getMerchantOpenid() {
  try {
    const res = await db
      .collection("config")
      .where({ key: "merchant_openid" })
      .get();
    return res.data.length ? res.data[0].value : "";
  } catch (e) {
    return "";
  }
}

/**
 * 确保核心集合存在（幂等，可重复调用）
 * 集合已存在时 createCollection 会抛错，此处静默忽略
 */
async function ensureCollections() {
  const names = ["admin_users", "addresses", "config"];
  for (const name of names) {
    try {
      await db.createCollection(name);
    } catch (e) {
      // 已存在则忽略
    }
  }
}

/**
 * RBAC 权限判定
 * @param {string} openid - 待判定的用户 openid
 * @returns {Promise<{isAdmin: boolean, role: "owner"|"staff"|"", hasOwner: boolean}>}
 *          isAdmin  是否后台管理员；role 为 owner/staff/空；hasOwner 表示厨房是否已初始化
 */
async function getPermission(openid) {
  if (!openid) {
    return { isAdmin: false, role: "", hasOwner: false };
  }
  const owner = await getMerchantOpenid();
  const hasOwner = !!owner;
  if (owner && openid === owner) {
    return { isAdmin: true, role: "owner", hasOwner: hasOwner };
  }
  try {
    const res = await db.collection("admin_users").where({ openid: openid }).get();
    if (res.data.length) {
      return { isAdmin: true, role: res.data[0].role || "staff", hasOwner: hasOwner };
    }
  } catch (e) {
    // 集合不存在
  }
  return { isAdmin: false, role: "", hasOwner: hasOwner };
}

/**
 * 获取邀请码；不存在则生成 6 位随机大写码并存入 config 集合
 * @returns {Promise<string>} 邀请码，读写失败时返回空字符串
 */
async function getInviteCode() {
  try {
    const res = await db
      .collection("config")
      .where({ key: "invite_code" })
      .get();
    if (res.data.length) return res.data[0].value;
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    await db
      .collection("config")
      .add({ data: { key: "invite_code", value: code } });
    return code;
  } catch (e) {
    return "";
  }
}

/**
 * 后台成员管理入口
 * @param {Object} event - 云函数入参
 * @param {string} event.action - 操作类型：
 *   list          成员列表 + 邀请码（仅 owner 返回邀请码，需管理员权限）
 *   remove        移除成员（仅 owner，且不能移除自己）
 *   joinByInvite  凭邀请码加入厨房（任意未加入的用户）
 * @returns {{success: boolean, [key: string]: any}}
 */
async function manageAdmin(event) {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const action = event.action;

  try {
    await ensureCollections();
    const perm = await getPermission(openid);

    switch (action) {
      case "list": {
        if (!perm.isAdmin) {
          return { success: false, errMsg: "无权限" };
        }
        let members = [];
        try {
          const res = await db
            .collection("admin_users")
            .limit(100)
            .get();
          members = res.data;
        } catch (e) {}
        const inviteCode =
          perm.role === "owner" ? await getInviteCode() : "";
        return {
          success: true,
          role: perm.role,
          inviteCode: inviteCode,
          members: members,
        };
      }
      case "remove": {
        if (perm.role !== "owner") {
          return { success: false, errMsg: "仅掌勺人可移除成员" };
        }
        const target = await db.collection("admin_users").doc(event._id).get();
        if (target.data.openid === (await getMerchantOpenid())) {
          return { success: false, errMsg: "不能移除掌勺人本人" };
        }
        await db.collection("admin_users").doc(event._id).remove();
        return { success: true };
      }
      case "joinByInvite": {
        if (perm.isAdmin) {
          return { success: true, role: perm.role, message: "你已是厨房成员" };
        }
        if (!perm.hasOwner) {
          return { success: false, errMsg: "厨房尚未初始化" };
        }
        const code = (event.code || "").trim().toUpperCase();
        if (!code) {
          return { success: false, errMsg: "请输入邀请码" };
        }
        const inviteCode = await getInviteCode();
        if (!inviteCode || code !== inviteCode) {
          return { success: false, errMsg: "邀请码不正确" };
        }
        await db.collection("admin_users").add({
          data: { openid: openid, role: "staff", joinTime: Date.now() },
        });
        return { success: true, role: "staff" };
      }
      default:
        return { success: false, errMsg: "unknown action: " + action };
    }
  } catch (e) {
    return { success: false, errMsg: String(e) };
  }
}

module.exports = {
  getMerchantOpenid: getMerchantOpenid,
  getPermission: getPermission,
  ensureCollections: ensureCollections,
  getInviteCode: getInviteCode,
  manageAdmin: manageAdmin,
};
