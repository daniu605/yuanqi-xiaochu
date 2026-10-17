// 菜品分类数据（本地兜底数据，云端初始化后以致云数据库为准）
const categories = [
  { id: 'c001', name: '大鸡大利', order: 1 },
  { id: 'c002', name: '牛气冲天', order: 2 },
  { id: 'c003', name: '鱼鱼得水', order: 3 },
  { id: 'c004', name: '猪猪快来', order: 4 },
  { id: 'c005', name: '挚爱甜品', order: 5 },
  { id: 'c006', name: '海鲜', order: 6 },
  { id: 'c007', name: '健康素菜', order: 7 },
  { id: 'c008', name: '其他', order: 8 }
];

module.exports = categories;
