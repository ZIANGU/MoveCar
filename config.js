// 配置文件
const config = {
    // 车主电话号码
    phone: '13161991613',
    
    // 微信推送配置
    wxPusher: {
        appToken: 'AT_x2nQivsYLJK4knvYljx35YQtwn1fAbGK',
        uids: ['UID_p2iaIZefYc87yoeAzRJi11ZGbdgy'],
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