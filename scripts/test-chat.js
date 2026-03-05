const axios = require('axios')

async function testChat() {
    try {
        const res = await axios.post('http://localhost:3000/api/chat', {
            message: "What is our current revenue target?"
        })
        console.log('AI Reply:', res.data.reply)
    } catch (e) {
        console.error('Chat Error:', e.response?.data || e.message)
    }
}

testChat()
