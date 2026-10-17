// 菜品数据（本地兜底数据，云端初始化后以致云数据库为准，portion 为份量说明）
const dishes = [
  // 大鸡大利
  { id: 'd001', categoryId: 'c001', name: '姜葱炒鸡', image: '/images/smaller/姜葱炒鸡.jpg', description: '鲜香可口，姜香浓郁', portion: '2-3人份', isPopular: true, order: 1 },
  { id: 'd002', categoryId: 'c001', name: '鲜啫鸡', image: '/images/smaller/鲜啫鸡.jpg', description: '鲜嫩多汁，味道鲜美', portion: '2-3人份', isPopular: true, order: 2 },
  { id: 'd003', categoryId: 'c001', name: '虫草花蒸鸡', image: '/images/default-goods-image.png', description: '滋补养生，鸡肉鲜嫩', portion: '2-3人份', isPopular: false, order: 3 },
  { id: 'd004', categoryId: 'c001', name: '照烧汁鸡腿肉', image: '/images/smaller/照烧汁鸡腿肉.jpg', description: '甜咸适中，鸡肉多汁', portion: '1-2人份', isPopular: true, order: 4 },
  { id: 'd005', categoryId: 'c001', name: '瑞世鸡翅', image: '/images/smaller/瑞世鸡翅.jpg', description: '外脆里嫩，香气四溢', portion: '1-2人份', isPopular: true, order: 5 },

  // 牛气冲天
  { id: 'd006', categoryId: 'c002', name: '小炒黄牛肉', image: '/images/smaller/小炒黄牛肉.jpg', description: '牛肉鲜嫩，口感佳', portion: '2-3人份', isPopular: true, order: 1 },
  { id: 'd007', categoryId: 'c002', name: '香煎牛扒', image: '/images/smaller/香煎牛扒.jpg', description: '外焦里嫩，香气四溢', portion: '1-2人份', isPopular: true, order: 2 },
  { id: 'd008', categoryId: 'c002', name: '黑椒牛仔骨', image: '/images/smaller/黑椒牛仔骨.jpg', description: '黑椒香浓，肉质鲜嫩', portion: '2-3人份', isPopular: false, order: 3 },

  // 鱼鱼得水
  { id: 'd009', categoryId: 'c003', name: '酸菜鱼', image: '/images/smaller/酸菜鱼.jpg', description: '酸辣开胃，鱼肉鲜嫩', portion: '2-3人份', isPopular: true, order: 1 },
  { id: 'd010', categoryId: 'c003', name: '清蒸鱼', image: '/images/smaller/清蒸鱼.jpg', description: '鲜香嫩滑，原汁原味', portion: '2-3人份', isPopular: true, order: 2 },
  { id: 'd011', categoryId: 'c003', name: '生炒鱼片', image: '/images/smaller/生炒鱼片.jpg', description: '鱼片鲜嫩，调味鲜美', portion: '1-2人份', isPopular: false, order: 3 },
  { id: 'd012', categoryId: 'c003', name: '砂锅鱼头', image: '/images/smaller/砂锅鱼头.jpg', description: '鲜香浓郁，营养丰富', portion: '2-3人份', isPopular: true, order: 4 },

  // 猪猪快来
  { id: 'd013', categoryId: 'c004', name: '辣椒炒肉', image: '/images/smaller/辣椒炒肉.jpg', description: '香辣可口，下饭神器', portion: '1-2人份', isPopular: true, order: 1 },
  { id: 'd014', categoryId: 'c004', name: '烤五花肉', image: '/images/smaller/烤五花肉.jpg', description: '外酥里嫩，肥而不腻', portion: '1-2人份', isPopular: true, order: 2 },
  { id: 'd015', categoryId: 'c004', name: '可乐排骨', image: '/images/smaller/可乐排骨.jpg', description: '甜香入味，肉质酥烂', portion: '2-3人份', isPopular: false, order: 3 },
  { id: 'd016', categoryId: 'c004', name: '胡萝卜炒肉', image: '/images/default-goods-image.png', description: '口感脆爽，营养均衡', portion: '1-2人份', isPopular: false, order: 4 },

  // 挚爱甜品
  { id: 'd017', categoryId: 'c005', name: '番薯糖水', image: '/images/default-goods-image.png', description: '甜而不腻，暖胃舒心', portion: '1-2人份', isPopular: true, order: 1 },
  { id: 'd018', categoryId: 'c005', name: '椰汁西米露', image: '/images/default-goods-image.png', description: '香甜顺滑，口感丰富', portion: '1-2人份', isPopular: true, order: 2 },
  { id: 'd019', categoryId: 'c005', name: '拔丝地瓜', image: '/images/smaller/拔丝地瓜.jpg', description: '外脆内软，香甜可口', portion: '1-2人份', isPopular: false, order: 3 },

  // 海鲜
  { id: 'd020', categoryId: 'c006', name: '香辣小龙虾', image: '/images/smaller/香辣小龙虾.jpg', description: '麻辣鲜香，回味无穷', portion: '2-3人份', isPopular: true, order: 1 },
  { id: 'd021', categoryId: 'c006', name: '姜葱炒蟹', image: '/images/smaller/姜葱炒蟹.jpg', description: '鲜香四溢，蟹肉甘甜', portion: '2-3人份', isPopular: true, order: 2 },
  { id: 'd022', categoryId: 'c006', name: '啫鲜鱿', image: '/images/smaller/啫鲜鱿.jpg', description: '鲜嫩爽滑，口感弹牙', portion: '1-2人份', isPopular: false, order: 3 },
  { id: 'd023', categoryId: 'c006', name: '爆炒鱿鱼', image: '/images/smaller/爆炒鱿鱼.jpg', description: '香辣入味，爽口开胃', portion: '1-2人份', isPopular: true, order: 4 },
  { id: 'd024', categoryId: 'c006', name: '蒜蓉粉丝开边虾', image: '/images/smaller/蒜蓉粉丝开边虾.jpg', description: '蒜香浓郁，虾肉鲜嫩', portion: '2-3人份', isPopular: true, order: 5 },
  { id: 'd025', categoryId: 'c006', name: '香辣虾', image: '/images/smaller/香辣虾.jpg', description: '麻辣鲜香，虾肉爽弹', portion: '2-3人份', isPopular: false, order: 6 },
  { id: 'd026', categoryId: 'c006', name: '蒜蓉烤生蚝', image: '/images/smaller/蒜蓉烤生蚝.jpg', description: '蒜香四溢，鲜嫩多汁', portion: '1-2人份', isPopular: true, order: 7 }
];

module.exports = dishes;
