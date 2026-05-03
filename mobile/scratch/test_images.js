const axios = require('axios');

async function testFetchProducts() {
    try {
        const response = await axios.get('http://192.168.8.134:5001/api/v1/products?skip=0&take=10');
        if (response.data.data && response.data.data.products) {
            response.data.data.products.forEach(p => {
                console.log(`Product: ${p.name}`);
                console.log(`  imageUrl: ${p.imageUrl}`);
                console.log(`  images: ${JSON.stringify(p.images)}`);
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testFetchProducts();
