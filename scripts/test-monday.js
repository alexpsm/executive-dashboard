const axios = require('axios')
require('dotenv').config({ path: '.env.local' })

async function checkMonday() {
    const token = process.env.MONDAY_API_TOKEN
    const query = '{ boards(limit: 50) { id name } }'
    try {
        const res = await axios.post('https://api.monday.com/v2', { query }, {
            headers: { 'Authorization': token, 'Content-Type': 'application/json', 'API-Version': '2023-10' }
        })
        const match = res.data.data.boards.filter(b => b.name.toLowerCase().includes('deal'))
        console.log('Candidate Boards:', JSON.stringify(match, null, 2))
    } catch (e) {
        console.error('Monday Error:', e.message)
    }
}

checkMonday()
