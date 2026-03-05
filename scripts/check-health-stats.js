const axios = require('axios')

async function checkHealth() {
    const res = await axios.get('http://localhost:3000/api/health')
    console.log(`DEALS: ${res.data.stats.active_deals}`)
    console.log(`REVENUE: ${res.data.stats.ytd_revenue}`)
}

checkHealth()
