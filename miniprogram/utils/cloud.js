/**
 * 云函数调用封装
 *
 * 小程序端所有后端请求统一走此函数：
 * 后端为单函数路由模式，通过 type 字段分发到对应处理逻辑（见云函数 index.js 路由表）。
 *
 * @param {string} type - 路由类型，如 "getMenu" / "sendOrderNotification"
 * @param {Object} [data] - 业务入参，会与 { type } 合并后发送
 * @returns {Promise<Object>} 云函数返回的 result 对象
 * @example
 *   const res = await callFunction("getMenu");
 *   // res => { success: true, categories: [...], dishes: [...] }
 */
function callFunction(type, data) {
  return new Promise(function (resolve, reject) {
    wx.cloud.callFunction({
      name: "quickstartFunctions",
      data: Object.assign({ type: type }, data || {}),
      success: function (res) {
        resolve(res.result);
      },
      fail: function (err) {
        console.error("云函数调用失败", type, err);
        reject(err);
      },
    });
  });
}

module.exports = {
  callFunction: callFunction,
};
