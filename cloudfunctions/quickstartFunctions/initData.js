const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();
const auth = require("./auth");

/**
 * 数据库初始化模块
 *
 * 一次性完成：创建全部集合 → 导入默认分类与菜品 → 登记掌勺人。
 * 所有步骤均为幂等设计，可安全重复调用；数据已存在时只返回当前身份，不重复写入。
 */

// 默认分类数据
const categories = [
  { id: "c001", name: "大鸡大利", order: 1 },
  { id: "c002", name: "牛气冲天", order: 2 },
  { id: "c003", name: "鱼鱼得水", order: 3 },
  { id: "c004", name: "猪猪快来", order: 4 },
  { id: "c005", name: "挚爱甜品", order: 5 },
  { id: "c006", name: "海鲜", order: 6 },
  { id: "c007", name: "健康素菜", order: 7 },
  { id: "c008", name: "其他", order: 8 },
];

// 默认菜品数据（portion 为份量说明，不涉及价格）
const dishes = [
  { id: "d001", categoryId: "c001", name: "姜葱炒鸡", image: "/images/smaller/姜葱炒鸡.jpg", description: "鲜香可口，姜香浓郁", portion: "2-3人份", isPopular: true, order: 1 },
  { id: "d002", categoryId: "c001", name: "鲜啫鸡", image: "/images/smaller/鲜啫鸡.jpg", description: "鲜嫩多汁，味道鲜美", portion: "2-3人份", isPopular: true, order: 2 },
  { id: "d003", categoryId: "c001", name: "虫草花蒸鸡", image: "/images/default-goods-image.png", description: "滋补养生，鸡肉鲜嫩", portion: "2-3人份", isPopular: false, order: 3 },
  { id: "d004", categoryId: "c001", name: "照烧汁鸡腿肉", image: "/images/smaller/照烧汁鸡腿肉.jpg", description: "甜咸适中，鸡肉多汁", portion: "1-2人份", isPopular: true, order: 4 },
  { id: "d005", categoryId: "c001", name: "瑞世鸡翅", image: "/images/smaller/瑞世鸡翅.jpg", description: "外脆里嫩，香气四溢", portion: "1-2人份", isPopular: true, order: 5 },
  { id: "d006", categoryId: "c002", name: "小炒黄牛肉", image: "/images/smaller/小炒黄牛肉.jpg", description: "牛肉鲜嫩，口感佳", portion: "2-3人份", isPopular: true, order: 1 },
  { id: "d007", categoryId: "c002", name: "香煎牛扒", image: "/images/smaller/香煎牛扒.jpg", description: "外焦里嫩，香气四溢", portion: "1-2人份", isPopular: true, order: 2 },
  { id: "d008", categoryId: "c002", name: "黑椒牛仔骨", image: "/images/smaller/黑椒牛仔骨.jpg", description: "黑椒香浓，肉质鲜嫩", portion: "2-3人份", isPopular: false, order: 3 },
  { id: "d009", categoryId: "c003", name: "酸菜鱼", image: "/images/smaller/酸菜鱼.jpg", description: "酸辣开胃，鱼肉鲜嫩", portion: "2-3人份", isPopular: true, order: 1 },
  { id: "d010", categoryId: "c003", name: "清蒸鱼", image: "/images/smaller/清蒸鱼.jpg", description: "鲜香嫩滑，原汁原味", portion: "2-3人份", isPopular: true, order: 2 },
  { id: "d011", categoryId: "c003", name: "生炒鱼片", image: "/images/smaller/生炒鱼片.jpg", description: "鱼片鲜嫩，调味鲜美", portion: "1-2人份", isPopular: false, order: 3 },
  { id: "d012", categoryId: "c003", name: "砂锅鱼头", image: "/images/smaller/砂锅鱼头.jpg", description: "鲜香浓郁，营养丰富", portion: "2-3人份", isPopular: true, order: 4 },
  { id: "d013", categoryId: "c004", name: "辣椒炒肉", image: "/images/smaller/辣椒炒肉.jpg", description: "香辣可口，下饭神器", portion: "1-2人份", isPopular: true, order: 1 },
  { id: "d014", categoryId: "c004", name: "烤五花肉", image: "/images/smaller/烤五花肉.jpg", description: "外酥里嫩，肥而不腻", portion: "1-2人份", isPopular: true, order: 2 },
  { id: "d015", categoryId: "c004", name: "可乐排骨", image: "/images/smaller/可乐排骨.jpg", description: "甜香入味，肉质酥烂", portion: "2-3人份", isPopular: false, order: 3 },
  { id: "d016", categoryId: "c004", name: "胡萝卜炒肉", image: "/images/default-goods-image.png", description: "口感脆爽，营养均衡", portion: "1-2人份", isPopular: false, order: 4 },
  { id: "d017", categoryId: "c005", name: "番薯糖水", image: "/images/default-goods-image.png", description: "甜而不腻，暖胃舒心", portion: "1-2人份", isPopular: true, order: 1 },
  { id: "d018", categoryId: "c005", name: "椰汁西米露", image: "/images/default-goods-image.png", description: "香甜顺滑，口感丰富", portion: "1-2人份", isPopular: true, order: 2 },
  { id: "d019", categoryId: "c005", name: "拔丝地瓜", image: "/images/smaller/拔丝地瓜.jpg", description: "外脆内软，香甜可口", portion: "1-2人份", isPopular: false, order: 3 },
  { id: "d020", categoryId: "c006", name: "香辣小龙虾", image: "/images/smaller/香辣小龙虾.jpg", description: "麻辣鲜香，回味无穷", portion: "2-3人份", isPopular: true, order: 1 },
  { id: "d021", categoryId: "c006", name: "姜葱炒蟹", image: "/images/smaller/姜葱炒蟹.jpg", description: "鲜香四溢，蟹肉甘甜", portion: "2-3人份", isPopular: true, order: 2 },
  { id: "d022", categoryId: "c006", name: "啫鲜鱿", image: "/images/smaller/啫鲜鱿.jpg", description: "鲜嫩爽滑，口感弹牙", portion: "1-2人份", isPopular: false, order: 3 },
  { id: "d023", categoryId: "c006", name: "爆炒鱿鱼", image: "/images/smaller/爆炒鱿鱼.jpg", description: "香辣入味，爽口开胃", portion: "1-2人份", isPopular: true, order: 4 },
  { id: "d024", categoryId: "c006", name: "蒜蓉粉丝开边虾", image: "/images/smaller/蒜蓉粉丝开边虾.jpg", description: "蒜香浓郁，虾肉鲜嫩", portion: "2-3人份", isPopular: true, order: 5 },
  { id: "d025", categoryId: "c006", name: "香辣虾", image: "/images/smaller/香辣虾.jpg", description: "麻辣鲜香，虾肉爽弹", portion: "2-3人份", isPopular: false, order: 6 },
  { id: "d026", categoryId: "c006", name: "蒜蓉烤生蚝", image: "/images/smaller/蒜蓉烤生蚝.jpg", description: "蒜香四溢，鲜嫩多汁", portion: "1-2人份", isPopular: true, order: 7 },
];

/**
 * 创建单个集合（幂等），已存在时静默忽略
 * @param {string} name - 集合名称
 */
async function ensureCollection(name) {
  try {
    await db.createCollection(name);
  } catch (e) {
    // 集合已存在则忽略
  }
}

/**
 * 初始化数据库：创建集合、导入默认菜单、首个调用者成为掌勺人(owner)
 * @param {Object} event - 云函数入参（本函数不使用，保持签名统一）
 * @returns {{success: boolean, isMerchant: boolean, role?: string,
 *            inviteCode?: string, merchantOpenid: string, message: string}}
 */
module.exports = async function initData(event) {
  const wxContext = cloud.getWXContext();

  const collections = [
    "categories",
    "dishes",
    "orders",
    "config",
    "admin_users",
    "addresses",
  ];
  for (const name of collections) {
    await ensureCollection(name);
  }

  // 导入分类（仅当为空时）
  const catCount = await db.collection("categories").count();
  if (catCount.total === 0) {
    for (const c of categories) {
      await db.collection("categories").add({ data: c });
    }
  }

  // 导入菜品（仅当为空时）
  const dishCount = await db.collection("dishes").count();
  if (dishCount.total === 0) {
    for (const d of dishes) {
      await db.collection("dishes").add({ data: d });
    }
  }

  // 设置掌勺人：首次初始化者成为 owner
  const cfg = await db
    .collection("config")
    .where({ key: "merchant_openid" })
    .get();
  if (cfg.data.length === 0) {
    await db.collection("config").add({
      data: { key: "merchant_openid", value: wxContext.OPENID },
    });
    const inviteCode = await auth.getInviteCode();
    return {
      success: true,
      isMerchant: true,
      role: "owner",
      inviteCode: inviteCode,
      merchantOpenid: wxContext.OPENID,
      message: "初始化完成，您已成为掌勺人",
    };
  }

  return {
    success: true,
    isMerchant: cfg.data[0].value === wxContext.OPENID,
    merchantOpenid: cfg.data[0].value,
    message: "数据已存在，无需重复初始化",
  };
};
