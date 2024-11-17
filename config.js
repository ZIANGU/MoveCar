// 配置文件
const config = {
    // 车主电话号码
    phone: '1316XXXXXXX',
    
    // 微信推送配置
    wxPusher: {
        appToken: 'AT_XXXXXXXXXXXXXXXXXXK',
        uids: ['UID_XXXXXXXXXXXXXXXXXX'],
        apiUrl: 'https://wxpusher.zjiecode.com/api/send/message'
    },
    
    // 通知相关配置
    notification: {
        cooldown: 120000, // 通知冷却时间（毫秒）
        defaultMessage: '需要挪车，请及时处理。' // 默认通知消息
    }
};

// 导出配置
window.config = config;
