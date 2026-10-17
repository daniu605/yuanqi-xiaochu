# 私房菜单点餐小程序

这是一个家庭/小店使用的点餐应用，用户浏览菜单下单，商家在小程序内接单管理，全部基于微信云开发，无需自建服务器。

## 项目结构

```
├── miniprogram/              // 小程序主目录
│   ├── pages/index/          // 菜单首页（分类浏览、加购）
│   ├── packageA/pages/       // 用户端分包
│   │   ├── cart/             // 购物车（备注、提交订单）
│   │   ├── order-success/    // 下单成功
│   │   └── my-orders/        // 我的订单
│   ├── packageB/pages/       // 商家端分包
│   │   ├── admin-home/       // 商家后台入口（身份校验、数据初始化）
│   │   ├── admin-orders/     // 订单管理（筛选、接单/完成/取消）
│   │   └── admin-dishes/     // 菜品管理（增删改、换图片、改菜名）
│   ├── utils/                // 常量与云函数封装
│   ├── data/                 // 本地兜底菜单数据
│   └── images/               // 图片资源
├── cloudfunctions/
│   └── quickstartFunctions/  // 云函数（单函数路由模式）
│       ├── index.js          // 路由入口（按 event.type 分发）
│       ├── initData.js       // 数据库初始化（首个调用者成为掌勺人）
│       ├── menu.js           // 菜单查询 / 后台校验 / 菜品分类管理
│       ├── order.js          // 下单 / 订单状态 / 订单查询 / 订阅消息通知
│       ├── auth.js           // RBAC 权限判定 / 邀请码 / 后台成员管理
│       └── address.js        // 收货地址簿（增删改查 / 设默认）
└── project.config.json
```

## 主要功能

- 菜单浏览：分类导航、菜品图片、价格、加入购物车（飞入动画）
- 购物车：数量修改、备注、合计金额、提交订单
- 订单通知：下单后通过微信订阅消息通知商家；订单状态变更通知用户
- 我的订单：用户查看自己的订单及状态
- 商家后台：订单管理（接单/完成/取消）、菜品管理（增删改、上传图片）

## 部署指南

1. 微信开发者工具导入本项目，appid 使用 `wxe046551223496220`
2. 云环境：`cloud1-d5gyoiv955ef52486`（已在 `miniprogram/app.js` 配置）
3. 在 `miniprogram` 目录执行 `npm install`，然后在开发者工具中【工具 → 构建 npm】
4. 右键 `cloudfunctions/quickstartFunctions` → 【上传并部署：云端安装依赖】
5. 编译运行，进入首页后打开【商家后台 → 初始化数据】，首个初始化者自动成为商家
6. 订阅消息模板已配置（微信公众平台 → 功能 → 订阅消息）：
   - 新订单通知（发商家，模板2047）：下单时间date4/订单内容thing1/收货人thing8/地址thing11/订单金额amount13
   - 订单状态通知（发用户，模板9941）：订单号character_string4/订单状态phrase2/操作时间time5
   - 模板 ID 位于 `miniprogram/utils/constants.js` 与 `cloudfunctions/quickstartFunctions/order.js`

## 云函数 API 路由表

所有请求统一调用云函数 `quickstartFunctions`，通过 `event.type` 路由：

| type | 说明 | 权限 |
| --- | --- | --- |
| getOpenId | 获取当前用户 openid | 任意用户 |
| initData | 创建集合、导入默认菜单、登记掌勺人（幂等） | 首个调用者成为 owner |
| getMenu | 获取分类 + 菜品 | 任意用户 |
| checkMerchant | 校验后台权限，返回角色 | 任意用户 |
| manageDish | 菜品/分类增删改（action 区分） | 管理员 |
| sendOrderNotification | 提交订单并通知商家 | 任意用户 |
| updateOrderStatus | 更新订单状态并通知用户 | 管理员 |
| getOrders | 查询订单（商家看全部，用户看自己的） | 任意用户 |
| manageAdmin | 成员列表/移除/凭邀请码加入 | 视 action 而定 |
| manageAddress | 地址簿增删改查/设默认 | 本人 |

## 权限模型（RBAC）

- **owner（掌勺人）**：首次执行初始化的用户，记录在 `config` 集合 `merchant_openid` 键下，拥有全部后台权限及成员管理权
- **staff（厨房成员）**：凭 owner 生成的 6 位邀请码加入，记录在 `admin_users` 集合，拥有后台权限
- 权限判定统一由 `auth.js` 的 `getPermission(openid)` 完成，写操作均校验 `isAdmin`

## 订单状态机

```
pending（待接单）→ accepted（已接单）→ completed（已完成）
        ↘ cancelled（已取消）
```

## 数据库集合

| 集合 | 说明 |
| --- | --- |
| categories | 菜品分类（id/name/order） |
| dishes | 菜品（id/categoryId/name/image/description/price/isPopular/order） |
| orders | 订单（orderNo/userOpenid/items/remark/address/totalAmount/status/createTime/createTs） |
| admin_users | 后台成员（openid/role/joinTime） |
| addresses | 收货地址（openid/name/phone/address/isDefault/createTime） |
| config | 配置（key=merchant_openid 存商家openid） |

## 授权协议

本项目仅供学习使用，未经允许不得用于商业用途。
